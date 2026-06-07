-- =============================================================
-- migration-0.60.0-sav-bilans-transferts.sql
-- - Tables bilans_sav + bilans_sav_points + bilans_sav_articles
-- - ALTER demandes_internes : type_demande, bilan_sav_id, article_concerne_id
-- - Table etablissements_magasins_droits (qui peut commander/SAV/transférer où)
-- - Table sav_executions (résultats des contrôles 5 points)
-- =============================================================

-- ==========================================
-- 1. BILANS SAV (templates de contrôles côté magasin)
-- ==========================================
CREATE TABLE IF NOT EXISTS bilans_sav (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magasin_id UUID,
  structure_id UUID,
  code TEXT,
  nom TEXT NOT NULL,
  description TEXT,
  duree_estimee_min INTEGER,
  icone TEXT DEFAULT 'ti-clipboard-check',
  couleur TEXT DEFAULT '#5a8f8f',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

ALTER TABLE bilans_sav
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS duree_estimee_min INTEGER,
  ADD COLUMN IF NOT EXISTS icone TEXT,
  ADD COLUMN IF NOT EXISTS couleur TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_bilans_struct ON bilans_sav(structure_id);
CREATE INDEX IF NOT EXISTS idx_bilans_magasin ON bilans_sav(magasin_id);
CREATE INDEX IF NOT EXISTS idx_bilans_actif ON bilans_sav(actif) WHERE actif = true;

ALTER TABLE bilans_sav ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bilans_read_auth" ON bilans_sav;
DROP POLICY IF EXISTS "bilans_write_auth" ON bilans_sav;
CREATE POLICY "bilans_read_auth" ON bilans_sav FOR SELECT TO authenticated USING (true);
CREATE POLICY "bilans_write_auth" ON bilans_sav FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 2. POINTS DE CONTRÔLE (5 points typiquement)
-- ==========================================
CREATE TABLE IF NOT EXISTS bilans_sav_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id UUID NOT NULL,
  ordre INTEGER DEFAULT 1,
  libelle TEXT NOT NULL,
  description TEXT,
  type_controle TEXT DEFAULT 'oui_non', -- 'oui_non' | 'mesure' | 'texte' | 'photo'
  unite TEXT, -- pour type_controle = mesure (bar, %, °C, mm, etc.)
  valeur_min NUMERIC,
  valeur_max NUMERIC,
  est_obligatoire BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bilans_sav_points
  ADD COLUMN IF NOT EXISTS bilan_id UUID,
  ADD COLUMN IF NOT EXISTS ordre INTEGER,
  ADD COLUMN IF NOT EXISTS libelle TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS type_controle TEXT,
  ADD COLUMN IF NOT EXISTS unite TEXT,
  ADD COLUMN IF NOT EXISTS valeur_min NUMERIC,
  ADD COLUMN IF NOT EXISTS valeur_max NUMERIC,
  ADD COLUMN IF NOT EXISTS est_obligatoire BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_bsp_bilan ON bilans_sav_points(bilan_id);

ALTER TABLE bilans_sav_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsp_read_auth" ON bilans_sav_points;
DROP POLICY IF EXISTS "bsp_write_auth" ON bilans_sav_points;
CREATE POLICY "bsp_read_auth" ON bilans_sav_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "bsp_write_auth" ON bilans_sav_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 3. RATTACHEMENT BILANS <-> ARTICLES (M:N)
-- Quels bilans s'appliquent à quels articles
-- ==========================================
CREATE TABLE IF NOT EXISTS bilans_sav_articles (
  bilan_id UUID NOT NULL,
  article_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (bilan_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_bsa_bilan ON bilans_sav_articles(bilan_id);
CREATE INDEX IF NOT EXISTS idx_bsa_article ON bilans_sav_articles(article_id);

ALTER TABLE bilans_sav_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsa_read_auth" ON bilans_sav_articles;
DROP POLICY IF EXISTS "bsa_write_auth" ON bilans_sav_articles;
CREATE POLICY "bsa_read_auth" ON bilans_sav_articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "bsa_write_auth" ON bilans_sav_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 4. ALTER demandes_internes : type SAV + transfert
-- ==========================================
ALTER TABLE demandes_internes
  ADD COLUMN IF NOT EXISTS type_demande TEXT DEFAULT 'di', -- 'di' | 'sav' | 'transfert'
  ADD COLUMN IF NOT EXISTS bilan_sav_id UUID,
  ADD COLUMN IF NOT EXISTS article_concerne_id UUID,       -- pour SAV : article concerné
  ADD COLUMN IF NOT EXISTS materiel_concerne_id UUID,      -- pour SAV : matériel/série concerné
  ADD COLUMN IF NOT EXISTS depot_source_id UUID,           -- pour transferts
  ADD COLUMN IF NOT EXISTS panne_description TEXT;

CREATE INDEX IF NOT EXISTS idx_di_type ON demandes_internes(type_demande);
CREATE INDEX IF NOT EXISTS idx_di_bilan ON demandes_internes(bilan_sav_id);

-- ==========================================
-- 5. RÉSULTATS DES BILANS SAV EXÉCUTÉS
-- ==========================================
CREATE TABLE IF NOT EXISTS sav_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id UUID,         -- DI de type SAV
  bilan_id UUID,
  point_id UUID,           -- point contrôlé
  resultat TEXT,           -- 'OK' | 'KO' | 'NA' | mesure
  valeur_mesure NUMERIC,
  commentaire TEXT,
  photo_url TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by UUID
);

CREATE INDEX IF NOT EXISTS idx_sav_exec_demande ON sav_executions(demande_id);

ALTER TABLE sav_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sav_exec_read_auth" ON sav_executions;
DROP POLICY IF EXISTS "sav_exec_write_auth" ON sav_executions;
CREATE POLICY "sav_exec_read_auth" ON sav_executions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sav_exec_write_auth" ON sav_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 6. DROITS DES ÉTABLISSEMENTS SUR MAGASINS
-- Quel établissement peut commander/SAV/transférer via quel magasin
-- ==========================================
CREATE TABLE IF NOT EXISTS etablissements_magasins_droits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id UUID NOT NULL,
  magasin_id UUID NOT NULL,
  structure_id UUID,
  droit_commande BOOLEAN DEFAULT true,
  droit_sav BOOLEAN DEFAULT true,
  droit_transfert BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_emd_etab ON etablissements_magasins_droits(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_emd_magasin ON etablissements_magasins_droits(magasin_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_emd_pair ON etablissements_magasins_droits(etablissement_id, magasin_id);

ALTER TABLE etablissements_magasins_droits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emd_read_auth" ON etablissements_magasins_droits;
DROP POLICY IF EXISTS "emd_write_auth" ON etablissements_magasins_droits;
CREATE POLICY "emd_read_auth" ON etablissements_magasins_droits FOR SELECT TO authenticated USING (true);
CREATE POLICY "emd_write_auth" ON etablissements_magasins_droits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- VÉRIFICATION
-- ==========================================
SELECT 'TABLES SAV+DROITS' AS info, table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('bilans_sav', 'bilans_sav_points', 'bilans_sav_articles', 'sav_executions', 'etablissements_magasins_droits')
ORDER BY table_name;
