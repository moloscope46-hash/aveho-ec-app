-- =============================================================
-- Migration 0.58.69 : table stock_mouvements pour traçabilité
-- =============================================================
-- Permet de tracer les entrées/sorties de stock par article
-- avec lot/série/péremption, alimentée par le scan code-barre.
-- =============================================================

CREATE TABLE IF NOT EXISTS stock_mouvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  etablissement_id UUID,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'entree',     -- "entree" | "sortie" | "ajustement" | "retour"
  quantite NUMERIC(10,2) NOT NULL DEFAULT 1,
  -- Tracabilité (si l'article gere_lot/serie/peremption)
  lot TEXT,
  numero_serie TEXT,
  date_peremption DATE,
  -- Rattachements optionnels
  depot_id UUID,
  patient_id UUID,
  fournisseur_id UUID,
  -- Métadonnées
  prix_achat_unitaire NUMERIC(10,4),       -- snapshot prix au moment du mouvement
  notes TEXT,
  user_id UUID,
  user_email TEXT,                          -- snapshot (en cas de suppression user)
  source TEXT,                              -- "scan_barcode" | "manuel" | "import" | "transfert"
  reference_externe TEXT,                   -- ex: BL fournisseur, n° facture
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_mvts_article ON stock_mouvements(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_mvts_structure ON stock_mouvements(structure_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_mvts_type ON stock_mouvements(type);
CREATE INDEX IF NOT EXISTS idx_stock_mvts_lot ON stock_mouvements(lot) WHERE lot IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_mvts_serie ON stock_mouvements(numero_serie) WHERE numero_serie IS NOT NULL;

-- RLS : lecture pour la structure, écriture pour membres de la structure
ALTER TABLE stock_mouvements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_mvts_read_struct" ON stock_mouvements;
CREATE POLICY "stock_mvts_read_struct"
  ON stock_mouvements FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "stock_mvts_insert_member" ON stock_mouvements;
CREATE POLICY "stock_mvts_insert_member"
  ON stock_mouvements FOR INSERT
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "stock_mvts_update_admin" ON stock_mouvements;
CREATE POLICY "stock_mvts_update_admin"
  ON stock_mouvements FOR UPDATE
  USING (
    structure_id IN (
      SELECT structure_id FROM membres_structure
      WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
    )
  );

COMMENT ON TABLE stock_mouvements IS '0.58.69 - Traçabilité des mouvements de stock par article';
COMMENT ON COLUMN stock_mouvements.source IS 'Origine du mouvement: scan_barcode | manuel | import | transfert';
