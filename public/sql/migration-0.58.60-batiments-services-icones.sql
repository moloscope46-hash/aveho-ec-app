-- =============================================================
-- Migration 0.58.60 : icônes pour bâtiments et services
-- =============================================================
-- Ajoute une colonne `icone TEXT` sur les tables batiments et services
-- pour permettre de choisir une icône Tabler lors de la création/édition.
-- Cette icône est affichée dans le sélecteur de contexte de la TopBar
-- (à côté du nom du bâtiment / service) ainsi que dans les listes.
-- =============================================================

ALTER TABLE batiments
  ADD COLUMN IF NOT EXISTS icone TEXT;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS icone TEXT;

COMMENT ON COLUMN batiments.icone IS '0.58.60 - Nom d''icône Tabler (sans préfixe ti-) ex: building-hospital';
COMMENT ON COLUMN services.icone IS '0.58.60 - Nom d''icône Tabler (sans préfixe ti-) ex: stethoscope';

-- Initialise quelques icônes par défaut pour les bâtiments existants (optionnel)
-- UPDATE batiments SET icone = 'building-hospital' WHERE icone IS NULL AND lower(nom) ~ 'hopital|hôpital|chu|chr';
-- UPDATE batiments SET icone = 'building-community' WHERE icone IS NULL AND lower(nom) ~ 'ehpad|maison.*retraite';
-- UPDATE batiments SET icone = 'building' WHERE icone IS NULL;
-- UPDATE services SET icone = 'stethoscope' WHERE icone IS NULL;

-- =============================================================
-- Vérification :
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name IN ('batiments', 'services') AND column_name = 'icone';
-- =============================================================
