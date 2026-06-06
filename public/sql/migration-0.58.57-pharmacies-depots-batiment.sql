-- =============================================================
-- Migration 0.58.57 : table pharmacies dédiée + depots.batiment_id
-- =============================================================
-- 1) Crée la table `pharmacies` (table dédiée aux officines partenaires
--    avec horaires d'ouverture, garde, FINESS, etc.)
-- 2) Ajoute la colonne `batiment_id` à `depots` pour permettre le filtrage
--    contextuel des transferts par bâtiment
-- =============================================================

-- ============================================================================
-- A) Table pharmacies
-- ============================================================================

CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE,

  -- Identification
  nom TEXT NOT NULL,
  finess TEXT,                -- N° FINESS (officine ou PUI)
  siret TEXT,
  raison_sociale TEXT,        -- ex : "SELARL Pharmacie Centrale"
  type TEXT DEFAULT 'officine',  -- 'officine' | 'PUI' | 'LPP' | 'autre'

  -- Coordonnées
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  telephone TEXT,
  email TEXT,
  site_web TEXT,
  latitude FLOAT8,
  longitude FLOAT8,

  -- Horaires : structure JSONB par jour de la semaine
  -- ex : { "lundi": [{ "open": "08:30", "close": "12:30" }, { "open": "14:00", "close": "19:30" }], ... }
  horaires JSONB DEFAULT '{}'::jsonb,

  -- Garde / urgences
  garde_disponible BOOLEAN DEFAULT FALSE,
  garde_24h BOOLEAN DEFAULT FALSE,
  garde_notes TEXT,           -- ex : "Pharmacie de garde 1er dimanche du mois"

  -- Spécialités (matériel médical, orthopédie, etc.)
  specialites TEXT[],         -- array : ['lpp', 'orthopedie', 'vph']

  -- Référent pharmacien
  pharmacien_titulaire TEXT,  -- nom du pharmacien titulaire
  pharmacien_rpps TEXT,       -- RPPS du pharmacien titulaire

  -- Métadonnées
  notes TEXT,
  archive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE pharmacies IS '0.58.57 - Pharmacies partenaires (officines, PUI) avec horaires + garde';
COMMENT ON COLUMN pharmacies.horaires IS 'JSONB : { "lundi": [{ open, close }], ... } - plages horaires par jour';
COMMENT ON COLUMN pharmacies.specialites IS 'Array : LPP, orthopédie, VPH, oxygénothérapie, etc.';

-- Index
CREATE INDEX IF NOT EXISTS idx_pharmacies_structure ON pharmacies(structure_id, archive);
CREATE INDEX IF NOT EXISTS idx_pharmacies_finess ON pharmacies(finess) WHERE finess IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pharmacies_garde ON pharmacies(structure_id, garde_disponible) WHERE garde_disponible = TRUE;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_pharmacies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pharmacies_updated_at ON pharmacies;
CREATE TRIGGER trigger_pharmacies_updated_at
  BEFORE UPDATE ON pharmacies
  FOR EACH ROW
  EXECUTE FUNCTION update_pharmacies_updated_at();

-- RLS : lecture pour tous les users de la structure, modification admin only
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read pharmacies in own structure" ON pharmacies;
CREATE POLICY "Read pharmacies in own structure"
  ON pharmacies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM membres_structure
      WHERE membres_structure.structure_id = pharmacies.structure_id
        AND membres_structure.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Manage pharmacies (admin)" ON pharmacies;
CREATE POLICY "Manage pharmacies (admin)"
  ON pharmacies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM membres_structure ms
      JOIN roles r ON r.id = ms.role_id
      WHERE ms.structure_id = pharmacies.structure_id
        AND ms.user_id = auth.uid()
        AND r.nom = 'Administrateur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM membres_structure ms
      JOIN roles r ON r.id = ms.role_id
      WHERE ms.structure_id = pharmacies.structure_id
        AND ms.user_id = auth.uid()
        AND r.nom = 'Administrateur'
    )
  );

-- ============================================================================
-- B) depots.batiment_id pour filtrage contextuel des transferts
-- ============================================================================

ALTER TABLE depots
  ADD COLUMN IF NOT EXISTS batiment_id UUID REFERENCES batiments(id) ON DELETE SET NULL;

COMMENT ON COLUMN depots.batiment_id IS '0.58.57 - Bâtiment de rattachement du dépôt (pour filtrage ctx des transferts)';

CREATE INDEX IF NOT EXISTS idx_depots_batiment ON depots(batiment_id) WHERE batiment_id IS NOT NULL;

-- =============================================================
-- Vérifications
-- =============================================================
-- SELECT count(*) FROM pharmacies;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'depots' AND column_name = 'batiment_id';
