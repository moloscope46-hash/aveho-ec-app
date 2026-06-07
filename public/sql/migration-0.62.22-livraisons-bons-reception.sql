-- =============================================================
-- migration-0.62.22-livraisons-bons-reception.sql
-- Table bons_reception : trace les validations de livraison
-- (avec ou sans conformité, lien vers tournée/transfert/DI source)
-- 100% idempotent
-- =============================================================

CREATE TABLE IF NOT EXISTS bons_reception (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  structure_id UUID NOT NULL,
  etablissement_id UUID,
  -- source de la livraison
  type_source TEXT NOT NULL,  -- 'tournee' | 'transfert' | 'di' | 'commande'
  source_id UUID NOT NULL,
  -- détails
  conforme BOOLEAN DEFAULT TRUE,
  anomalies TEXT,
  commentaire TEXT,
  signataire_email TEXT,
  signature_url TEXT,         -- URL Storage de la signature image
  receptionne_par UUID,
  receptionne_le TIMESTAMPTZ DEFAULT NOW(),
  statut TEXT DEFAULT 'valide', -- 'valide' | 'litige' | 'refuse'
  -- métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bons_reception_structure ON bons_reception(structure_id);
CREATE INDEX IF NOT EXISTS idx_bons_reception_etab ON bons_reception(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_bons_reception_source ON bons_reception(type_source, source_id);
CREATE INDEX IF NOT EXISTS idx_bons_reception_numero ON bons_reception(numero);

ALTER TABLE bons_reception ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bons_reception_select ON bons_reception;
CREATE POLICY bons_reception_select ON bons_reception FOR SELECT TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS bons_reception_insert ON bons_reception;
CREATE POLICY bons_reception_insert ON bons_reception FOR INSERT TO authenticated
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS bons_reception_update ON bons_reception;
CREATE POLICY bons_reception_update ON bons_reception FOR UPDATE TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

SELECT 'bons_reception OK' AS info,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'bons_reception') AS table_exists;
