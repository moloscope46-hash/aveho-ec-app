-- =============================================================
-- migration-0.62.16-garages.sql
-- Crée la table garages (lieux de stationnement / entretien véhicules)
-- + colonne vehicules.garage_id pour rattacher chaque véhicule à un garage
-- 100% idempotent
-- =============================================================

CREATE TABLE IF NOT EXISTS garages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  etablissement_id UUID,
  magasin_id UUID,
  nom TEXT NOT NULL,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  capacite INTEGER,            -- nb de véhicules
  type TEXT DEFAULT 'garage',  -- 'garage' | 'parking' | 'atelier' | 'depot_logistique'
  telephone TEXT,
  responsable TEXT,
  horaires TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_garages_structure ON garages(structure_id);
CREATE INDEX IF NOT EXISTS idx_garages_etab ON garages(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_garages_magasin ON garages(magasin_id);

-- Ajout colonne garage_id sur vehicules
ALTER TABLE IF EXISTS vehicules
  ADD COLUMN IF NOT EXISTS garage_id UUID;

CREATE INDEX IF NOT EXISTS idx_vehicules_garage ON vehicules(garage_id);

-- RLS
ALTER TABLE garages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS garages_select ON garages;
CREATE POLICY garages_select ON garages
  FOR SELECT TO authenticated
  USING (
    structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS garages_insert ON garages;
CREATE POLICY garages_insert ON garages
  FOR INSERT TO authenticated
  WITH CHECK (
    structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS garages_update ON garages;
CREATE POLICY garages_update ON garages
  FOR UPDATE TO authenticated
  USING (
    structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS garages_delete ON garages;
CREATE POLICY garages_delete ON garages
  FOR DELETE TO authenticated
  USING (
    structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())
  );

-- Vérif
SELECT 'Garages créés' AS info,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'garages') AS table_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vehicules' AND column_name = 'garage_id') AS garage_id_col;
