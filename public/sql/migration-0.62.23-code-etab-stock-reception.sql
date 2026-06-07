-- =============================================================
-- migration-0.62.23-code-etab-stock-reception.sql
-- 1. Ajoute etablissements.code (code court interne)
-- 2. Trigger stock auto à la validation de bon_reception conforme
-- 100% idempotent
-- =============================================================

-- 1. Code établissement
ALTER TABLE IF EXISTS etablissements ADD COLUMN IF NOT EXISTS code TEXT;
CREATE INDEX IF NOT EXISTS idx_etablissements_code ON etablissements(code) WHERE code IS NOT NULL;

-- 2. Fonction qui crée des mouvements de stock à la réception conforme
CREATE OR REPLACE FUNCTION fn_bon_reception_creer_mouvements()
RETURNS TRIGGER AS $$
DECLARE
  v_source_record RECORD;
BEGIN
  -- Seulement pour les bons CONFORMES et statut valide
  IF NEW.conforme = TRUE AND NEW.statut = 'valide' THEN
    -- Si source = transfert : créer un mouvement entrée sur le dépôt destination
    IF NEW.type_source = 'transfert' THEN
      SELECT t.depot_destination_id, t.article_id, t.quantite
        INTO v_source_record
        FROM transferts t
        WHERE t.id = NEW.source_id;

      IF v_source_record.depot_destination_id IS NOT NULL THEN
        INSERT INTO stock_mouvements (
          depot_id, article_id, type_mouvement, quantite,
          source_type, source_id, commentaire, structure_id, created_by
        ) VALUES (
          v_source_record.depot_destination_id,
          v_source_record.article_id,
          'entree',
          COALESCE(v_source_record.quantite, 1),
          'bon_reception',
          NEW.id,
          'Réception conforme du bon ' || NEW.numero,
          NEW.structure_id,
          NEW.receptionne_par
        );
      END IF;
    END IF;
    -- Si source = tournée : on ne crée pas de mouvement (les étapes le font individuellement, TODO)
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur, on log mais on ne bloque pas le bon
  RAISE WARNING 'Erreur stock auto sur bon_reception % : %', NEW.numero, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bon_reception_stock ON bons_reception;
CREATE TRIGGER trg_bon_reception_stock
  AFTER INSERT ON bons_reception
  FOR EACH ROW EXECUTE FUNCTION fn_bon_reception_creer_mouvements();

-- 3. Table articles_min_stock_etage (min stock par bâtiment/service au lieu de juste global)
CREATE TABLE IF NOT EXISTS articles_min_stock_etape (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  article_id UUID NOT NULL,
  etablissement_id UUID,
  batiment_id UUID,
  service_id UUID,
  depot_id UUID,
  stock_min INTEGER NOT NULL DEFAULT 0,
  stock_max INTEGER,
  notes TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (article_id, batiment_id, service_id, depot_id)
);

CREATE INDEX IF NOT EXISTS idx_min_stock_etape_struct ON articles_min_stock_etape(structure_id);
CREATE INDEX IF NOT EXISTS idx_min_stock_etape_article ON articles_min_stock_etape(article_id);
CREATE INDEX IF NOT EXISTS idx_min_stock_etape_etab ON articles_min_stock_etape(etablissement_id);

ALTER TABLE articles_min_stock_etape ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS min_stock_etape_select ON articles_min_stock_etape;
CREATE POLICY min_stock_etape_select ON articles_min_stock_etape FOR SELECT TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS min_stock_etape_insert ON articles_min_stock_etape;
CREATE POLICY min_stock_etape_insert ON articles_min_stock_etape FOR INSERT TO authenticated
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS min_stock_etape_update ON articles_min_stock_etape;
CREATE POLICY min_stock_etape_update ON articles_min_stock_etape FOR UPDATE TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS min_stock_etape_delete ON articles_min_stock_etape;
CREATE POLICY min_stock_etape_delete ON articles_min_stock_etape FOR DELETE TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

-- Vérif
SELECT 'etablissements.code' AS info, COUNT(*) AS exists FROM information_schema.columns WHERE table_name = 'etablissements' AND column_name = 'code'
UNION ALL
SELECT 'fn_bon_reception_creer_mouvements', COUNT(*) FROM pg_proc WHERE proname = 'fn_bon_reception_creer_mouvements'
UNION ALL
SELECT 'articles_min_stock_etape', COUNT(*) FROM information_schema.tables WHERE table_name = 'articles_min_stock_etape';
