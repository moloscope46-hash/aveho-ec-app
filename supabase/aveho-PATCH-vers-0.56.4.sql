-- ============================================================
--  AVEHO EC — Patch 0.56.4
--  Ajout colonnes lat/lng + email pour mutuelles + complétion
--  des champs nécessaires aux actions tel/gps/mail/web depuis
--  les pages admin caisses + mutuelles.
--  100% idempotent.
-- ============================================================

-- 1) Coordonnées GPS sur caisses (pour bouton "Itinéraire")
alter table caisses_assurance_maladie
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7);

-- 2) Coordonnées + email sur mutuelles (déjà : nom, n° AMC, tel, web, adresse)
alter table mutuelles
  add column if not exists email text,
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7);

-- 3) Index sur coords (recherches futures par proximité)
create index if not exists idx_caisses_coords on caisses_assurance_maladie(latitude, longitude)
  where latitude is not null and longitude is not null;

create index if not exists idx_mutuelles_coords on mutuelles(latitude, longitude)
  where latitude is not null and longitude is not null;

-- Fin du patch 0.56.4
