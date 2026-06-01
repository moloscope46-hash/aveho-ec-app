-- ============================================================
--  AVEHO EC — Patch 0.56.5
--  Table medecins_prescripteurs : cache local des médecins vus
--  via OCR ordonnance, avec vérification RPPS ANS/dump.
-- ============================================================

create table if not exists medecins_prescripteurs (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null,

  -- Identification
  rpps text,                              -- 11 chiffres (clé de lookup)
  nom text not null,
  prenom text,
  civilite text,                          -- M / Mme / Dr / Pr

  -- Profession
  profession_libelle text,                -- "Médecin", "Sage-femme"
  specialite_libelle text,                -- "Cardiologie", "Médecine générale"

  -- Lieu d'exercice
  raison_sociale_lieu text,
  finess text,
  adresse text,
  code_postal text,
  ville text,
  code_insee_commune text,
  telephone text,
  email text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),

  -- Vérification ANS / dump
  source_verification text,               -- 'ANS FHIR' / 'dump_local' / 'manuel' / null
  date_verification timestamptz,
  est_verifie boolean default false,

  -- Stats d'usage
  nb_prescriptions int default 0,
  premiere_prescription_date date,
  derniere_prescription_date date,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Contraintes : 1 médecin (RPPS, structure) unique
  constraint medecins_prescripteurs_rpps_struct_unique unique nulls not distinct (rpps, structure_id)
);

create index if not exists idx_medecins_prescripteurs_struct on medecins_prescripteurs(structure_id, nom);
create index if not exists idx_medecins_prescripteurs_rpps on medecins_prescripteurs(rpps) where rpps is not null;
create index if not exists idx_medecins_prescripteurs_specialite on medecins_prescripteurs(specialite_libelle) where specialite_libelle is not null;
create index if not exists idx_medecins_prescripteurs_nom_lower on medecins_prescripteurs(lower(nom));

-- ============================================================
-- Lien : prescription → medecin_prescripteur (optionnel)
-- ============================================================

alter table prescriptions
  add column if not exists medecin_prescripteur_id uuid references medecins_prescripteurs(id) on delete set null,
  add column if not exists rpps_verifie boolean default false,
  add column if not exists rpps_source_verification text;  -- ANS FHIR / dump_local / manuel

create index if not exists idx_prescriptions_medecin on prescriptions(medecin_prescripteur_id)
  where medecin_prescripteur_id is not null;

-- ============================================================
-- RLS
-- ============================================================

alter table medecins_prescripteurs enable row level security;

drop policy if exists "medecins_prescripteurs_select" on medecins_prescripteurs;
create policy "medecins_prescripteurs_select" on medecins_prescripteurs for select to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "medecins_prescripteurs_insert" on medecins_prescripteurs;
create policy "medecins_prescripteurs_insert" on medecins_prescripteurs for insert to authenticated
  with check (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "medecins_prescripteurs_update" on medecins_prescripteurs;
create policy "medecins_prescripteurs_update" on medecins_prescripteurs for update to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "medecins_prescripteurs_delete" on medecins_prescripteurs;
create policy "medecins_prescripteurs_delete" on medecins_prescripteurs for delete to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

-- ============================================================
-- Trigger : recalculer les stats de prescription à chaque insert/delete
-- ============================================================

create or replace function refresh_medecin_stats() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    update medecins_prescripteurs m set
      nb_prescriptions = (select count(*) from prescriptions where medecin_prescripteur_id = m.id),
      premiere_prescription_date = (select min(date_prescription) from prescriptions where medecin_prescripteur_id = m.id),
      derniere_prescription_date = (select max(date_prescription) from prescriptions where medecin_prescripteur_id = m.id),
      updated_at = now()
    where m.id = NEW.medecin_prescripteur_id;
  end if;
  if (TG_OP = 'DELETE') then
    update medecins_prescripteurs m set
      nb_prescriptions = (select count(*) from prescriptions where medecin_prescripteur_id = m.id),
      derniere_prescription_date = (select max(date_prescription) from prescriptions where medecin_prescripteur_id = m.id),
      updated_at = now()
    where m.id = OLD.medecin_prescripteur_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_prescriptions_refresh_medecin on prescriptions;
create trigger trg_prescriptions_refresh_medecin
  after insert or update or delete on prescriptions
  for each row execute function refresh_medecin_stats();

-- ============================================================
-- Fonction : upsert d'un médecin depuis OCR (recherche par RPPS sinon nom)
-- ============================================================

create or replace function upsert_medecin_from_ocr(
  p_structure_id uuid,
  p_rpps text default null,
  p_nom text default null,
  p_prenom text default null,
  p_civilite text default null,
  p_profession_libelle text default null,
  p_specialite_libelle text default null,
  p_raison_sociale_lieu text default null,
  p_finess text default null,
  p_adresse text default null,
  p_code_postal text default null,
  p_ville text default null,
  p_code_insee_commune text default null,
  p_telephone text default null,
  p_email text default null,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_source_verification text default null,
  p_est_verifie boolean default false
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_nom is null then
    raise exception 'p_nom est obligatoire';
  end if;

  -- Priorité 1 : recherche par RPPS exact (si fourni)
  if p_rpps is not null and length(trim(p_rpps)) >= 11 then
    select id into v_id from medecins_prescripteurs
      where rpps = p_rpps and structure_id = p_structure_id limit 1;
  end if;

  -- Priorité 2 : recherche par nom+prenom (case-insensitive) si pas trouvé par RPPS
  if v_id is null then
    select id into v_id from medecins_prescripteurs
      where structure_id = p_structure_id
        and lower(nom) = lower(p_nom)
        and (p_prenom is null or lower(coalesce(prenom, '')) = lower(p_prenom))
      limit 1;
  end if;

  if v_id is not null then
    -- UPDATE : on enrichit les champs vides avec les nouvelles valeurs (préfère existant)
    update medecins_prescripteurs set
      rpps = coalesce(rpps, p_rpps),
      prenom = coalesce(prenom, p_prenom),
      civilite = coalesce(civilite, p_civilite),
      profession_libelle = coalesce(profession_libelle, p_profession_libelle),
      specialite_libelle = coalesce(specialite_libelle, p_specialite_libelle),
      raison_sociale_lieu = coalesce(raison_sociale_lieu, p_raison_sociale_lieu),
      finess = coalesce(finess, p_finess),
      adresse = coalesce(adresse, p_adresse),
      code_postal = coalesce(code_postal, p_code_postal),
      ville = coalesce(ville, p_ville),
      code_insee_commune = coalesce(code_insee_commune, p_code_insee_commune),
      telephone = coalesce(telephone, p_telephone),
      email = coalesce(email, p_email),
      latitude = coalesce(latitude, p_latitude),
      longitude = coalesce(longitude, p_longitude),
      est_verifie = est_verifie or p_est_verifie,
      source_verification = case when p_est_verifie then p_source_verification else source_verification end,
      date_verification = case when p_est_verifie then now() else date_verification end,
      updated_at = now()
    where id = v_id;
  else
    -- INSERT nouveau
    insert into medecins_prescripteurs (
      structure_id, rpps, nom, prenom, civilite,
      profession_libelle, specialite_libelle,
      raison_sociale_lieu, finess,
      adresse, code_postal, ville, code_insee_commune,
      telephone, email, latitude, longitude,
      source_verification, est_verifie,
      date_verification
    ) values (
      p_structure_id, p_rpps, p_nom, p_prenom, p_civilite,
      p_profession_libelle, p_specialite_libelle,
      p_raison_sociale_lieu, p_finess,
      p_adresse, p_code_postal, p_ville, p_code_insee_commune,
      p_telephone, p_email, p_latitude, p_longitude,
      p_source_verification, p_est_verifie,
      case when p_est_verifie then now() else null end
    ) returning id into v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function upsert_medecin_from_ocr to authenticated;

-- ============================================================
-- RPC stats médecins
-- ============================================================

create or replace function medecins_stats() returns table (
  total_medecins bigint,
  verifies_ans bigint,
  verifies_dump bigint,
  non_verifies bigint,
  total_prescriptions bigint,
  derniere_activite timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    count(*) as total_medecins,
    count(*) filter (where source_verification = 'ANS FHIR') as verifies_ans,
    count(*) filter (where source_verification = 'dump_local') as verifies_dump,
    count(*) filter (where est_verifie = false or source_verification is null) as non_verifies,
    coalesce(sum(nb_prescriptions), 0) as total_prescriptions,
    max(derniere_prescription_date)::timestamptz as derniere_activite
  from medecins_prescripteurs
  where structure_id in (select structure_id from membres_structure where user_id = auth.uid());
$$;

grant execute on function medecins_stats to authenticated;

-- Fin du patch 0.56.5
