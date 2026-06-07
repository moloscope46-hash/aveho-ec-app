-- =============================================================
-- migration-0.62.20-familles-articles-garages-magasin.sql
-- 1. Table familles d'articles (3 niveaux : famille / sous-famille / sous-sous-famille)
-- 2. Colonne articles.famille_id pour rattacher l'article à sa famille
-- 3. Colonne garages.magasin_id (déjà existe en 0.62.16, mais on s'assure)
-- 4. Colonne articles.code_ean13 et code_gs1 (pour étiquettes)
-- 100% idempotent
-- =============================================================

-- 1. Table familles avec parent (auto-référence pour la hiérarchie)
CREATE TABLE IF NOT EXISTS familles_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  magasin_id UUID,
  parent_id UUID REFERENCES familles_articles(id) ON DELETE CASCADE,
  niveau INTEGER NOT NULL DEFAULT 1,  -- 1 = famille, 2 = sous-famille, 3 = sous-sous-famille
  nom TEXT NOT NULL,
  code TEXT,
  description TEXT,
  couleur TEXT DEFAULT '#185FA5',
  icone TEXT DEFAULT 'ti-folder',
  ordre INTEGER DEFAULT 0,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_familles_structure ON familles_articles(structure_id);
CREATE INDEX IF NOT EXISTS idx_familles_magasin ON familles_articles(magasin_id);
CREATE INDEX IF NOT EXISTS idx_familles_parent ON familles_articles(parent_id);
CREATE INDEX IF NOT EXISTS idx_familles_niveau ON familles_articles(niveau);

-- 2. Ajout famille_id sur articles
ALTER TABLE IF EXISTS articles ADD COLUMN IF NOT EXISTS famille_id UUID;
CREATE INDEX IF NOT EXISTS idx_articles_famille ON articles(famille_id);

-- 3. Ajout code_ean13 + code_gs1 sur articles (pour étiquettes)
ALTER TABLE IF EXISTS articles ADD COLUMN IF NOT EXISTS code_ean13 TEXT;
ALTER TABLE IF EXISTS articles ADD COLUMN IF NOT EXISTS code_gs1 TEXT;
CREATE INDEX IF NOT EXISTS idx_articles_ean13 ON articles(code_ean13) WHERE code_ean13 IS NOT NULL;

-- 4. Assurer la colonne magasin_id sur garages (déjà en 0.62.16 normalement)
ALTER TABLE IF EXISTS garages ADD COLUMN IF NOT EXISTS magasin_id UUID;
CREATE INDEX IF NOT EXISTS idx_garages_magasin ON garages(magasin_id);

-- RLS pour familles
ALTER TABLE familles_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS familles_select ON familles_articles;
CREATE POLICY familles_select ON familles_articles FOR SELECT TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS familles_insert ON familles_articles;
CREATE POLICY familles_insert ON familles_articles FOR INSERT TO authenticated
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS familles_update ON familles_articles;
CREATE POLICY familles_update ON familles_articles FOR UPDATE TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS familles_delete ON familles_articles;
CREATE POLICY familles_delete ON familles_articles FOR DELETE TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

-- Vérif
SELECT 'familles_articles' AS info, COUNT(*) AS nb FROM information_schema.tables WHERE table_name = 'familles_articles'
UNION ALL
SELECT 'articles.famille_id', COUNT(*) FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'famille_id'
UNION ALL
SELECT 'articles.code_ean13', COUNT(*) FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'code_ean13'
UNION ALL
SELECT 'articles.code_gs1', COUNT(*) FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'code_gs1';
