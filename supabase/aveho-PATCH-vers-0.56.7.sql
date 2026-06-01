-- ============================================================
--  AVEHO EC — Patch 0.56.7
--  Détection automatique des doublons forces (établissements,
--  groupements, médecins prescripteurs) via similarité fuzzy
--  pg_trgm.
-- ============================================================

-- 1) Activer pg_trgm (similarity, %, etc.)
create extension if not exists pg_trgm;

-- 2) Index GIN trigramme sur les noms pour accélérer les comparaisons
create index if not exists idx_etablissements_nom_trgm
  on etablissements using gin (nom gin_trgm_ops);

create index if not exists idx_groupements_nom_trgm
  on groupements using gin (nom gin_trgm_ops);

create index if not exists idx_medecins_nom_trgm
  on medecins_prescripteurs using gin (nom gin_trgm_ops);

-- 3) Table doublons_ignores : permet à l'user de masquer un doublon
-- (ex : "Ce sont 2 vrais établissements différents même si le nom est proche")
create table if not exists doublons_ignores (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null,
  cible text not null check (cible in ('etablissement', 'groupement', 'medecin')),
  entity_id_1 uuid not null,
  entity_id_2 uuid not null,
  raison text,
  ignore_par uuid,
  created_at timestamptz default now(),

  -- Contrainte : on stocke toujours les IDs triés (le plus petit en premier)
  -- pour éviter (A, B) et (B, A) en double
  constraint doublons_ignores_unique unique (structure_id, cible, entity_id_1, entity_id_2),
  constraint doublons_ignores_order check (entity_id_1 < entity_id_2)
);

create index if not exists idx_doublons_ignores_struct on doublons_ignores(structure_id, cible);

alter table doublons_ignores enable row level security;

drop policy if exists "doublons_ignores_select" on doublons_ignores;
create policy "doublons_ignores_select" on doublons_ignores for select to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "doublons_ignores_insert" on doublons_ignores;
create policy "doublons_ignores_insert" on doublons_ignores for insert to authenticated
  with check (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "doublons_ignores_delete" on doublons_ignores;
create policy "doublons_ignores_delete" on doublons_ignores for delete to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

-- ============================================================
-- 4) RPC : doublons établissements
-- ============================================================
--
-- Stratégie :
--   - SIRET identique (et non null) → score 1.0 (certain)
--   - FINESS identique (et non null) → score 0.95
--   - Sinon : similarité nom > seuil + même CP (si dispo) → score = similarity
--
-- On retourne les paires triées par score décroissant.
-- ============================================================

create or replace function detecter_doublons_etablissements(
  p_seuil_similarite numeric default 0.55,
  p_max_resultats int default 100
) returns table (
  etab_1_id uuid,
  etab_1_nom text,
  etab_1_siret text,
  etab_1_finess text,
  etab_1_cp text,
  etab_1_ville text,
  etab_2_id uuid,
  etab_2_nom text,
  etab_2_siret text,
  etab_2_finess text,
  etab_2_cp text,
  etab_2_ville text,
  score numeric,
  motif text
)
language sql
security definer
set search_path = public
as $$
  with mes_etabs as (
    select * from etablissements
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
  ),
  paires as (
    select
      e1.id as id_1, e1.nom as nom_1, e1.siret as siret_1, e1.finess as finess_1, e1.code_postal as cp_1, e1.ville as ville_1,
      e2.id as id_2, e2.nom as nom_2, e2.siret as siret_2, e2.finess as finess_2, e2.code_postal as cp_2, e2.ville as ville_2,
      case
        when e1.siret is not null and e1.siret = e2.siret then 1.0
        when e1.finess is not null and e1.finess = e2.finess then 0.95
        else similarity(lower(e1.nom), lower(e2.nom))::numeric
      end as score,
      case
        when e1.siret is not null and e1.siret = e2.siret then 'SIRET identique'
        when e1.finess is not null and e1.finess = e2.finess then 'FINESS identique'
        when e1.code_postal is not null and e1.code_postal = e2.code_postal then 'Nom similaire + même CP'
        else 'Nom similaire'
      end as motif
    from mes_etabs e1
    join mes_etabs e2 on e1.id < e2.id  -- évite (A,B) et (B,A), évite (A,A)
  )
  select
    id_1, nom_1, siret_1, finess_1, cp_1, ville_1,
    id_2, nom_2, siret_2, finess_2, cp_2, ville_2,
    score, motif
  from paires
  where score >= p_seuil_similarite
    and not exists (
      select 1 from doublons_ignores di
      where di.cible = 'etablissement'
        and di.entity_id_1 = least(id_1, id_2)
        and di.entity_id_2 = greatest(id_1, id_2)
    )
  order by score desc, nom_1
  limit p_max_resultats;
$$;

grant execute on function detecter_doublons_etablissements to authenticated;

-- ============================================================
-- 5) RPC : doublons groupements
-- ============================================================

create or replace function detecter_doublons_groupements(
  p_seuil_similarite numeric default 0.6,
  p_max_resultats int default 100
) returns table (
  grp_1_id uuid,
  grp_1_nom text,
  grp_1_nb_etabs bigint,
  grp_2_id uuid,
  grp_2_nom text,
  grp_2_nb_etabs bigint,
  score numeric
)
language sql
security definer
set search_path = public
as $$
  with mes_grp as (
    select g.id, g.nom,
      (select count(*) from etablissements where groupement_id = g.id and archive = false) as nb_etabs
    from groupements g
    where g.structure_id in (select structure_id from membres_structure where user_id = auth.uid())
      and g.archive = false
  ),
  paires as (
    select
      g1.id as id_1, g1.nom as nom_1, g1.nb_etabs as nb_1,
      g2.id as id_2, g2.nom as nom_2, g2.nb_etabs as nb_2,
      similarity(lower(g1.nom), lower(g2.nom))::numeric as score
    from mes_grp g1
    join mes_grp g2 on g1.id < g2.id
  )
  select
    id_1, nom_1, nb_1,
    id_2, nom_2, nb_2,
    score
  from paires
  where score >= p_seuil_similarite
    and not exists (
      select 1 from doublons_ignores di
      where di.cible = 'groupement'
        and di.entity_id_1 = least(id_1, id_2)
        and di.entity_id_2 = greatest(id_1, id_2)
    )
  order by score desc, nom_1
  limit p_max_resultats;
$$;

grant execute on function detecter_doublons_groupements to authenticated;

-- ============================================================
-- 6) RPC : doublons médecins prescripteurs
-- ============================================================
--
-- Stratégie :
--   - RPPS identique (et non null) → score 1.0
--   - Sinon similarité (nom + prenom concaténés) > seuil
-- ============================================================

create or replace function detecter_doublons_medecins(
  p_seuil_similarite numeric default 0.6,
  p_max_resultats int default 100
) returns table (
  med_1_id uuid,
  med_1_nom text,
  med_1_prenom text,
  med_1_rpps text,
  med_1_specialite text,
  med_1_ville text,
  med_1_nb_prescriptions int,
  med_2_id uuid,
  med_2_nom text,
  med_2_prenom text,
  med_2_rpps text,
  med_2_specialite text,
  med_2_ville text,
  med_2_nb_prescriptions int,
  score numeric,
  motif text
)
language sql
security definer
set search_path = public
as $$
  with mes_med as (
    select * from medecins_prescripteurs
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
  ),
  paires as (
    select
      m1.id as id_1, m1.nom as nom_1, m1.prenom as prenom_1, m1.rpps as rpps_1,
      m1.specialite_libelle as spe_1, m1.ville as ville_1, m1.nb_prescriptions as nb_1,
      m2.id as id_2, m2.nom as nom_2, m2.prenom as prenom_2, m2.rpps as rpps_2,
      m2.specialite_libelle as spe_2, m2.ville as ville_2, m2.nb_prescriptions as nb_2,
      case
        when m1.rpps is not null and m1.rpps = m2.rpps then 1.0
        else similarity(
          lower(coalesce(m1.nom, '') || ' ' || coalesce(m1.prenom, '')),
          lower(coalesce(m2.nom, '') || ' ' || coalesce(m2.prenom, ''))
        )::numeric
      end as score,
      case
        when m1.rpps is not null and m1.rpps = m2.rpps then 'RPPS identique'
        else 'Nom + prénom similaires'
      end as motif
    from mes_med m1
    join mes_med m2 on m1.id < m2.id
  )
  select
    id_1, nom_1, prenom_1, rpps_1, spe_1, ville_1, nb_1,
    id_2, nom_2, prenom_2, rpps_2, spe_2, ville_2, nb_2,
    score, motif
  from paires
  where score >= p_seuil_similarite
    and not exists (
      select 1 from doublons_ignores di
      where di.cible = 'medecin'
        and di.entity_id_1 = least(id_1, id_2)
        and di.entity_id_2 = greatest(id_1, id_2)
    )
  order by score desc, nom_1
  limit p_max_resultats;
$$;

grant execute on function detecter_doublons_medecins to authenticated;

-- ============================================================
-- 7) RPC : ignorer un doublon (toujours stocker IDs triés)
-- ============================================================

create or replace function ignorer_doublon(
  p_cible text,
  p_id_1 uuid,
  p_id_2 uuid,
  p_raison text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_struct_id uuid;
  v_low uuid;
  v_high uuid;
  v_id uuid;
begin
  -- Récupérer la structure_id en cohérence avec la cible
  if p_cible = 'etablissement' then
    select structure_id into v_struct_id from etablissements where id = p_id_1;
  elsif p_cible = 'groupement' then
    select structure_id into v_struct_id from groupements where id = p_id_1;
  elsif p_cible = 'medecin' then
    select structure_id into v_struct_id from medecins_prescripteurs where id = p_id_1;
  else
    raise exception 'Cible invalide : %', p_cible;
  end if;

  if v_struct_id is null then
    raise exception 'Entité introuvable';
  end if;

  v_low := least(p_id_1, p_id_2);
  v_high := greatest(p_id_1, p_id_2);

  insert into doublons_ignores (structure_id, cible, entity_id_1, entity_id_2, raison, ignore_par)
  values (v_struct_id, p_cible, v_low, v_high, p_raison, auth.uid())
  on conflict (structure_id, cible, entity_id_1, entity_id_2) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function ignorer_doublon to authenticated;

-- ============================================================
-- 8) RPC : stats des doublons détectés
-- ============================================================

create or replace function doublons_stats(
  p_seuil_etab numeric default 0.55,
  p_seuil_grp numeric default 0.6,
  p_seuil_med numeric default 0.6
) returns table (
  nb_doublons_etablissements bigint,
  nb_doublons_groupements bigint,
  nb_doublons_medecins bigint,
  nb_ignores bigint,
  total bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from detecter_doublons_etablissements(p_seuil_etab, 9999)) as nb_doublons_etablissements,
    (select count(*) from detecter_doublons_groupements(p_seuil_grp, 9999)) as nb_doublons_groupements,
    (select count(*) from detecter_doublons_medecins(p_seuil_med, 9999)) as nb_doublons_medecins,
    (select count(*) from doublons_ignores
      where structure_id in (select structure_id from membres_structure where user_id = auth.uid())) as nb_ignores,
    (select
      (select count(*) from detecter_doublons_etablissements(p_seuil_etab, 9999)) +
      (select count(*) from detecter_doublons_groupements(p_seuil_grp, 9999)) +
      (select count(*) from detecter_doublons_medecins(p_seuil_med, 9999))
    ) as total;
$$;

grant execute on function doublons_stats to authenticated;

-- Fin du patch 0.56.7
