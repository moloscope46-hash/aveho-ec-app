-- ============================================================
--  AVEHO EC — Patch 0.52.5
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  Ajout du ciblage par établissement sur les annonces
--  (NULL = annonce structure-wide visible partout, sinon ciblée)
-- ============================================================

alter table annonces
  add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;

create index if not exists idx_annonces_etab on annonces (etablissement_id);

-- ============================================================
-- Reload PostgREST cache (réflexe 4)
-- ============================================================
notify pgrst, 'reload schema';

-- Vérif :
--   select id, titre, etablissement_id from annonces limit 5;
