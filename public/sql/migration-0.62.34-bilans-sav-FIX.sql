-- =============================================================
-- migration-0.62.34-bilans-sav-FIX.sql
-- Fix : ajoute les colonnes manquantes si bilans_sav existait déjà partiellement
-- 100% idempotent, à relancer même après l'erreur 0.62.32
-- =============================================================

-- Si la table existe mais qu'il manque des colonnes, les ajouter :
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS structure_id UUID;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS sav_id UUID;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS materiel_id UUID;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS article_id UUID;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS technicien_user_id UUID;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS technicien_nom TEXT;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'en_cours';
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS date_debut TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS date_fin TIMESTAMPTZ;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS points JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS resultat TEXT;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS diagnostic TEXT;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS preconisations TEXT;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS signature_technicien_url TEXT;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS signature_ec_url TEXT;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS signature_ec_par UUID;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS signature_ec_le TIMESTAMPTZ;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS signature_ec_nom TEXT;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS motif_refus TEXT;
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS bilans_sav ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Si la table n'existait pas, la créer maintenant en complet
CREATE TABLE IF NOT EXISTS bilans_sav (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Indexes (idempotents)
CREATE INDEX IF NOT EXISTS idx_bilans_sav_structure ON bilans_sav(structure_id);
CREATE INDEX IF NOT EXISTS idx_bilans_sav_sav ON bilans_sav(sav_id);
CREATE INDEX IF NOT EXISTS idx_bilans_sav_materiel ON bilans_sav(materiel_id);
CREATE INDEX IF NOT EXISTS idx_bilans_sav_technicien ON bilans_sav(technicien_user_id);
CREATE INDEX IF NOT EXISTS idx_bilans_sav_statut ON bilans_sav(statut);

-- Photos
CREATE TABLE IF NOT EXISTS bilans_sav_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id UUID NOT NULL,
  point_n INTEGER,
  url TEXT NOT NULL,
  filename TEXT,
  taille_octets INTEGER,
  taken_by UUID,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  commentaire TEXT
);

-- Ajout FK CASCADE si pas déjà fait
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bilans_sav_photos_bilan_id_fkey') THEN
    ALTER TABLE bilans_sav_photos ADD CONSTRAINT bilans_sav_photos_bilan_id_fkey FOREIGN KEY (bilan_id) REFERENCES bilans_sav(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_bilans_sav_photos_bilan ON bilans_sav_photos(bilan_id);

-- RLS
ALTER TABLE bilans_sav ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bilans_sav_select ON bilans_sav;
CREATE POLICY bilans_sav_select ON bilans_sav FOR SELECT TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS bilans_sav_insert ON bilans_sav;
CREATE POLICY bilans_sav_insert ON bilans_sav FOR INSERT TO authenticated
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS bilans_sav_update ON bilans_sav;
CREATE POLICY bilans_sav_update ON bilans_sav FOR UPDATE TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

ALTER TABLE bilans_sav_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bilans_sav_photos_select ON bilans_sav_photos;
CREATE POLICY bilans_sav_photos_select ON bilans_sav_photos FOR SELECT TO authenticated
  USING (bilan_id IN (SELECT id FROM bilans_sav WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));
DROP POLICY IF EXISTS bilans_sav_photos_insert ON bilans_sav_photos;
CREATE POLICY bilans_sav_photos_insert ON bilans_sav_photos FOR INSERT TO authenticated
  WITH CHECK (bilan_id IN (SELECT id FROM bilans_sav WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

-- Vue analytics
DROP VIEW IF EXISTS v_sav_analytics;
CREATE VIEW v_sav_analytics AS
SELECT
  structure_id,
  COUNT(*) FILTER (WHERE statut = 'en_cours') AS nb_en_cours,
  COUNT(*) FILTER (WHERE statut = 'termine') AS nb_a_valider,
  COUNT(*) FILTER (WHERE statut = 'valide_ec') AS nb_valides,
  COUNT(*) FILTER (WHERE statut = 'refuse_ec') AS nb_refuses,
  COUNT(*) AS total
FROM bilans_sav
GROUP BY structure_id;

-- Vérif
SELECT 'OK' AS info,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'bilans_sav' AND column_name = 'sav_id') AS sav_id_existe;
