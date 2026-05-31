-- ============================================================
--  AVEHO EC — Patch 0.20.1 (Aligner patients + FTS robuste)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
-- ============================================================
--  Inclut tout le contenu de 0.20 (FTS) + ajoute les colonnes
--  manquantes sur patients pour aligner avec le code applicatif.
-- ============================================================

-- ============================================================
-- 0) Aligner le schéma patients sur ce qu'attend le code
-- ============================================================
-- Le code applicatif (fiche patient, fiches imprimées, export Excel)
-- référence ces colonnes. Sans elles, les valeurs sont undefined
-- côté React et les blocs sont masqués par les && de garde.
alter table patients
  add column if not exists date_naissance date,
  add column if not exists numero_dossier text,
  add column if not exists medecin_traitant text,
  add column if not exists etat text default 'Présent',
  add column if not exists service_id uuid references services(id) on delete set null,
  add column if not exists notes text;

-- Index utile pour les jointures et filtres
create index if not exists idx_patients_service on patients (service_id) where service_id is not null;
create index if not exists idx_patients_etat on patients (etat) where etat is not null;

-- ============================================================
-- 1) Configuration FTS française avec accent-insensitive
-- ============================================================
create extension if not exists unaccent;

do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'aveho_fr') then
    create text search configuration aveho_fr (copy = french);
    alter text search configuration aveho_fr
      alter mapping for hword, hword_part, word with unaccent, french_stem;
  end if;
end $$;

-- ============================================================
-- 2) Colonne tsvector générée sur patients
-- Maintenant qu'on a aligné le schéma, l'expression est simple et fixe.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'patients' and column_name = 'search_vector'
  ) then
    alter table patients 
      add column search_vector tsvector
      generated always as (
        to_tsvector('aveho_fr',
          coalesce(nom, '') || ' ' ||
          coalesce(prenom, '') || ' ' ||
          coalesce(chambre, '') || ' ' ||
          coalesce(batiment, '') || ' ' ||
          coalesce(numero_dossier, '') || ' ' ||
          coalesce(medecin_traitant, '')
        )
      ) stored;
    raise notice 'patients.search_vector créée';
  end if;
end $$;

create index if not exists idx_patients_search 
  on patients using gin (search_vector);

-- ============================================================
-- 3) Colonne tsvector générée sur materiels
-- ============================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'materiels' and column_name = 'search_vector'
  ) then
    alter table materiels 
      add column search_vector tsvector
      generated always as (
        to_tsvector('aveho_fr',
          coalesce(libelle, '') || ' ' ||
          coalesce(num_serie, '') || ' ' ||
          coalesce(num_parc, '') || ' ' ||
          coalesce(num_lot, '')
        )
      ) stored;
    raise notice 'materiels.search_vector créée';
  end if;
end $$;

create index if not exists idx_materiels_search 
  on materiels using gin (search_vector);

-- ============================================================
-- 4) RPC pour recherche patients/materiels
-- ============================================================
create or replace function search_patients(q text, lim int default 10)
returns table (id uuid, nom text, prenom text, chambre text, rank real)
language sql
stable
as $$
  select p.id, p.nom, p.prenom, p.chambre,
    ts_rank(p.search_vector, plainto_tsquery('aveho_fr', q)) as rank
  from patients p
  where p.search_vector @@ plainto_tsquery('aveho_fr', q)
  order by rank desc
  limit lim;
$$;

create or replace function search_materiels(q text, lim int default 10)
returns table (id uuid, libelle text, num_serie text, num_parc text, num_lot text, rank real)
language sql
stable
as $$
  select m.id, m.libelle, m.num_serie, m.num_parc, m.num_lot,
    ts_rank(m.search_vector, plainto_tsquery('aveho_fr', q)) as rank
  from materiels m
  where m.search_vector @@ plainto_tsquery('aveho_fr', q)
  order by rank desc
  limit lim;
$$;

-- ============================================================
-- FIN DU PATCH 0.20.1
-- ============================================================
-- Vérifications :
--
--   -- Nouvelles colonnes patients :
--   select column_name from information_schema.columns 
--   where table_name = 'patients' and column_name in 
--     ('date_naissance','numero_dossier','medecin_traitant','etat','service_id','notes','search_vector');
--
--   -- Tests fonctionnels :
--   select * from search_patients('dupont', 5);
--   select * from search_materiels('lit', 5);
