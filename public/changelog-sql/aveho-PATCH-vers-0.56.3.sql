-- ============================================================
--  AVEHO EC — Patch 0.56.3
--  OCR Prescriptions : tables + bucket Storage + RLS + RPC stats
-- ============================================================

-- ============================================================
-- 1) Table prescriptions (en-tête : 1 ordonnance = 1 ligne)
-- ============================================================

create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  structure_id uuid not null,
  etablissement_id uuid,

  -- Données prescripteur (extraites par OCR ou saisies)
  prescripteur_nom text,
  prescripteur_prenom text,
  prescripteur_rpps text,
  prescripteur_specialite text,
  prescripteur_adresse text,
  prescripteur_telephone text,
  prescripteur_email text,
  prescripteur_finess text,

  -- Métadonnées de l'ordonnance
  date_prescription date,
  type_prescription text,                     -- ordonnance / bizone / médicaments d'exception / hospitalière
  duree_traitement text,                      -- "1 mois", "3 mois renouvelable 2 fois", etc.
  est_renouvelable boolean default false,
  nb_renouvellements int default 0,
  notes_libres text,

  -- Archivage du fichier source (même archi que 0.56.1 bulletin)
  fichier_path text,                          -- chemin Storage
  fichier_mime text,
  fichier_size_kb int,

  -- Audit OCR
  ocr_brut text,                              -- texte OCR brut
  ocr_date timestamptz,
  ocr_confiance text,                         -- haute / moyenne / faible
  ocr_tokens_in int,
  ocr_tokens_out int,

  -- Statut
  statut text default 'active',               -- active / archivee / annulee
  source_creation text default 'manuelle',    -- manuelle / ocr / import

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_prescriptions_patient on prescriptions(patient_id, date_prescription desc);
create index if not exists idx_prescriptions_structure on prescriptions(structure_id, date_prescription desc);
create index if not exists idx_prescriptions_rpps on prescriptions(prescripteur_rpps) where prescripteur_rpps is not null;

-- ============================================================
-- 2) Table prescriptions_lignes (N médicaments par prescription)
-- ============================================================

create table if not exists prescriptions_lignes (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  ordre int default 0,                        -- ordre d'affichage

  -- Médicament (extrait OCR ou saisi)
  medicament_nom text not null,               -- "DOLIPRANE 1000 mg"
  medicament_dci text,                        -- "PARACETAMOL" (Dénomination Commune Internationale)
  forme text,                                 -- "comprimé", "sirop", "gélule", "patch", "ampoule"
  dosage text,                                -- "1000 mg", "500 mg/5 ml"
  voie_administration text,                   -- "orale", "cutanée", "intraveineuse"

  -- Posologie
  posologie_libre text,                       -- "1 comprimé matin et soir pendant 7 jours"
  qte_par_prise numeric(8, 2),                -- 1, 0.5, 2
  unite_prise text,                           -- "comprimé", "ml", "goutte"
  prises_par_jour int,                        -- 1, 2, 3, 4
  duree_jours int,                            -- 7, 30, 90

  -- Délivrance pharmacie
  quantite_a_delivrer text,                   -- "QSP 1 mois", "2 boîtes de 30"
  est_renouvelable boolean default false,

  -- Champ commentaire (à jeun, ALD, contexte)
  commentaire text,

  created_at timestamptz default now()
);

create index if not exists idx_prescriptions_lignes_prescription on prescriptions_lignes(prescription_id, ordre);
create index if not exists idx_prescriptions_lignes_dci on prescriptions_lignes(lower(medicament_dci)) where medicament_dci is not null;

-- ============================================================
-- 3) Bucket Storage 'prescriptions-scannees'
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prescriptions-scannees',
  'prescriptions-scannees',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Convention de path : {structure_id}/{patient_id}/{prescription_id}/{ts}-{filename}

-- ============================================================
-- 4) RLS Policies prescriptions + lignes + Storage
-- ============================================================

alter table prescriptions enable row level security;
alter table prescriptions_lignes enable row level security;

drop policy if exists "prescriptions_select" on prescriptions;
create policy "prescriptions_select" on prescriptions for select to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "prescriptions_insert" on prescriptions;
create policy "prescriptions_insert" on prescriptions for insert to authenticated
  with check (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "prescriptions_update" on prescriptions;
create policy "prescriptions_update" on prescriptions for update to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "prescriptions_delete" on prescriptions;
create policy "prescriptions_delete" on prescriptions for delete to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

-- Lignes : accessibles si la prescription parente est accessible
drop policy if exists "prescriptions_lignes_select" on prescriptions_lignes;
create policy "prescriptions_lignes_select" on prescriptions_lignes for select to authenticated
  using (prescription_id in (select id from prescriptions));

drop policy if exists "prescriptions_lignes_insert" on prescriptions_lignes;
create policy "prescriptions_lignes_insert" on prescriptions_lignes for insert to authenticated
  with check (prescription_id in (select id from prescriptions));

drop policy if exists "prescriptions_lignes_update" on prescriptions_lignes;
create policy "prescriptions_lignes_update" on prescriptions_lignes for update to authenticated
  using (prescription_id in (select id from prescriptions));

drop policy if exists "prescriptions_lignes_delete" on prescriptions_lignes;
create policy "prescriptions_lignes_delete" on prescriptions_lignes for delete to authenticated
  using (prescription_id in (select id from prescriptions));

-- Storage policies — isolation par structure (1er segment du path)
drop policy if exists "prescriptions_scannees_select" on storage.objects;
create policy "prescriptions_scannees_select" on storage.objects for select to authenticated
  using (bucket_id = 'prescriptions-scannees'
    and (storage.foldername(name))[1] in (
      select structure_id::text from membres_structure where user_id = auth.uid()
    ));

drop policy if exists "prescriptions_scannees_insert" on storage.objects;
create policy "prescriptions_scannees_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'prescriptions-scannees'
    and (storage.foldername(name))[1] in (
      select structure_id::text from membres_structure where user_id = auth.uid()
    ));

drop policy if exists "prescriptions_scannees_update" on storage.objects;
create policy "prescriptions_scannees_update" on storage.objects for update to authenticated
  using (bucket_id = 'prescriptions-scannees'
    and (storage.foldername(name))[1] in (
      select structure_id::text from membres_structure where user_id = auth.uid()
    ));

drop policy if exists "prescriptions_scannees_delete" on storage.objects;
create policy "prescriptions_scannees_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'prescriptions-scannees'
    and (storage.foldername(name))[1] in (
      select structure_id::text from membres_structure where user_id = auth.uid()
    ));

-- ============================================================
-- 5) RPC stats prescriptions
-- ============================================================

create or replace function prescriptions_stats() returns table (
  total_prescriptions bigint,
  total_actives bigint,
  total_lignes bigint,
  prescripteurs_uniques bigint,
  premier_date date,
  dernier_date date,
  tokens_total_in bigint,
  tokens_total_out bigint
)
language sql
security definer
set search_path = public
as $$
  select
    count(*) as total_prescriptions,
    count(*) filter (where statut = 'active') as total_actives,
    (select count(*) from prescriptions_lignes l join prescriptions p on l.prescription_id = p.id
      where p.structure_id in (select structure_id from membres_structure where user_id = auth.uid())) as total_lignes,
    count(distinct prescripteur_rpps) as prescripteurs_uniques,
    min(date_prescription) as premier_date,
    max(date_prescription) as dernier_date,
    coalesce(sum(ocr_tokens_in), 0) as tokens_total_in,
    coalesce(sum(ocr_tokens_out), 0) as tokens_total_out
  from prescriptions p
  where structure_id in (select structure_id from membres_structure where user_id = auth.uid());
$$;

grant execute on function prescriptions_stats to authenticated;

-- Fin du patch 0.56.3
