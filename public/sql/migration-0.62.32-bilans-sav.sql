-- =============================================================
-- migration-0.62.32-bilans-sav.sql
-- Table bilans_sav avec 5 points de contrôle + photos + signatures
-- 100% idempotent
-- =============================================================

-- Bucket Storage pour photos SAV (créer manuellement dans Supabase si pas fait)
-- Bucket name: sav-photos
-- Public: false (signed URLs uniquement)

CREATE TABLE IF NOT EXISTS bilans_sav (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  structure_id UUID NOT NULL,
  -- Lien vers DI/SAV d'origine
  sav_id UUID,                -- demandes_internes.id (type SAV)
  materiel_id UUID,
  article_id UUID,
  -- Technicien
  technicien_user_id UUID,
  technicien_nom TEXT,
  -- Workflow
  statut TEXT DEFAULT 'en_cours',
  -- 'en_cours' : technicien en train de remplir
  -- 'termine' : technicien a fini, attend validation EC
  -- 'valide_ec' : étab a validé + signé
  -- 'refuse_ec' : étab a refusé, à reprendre
  date_debut TIMESTAMPTZ DEFAULT NOW(),
  date_fin TIMESTAMPTZ,
  -- 5 points de contrôle stockés en JSONB :
  -- [{n:1, libelle:"Aspect général", conforme:true, commentaire:"OK"},
  --  {n:2, libelle:"Fonctionnement", conforme:false, commentaire:"Cable HS"}, ...]
  points JSONB DEFAULT '[]',
  -- Synthèse globale
  resultat TEXT,              -- 'conforme' | 'non_conforme' | 'reparable' | 'a_remplacer'
  diagnostic TEXT,
  preconisations TEXT,
  -- Signatures (URL Storage ou data:image base64)
  signature_technicien_url TEXT,
  signature_ec_url TEXT,
  signature_ec_par UUID,
  signature_ec_le TIMESTAMPTZ,
  signature_ec_nom TEXT,
  -- Refus
  motif_refus TEXT,
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bilans_sav_structure ON bilans_sav(structure_id);
CREATE INDEX IF NOT EXISTS idx_bilans_sav_sav ON bilans_sav(sav_id);
CREATE INDEX IF NOT EXISTS idx_bilans_sav_materiel ON bilans_sav(materiel_id);
CREATE INDEX IF NOT EXISTS idx_bilans_sav_technicien ON bilans_sav(technicien_user_id);
CREATE INDEX IF NOT EXISTS idx_bilans_sav_statut ON bilans_sav(statut);

-- Table photos séparée (1 photo par point + photos globales)
CREATE TABLE IF NOT EXISTS bilans_sav_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id UUID NOT NULL REFERENCES bilans_sav(id) ON DELETE CASCADE,
  point_n INTEGER,            -- 1-5 ou NULL pour photo globale
  url TEXT NOT NULL,           -- URL Storage
  filename TEXT,
  taille_octets INTEGER,
  taken_by UUID,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  commentaire TEXT
);

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
DROP POLICY IF EXISTS bilans_sav_photos_delete ON bilans_sav_photos;
CREATE POLICY bilans_sav_photos_delete ON bilans_sav_photos FOR DELETE TO authenticated
  USING (bilan_id IN (SELECT id FROM bilans_sav WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

-- Vue analytics SAV
CREATE OR REPLACE VIEW v_sav_analytics AS
SELECT
  structure_id,
  COUNT(*) FILTER (WHERE statut = 'en_cours') AS nb_en_cours,
  COUNT(*) FILTER (WHERE statut = 'termine') AS nb_a_valider,
  COUNT(*) FILTER (WHERE statut = 'valide_ec') AS nb_valides,
  COUNT(*) FILTER (WHERE statut = 'refuse_ec') AS nb_refuses,
  COUNT(*) FILTER (WHERE resultat = 'conforme') AS nb_conformes,
  COUNT(*) FILTER (WHERE resultat = 'non_conforme') AS nb_non_conformes,
  COUNT(*) FILTER (WHERE resultat = 'reparable') AS nb_reparables,
  COUNT(*) FILTER (WHERE resultat = 'a_remplacer') AS nb_a_remplacer,
  ROUND(AVG(EXTRACT(EPOCH FROM (date_fin - date_debut)) / 60))::INTEGER AS duree_moyenne_min,
  COUNT(*) AS total
FROM bilans_sav
GROUP BY structure_id;

-- Vérif
SELECT 'bilans_sav' AS info, (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'bilans_sav') AS table_exists
UNION ALL SELECT 'bilans_sav_photos', (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'bilans_sav_photos')
UNION ALL SELECT 'v_sav_analytics', (SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_sav_analytics');
