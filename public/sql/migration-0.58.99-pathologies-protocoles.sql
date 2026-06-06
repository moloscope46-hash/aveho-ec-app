-- =============================================================
-- migration-0.58.99-pathologies-protocoles.sql
-- Création des pathologies (référentiel commun structure)
-- + rattachement aux services
-- + champ pathologie_id sur patients
-- =============================================================

-- ==========================================
-- Table pathologies
-- ==========================================
CREATE TABLE IF NOT EXISTS pathologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  code TEXT,
  nom TEXT NOT NULL,
  description TEXT,
  icone TEXT DEFAULT 'ti-stethoscope',
  couleur TEXT DEFAULT '#185FA5',
  -- Spécialités/protocoles
  protocole_court TEXT,
  protocole_detail TEXT,
  alertes TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_pathologies_structure ON pathologies(structure_id);
CREATE INDEX IF NOT EXISTS idx_pathologies_actif ON pathologies(actif) WHERE actif = true;

-- ==========================================
-- Table de jointure services <-> pathologies
-- ==========================================
CREATE TABLE IF NOT EXISTS services_pathologies (
  service_id UUID NOT NULL,
  pathologie_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (service_id, pathologie_id)
);
CREATE INDEX IF NOT EXISTS idx_svc_path_svc ON services_pathologies(service_id);
CREATE INDEX IF NOT EXISTS idx_svc_path_path ON services_pathologies(pathologie_id);

-- ==========================================
-- ALTER patients : ajouter pathologie_id
-- ==========================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pathologie_id UUID;
CREATE INDEX IF NOT EXISTS idx_patients_pathologie ON patients(pathologie_id);

-- ==========================================
-- RLS pour pathologies
-- ==========================================
ALTER TABLE pathologies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pathologies_read_auth" ON pathologies;
DROP POLICY IF EXISTS "pathologies_write_auth" ON pathologies;

CREATE POLICY "pathologies_read_auth" ON pathologies FOR SELECT
  TO authenticated
  USING (structure_id IS NOT NULL);

CREATE POLICY "pathologies_write_auth" ON pathologies FOR ALL
  TO authenticated
  USING (structure_id IS NOT NULL)
  WITH CHECK (structure_id IS NOT NULL);

-- RLS pour services_pathologies
ALTER TABLE services_pathologies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "svc_path_all_auth" ON services_pathologies;

CREATE POLICY "svc_path_all_auth" ON services_pathologies FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- Seed quelques pathologies courantes en PSAD
-- ==========================================
-- Note : à ne run qu'une fois — IF NOT EXISTS sur le nom
DO $$
DECLARE
  v_struct UUID;
BEGIN
  -- Récupérer la première structure (à adapter)
  SELECT id INTO v_struct FROM structures LIMIT 1;

  IF v_struct IS NOT NULL THEN
    INSERT INTO pathologies (structure_id, code, nom, description, icone, couleur)
    VALUES
      (v_struct, 'PERF', 'Perfusion à domicile', 'Patient sous perfusion (PERFADOM)', 'ti-droplet', '#185FA5'),
      (v_struct, 'NUT-NED', 'Nutrition entérale', 'NED — Nutrition entérale à domicile', 'ti-meat', '#5aa05a'),
      (v_struct, 'NUT-NPAD', 'Nutrition parentérale', 'NPAD — Nutrition parentérale à domicile', 'ti-flask', '#7a6fb0'),
      (v_struct, 'PPC', 'PPC (Apnée du sommeil)', 'Patient sous Pression Positive Continue', 'ti-wind', '#7CC8C8'),
      (v_struct, 'OXY', 'Oxygénothérapie', 'Patient sous oxygène', 'ti-circle', '#EF9F27'),
      (v_struct, 'CICA', 'Cicatrisation', 'TPN, pansements complexes', 'ti-bandage', '#C9867F'),
      (v_struct, 'VPH', 'Mobilité (VPH)', 'Véhicule pour handicapé physique', 'ti-armchair-2', '#5e4a8c'),
      (v_struct, 'DIAL', 'Dialyse', 'Dialyse péritonéale ou hémodialyse', 'ti-activity', '#e35d5b')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ==========================================
-- Vérification
-- ==========================================
SELECT 'pathologies' AS table, COUNT(*) AS lignes FROM pathologies
UNION ALL
SELECT 'services_pathologies', COUNT(*) FROM services_pathologies;
