-- ============================================================
--  AVEHO EC — Patch 0.21.0 (Consentement RGPD)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) Table consentements_rgpd
-- ============================================================
-- Stocke chaque consentement signé avec son hash, sa date, l'utilisateur
-- qui a recueilli la signature, et un chemin vers l'image dans Storage.
create table if not exists consentements_rgpd (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references structures(id) on delete cascade,
  etablissement_id uuid references etablissements(id) on delete set null,
  patient_id uuid not null references patients(id) on delete cascade,
  
  -- Identité capturée au moment du consentement (gelée même si patient modifié après)
  patient_nom_prenom text not null,
  patient_date_naissance date,
  patient_numero_dossier text,
  
  -- Établissement au moment du consentement (gelé pour traçabilité)
  etablissement_nom text not null,
  collectivite_nom text not null,
  
  -- Finalités acceptées (cases cochées)
  finalites_acceptees text[] default '{}',
  
  -- Métadonnées de signature
  statut text not null default 'signe' check (statut in ('signe', 'refuse', 'en_attente', 'archive')),
  signe_par_role text default 'patient', -- 'patient' | 'representant_legal'
  signe_par_nom text, -- nom du signataire si différent du patient (tuteur, famille)
  date_signature timestamptz not null default now(),
  
  -- Hash SHA-256 de l'image PNG pour garantir l'intégrité
  signature_hash text,
  signature_storage_path text, -- chemin dans le bucket Supabase Storage
  
  -- Métadonnées techniques (forensic)
  recueilli_par_user_id uuid references auth.users(id) on delete set null,
  recueilli_par_email text,
  recueilli_par_nom text,
  user_agent text,
  device_type text, -- 'mobile' | 'desktop' | 'tablette'
  
  -- Texte exact du consentement signé (gelé pour traçabilité)
  texte_consentement text not null,
  version_template text default '1.0',
  
  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  archive boolean not null default false,
  notes text
);

create index if not exists idx_consent_patient on consentements_rgpd (patient_id);
create index if not exists idx_consent_structure on consentements_rgpd (structure_id);
create index if not exists idx_consent_etab on consentements_rgpd (etablissement_id);
create index if not exists idx_consent_statut on consentements_rgpd (statut);
create index if not exists idx_consent_date on consentements_rgpd (date_signature desc);

-- RLS
alter table consentements_rgpd enable row level security;

drop policy if exists "consent_select" on consentements_rgpd;
drop policy if exists "consent_insert" on consentements_rgpd;
drop policy if exists "consent_update" on consentements_rgpd;

-- Tous les membres de la structure peuvent voir
create policy "consent_select" on consentements_rgpd for select
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

-- Insert : tous les membres autorisés à écrire
create policy "consent_insert" on consentements_rgpd for insert
  with check (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

-- Update : tous les membres autorisés à écrire (pour archiver, modifier statut, ajouter notes)
create policy "consent_update" on consentements_rgpd for update
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

-- Pas de delete : un consentement signé est immuable (RGPD).
-- Pour "supprimer" : on archive (archive = true).

-- ============================================================
-- 2) Trigger updated_at automatique
-- ============================================================
create or replace function update_consent_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_consent_updated on consentements_rgpd;
create trigger trg_consent_updated
  before update on consentements_rgpd
  for each row execute function update_consent_updated_at();

-- ============================================================
-- 3) Vue agrégée : combien de consentements par patient
-- Permet d'afficher en un coup d'œil sur la fiche/liste patients
-- si le patient a un consentement valide en cours.
-- ============================================================
create or replace view v_patient_consent_status as
select 
  p.id as patient_id,
  p.structure_id,
  count(c.id) filter (where c.statut = 'signe' and not c.archive) as consentements_actifs,
  count(c.id) filter (where c.statut = 'refuse' and not c.archive) as consentements_refuses,
  max(c.date_signature) filter (where c.statut = 'signe' and not c.archive) as derniere_signature,
  bool_or(c.statut = 'signe' and not c.archive) as a_consenti
from patients p
left join consentements_rgpd c on c.patient_id = p.id
group by p.id, p.structure_id;

-- ============================================================
-- 4) Bucket Supabase Storage pour les signatures
-- ============================================================
-- ATTENTION : à créer manuellement dans Supabase Dashboard si pas
-- supporté via SQL dans ta version. Procédure :
--   1. Aller dans Storage → New bucket
--   2. Nom : "signatures-rgpd"
--   3. Public : NON (privé, accessible via URL signée)
--   4. RLS Policies à créer :
--      - SELECT : authentifié + même structure que le consentement
--      - INSERT : authentifié + même structure
--
-- Création via SQL (peut nécessiter des droits service_role) :
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signatures-rgpd', 
  'signatures-rgpd', 
  false, 
  5242880, -- 5 MB max
  array['image/png']
)
on conflict (id) do nothing;

-- Policies Storage : un membre peut uploader/lire les signatures
-- de sa structure (path = structure_id/...)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' and tablename = 'objects' 
    and policyname = 'aveho_signatures_upload'
  ) then
    create policy "aveho_signatures_upload" on storage.objects 
      for insert with check (
        bucket_id = 'signatures-rgpd' 
        and auth.uid() is not null
      );
  end if;
  
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' and tablename = 'objects' 
    and policyname = 'aveho_signatures_read'
  ) then
    create policy "aveho_signatures_read" on storage.objects 
      for select using (
        bucket_id = 'signatures-rgpd' 
        and auth.uid() is not null
      );
  end if;
end $$;

-- ============================================================
-- FIN DU PATCH 0.21.0
-- ============================================================
-- Vérifications :
--
--   -- Table créée ?
--   select count(*) from consentements_rgpd;
--
--   -- Bucket créé ?
--   select id, name, public from storage.buckets where id = 'signatures-rgpd';
--
--   -- Vue OK ?
--   select * from v_patient_consent_status limit 5;
