-- =============================================================
-- HOTFIX-aveho-0.60.2-tout-en-un.sql
-- ⚠ APPLIQUER CE FICHIER SEUL — il remplace tous les SQL 0.59.5 → 0.60.1
-- Crée TOUT ce qui pourrait manquer dans l'ordre correct :
--  1. ALTER magasins (colonnes manquantes)
--  2. ALTER articles (est_catalogue_magasin, magasin_id, article_magasin_id)
--  3. ALTER etablissements_partenaires (est_fournisseur, magasin_id)
--  4. Tables bilans_sav + points + articles + executions
--  5. Tables demandes_internes + lignes + bons_livraison
--  6. ALTER demandes_internes (type_demande, bilan_sav_id, etc.)
--  7. Tables droits magasin + membres rattachement
--  8. Vue v_magasins_disponibles (APRÈS les ALTER)
--  9. Vue v_magasin_di
-- 100% idempotent
-- =============================================================

-- =============================================================
-- 1. ALTER magasins — colonnes manquantes (CRITIQUE : avant la vue)
-- =============================================================
CREATE TABLE IF NOT EXISTS magasins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID,
  nom TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE magasins
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS nom TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS responsable TEXT,
  ADD COLUMN IF NOT EXISTS responsable_user_id UUID,
  ADD COLUMN IF NOT EXISTS favori BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS partenaire_id UUID,
  ADD COLUMN IF NOT EXISTS etablissement_rattache_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_magasins_struct ON magasins(structure_id);
CREATE INDEX IF NOT EXISTS idx_magasins_etab_rattache ON magasins(etablissement_rattache_id);

ALTER TABLE magasins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mag_read" ON magasins;
DROP POLICY IF EXISTS "mag_write" ON magasins;
CREATE POLICY "mag_read" ON magasins FOR SELECT TO authenticated USING (true);
CREATE POLICY "mag_write" ON magasins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================
-- 2. ALTER articles
-- =============================================================
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS article_magasin_id UUID,
  ADD COLUMN IF NOT EXISTS est_catalogue_magasin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_actuel NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_articles_magasin ON articles(magasin_id);
CREATE INDEX IF NOT EXISTS idx_articles_corresp ON articles(article_magasin_id);
CREATE INDEX IF NOT EXISTS idx_articles_cat_mag ON articles(est_catalogue_magasin) WHERE est_catalogue_magasin = true;

-- =============================================================
-- 3. ALTER etablissements_partenaires
-- =============================================================
ALTER TABLE etablissements_partenaires
  ADD COLUMN IF NOT EXISTS est_fournisseur BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS magasin_id UUID;

CREATE INDEX IF NOT EXISTS idx_partenaires_fournisseur
  ON etablissements_partenaires(est_fournisseur)
  WHERE est_fournisseur = true;

-- =============================================================
-- 4. TABLES demandes_internes + lignes + BL
-- =============================================================
CREATE TABLE IF NOT EXISTS demandes_internes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE demandes_internes
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'nouvelle',
  ADD COLUMN IF NOT EXISTS priorite TEXT DEFAULT 'normale',
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS depot_destination_id UUID,
  ADD COLUMN IF NOT EXISTS depot_source_id UUID,
  ADD COLUMN IF NOT EXISTS etablissement_id UUID,
  ADD COLUMN IF NOT EXISTS service_id UUID,
  ADD COLUMN IF NOT EXISTS commentaire TEXT,
  ADD COLUMN IF NOT EXISTS motif_refus TEXT,
  ADD COLUMN IF NOT EXISTS numero_bl TEXT,
  ADD COLUMN IF NOT EXISTS validee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validee_par UUID,
  ADD COLUMN IF NOT EXISTS refusee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refusee_par UUID,
  ADD COLUMN IF NOT EXISTS livree_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cloturee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recue_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recue_par UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS type_demande TEXT DEFAULT 'di',
  ADD COLUMN IF NOT EXISTS bilan_sav_id UUID,
  ADD COLUMN IF NOT EXISTS article_concerne_id UUID,
  ADD COLUMN IF NOT EXISTS materiel_concerne_id UUID,
  ADD COLUMN IF NOT EXISTS panne_description TEXT;

CREATE INDEX IF NOT EXISTS idx_di_struct ON demandes_internes(structure_id);
CREATE INDEX IF NOT EXISTS idx_di_statut ON demandes_internes(statut);
CREATE INDEX IF NOT EXISTS idx_di_magasin ON demandes_internes(magasin_id);
CREATE INDEX IF NOT EXISTS idx_di_type ON demandes_internes(type_demande);

ALTER TABLE demandes_internes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "di_read" ON demandes_internes;
DROP POLICY IF EXISTS "di_write" ON demandes_internes;
CREATE POLICY "di_read" ON demandes_internes FOR SELECT TO authenticated USING (true);
CREATE POLICY "di_write" ON demandes_internes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS demandes_internes_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id UUID,
  article_id UUID,
  libelle TEXT,
  code TEXT,
  quantite_demandee NUMERIC DEFAULT 1,
  quantite_validee NUMERIC,
  quantite_livree NUMERIC,
  unite TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dil_demande ON demandes_internes_lignes(demande_id);
ALTER TABLE demandes_internes_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dil_all" ON demandes_internes_lignes;
CREATE POLICY "dil_all" ON demandes_internes_lignes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bons_livraison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID,
  demande_id UUID,
  numero TEXT,
  statut TEXT DEFAULT 'draft',
  date_emission TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);
ALTER TABLE bons_livraison ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bl_all" ON bons_livraison;
CREATE POLICY "bl_all" ON bons_livraison FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================
-- 5. TABLES bilans_sav + points + articles + executions
-- =============================================================
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
ALTER TABLE bilans_sav ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bilans_all" ON bilans_sav;
CREATE POLICY "bilans_all" ON bilans_sav FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bilans_sav_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id UUID NOT NULL,
  ordre INTEGER DEFAULT 1,
  libelle TEXT NOT NULL,
  description TEXT,
  type_controle TEXT DEFAULT 'oui_non',
  unite TEXT,
  valeur_min NUMERIC,
  valeur_max NUMERIC,
  est_obligatoire BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bsp_bilan ON bilans_sav_points(bilan_id);
ALTER TABLE bilans_sav_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsp_all" ON bilans_sav_points;
CREATE POLICY "bsp_all" ON bilans_sav_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bilans_sav_articles (
  bilan_id UUID NOT NULL,
  article_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (bilan_id, article_id)
);
ALTER TABLE bilans_sav_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsa_all" ON bilans_sav_articles;
CREATE POLICY "bsa_all" ON bilans_sav_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS sav_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id UUID,
  bilan_id UUID,
  point_id UUID,
  resultat TEXT,
  valeur_mesure NUMERIC,
  commentaire TEXT,
  photo_url TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by UUID
);
ALTER TABLE sav_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sav_exec_all" ON sav_executions;
CREATE POLICY "sav_exec_all" ON sav_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================
-- 6. TABLES droits magasin + rattachement membres
-- =============================================================
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
DROP POLICY IF EXISTS "emd_all" ON etablissements_magasins_droits;
CREATE POLICY "emd_all" ON etablissements_magasins_droits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ALTER membres_structure : rattachement magasin
ALTER TABLE membres_structure
  ADD COLUMN IF NOT EXISTS magasin_fournisseur_id UUID;

CREATE INDEX IF NOT EXISTS idx_ms_magasin_four
  ON membres_structure(magasin_fournisseur_id)
  WHERE magasin_fournisseur_id IS NOT NULL;

-- Index unique : un magasin = un user fournisseur max
DROP INDEX IF EXISTS uq_ms_magasin_four;
CREATE UNIQUE INDEX uq_ms_magasin_four
  ON membres_structure(magasin_fournisseur_id)
  WHERE magasin_fournisseur_id IS NOT NULL;

-- =============================================================
-- 7. VUES (APRÈS les ALTER, sinon les colonnes manquent)
-- DROP d'abord pour pouvoir changer la structure des colonnes
-- =============================================================
DROP VIEW IF EXISTS v_magasin_di;
DROP VIEW IF EXISTS v_magasins_disponibles;

CREATE VIEW v_magasin_di AS
SELECT
  d.id,
  d.numero,
  d.created_at,
  d.statut,
  d.priorite,
  d.magasin_id,
  d.depot_destination_id,
  d.structure_id,
  d.commentaire,
  d.numero_bl,
  d.created_by,
  d.type_demande,
  d.panne_description,
  (SELECT COUNT(*) FROM demandes_internes_lignes WHERE demande_id = d.id) AS nb_lignes,
  (SELECT SUM(quantite_demandee) FROM demandes_internes_lignes WHERE demande_id = d.id) AS qte_totale
FROM demandes_internes d
ORDER BY d.created_at DESC;

CREATE VIEW v_magasins_disponibles AS
SELECT
  m.id,
  m.nom,
  m.ville,
  m.code_postal,
  m.etablissement_rattache_id,
  m.structure_id,
  CASE
    WHEN ms.user_id IS NOT NULL THEN true
    ELSE false
  END AS est_rattache,
  ms.user_id AS rattache_user_id
FROM magasins m
LEFT JOIN membres_structure ms ON ms.magasin_fournisseur_id = m.id
WHERE m.actif = true OR m.actif IS NULL
ORDER BY m.nom;

-- =============================================================
-- VÉRIFICATION FINALE
-- =============================================================
SELECT 'TABLES OK' AS info, table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'magasins', 'articles', 'etablissements_partenaires',
  'demandes_internes', 'demandes_internes_lignes', 'bons_livraison',
  'bilans_sav', 'bilans_sav_points', 'bilans_sav_articles', 'sav_executions',
  'etablissements_magasins_droits', 'membres_structure'
) ORDER BY table_name;

SELECT 'COLONNES MAGASINS OK' AS info, column_name FROM information_schema.columns
WHERE table_name = 'magasins' AND column_name IN ('code_postal', 'ville', 'etablissement_rattache_id', 'responsable_user_id')
ORDER BY column_name;
