-- =============================================================
-- Migration 0.58.63 : rattachement pharmacies à bât/svc/équipe
-- =============================================================
ALTER TABLE pharmacies
  ADD COLUMN IF NOT EXISTS batiment_id UUID REFERENCES batiments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES equipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pharmacies_batiment_id ON pharmacies(batiment_id) WHERE batiment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pharmacies_service_id ON pharmacies(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pharmacies_equipe_id ON pharmacies(equipe_id) WHERE equipe_id IS NOT NULL;

COMMENT ON COLUMN pharmacies.batiment_id IS '0.58.63 - Bâtiment de référence (filtre TopBar)';
COMMENT ON COLUMN pharmacies.service_id IS '0.58.63 - Service de référence (filtre TopBar)';
COMMENT ON COLUMN pharmacies.equipe_id IS '0.58.63 - Équipe responsable (filtre TopBar)';
