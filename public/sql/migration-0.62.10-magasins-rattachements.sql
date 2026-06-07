-- =============================================================
-- migration-0.62.10-magasins-rattachements.sql
-- Table de rattachement granulaire magasin ↔ étab/bât/svc/dépôt
-- Permet de filtrer la vue magasin sur les périmètres où il intervient
-- 100% idempotent
-- =============================================================

-- 1. Table principale de rattachement
CREATE TABLE IF NOT EXISTS magasins_rattachements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magasin_id UUID NOT NULL,
  etablissement_id UUID,         -- toujours rempli
  batiment_id UUID,              -- optionnel : si null, rattachement au niveau étab
  service_id UUID,               -- optionnel : si null, rattachement au niveau bât ou étab
  depot_id UUID,                 -- optionnel : rattachement à un dépôt précis
  actif BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Au moins un niveau de rattachement requis
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE table_name = 'magasins_rattachements' AND constraint_name = 'magasins_rattachements_check_level') THEN
    ALTER TABLE magasins_rattachements ADD CONSTRAINT magasins_rattachements_check_level
      CHECK (etablissement_id IS NOT NULL OR depot_id IS NOT NULL);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mag_ratt_magasin ON magasins_rattachements(magasin_id);
CREATE INDEX IF NOT EXISTS idx_mag_ratt_etab ON magasins_rattachements(etablissement_id) WHERE etablissement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mag_ratt_batiment ON magasins_rattachements(batiment_id) WHERE batiment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mag_ratt_service ON magasins_rattachements(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mag_ratt_depot ON magasins_rattachements(depot_id) WHERE depot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mag_ratt_actif ON magasins_rattachements(magasin_id, actif) WHERE actif = TRUE;

-- 2. Colonne magasin_id sur depots (rattachement direct simple)
ALTER TABLE IF EXISTS depots
  ADD COLUMN IF NOT EXISTS magasin_id UUID;
CREATE INDEX IF NOT EXISTS idx_depots_magasin ON depots(magasin_id) WHERE magasin_id IS NOT NULL;

-- 3. RLS basique
DO $$ BEGIN
  ALTER TABLE magasins_rattachements ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS mag_ratt_all ON magasins_rattachements;
CREATE POLICY mag_ratt_all ON magasins_rattachements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Vue helper : pour un user magasin, lister les étabs où son magasin intervient
CREATE OR REPLACE VIEW v_etabs_du_magasin AS
SELECT DISTINCT
  mr.magasin_id,
  e.id AS etablissement_id,
  e.nom AS etablissement_nom,
  e.ville AS etablissement_ville
FROM magasins_rattachements mr
JOIN etablissements e ON e.id = mr.etablissement_id
WHERE mr.actif = TRUE AND mr.etablissement_id IS NOT NULL;

-- 5. Vue helper : pour un user magasin, lister les bât/svc rattachés
CREATE OR REPLACE VIEW v_perimetre_magasin AS
SELECT
  mr.magasin_id,
  mr.etablissement_id,
  mr.batiment_id,
  mr.service_id,
  mr.depot_id,
  b.nom AS batiment_nom,
  s.nom AS service_nom,
  d.nom AS depot_nom
FROM magasins_rattachements mr
LEFT JOIN batiments b ON b.id = mr.batiment_id
LEFT JOIN services s ON s.id = mr.service_id
LEFT JOIN depots d ON d.id = mr.depot_id
WHERE mr.actif = TRUE;

-- Vérif
SELECT 'magasins_rattachements OK' AS info, COUNT(*) AS rows FROM magasins_rattachements;
