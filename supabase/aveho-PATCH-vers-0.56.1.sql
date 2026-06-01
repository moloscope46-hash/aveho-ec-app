-- ============================================================
--  AVEHO EC — Patch 0.56.1
--  Storage Supabase pour archiver les images de bulletins
--  scannés (workflow OCR). Bucket privé avec RLS.
--
--  Structure des chemins :
--    bulletins-scannes/{structure_id}/{patient_id}/{timestamp}-{filename}
--
--  100% idempotent.
-- ============================================================

-- Création du bucket privé (idempotent via on conflict do nothing)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bulletins-scannes',
  'bulletins-scannes',
  false,
  10485760,  -- 10 Mo max par fichier
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- RLS Policies — chaque structure ne voit que ses propres fichiers
-- ============================================================

-- 1. SELECT : l'utilisateur peut lire un fichier si sa structure_id correspond au 1er segment du path
drop policy if exists "bulletins_scannes_select" on storage.objects;
create policy "bulletins_scannes_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bulletins-scannes'
    and (storage.foldername(name))[1] in (
      select structure_id::text from membres_structure where user_id = auth.uid()
    )
  );

-- 2. INSERT : l'utilisateur peut uploader si le path commence par sa structure_id
drop policy if exists "bulletins_scannes_insert" on storage.objects;
create policy "bulletins_scannes_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bulletins-scannes'
    and (storage.foldername(name))[1] in (
      select structure_id::text from membres_structure where user_id = auth.uid()
    )
  );

-- 3. UPDATE : pareil
drop policy if exists "bulletins_scannes_update" on storage.objects;
create policy "bulletins_scannes_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'bulletins-scannes'
    and (storage.foldername(name))[1] in (
      select structure_id::text from membres_structure where user_id = auth.uid()
    )
  );

-- 4. DELETE : pareil
drop policy if exists "bulletins_scannes_delete" on storage.objects;
create policy "bulletins_scannes_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bulletins-scannes'
    and (storage.foldername(name))[1] in (
      select structure_id::text from membres_structure where user_id = auth.uid()
    )
  );

-- ============================================================
-- Colonnes additionnelles sur patients pour le suivi
-- ============================================================

alter table patients
  add column if not exists bs_file_path text,           -- chemin storage relatif (structure_id/patient_id/file.jpg)
  add column if not exists bs_file_mime text,           -- type MIME du fichier original
  add column if not exists bs_file_size_kb int,         -- taille en Ko (audit)
  add column if not exists bs_ocr_tokens_in int,        -- coût IA : tokens input
  add column if not exists bs_ocr_tokens_out int,       -- coût IA : tokens output
  add column if not exists bs_ocr_confiance text;       -- haute / moyenne / faible

create index if not exists idx_patients_bs_archive
  on patients(structure_id, bs_ocr_date desc)
  where bs_file_path is not null;

-- ============================================================
-- Fonction RPC : statistiques des archives par structure
-- ============================================================

create or replace function bulletins_archive_stats() returns table (
  total_patients_avec_bs bigint,
  total_ko bigint,
  premier_archive timestamptz,
  dernier_archive timestamptz,
  tokens_total_in bigint,
  tokens_total_out bigint
)
language sql
security definer
set search_path = public
as $$
  select
    count(*) as total_patients_avec_bs,
    coalesce(sum(bs_file_size_kb), 0) as total_ko,
    min(bs_ocr_date) as premier_archive,
    max(bs_ocr_date) as dernier_archive,
    coalesce(sum(bs_ocr_tokens_in), 0) as tokens_total_in,
    coalesce(sum(bs_ocr_tokens_out), 0) as tokens_total_out
  from patients p
  where p.bs_file_path is not null
    and p.structure_id in (
      select structure_id from membres_structure where user_id = auth.uid()
    );
$$;

grant execute on function bulletins_archive_stats to authenticated;

-- Fin du patch 0.56.1
