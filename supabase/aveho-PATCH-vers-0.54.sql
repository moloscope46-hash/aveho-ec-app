-- ============================================================
--  AVEHO EC — Patch 0.54.0
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  AX - Géolocalisation établissements (carte Leaflet)
-- ============================================================

alter table etablissements
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7);

-- Index spatial léger (recherche par proximité plus tard si besoin)
create index if not exists idx_etablissements_geo 
  on etablissements (latitude, longitude)
  where latitude is not null and longitude is not null;

-- ============================================================
-- Reload PostgREST cache (réflexe 4)
-- ============================================================
notify pgrst, 'reload schema';

-- Vérif :
--   select id, nom, latitude, longitude from etablissements limit 5;
