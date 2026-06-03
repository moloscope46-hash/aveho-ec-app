-- ============================================================
--  AVEHO EC — Patch 0.56.8
--  Prescriptions archive : stats agrégées + index pour recherche
--  multi-critères + RPC top médicaments/médecins.
-- ============================================================

-- 1) Index supplémentaires pour la recherche multi-critères
create index if not exists idx_prescriptions_struct_date
  on prescriptions(structure_id, date_prescription desc)
  where statut = 'active';

create index if not exists idx_prescriptions_type
  on prescriptions(type_prescription)
  where statut = 'active';

create index if not exists idx_prescriptions_source
  on prescriptions(source_creation);

-- Trigram pour recherche fuzzy sur nom prescripteur (sans accent, casse)
create index if not exists idx_prescriptions_prescripteur_trgm
  on prescriptions using gin (lower(prescripteur_nom) gin_trgm_ops)
  where prescripteur_nom is not null;

-- Trigram sur nom médicament (recherche dans les lignes)
create index if not exists idx_prescriptions_lignes_medicament_trgm
  on prescriptions_lignes using gin (lower(medicament_nom) gin_trgm_ops);

create index if not exists idx_prescriptions_lignes_dci_trgm
  on prescriptions_lignes using gin (lower(medicament_dci) gin_trgm_ops)
  where medicament_dci is not null;

-- ============================================================
-- 2) RPC : Stats archive prescriptions (dashboard)
-- ============================================================

create or replace function prescriptions_archive_stats(
  p_date_debut date default null,
  p_date_fin date default null
) returns table (
  total_prescriptions bigint,
  total_actives bigint,
  total_archivees bigint,
  total_annulees bigint,
  total_lignes bigint,
  total_medicaments_uniques bigint,
  total_prescripteurs_uniques bigint,
  total_patients_uniques bigint,
  prescriptions_ocr bigint,
  prescriptions_manuelles bigint,
  rpps_verifies bigint,
  premier_date date,
  dernier_date date,
  tokens_total_in bigint,
  tokens_total_out bigint
)
language sql
security definer
set search_path = public
as $$
  with mes_prescriptions as (
    select * from prescriptions
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
      and (p_date_debut is null or date_prescription >= p_date_debut)
      and (p_date_fin is null or date_prescription <= p_date_fin)
  ),
  mes_lignes as (
    select l.* from prescriptions_lignes l
    join mes_prescriptions p on l.prescription_id = p.id
  )
  select
    (select count(*) from mes_prescriptions) as total_prescriptions,
    (select count(*) from mes_prescriptions where statut = 'active') as total_actives,
    (select count(*) from mes_prescriptions where statut = 'archivee') as total_archivees,
    (select count(*) from mes_prescriptions where statut = 'annulee') as total_annulees,
    (select count(*) from mes_lignes) as total_lignes,
    (select count(distinct lower(coalesce(medicament_dci, medicament_nom))) from mes_lignes) as total_medicaments_uniques,
    (select count(distinct coalesce(prescripteur_rpps, lower(prescripteur_nom))) from mes_prescriptions where prescripteur_nom is not null) as total_prescripteurs_uniques,
    (select count(distinct patient_id) from mes_prescriptions) as total_patients_uniques,
    (select count(*) from mes_prescriptions where source_creation = 'ocr') as prescriptions_ocr,
    (select count(*) from mes_prescriptions where source_creation = 'manuelle') as prescriptions_manuelles,
    (select count(*) from mes_prescriptions where rpps_verifie = true) as rpps_verifies,
    (select min(date_prescription) from mes_prescriptions) as premier_date,
    (select max(date_prescription) from mes_prescriptions) as dernier_date,
    (select coalesce(sum(ocr_tokens_in), 0) from mes_prescriptions) as tokens_total_in,
    (select coalesce(sum(ocr_tokens_out), 0) from mes_prescriptions) as tokens_total_out;
$$;

grant execute on function prescriptions_archive_stats to authenticated;

-- ============================================================
-- 3) RPC : Top N médicaments (DCI préférée, sinon nom commercial)
-- ============================================================

create or replace function prescriptions_top_medicaments(
  p_limit int default 20,
  p_date_debut date default null,
  p_date_fin date default null
) returns table (
  medicament text,
  est_dci boolean,
  nb_prescriptions bigint,
  nb_patients_uniques bigint,
  nb_prescripteurs_uniques bigint
)
language sql
security definer
set search_path = public
as $$
  with mes_lignes as (
    select
      l.*,
      p.patient_id,
      p.prescripteur_rpps,
      p.prescripteur_nom,
      p.date_prescription,
      p.structure_id
    from prescriptions_lignes l
    join prescriptions p on l.prescription_id = p.id
    where p.structure_id in (select structure_id from membres_structure where user_id = auth.uid())
      and (p_date_debut is null or p.date_prescription >= p_date_debut)
      and (p_date_fin is null or p.date_prescription <= p_date_fin)
  )
  select
    coalesce(upper(medicament_dci), upper(medicament_nom)) as medicament,
    (medicament_dci is not null) as est_dci,
    count(*) as nb_prescriptions,
    count(distinct patient_id) as nb_patients_uniques,
    count(distinct coalesce(prescripteur_rpps, lower(prescripteur_nom))) as nb_prescripteurs_uniques
  from mes_lignes
  where medicament_nom is not null
  group by 1, 2
  order by nb_prescriptions desc
  limit p_limit;
$$;

grant execute on function prescriptions_top_medicaments to authenticated;

-- ============================================================
-- 4) RPC : Top N prescripteurs
-- ============================================================

create or replace function prescriptions_top_prescripteurs(
  p_limit int default 20,
  p_date_debut date default null,
  p_date_fin date default null
) returns table (
  prescripteur_nom text,
  prescripteur_prenom text,
  prescripteur_rpps text,
  prescripteur_specialite text,
  medecin_id uuid,
  rpps_verifie boolean,
  nb_prescriptions bigint,
  nb_patients_uniques bigint,
  nb_lignes bigint,
  premiere_date date,
  derniere_date date
)
language sql
security definer
set search_path = public
as $$
  with mes_prescriptions as (
    select * from prescriptions
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
      and (p_date_debut is null or date_prescription >= p_date_debut)
      and (p_date_fin is null or date_prescription <= p_date_fin)
      and prescripteur_nom is not null
  ),
  agreg as (
    select
      lower(prescripteur_nom) as nom_key,
      prescripteur_nom as nom_orig,
      count(*) as nb_p,
      count(distinct patient_id) as nb_pat,
      coalesce(sum((select count(*) from prescriptions_lignes l where l.prescription_id = mes_prescriptions.id)), 0)::bigint as nb_l,
      bool_or(rpps_verifie) as verifie,
      min(date_prescription) as date_min,
      max(date_prescription) as date_max
    from mes_prescriptions
    group by lower(prescripteur_nom), prescripteur_nom
  )
  select
    a.nom_orig as prescripteur_nom,
    -- Prendre prénom/rpps/spé/medecin_id depuis la prescription la plus récente
    (select prescripteur_prenom from mes_prescriptions
      where lower(prescripteur_nom) = a.nom_key and prescripteur_prenom is not null
      order by date_prescription desc nulls last limit 1) as prescripteur_prenom,
    (select prescripteur_rpps from mes_prescriptions
      where lower(prescripteur_nom) = a.nom_key and prescripteur_rpps is not null
      order by date_prescription desc nulls last limit 1) as prescripteur_rpps,
    (select prescripteur_specialite from mes_prescriptions
      where lower(prescripteur_nom) = a.nom_key and prescripteur_specialite is not null
      order by date_prescription desc nulls last limit 1) as prescripteur_specialite,
    (select medecin_prescripteur_id from mes_prescriptions
      where lower(prescripteur_nom) = a.nom_key and medecin_prescripteur_id is not null
      order by date_prescription desc nulls last limit 1) as medecin_id,
    a.verifie as rpps_verifie,
    a.nb_p as nb_prescriptions,
    a.nb_pat as nb_patients_uniques,
    a.nb_l as nb_lignes,
    a.date_min as premiere_date,
    a.date_max as derniere_date
  from agreg a
  order by a.nb_p desc
  limit p_limit;
$$;

grant execute on function prescriptions_top_prescripteurs to authenticated;

-- ============================================================
-- 5) RPC : Histogramme prescriptions par mois
-- ============================================================

create or replace function prescriptions_par_mois(
  p_mois_count int default 12
) returns table (
  mois date,
  nb_prescriptions bigint,
  nb_lignes bigint,
  nb_patients_uniques bigint,
  nb_ocr bigint
)
language sql
security definer
set search_path = public
as $$
  with bornes as (
    select date_trunc('month', current_date)::date - (p_mois_count - 1) * interval '1 month' as min_mois
  ),
  mois_serie as (
    select generate_series(
      (select min_mois from bornes),
      date_trunc('month', current_date)::date,
      interval '1 month'
    )::date as mois
  ),
  mes_prescriptions as (
    select * from prescriptions
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
      and date_prescription >= (select min_mois from bornes)
  )
  select
    ms.mois,
    count(p.*)::bigint as nb_prescriptions,
    coalesce(
      (select count(*) from prescriptions_lignes l
       join mes_prescriptions p2 on l.prescription_id = p2.id
       where date_trunc('month', p2.date_prescription)::date = ms.mois),
      0
    )::bigint as nb_lignes,
    count(distinct p.patient_id)::bigint as nb_patients_uniques,
    count(p.*) filter (where p.source_creation = 'ocr')::bigint as nb_ocr
  from mois_serie ms
  left join mes_prescriptions p
    on date_trunc('month', p.date_prescription)::date = ms.mois
  group by ms.mois
  order by ms.mois;
$$;

grant execute on function prescriptions_par_mois to authenticated;

-- Fin du patch 0.56.8
