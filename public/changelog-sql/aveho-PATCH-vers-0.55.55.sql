-- ============================================================
--  AVEHO EC — Patch 0.55.55
--  Ajout des colonnes nécessaires pour l'autocomplete BAN/INSEE
--  sur la table patients (adresse de résidence avec géolocalisation).
--  100% idempotent.
-- ============================================================

alter table patients
  add column if not exists code_insee_residence text,   -- 5 chiffres INSEE commune
  add column if not exists latitude numeric(10, 7),     -- géocode adresse BAN
  add column if not exists longitude numeric(10, 7);

-- Index pour les recherches géo / par commune
create index if not exists idx_patients_code_insee on patients(code_insee_residence)
  where code_insee_residence is not null;

create index if not exists idx_patients_coords on patients(latitude, longitude)
  where latitude is not null and longitude is not null;

-- Fin du patch 0.55.55
