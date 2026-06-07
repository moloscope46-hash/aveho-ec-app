-- =============================================================
-- migration-0.61.1-inventaires-historique.sql
-- - Table inventaires (sessions d'inventaire)
-- - Table inventaires_lignes (résultats par article)
-- 100% idempotent
-- =============================================================

CREATE TABLE IF NOT EXISTS inventaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID,
  depot_id UUID NOT NULL,
  numero TEXT,                          -- INV-YYYYMMDD-XXXX
  statut TEXT DEFAULT 'en_cours',       -- en_cours, valide, archive
  date_debut TIMESTAMPTZ DEFAULT NOW(),
  date_fin TIMESTAMPTZ,
  notes TEXT,
  nb_articles_comptes INTEGER DEFAULT 0,
  nb_exact INTEGER DEFAULT 0,
  nb_surstock INTEGER DEFAULT 0,
  nb_manquants INTEGER DEFAULT 0,
  ecart_valeur_total NUMERIC(12,2),     -- somme abs des écarts
  -- Workflow validation
  valide_par UUID,
  valide_at TIMESTAMPTZ,
  ajustement_stock_genere BOOLEAN DEFAULT false,
  signature TEXT,
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_inv_struct ON inventaires(structure_id);
CREATE INDEX IF NOT EXISTS idx_inv_depot ON inventaires(depot_id);
CREATE INDEX IF NOT EXISTS idx_inv_statut ON inventaires(statut);

ALTER TABLE inventaires ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_all" ON inventaires;
CREATE POLICY "inv_all" ON inventaires FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventaires_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventaire_id UUID NOT NULL,
  article_id UUID,
  libelle TEXT,
  code TEXT,
  quantite_theorique NUMERIC,
  quantite_comptee NUMERIC,
  ecart NUMERIC,                         -- comptée - théorique
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invl_inv ON inventaires_lignes(inventaire_id);
CREATE INDEX IF NOT EXISTS idx_invl_art ON inventaires_lignes(article_id);

ALTER TABLE inventaires_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invl_all" ON inventaires_lignes;
CREATE POLICY "invl_all" ON inventaires_lignes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ALTER stock_mouvements pour traçabilité ajustement inventaire
ALTER TABLE stock_mouvements
  ADD COLUMN IF NOT EXISTS inventaire_id UUID,
  ADD COLUMN IF NOT EXISTS source_motif TEXT;        -- 'inventaire', 'di', 'sav', 'transfert', 'manuel'

CREATE INDEX IF NOT EXISTS idx_stock_mvt_inventaire ON stock_mouvements(inventaire_id);

-- VÉRIFICATION
SELECT 'TABLES OK' AS info, table_name FROM information_schema.tables
WHERE table_name IN ('inventaires', 'inventaires_lignes')
ORDER BY table_name;
