-- =============================================================
-- HOTFIX-aveho-0.60.5-colonnes-materiels-stock.sql
-- Fix erreurs 400 sur materiels et stock_mouvements
-- Colonnes manquantes : num_serie, num_lot, date_peremption, etc.
-- 100% idempotent
-- =============================================================

-- ==========================================
-- ALTER materiels — colonnes manquantes
-- ==========================================
ALTER TABLE materiels
  ADD COLUMN IF NOT EXISTS num_serie TEXT,
  ADD COLUMN IF NOT EXISTS num_lot TEXT,
  ADD COLUMN IF NOT EXISTS date_peremption DATE,
  ADD COLUMN IF NOT EXISTS etat TEXT DEFAULT 'OK',
  ADD COLUMN IF NOT EXISTS depot_id UUID,
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS article_id UUID,
  ADD COLUMN IF NOT EXISTS libelle TEXT;

CREATE INDEX IF NOT EXISTS idx_materiels_article ON materiels(article_id);
CREATE INDEX IF NOT EXISTS idx_materiels_depot ON materiels(depot_id);
CREATE INDEX IF NOT EXISTS idx_materiels_patient ON materiels(patient_id);
CREATE INDEX IF NOT EXISTS idx_materiels_etat ON materiels(etat);

-- ==========================================
-- ALTER stock_mouvements — colonnes manquantes
-- ==========================================
ALTER TABLE stock_mouvements
  ADD COLUMN IF NOT EXISTS num_serie TEXT,
  ADD COLUMN IF NOT EXISTS lot TEXT,
  ADD COLUMN IF NOT EXISTS date_peremption DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS quantite NUMERIC,
  ADD COLUMN IF NOT EXISTS article_id UUID;

CREATE INDEX IF NOT EXISTS idx_stock_mvt_article ON stock_mouvements(article_id);

-- ==========================================
-- VÉRIFICATION
-- ==========================================
SELECT 'COLUMNS ADDED' AS info, table_name, column_name FROM information_schema.columns
WHERE (table_name = 'materiels' AND column_name IN ('num_serie', 'num_lot', 'date_peremption', 'etat', 'depot_id', 'patient_id', 'article_id'))
   OR (table_name = 'stock_mouvements' AND column_name IN ('num_serie', 'lot', 'date_peremption', 'notes', 'user_email', 'type', 'quantite', 'article_id'))
ORDER BY table_name, column_name;
