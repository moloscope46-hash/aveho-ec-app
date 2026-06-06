-- =============================================================
-- Migration 0.58.62 : équipe_id sur patients / interventions / materiels
-- =============================================================
-- Permet de filtrer les listes Patients, Interventions et Materiels
-- par équipe (en plus du filtre bâtiment/service déjà existant).
-- Le filtre est piloté par le sélecteur "Équipe" de la TopBar (0.58.60).
-- =============================================================

-- Ajoute colonne equipe_id (nullable - rétrocompat)
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES equipes(id) ON DELETE SET NULL;

ALTER TABLE interventions
  ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES equipes(id) ON DELETE SET NULL;

ALTER TABLE materiels
  ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES equipes(id) ON DELETE SET NULL;

-- Index pour accélérer les filtres
CREATE INDEX IF NOT EXISTS idx_patients_equipe_id ON patients(equipe_id) WHERE equipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interventions_equipe_id ON interventions(equipe_id) WHERE equipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materiels_equipe_id ON materiels(equipe_id) WHERE equipe_id IS NOT NULL;

COMMENT ON COLUMN patients.equipe_id IS '0.58.62 - Équipe de référence (filtre TopBar)';
COMMENT ON COLUMN interventions.equipe_id IS '0.58.62 - Équipe en charge (filtre TopBar)';
COMMENT ON COLUMN materiels.equipe_id IS '0.58.62 - Équipe responsable (filtre TopBar)';

-- =============================================================
-- Vérification :
-- SELECT table_name, column_name FROM information_schema.columns
--   WHERE table_name IN ('patients', 'interventions', 'materiels')
--   AND column_name = 'equipe_id';
-- =============================================================
