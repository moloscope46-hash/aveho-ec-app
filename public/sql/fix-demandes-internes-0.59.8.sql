-- =============================================================
-- fix-demandes-internes-0.59.8.sql
-- Crée les tables demandes_internes + demandes_internes_lignes + bons_livraison
-- si elles n'existent pas, puis recrée la vue v_magasin_di.
-- 100% idempotent, safe à re-run.
-- =============================================================

-- ==========================================
-- TABLE demandes_internes
-- ==========================================
CREATE TABLE IF NOT EXISTS demandes_internes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  numero TEXT,
  statut TEXT DEFAULT 'nouvelle',
  priorite TEXT DEFAULT 'normale',
  magasin_id UUID,
  depot_destination_id UUID,
  etablissement_id UUID,
  service_id UUID,
  commentaire TEXT,
  motif_refus TEXT,
  numero_bl TEXT,
  date_souhaitee DATE,
  validee_at TIMESTAMPTZ,
  validee_par UUID,
  refusee_at TIMESTAMPTZ,
  refusee_par UUID,
  livree_at TIMESTAMPTZ,
  cloturee_at TIMESTAMPTZ,
  recue_at TIMESTAMPTZ,
  recue_par UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

ALTER TABLE demandes_internes
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'nouvelle',
  ADD COLUMN IF NOT EXISTS priorite TEXT,
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS depot_destination_id UUID,
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
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS idx_di_struct ON demandes_internes(structure_id);
CREATE INDEX IF NOT EXISTS idx_di_statut ON demandes_internes(statut);
CREATE INDEX IF NOT EXISTS idx_di_magasin ON demandes_internes(magasin_id);
CREATE INDEX IF NOT EXISTS idx_di_created_by ON demandes_internes(created_by);

ALTER TABLE demandes_internes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "di_read_auth" ON demandes_internes;
DROP POLICY IF EXISTS "di_write_auth" ON demandes_internes;
CREATE POLICY "di_read_auth" ON demandes_internes FOR SELECT TO authenticated USING (structure_id IS NOT NULL);
CREATE POLICY "di_write_auth" ON demandes_internes FOR ALL TO authenticated USING (structure_id IS NOT NULL) WITH CHECK (structure_id IS NOT NULL);

-- ==========================================
-- TABLE demandes_internes_lignes
-- ==========================================
CREATE TABLE IF NOT EXISTS demandes_internes_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id UUID NOT NULL,
  article_id UUID,
  libelle TEXT,
  code TEXT,
  quantite_demandee NUMERIC DEFAULT 1,
  quantite_validee NUMERIC,
  quantite_livree NUMERIC,
  unite TEXT DEFAULT 'unité',
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE demandes_internes_lignes
  ADD COLUMN IF NOT EXISTS demande_id UUID,
  ADD COLUMN IF NOT EXISTS article_id UUID,
  ADD COLUMN IF NOT EXISTS libelle TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS quantite_demandee NUMERIC,
  ADD COLUMN IF NOT EXISTS quantite_validee NUMERIC,
  ADD COLUMN IF NOT EXISTS quantite_livree NUMERIC,
  ADD COLUMN IF NOT EXISTS unite TEXT;

CREATE INDEX IF NOT EXISTS idx_dil_demande ON demandes_internes_lignes(demande_id);
CREATE INDEX IF NOT EXISTS idx_dil_article ON demandes_internes_lignes(article_id);

ALTER TABLE demandes_internes_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dil_read_auth" ON demandes_internes_lignes;
DROP POLICY IF EXISTS "dil_write_auth" ON demandes_internes_lignes;
CREATE POLICY "dil_read_auth" ON demandes_internes_lignes FOR SELECT TO authenticated USING (true);
CREATE POLICY "dil_write_auth" ON demandes_internes_lignes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- TABLE bons_livraison (pour génération BL)
-- ==========================================
CREATE TABLE IF NOT EXISTS bons_livraison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  demande_id UUID,
  numero TEXT,
  statut TEXT DEFAULT 'draft',
  date_emission TIMESTAMPTZ DEFAULT NOW(),
  date_livraison TIMESTAMPTZ,
  signataire_emetteur TEXT,
  signataire_recepteur TEXT,
  signature_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

ALTER TABLE bons_livraison
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS demande_id UUID,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS date_emission TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_livraison TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signataire_emetteur TEXT,
  ADD COLUMN IF NOT EXISTS signataire_recepteur TEXT,
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_bl_struct ON bons_livraison(structure_id);
CREATE INDEX IF NOT EXISTS idx_bl_demande ON bons_livraison(demande_id);
CREATE INDEX IF NOT EXISTS idx_bl_numero ON bons_livraison(numero);

ALTER TABLE bons_livraison ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bl_read_auth" ON bons_livraison;
DROP POLICY IF EXISTS "bl_write_auth" ON bons_livraison;
CREATE POLICY "bl_read_auth" ON bons_livraison FOR SELECT TO authenticated USING (structure_id IS NOT NULL);
CREATE POLICY "bl_write_auth" ON bons_livraison FOR ALL TO authenticated USING (structure_id IS NOT NULL) WITH CHECK (structure_id IS NOT NULL);

-- ==========================================
-- VUE v_magasin_di (recréée après la table)
-- ==========================================
CREATE OR REPLACE VIEW v_magasin_di AS
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
  (SELECT COUNT(*) FROM demandes_internes_lignes WHERE demande_id = d.id) AS nb_lignes,
  (SELECT SUM(quantite_demandee) FROM demandes_internes_lignes WHERE demande_id = d.id) AS qte_totale
FROM demandes_internes d
ORDER BY d.created_at DESC;

-- ==========================================
-- VÉRIFICATION
-- ==========================================
SELECT 'TABLES CRÉÉES' AS info, table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('demandes_internes', 'demandes_internes_lignes', 'bons_livraison')
ORDER BY table_name;
