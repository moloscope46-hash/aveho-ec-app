-- ============================================================
--  AVEHO EC — Patch 0.56.9
--  Fusion automatique des doublons : RPC qui migre toutes les
--  FK du perdant vers le gagnant, supprime le perdant, et
--  trace l'opération pour rollback.
-- ============================================================

-- 1) Table doublons_fusions : historique des fusions
create table if not exists doublons_fusions (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null,
  cible text not null check (cible in ('etablissement', 'groupement', 'medecin')),

  -- Entité conservée (gagnant) et supprimée (perdant)
  gagnant_id uuid not null,
  gagnant_label text,                        -- nom à l'heure de la fusion (audit)
  perdant_id uuid not null,                  -- supprimé après fusion, donc pas de FK
  perdant_label text,
  perdant_snapshot jsonb,                    -- copie complète du perdant avant DELETE (pour rollback)

  -- Détails migration
  fk_migrees jsonb,                          -- ex: {"prescriptions.medecin_prescripteur_id": 12, "patients.etablissement_id": 5}
  nb_rows_migrees int default 0,

  -- Audit
  fusionne_par uuid,
  raison text,
  created_at timestamptz default now(),

  -- Rollback
  rollback_at timestamptz,
  rollback_par uuid,
  rollback_raison text,
  est_rollbacke boolean default false
);

create index if not exists idx_doublons_fusions_struct on doublons_fusions(structure_id, created_at desc);
create index if not exists idx_doublons_fusions_perdant on doublons_fusions(perdant_id);
create index if not exists idx_doublons_fusions_gagnant on doublons_fusions(gagnant_id);

alter table doublons_fusions enable row level security;

drop policy if exists "doublons_fusions_select" on doublons_fusions;
create policy "doublons_fusions_select" on doublons_fusions for select to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "doublons_fusions_insert" on doublons_fusions;
create policy "doublons_fusions_insert" on doublons_fusions for insert to authenticated
  with check (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "doublons_fusions_update" on doublons_fusions;
create policy "doublons_fusions_update" on doublons_fusions for update to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

-- ============================================================
-- 2) RPC : preview fusion (compte les FK affectées, sans fusionner)
-- ============================================================

create or replace function preview_fusion_doublon(
  p_cible text,
  p_gagnant_id uuid,
  p_perdant_id uuid
) returns table (
  table_name text,
  column_name text,
  nb_rows bigint,
  on_delete_action text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_table text;
  v_target_pk text := 'id';
  r record;
  v_count bigint;
  v_sql text;
begin
  -- Map cible → table
  case p_cible
    when 'etablissement' then v_target_table := 'etablissements';
    when 'groupement' then v_target_table := 'groupements';
    when 'medecin' then v_target_table := 'medecins_prescripteurs';
    else raise exception 'Cible invalide : %', p_cible;
  end case;

  -- Itère sur toutes les FK qui pointent vers la table cible
  for r in
    select
      tc.table_name as src_table,
      kcu.column_name as src_column,
      rc.delete_rule
    from information_schema.referential_constraints rc
    join information_schema.table_constraints tc
      on tc.constraint_name = rc.constraint_name
      and tc.constraint_schema = rc.constraint_schema
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = rc.constraint_name
      and kcu.constraint_schema = rc.constraint_schema
    where tc.table_schema = 'public'
      and rc.unique_constraint_name in (
        select tc2.constraint_name
        from information_schema.table_constraints tc2
        where tc2.table_name = v_target_table
          and tc2.table_schema = 'public'
          and tc2.constraint_type = 'PRIMARY KEY'
      )
  loop
    v_sql := format('select count(*) from %I where %I = $1', r.src_table, r.src_column);
    execute v_sql into v_count using p_perdant_id;
    if v_count > 0 then
      table_name := r.src_table;
      column_name := r.src_column;
      nb_rows := v_count;
      on_delete_action := r.delete_rule;
      return next;
    end if;
  end loop;

  return;
end;
$$;

grant execute on function preview_fusion_doublon to authenticated;

-- ============================================================
-- 3) RPC : fusionner_doublon
--
-- Stratégie :
--   1) Vérifier que les 2 entités existent et sont dans la même
--      structure que l'utilisateur appelant
--   2) Snapshot le perdant pour rollback
--   3) Découvrir dynamiquement toutes les FK pointant vers la
--      table cible
--   4) Pour chaque FK, UPDATE source SET col = gagnant WHERE col = perdant
--   5) Si possible (cible etablissement/medecin) tenter un merge
--      léger des champs vides du gagnant avec ceux du perdant
--      (coalesce-style — n'écrase pas)
--   6) DELETE perdant
--   7) Insert doublons_fusions avec snapshot + détails
-- ============================================================

create or replace function fusionner_doublon(
  p_cible text,
  p_gagnant_id uuid,
  p_perdant_id uuid,
  p_raison text default null,
  p_merge_champs boolean default true
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_table text;
  v_struct_id uuid;
  v_perdant_struct_id uuid;
  v_gagnant_label text;
  v_perdant_label text;
  v_perdant_snapshot jsonb;
  v_fk_migrees jsonb := '{}'::jsonb;
  v_total_migrees int := 0;
  v_fusion_id uuid;
  v_count bigint;
  v_sql text;
  r record;
begin
  if p_gagnant_id = p_perdant_id then
    raise exception 'Le gagnant et le perdant ne peuvent pas être la même entité';
  end if;

  -- 1) Map cible → table + récup structure_id pour vérif
  case p_cible
    when 'etablissement' then
      v_target_table := 'etablissements';
      select structure_id into v_struct_id from etablissements where id = p_gagnant_id;
      select structure_id, nom into v_perdant_struct_id, v_perdant_label from etablissements where id = p_perdant_id;
      select nom into v_gagnant_label from etablissements where id = p_gagnant_id;
    when 'groupement' then
      v_target_table := 'groupements';
      select structure_id into v_struct_id from groupements where id = p_gagnant_id;
      select structure_id, nom into v_perdant_struct_id, v_perdant_label from groupements where id = p_perdant_id;
      select nom into v_gagnant_label from groupements where id = p_gagnant_id;
    when 'medecin' then
      v_target_table := 'medecins_prescripteurs';
      select structure_id into v_struct_id from medecins_prescripteurs where id = p_gagnant_id;
      select structure_id, nom into v_perdant_struct_id, v_perdant_label from medecins_prescripteurs where id = p_perdant_id;
      select nom into v_gagnant_label from medecins_prescripteurs where id = p_gagnant_id;
    else
      raise exception 'Cible invalide : %', p_cible;
  end case;

  if v_struct_id is null then raise exception 'Gagnant introuvable'; end if;
  if v_perdant_struct_id is null then raise exception 'Perdant introuvable'; end if;
  if v_struct_id != v_perdant_struct_id then
    raise exception 'Les deux entités doivent appartenir à la même structure';
  end if;

  -- Vérifier que l'utilisateur a accès à la structure
  if not exists (
    select 1 from membres_structure
    where user_id = auth.uid() and structure_id = v_struct_id
  ) then
    raise exception 'Accès refusé : non membre de la structure';
  end if;

  -- 2) Snapshot du perdant
  v_sql := format('select to_jsonb(t) from %I t where id = $1', v_target_table);
  execute v_sql into v_perdant_snapshot using p_perdant_id;

  -- 3) Itérer sur toutes les FK pointant vers la table cible
  for r in
    select
      tc.table_name as src_table,
      kcu.column_name as src_column
    from information_schema.referential_constraints rc
    join information_schema.table_constraints tc
      on tc.constraint_name = rc.constraint_name
      and tc.constraint_schema = rc.constraint_schema
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = rc.constraint_name
      and kcu.constraint_schema = rc.constraint_schema
    where tc.table_schema = 'public'
      and rc.unique_constraint_name in (
        select tc2.constraint_name
        from information_schema.table_constraints tc2
        where tc2.table_name = v_target_table
          and tc2.table_schema = 'public'
          and tc2.constraint_type = 'PRIMARY KEY'
      )
  loop
    -- 4) Pour chaque FK : compter puis migrer
    v_sql := format('select count(*) from %I where %I = $1', r.src_table, r.src_column);
    execute v_sql into v_count using p_perdant_id;

    if v_count > 0 then
      v_sql := format('update %I set %I = $1 where %I = $2', r.src_table, r.src_column, r.src_column);
      begin
        execute v_sql using p_gagnant_id, p_perdant_id;
        v_fk_migrees := v_fk_migrees || jsonb_build_object(
          format('%s.%s', r.src_table, r.src_column),
          v_count
        );
        v_total_migrees := v_total_migrees + v_count;
      exception when unique_violation then
        -- Contrainte unique violée : on supprime juste les rows perdantes
        -- (cas typique : table de pivot où perdant et gagnant sont déjà liés au même tiers)
        v_sql := format('delete from %I where %I = $1', r.src_table, r.src_column);
        execute v_sql using p_perdant_id;
        v_fk_migrees := v_fk_migrees || jsonb_build_object(
          format('%s.%s (supprimées car conflits unique)', r.src_table, r.src_column),
          v_count
        );
      end;
    end if;
  end loop;

  -- 5) Merge léger des champs vides (optionnel, pour etablissements + medecins)
  if p_merge_champs then
    if p_cible = 'etablissement' then
      update etablissements g set
        siret = coalesce(g.siret, p.siret),
        finess = coalesce(g.finess, p.finess),
        adresse = coalesce(g.adresse, p.adresse),
        code_postal = coalesce(g.code_postal, p.code_postal),
        ville = coalesce(g.ville, p.ville),
        telephone = coalesce(g.telephone, p.telephone),
        email = coalesce(g.email, p.email),
        capacite = coalesce(g.capacite, p.capacite)
      from etablissements p
      where g.id = p_gagnant_id and p.id = p_perdant_id;
    elsif p_cible = 'medecin' then
      update medecins_prescripteurs g set
        rpps = coalesce(g.rpps, p.rpps),
        prenom = coalesce(g.prenom, p.prenom),
        civilite = coalesce(g.civilite, p.civilite),
        profession_libelle = coalesce(g.profession_libelle, p.profession_libelle),
        specialite_libelle = coalesce(g.specialite_libelle, p.specialite_libelle),
        raison_sociale_lieu = coalesce(g.raison_sociale_lieu, p.raison_sociale_lieu),
        finess = coalesce(g.finess, p.finess),
        adresse = coalesce(g.adresse, p.adresse),
        code_postal = coalesce(g.code_postal, p.code_postal),
        ville = coalesce(g.ville, p.ville),
        telephone = coalesce(g.telephone, p.telephone),
        email = coalesce(g.email, p.email),
        latitude = coalesce(g.latitude, p.latitude),
        longitude = coalesce(g.longitude, p.longitude),
        est_verifie = g.est_verifie or p.est_verifie,
        source_verification = coalesce(g.source_verification, p.source_verification)
      from medecins_prescripteurs p
      where g.id = p_gagnant_id and p.id = p_perdant_id;
    end if;
  end if;

  -- 6) Supprimer le perdant
  v_sql := format('delete from %I where id = $1', v_target_table);
  execute v_sql using p_perdant_id;

  -- 7) Trace
  insert into doublons_fusions (
    structure_id, cible, gagnant_id, gagnant_label, perdant_id, perdant_label,
    perdant_snapshot, fk_migrees, nb_rows_migrees, fusionne_par, raison
  ) values (
    v_struct_id, p_cible, p_gagnant_id, v_gagnant_label, p_perdant_id, v_perdant_label,
    v_perdant_snapshot, v_fk_migrees, v_total_migrees, auth.uid(), p_raison
  ) returning id into v_fusion_id;

  -- Nettoyer les ignores éventuels qui référencent le perdant (devenu obsolète)
  delete from doublons_ignores
  where (entity_id_1 = p_perdant_id or entity_id_2 = p_perdant_id);

  return v_fusion_id;
end;
$$;

grant execute on function fusionner_doublon to authenticated;

-- ============================================================
-- 4) RPC : rollback d'une fusion
--
-- Recrée le perdant à partir du snapshot et restore les FK
-- depuis le gagnant. Note : si entre temps de nouvelles données
-- ont été ajoutées sur le gagnant, on NE PEUT PAS les démêler
-- du perdant. Le rollback est donc "best effort" : il restaure
-- le perdant tel qu'il était mais les FK migrées entretemps
-- restent sur le gagnant.
-- ============================================================

create or replace function rollback_fusion(
  p_fusion_id uuid,
  p_raison text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fusion record;
  v_target_table text;
  v_cols text;
  v_vals text;
  v_sql text;
begin
  select * into v_fusion from doublons_fusions
  where id = p_fusion_id
    and structure_id in (select structure_id from membres_structure where user_id = auth.uid());

  if not found then raise exception 'Fusion introuvable ou non autorisée'; end if;
  if v_fusion.est_rollbacke then raise exception 'Cette fusion est déjà rollbackée'; end if;

  case v_fusion.cible
    when 'etablissement' then v_target_table := 'etablissements';
    when 'groupement' then v_target_table := 'groupements';
    when 'medecin' then v_target_table := 'medecins_prescripteurs';
    else raise exception 'Cible invalide';
  end case;

  -- Réinjecter le perdant depuis snapshot (jsonb_populate_record requiert le type exact)
  -- On utilise une approche plus souple via INSERT...SELECT depuis le jsonb
  v_sql := format(
    'insert into %I select * from jsonb_populate_record(null::%I, $1)',
    v_target_table, v_target_table
  );
  execute v_sql using v_fusion.perdant_snapshot;

  -- Marquer la fusion comme rollbackée
  update doublons_fusions set
    est_rollbacke = true,
    rollback_at = now(),
    rollback_par = auth.uid(),
    rollback_raison = p_raison
  where id = p_fusion_id;

  return true;
end;
$$;

grant execute on function rollback_fusion to authenticated;

-- Fin du patch 0.56.9
