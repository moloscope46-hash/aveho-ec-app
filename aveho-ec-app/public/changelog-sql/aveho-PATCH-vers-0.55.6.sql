-- ============================================================
--  AVEHO EC — Patch 0.55.6
--  Idempotent — Supabase > SQL Editor
--
--  Enrichit la table `structures` (= "Groupement" côté UI) avec
--  les champs SIRENE/SIRET pour permettre l'import depuis l'API
--  Recherche d'Entreprises (DINUM/INSEE).
-- ============================================================

alter table structures
  add column if not exists siren text,
  add column if not exists siret text,
  add column if not exists adresse text,
  add column if not exists code_postal text,
  add column if not exists telephone text,
  add column if not exists email text,
  add column if not exists site_web text,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  -- Champs SIRENE enrichis
  add column if not exists nom_complet text,                  -- raison sociale officielle
  add column if not exists sigle text,
  add column if not exists activite_principale text,          -- code NAF/APE
  add column if not exists libelle_activite text,
  add column if not exists categorie_entreprise text,         -- TPE/PME/ETI/GE
  add column if not exists tranche_effectifs text,            -- tranche INSEE
  add column if not exists nature_juridique text,             -- code
  add column if not exists date_creation date,
  add column if not exists nombre_etablissements int,
  add column if not exists notes text;                        -- notes libres groupement

-- Contrainte d'unicité du SIRET (si renseigné) — facultatif mais évite doublons
create unique index if not exists ux_structures_siret on structures (siret) where siret is not null;

-- 0.55.6 : permet de rattacher un bâtiment à un établissement spécifique du groupement
-- (avant : tous les bâtiments étaient seulement rattachés au groupement parent).
-- Cela permet le clic "voir les bâtiments de l'établissement X" dans la page Groupement.
alter table batiments
  add column if not exists etablissement_id uuid references etablissements(id) on delete set null;

create index if not exists idx_batiments_etablissement on batiments (etablissement_id);

-- Reload PostgREST
notify pgrst, 'reload schema';

-- Vérif :
-- select id, nom, siret, siren, libelle_activite from structures;
