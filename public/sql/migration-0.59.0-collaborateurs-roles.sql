-- =============================================================
-- migration-0.59.0-collaborateurs-roles.sql
-- Ajoute :
--   - Table pharmacies (référentiel)
--   - ALTER membres_structure : role_professionnel, pharmacie_id, etablissement_id, service_id, etc.
--   - Vue v_collaborateurs (jointures pour affichage)
--   - ALTER patients : collaborateur_id (médecin référent)
-- =============================================================

-- ==========================================
-- Table pharmacies
-- ==========================================
CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  nom TEXT NOT NULL,
  finess TEXT,
  rpps_etab TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  telephone TEXT,
  email TEXT,
  fax TEXT,
  responsable TEXT,        -- nom du pharmacien titulaire
  actif BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_pharmacies_structure ON pharmacies(structure_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_actif ON pharmacies(actif) WHERE actif = true;

-- ==========================================
-- ALTER membres_structure pour les rôles professionnels
-- (table existante qui lie un user à une structure)
-- ==========================================
ALTER TABLE membres_structure
  ADD COLUMN IF NOT EXISTS role_professionnel TEXT, -- 'infirmier' | 'docteur' | 'pharmacien' | 'aide_soignant' | 'kine' | 'autre'
  ADD COLUMN IF NOT EXISTS specialite TEXT,
  ADD COLUMN IF NOT EXISTS numero_adeli TEXT,
  ADD COLUMN IF NOT EXISTS numero_rpps TEXT,
  ADD COLUMN IF NOT EXISTS pharmacie_id UUID,    -- si role_professionnel = 'pharmacien'
  ADD COLUMN IF NOT EXISTS etablissement_id UUID, -- établissement de rattachement
  ADD COLUMN IF NOT EXISTS service_id UUID,       -- service de rattachement
  ADD COLUMN IF NOT EXISTS prenom TEXT,
  ADD COLUMN IF NOT EXISTS nom TEXT,
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_ms_role_pro ON membres_structure(role_professionnel);
CREATE INDEX IF NOT EXISTS idx_ms_pharmacie ON membres_structure(pharmacie_id);
CREATE INDEX IF NOT EXISTS idx_ms_etab ON membres_structure(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_ms_service ON membres_structure(service_id);

-- ==========================================
-- ALTER patients : collaborateur référent
-- ==========================================
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS collaborateur_id UUID; -- → membres_structure.user_id

CREATE INDEX IF NOT EXISTS idx_patients_collab ON patients(collaborateur_id);

-- ==========================================
-- Vue pratique v_collaborateurs (joint pharmacie/etab/service nom)
-- ==========================================
CREATE OR REPLACE VIEW v_collaborateurs AS
SELECT
  ms.user_id,
  ms.structure_id,
  ms.role,                       -- role applicatif (admin / member / readonly)
  ms.role_professionnel,         -- profession métier
  ms.specialite,
  ms.numero_adeli,
  ms.numero_rpps,
  ms.prenom,
  ms.nom,
  ms.telephone,
  ms.photo_url,
  ms.notes,
  ms.pharmacie_id,
  ph.nom AS pharmacie_nom,
  ms.etablissement_id,
  et.nom AS etablissement_nom,
  ms.service_id,
  sv.nom AS service_nom
FROM membres_structure ms
LEFT JOIN pharmacies ph ON ph.id = ms.pharmacie_id
LEFT JOIN etablissements et ON et.id = ms.etablissement_id
LEFT JOIN services sv ON sv.id = ms.service_id;

-- ==========================================
-- RLS pour pharmacies
-- ==========================================
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacies_read_auth" ON pharmacies;
DROP POLICY IF EXISTS "pharmacies_write_auth" ON pharmacies;

CREATE POLICY "pharmacies_read_auth" ON pharmacies FOR SELECT
  TO authenticated USING (structure_id IS NOT NULL);

CREATE POLICY "pharmacies_write_auth" ON pharmacies FOR ALL
  TO authenticated USING (structure_id IS NOT NULL)
  WITH CHECK (structure_id IS NOT NULL);

-- ==========================================
-- Vérification
-- ==========================================
SELECT 'pharmacies' AS table, COUNT(*) AS lignes FROM pharmacies
UNION ALL SELECT 'membres_structure', COUNT(*) FROM membres_structure
UNION ALL SELECT 'patients (avec collab)', COUNT(*) FROM patients WHERE collaborateur_id IS NOT NULL;

-- Vérifier les colonnes ajoutées
SELECT column_name FROM information_schema.columns
WHERE table_name = 'membres_structure'
  AND column_name IN ('role_professionnel', 'pharmacie_id', 'etablissement_id', 'service_id', 'specialite');
