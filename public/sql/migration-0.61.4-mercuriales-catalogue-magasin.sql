-- =============================================================
-- migration-0.61.4-mercuriales-catalogue-magasin.sql
-- - HOTFIX vue v_analytics_sav (si pas créée précédemment)
-- - Mercuriales + Marchés magasin
-- - Catalogue articles propres au magasin
-- - Rattachement étab-articles aux articles magasin
-- 100% idempotent
-- =============================================================

-- ==========================================
-- 1. HOTFIX vue v_analytics_sav (404 si pas appliquée)
-- ==========================================
-- S'assurer que les colonnes nécessaires existent
ALTER TABLE IF EXISTS bilans_sav_executions ADD COLUMN IF NOT EXISTS verdict TEXT;
ALTER TABLE IF EXISTS bilans_sav_executions ADD COLUMN IF NOT EXISTS structure_id UUID;
ALTER TABLE IF EXISTS bilans_sav_executions ADD COLUMN IF NOT EXISTS magasin_id UUID;
ALTER TABLE IF EXISTS bilans_sav_executions ADD COLUMN IF NOT EXISTS executee_at TIMESTAMPTZ;

DROP VIEW IF EXISTS v_analytics_sav;
CREATE OR REPLACE VIEW v_analytics_sav AS
SELECT
  bse.id, bse.bilan_sav_id, bse.demande_id, bse.verdict, bse.executee_at,
  bse.structure_id, bse.magasin_id, bse.created_at,
  bs.nom AS bilan_nom,
  (SELECT COUNT(*) FROM bilans_sav_points WHERE bilan_sav_id = bse.bilan_sav_id) AS nb_points_total
FROM bilans_sav_executions bse
LEFT JOIN bilans_sav bs ON bs.id = bse.bilan_sav_id;

-- ==========================================
-- 2. Catalogue articles magasin (table articles déjà existe)
-- ==========================================
-- Ajout colonne magasin_id pour distinguer les articles "magasin" du catalogue général
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS est_catalogue_magasin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prix_public_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS prix_achat_ht NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_articles_magasin ON articles(magasin_id) WHERE magasin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_catalogue ON articles(est_catalogue_magasin) WHERE est_catalogue_magasin = true;

-- ==========================================
-- 3. Rattachement article étab → article magasin
-- ==========================================
CREATE TABLE IF NOT EXISTS articles_rattachements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_etablissement_id UUID NOT NULL,    -- article propre à l'étab
  article_magasin_id UUID NOT NULL,          -- article du catalogue magasin
  magasin_id UUID,
  etablissement_id UUID,
  prix_negocie_ht NUMERIC(10,2),             -- prix négocié pour cet étab (peut overrider mercuriale)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(article_etablissement_id, article_magasin_id)
);

CREATE INDEX IF NOT EXISTS idx_ar_etab ON articles_rattachements(article_etablissement_id);
CREATE INDEX IF NOT EXISTS idx_ar_magasin ON articles_rattachements(article_magasin_id);
CREATE INDEX IF NOT EXISTS idx_ar_magasin_id ON articles_rattachements(magasin_id);

ALTER TABLE articles_rattachements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ar_all" ON articles_rattachements;
CREATE POLICY "ar_all" ON articles_rattachements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 4. Mercuriales (catalogue de prix par étab)
-- ==========================================
CREATE TABLE IF NOT EXISTS mercuriales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT,                            -- MERCU-2026-001
  nom TEXT NOT NULL,
  magasin_id UUID,
  structure_id UUID,
  etablissement_id UUID,                  -- mercuriale spécifique à un étab (sinon générique)
  type_document TEXT DEFAULT 'mercuriale', -- mercuriale, marche, devis, contrat
  date_debut DATE,
  date_fin DATE,
  statut TEXT DEFAULT 'brouillon',        -- brouillon, en_validation, active, expiree, archivee
  remise_globale_pct NUMERIC(5,2) DEFAULT 0,
  conditions_paiement TEXT,
  conditions_livraison TEXT,
  notes TEXT,
  pdf_url TEXT,
  signee_par UUID,
  signee_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_mer_magasin ON mercuriales(magasin_id);
CREATE INDEX IF NOT EXISTS idx_mer_etab ON mercuriales(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_mer_statut ON mercuriales(statut);

ALTER TABLE mercuriales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mer_all" ON mercuriales;
CREATE POLICY "mer_all" ON mercuriales FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 5. Lignes de mercuriale (articles + prix)
-- ==========================================
CREATE TABLE IF NOT EXISTS mercuriales_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mercuriale_id UUID NOT NULL,
  article_id UUID,                       -- article du catalogue magasin
  libelle TEXT,                          -- copie pour archive
  code TEXT,
  prix_unitaire_ht NUMERIC(10,2),
  remise_pct NUMERIC(5,2) DEFAULT 0,
  prix_negocie_ht NUMERIC(10,2),         -- prix final après remise
  quantite_min INTEGER,
  quantite_max INTEGER,
  unite TEXT,
  ordre INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merl_mer ON mercuriales_lignes(mercuriale_id);
CREATE INDEX IF NOT EXISTS idx_merl_art ON mercuriales_lignes(article_id);

ALTER TABLE mercuriales_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merl_all" ON mercuriales_lignes;
CREATE POLICY "merl_all" ON mercuriales_lignes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 6. Vue : catalogue magasin avec stats
-- ==========================================
DROP VIEW IF EXISTS v_catalogue_magasin;
CREATE OR REPLACE VIEW v_catalogue_magasin AS
SELECT
  a.id, a.libelle, a.code, a.reference, a.unite,
  a.prix_public_ht, a.prix_achat_ht,
  a.magasin_id, a.structure_id, a.est_catalogue_magasin,
  a.actif, a.created_at,
  -- Nb d'étabs rattachés à cet article magasin
  (SELECT COUNT(DISTINCT etablissement_id) FROM articles_rattachements WHERE article_magasin_id = a.id) AS nb_etabs_rattaches,
  -- Nb de mercuriales actives où cet article apparait
  (SELECT COUNT(DISTINCT m.id) FROM mercuriales m
   JOIN mercuriales_lignes ml ON ml.mercuriale_id = m.id
   WHERE ml.article_id = a.id AND m.statut = 'active') AS nb_mercuriales_actives
FROM articles a
WHERE a.est_catalogue_magasin = true;

-- ==========================================
-- 7. RPC pour cantonnement notifications par magasin
-- ==========================================
CREATE OR REPLACE FUNCTION notifications_magasin(magasin_uuid UUID)
RETURNS SETOF notifications AS $$
  SELECT n.* FROM notifications n
  WHERE n.user_id IN (
    SELECT user_id FROM membres_structure_magasins WHERE magasin_id = magasin_uuid
  )
  OR n.url LIKE '%magasin=' || magasin_uuid::text || '%'
  ORDER BY n.created_at DESC
  LIMIT 50;
$$ LANGUAGE SQL STABLE;

-- ==========================================
-- VÉRIFICATION
-- ==========================================
SELECT 'TABLES' AS info, table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'articles_rattachements', 'mercuriales', 'mercuriales_lignes'
) ORDER BY table_name;
SELECT 'VIEWS' AS info, table_name FROM information_schema.views
WHERE table_schema = 'public' AND table_name IN ('v_analytics_sav', 'v_catalogue_magasin');
