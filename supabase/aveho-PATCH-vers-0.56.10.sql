-- ============================================================
--  AVEHO EC — Patch 0.56.10
--  Dashboard patient : RPC agrégées pour la vue d'ensemble
--  santé (prescriptions, médecins, ALD, échéances droits).
-- ============================================================

-- ============================================================
-- 1) RPC patient_dashboard_summary
-- Vue d'ensemble : compteurs + dernière activité
-- ============================================================

create or replace function patient_dashboard_summary(p_patient_id uuid)
returns table (
  total_prescriptions bigint,
  prescriptions_actives bigint,
  total_medicaments bigint,
  medicaments_uniques bigint,
  total_medecins bigint,
  derniere_prescription_date date,
  prescription_renouvelable_count bigint,
  est_ald boolean,
  ald_commentaire text,
  est_c2s boolean,
  est_ame boolean,
  tiers_payant_actif boolean,
  droits_secu_fin date,
  droits_mutuelle_fin date,
  jours_avant_fin_secu int,
  jours_avant_fin_mutuelle int,
  caisse_nom text,
  caisse_type text,
  mutuelle_nom text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient record;
  v_struct_id uuid;
begin
  -- Vérifier accès
  select * into v_patient from patients where id = p_patient_id;
  if not found then raise exception 'Patient introuvable'; end if;
  v_struct_id := v_patient.structure_id;

  if not exists (
    select 1 from membres_structure where user_id = auth.uid() and structure_id = v_struct_id
  ) then
    raise exception 'Accès refusé';
  end if;

  return query
    with prescriptions_p as (
      select * from prescriptions where patient_id = p_patient_id
    ),
    lignes_p as (
      select l.* from prescriptions_lignes l
      join prescriptions_p p on l.prescription_id = p.id
    )
  select
    (select count(*) from prescriptions_p) as total_prescriptions,
    (select count(*) from prescriptions_p where statut = 'active') as prescriptions_actives,
    (select count(*) from lignes_p) as total_medicaments,
    (select count(distinct lower(coalesce(medicament_dci, medicament_nom))) from lignes_p) as medicaments_uniques,
    (select count(distinct coalesce(prescripteur_rpps, lower(prescripteur_nom))) from prescriptions_p where prescripteur_nom is not null) as total_medecins,
    (select max(date_prescription) from prescriptions_p) as derniere_prescription_date,
    (select count(*) from prescriptions_p where est_renouvelable = true and statut = 'active') as prescription_renouvelable_count,
    v_patient.ald as est_ald,
    v_patient.ald_commentaire as ald_commentaire,
    v_patient.c2s as est_c2s,
    v_patient.ame as est_ame,
    coalesce(v_patient.tiers_payant_actif, false) as tiers_payant_actif,
    v_patient.date_fin_droits as droits_secu_fin,
    v_patient.mutuelle_date_fin_droits as droits_mutuelle_fin,
    case when v_patient.date_fin_droits is not null
      then (v_patient.date_fin_droits - current_date)::int
      else null end as jours_avant_fin_secu,
    case when v_patient.mutuelle_date_fin_droits is not null
      then (v_patient.mutuelle_date_fin_droits - current_date)::int
      else null end as jours_avant_fin_mutuelle,
    (select nom from caisses_assurance_maladie where id = v_patient.caisse_id) as caisse_nom,
    (select type from caisses_assurance_maladie where id = v_patient.caisse_id) as caisse_type,
    (select nom from mutuelles where id = v_patient.mutuelle_id) as mutuelle_nom;
end;
$$;

grant execute on function patient_dashboard_summary to authenticated;

-- ============================================================
-- 2) RPC patient_dashboard_medicaments_actifs
-- Liste des médicaments actuellement prescrits (statut active),
-- agrégés par DCI/nom commercial avec dernière prescription.
-- ============================================================

create or replace function patient_dashboard_medicaments_actifs(p_patient_id uuid)
returns table (
  medicament text,
  medicament_dci text,
  est_dci_fournie boolean,
  forme text,
  derniere_dosage text,
  derniere_posologie text,
  derniere_date date,
  nb_prescriptions bigint,
  est_renouvelable boolean,
  commentaire text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_struct_id uuid;
begin
  select structure_id into v_struct_id from patients where id = p_patient_id;
  if v_struct_id is null then raise exception 'Patient introuvable'; end if;
  if not exists (
    select 1 from membres_structure where user_id = auth.uid() and structure_id = v_struct_id
  ) then raise exception 'Accès refusé'; end if;

  return query
    with lignes_p as (
      select l.*, p.date_prescription, p.est_renouvelable as p_renouvelable, p.statut
      from prescriptions_lignes l
      join prescriptions p on l.prescription_id = p.id
      where p.patient_id = p_patient_id and p.statut = 'active'
    ),
    ranked as (
      select
        coalesce(upper(medicament_dci), upper(medicament_nom)) as med_key,
        upper(medicament_nom) as nom_commercial,
        medicament_dci as dci,
        forme,
        dosage,
        posologie_libre,
        date_prescription,
        p_renouvelable,
        commentaire,
        row_number() over (
          partition by coalesce(upper(medicament_dci), upper(medicament_nom))
          order by date_prescription desc nulls last
        ) as rn,
        count(*) over (partition by coalesce(upper(medicament_dci), upper(medicament_nom))) as nb
      from lignes_p
      where medicament_nom is not null
    )
  select
    coalesce(dci, nom_commercial) as medicament,
    dci as medicament_dci,
    (dci is not null) as est_dci_fournie,
    forme,
    dosage as derniere_dosage,
    posologie_libre as derniere_posologie,
    date_prescription as derniere_date,
    nb as nb_prescriptions,
    p_renouvelable as est_renouvelable,
    commentaire
  from ranked
  where rn = 1
  order by date_prescription desc nulls last;
end;
$$;

grant execute on function patient_dashboard_medicaments_actifs to authenticated;

-- ============================================================
-- 3) RPC patient_dashboard_medecins_traitants
-- Liste agrégée des médecins qui ont prescrit pour ce patient
-- ============================================================

create or replace function patient_dashboard_medecins(p_patient_id uuid)
returns table (
  medecin_id uuid,
  nom text,
  prenom text,
  rpps text,
  specialite text,
  ville text,
  telephone text,
  email text,
  est_verifie boolean,
  nb_prescriptions bigint,
  premiere_date date,
  derniere_date date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_struct_id uuid;
begin
  select structure_id into v_struct_id from patients where id = p_patient_id;
  if v_struct_id is null then raise exception 'Patient introuvable'; end if;
  if not exists (
    select 1 from membres_structure where user_id = auth.uid() and structure_id = v_struct_id
  ) then raise exception 'Accès refusé'; end if;

  return query
    with mes_p as (
      select * from prescriptions
      where patient_id = p_patient_id and prescripteur_nom is not null
    ),
    -- Agrégation : groupe par nom case-insensitive, prend les valeurs
    -- les plus récentes (via subquery par date_prescription desc)
    agreg as (
      select
        lower(prescripteur_nom) as nom_key,
        prescripteur_nom as nom_orig,
        count(*) as nb_p,
        min(date_prescription) as date_min,
        max(date_prescription) as date_max,
        bool_or(rpps_verifie) as verifie
      from mes_p
      group by lower(prescripteur_nom), prescripteur_nom
    )
  select
    -- Récupère l'UUID le plus récent via DISTINCT ON par date desc
    (select medecin_prescripteur_id from mes_p mp
      where lower(mp.prescripteur_nom) = a.nom_key
        and mp.medecin_prescripteur_id is not null
      order by mp.date_prescription desc nulls last limit 1) as medecin_id,
    a.nom_orig as nom,
    (select prescripteur_prenom from mes_p mp
      where lower(mp.prescripteur_nom) = a.nom_key
        and prescripteur_prenom is not null
      order by date_prescription desc nulls last limit 1) as prenom,
    (select prescripteur_rpps from mes_p mp
      where lower(mp.prescripteur_nom) = a.nom_key
        and prescripteur_rpps is not null
      order by date_prescription desc nulls last limit 1) as rpps,
    (select prescripteur_specialite from mes_p mp
      where lower(mp.prescripteur_nom) = a.nom_key
        and prescripteur_specialite is not null
      order by date_prescription desc nulls last limit 1) as specialite,
    -- Ville/tel/email depuis medecins_prescripteurs si lié
    (select m.ville from medecins_prescripteurs m
      where m.id = (
        select medecin_prescripteur_id from mes_p mp2
        where lower(mp2.prescripteur_nom) = a.nom_key
          and mp2.medecin_prescripteur_id is not null
        order by mp2.date_prescription desc nulls last limit 1
      ) limit 1) as ville,
    (select m.telephone from medecins_prescripteurs m
      where m.id = (
        select medecin_prescripteur_id from mes_p mp2
        where lower(mp2.prescripteur_nom) = a.nom_key
          and mp2.medecin_prescripteur_id is not null
        order by mp2.date_prescription desc nulls last limit 1
      ) limit 1) as telephone,
    (select m.email from medecins_prescripteurs m
      where m.id = (
        select medecin_prescripteur_id from mes_p mp2
        where lower(mp2.prescripteur_nom) = a.nom_key
          and mp2.medecin_prescripteur_id is not null
        order by mp2.date_prescription desc nulls last limit 1
      ) limit 1) as email,
    a.verifie as est_verifie,
    a.nb_p as nb_prescriptions,
    a.date_min as premiere_date,
    a.date_max as derniere_date
  from agreg a
  order by a.date_max desc nulls last, a.nom_orig;
end;
$$;

grant execute on function patient_dashboard_medecins to authenticated;

-- ============================================================
-- 4) RPC patient_dashboard_alertes
-- Génère des alertes contextuelles pour ce patient
-- (droits qui expirent, prescriptions à renouveler, etc.)
-- ============================================================

create or replace function patient_dashboard_alertes(p_patient_id uuid)
returns table (
  type_alerte text,    -- 'expiration_secu' / 'expiration_mutuelle' / 'renouvellement' / 'ald_sans_commentaire' / 'no_caisse'
  severite text,       -- 'info' / 'warning' / 'critique'
  message text,
  jours_restants int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient record;
  v_struct_id uuid;
  v_today date := current_date;
begin
  select * into v_patient from patients where id = p_patient_id;
  if not found then raise exception 'Patient introuvable'; end if;
  v_struct_id := v_patient.structure_id;
  if not exists (
    select 1 from membres_structure where user_id = auth.uid() and structure_id = v_struct_id
  ) then raise exception 'Accès refusé'; end if;

  -- Droits sécu expirent dans <= 30 jours
  if v_patient.date_fin_droits is not null then
    if v_patient.date_fin_droits < v_today then
      return query select
        'expiration_secu'::text, 'critique'::text,
        format('Droits sécu expirés depuis %s jour(s)', v_today - v_patient.date_fin_droits)::text,
        (v_patient.date_fin_droits - v_today)::int;
    elsif v_patient.date_fin_droits - v_today <= 30 then
      return query select
        'expiration_secu'::text, 'warning'::text,
        format('Droits sécu expirent dans %s jour(s)', v_patient.date_fin_droits - v_today)::text,
        (v_patient.date_fin_droits - v_today)::int;
    end if;
  end if;

  -- Droits mutuelle expirent dans <= 30 jours
  if v_patient.mutuelle_date_fin_droits is not null then
    if v_patient.mutuelle_date_fin_droits < v_today then
      return query select
        'expiration_mutuelle'::text, 'critique'::text,
        format('Droits mutuelle expirés depuis %s jour(s)', v_today - v_patient.mutuelle_date_fin_droits)::text,
        (v_patient.mutuelle_date_fin_droits - v_today)::int;
    elsif v_patient.mutuelle_date_fin_droits - v_today <= 30 then
      return query select
        'expiration_mutuelle'::text, 'warning'::text,
        format('Droits mutuelle expirent dans %s jour(s)', v_patient.mutuelle_date_fin_droits - v_today)::text,
        (v_patient.mutuelle_date_fin_droits - v_today)::int;
    end if;
  end if;

  -- ALD sans commentaire
  if v_patient.ald = true and (v_patient.ald_commentaire is null or trim(v_patient.ald_commentaire) = '') then
    return query select
      'ald_sans_commentaire'::text, 'info'::text,
      'Patient en ALD mais pas de diagnostic/n° d''exonération renseigné'::text,
      null::int;
  end if;

  -- Pas de caisse rattachée
  if v_patient.caisse_id is null then
    return query select
      'no_caisse'::text, 'warning'::text,
      'Aucune caisse d''affiliation renseignée'::text,
      null::int;
  end if;

  -- Prescriptions renouvelables actives non récentes (> 60 jours)
  return query
  select
    'renouvellement'::text as type_alerte,
    'info'::text as severite,
    format('Prescription du %s renouvelable mais ancienne (%s jours)',
      to_char(max(p.date_prescription), 'DD/MM/YYYY'),
      v_today - max(p.date_prescription)
    )::text as message,
    null::int as jours_restants
  from prescriptions p
  where p.patient_id = p_patient_id
    and p.statut = 'active'
    and p.est_renouvelable = true
    and p.date_prescription is not null
    and v_today - p.date_prescription > 60
  group by p.id
  limit 5;

  return;
end;
$$;

grant execute on function patient_dashboard_alertes to authenticated;

-- Fin du patch 0.56.10
