-- =============================================================
-- migration-0.62.30-equipe-id-entities.sql
-- Ajoute equipe_id sur patients / interventions / materiels
-- + commandes / achats / signalements / transferts
-- + indexes + vue compteurs équipe
-- 100% idempotent
-- =============================================================

-- 1. Ajout equipe_id sur les entités métier
ALTER TABLE IF EXISTS patients         ADD COLUMN IF NOT EXISTS equipe_id UUID;
ALTER TABLE IF EXISTS interventions    ADD COLUMN IF NOT EXISTS equipe_id UUID;
ALTER TABLE IF EXISTS materiels        ADD COLUMN IF NOT EXISTS equipe_id UUID;
ALTER TABLE IF EXISTS commandes        ADD COLUMN IF NOT EXISTS equipe_id UUID;
ALTER TABLE IF EXISTS achats           ADD COLUMN IF NOT EXISTS equipe_id UUID;
ALTER TABLE IF EXISTS signalements     ADD COLUMN IF NOT EXISTS equipe_id UUID;
ALTER TABLE IF EXISTS transferts       ADD COLUMN IF NOT EXISTS equipe_id UUID;
ALTER TABLE IF EXISTS demandes_internes ADD COLUMN IF NOT EXISTS equipe_id UUID;

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_patients_equipe ON patients(equipe_id) WHERE equipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interventions_equipe ON interventions(equipe_id) WHERE equipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materiels_equipe ON materiels(equipe_id) WHERE equipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commandes_equipe ON commandes(equipe_id) WHERE equipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_achats_equipe ON achats(equipe_id) WHERE equipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signalements_equipe ON signalements(equipe_id) WHERE equipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transferts_equipe ON transferts(equipe_id) WHERE equipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_di_equipe ON demandes_internes(equipe_id) WHERE equipe_id IS NOT NULL;

-- 3. Vue compteurs par équipe (pour stats équipe 7j/30j/90j)
CREATE OR REPLACE VIEW v_equipe_stats AS
SELECT
  e.id AS equipe_id,
  e.nom AS equipe_nom,
  e.structure_id,
  -- Compteurs 7 jours
  (SELECT COUNT(*) FROM patients      p WHERE p.equipe_id = e.id AND p.created_at >= NOW() - INTERVAL '7 days')   AS patients_7j,
  (SELECT COUNT(*) FROM interventions i WHERE i.equipe_id = e.id AND i.created_at >= NOW() - INTERVAL '7 days')   AS interventions_7j,
  (SELECT COUNT(*) FROM commandes     c WHERE c.equipe_id = e.id AND c.created_at >= NOW() - INTERVAL '7 days')   AS commandes_7j,
  (SELECT COUNT(*) FROM signalements  s WHERE s.equipe_id = e.id AND s.created_at >= NOW() - INTERVAL '7 days')   AS signalements_7j,
  -- Compteurs 30 jours
  (SELECT COUNT(*) FROM patients      p WHERE p.equipe_id = e.id AND p.created_at >= NOW() - INTERVAL '30 days')  AS patients_30j,
  (SELECT COUNT(*) FROM interventions i WHERE i.equipe_id = e.id AND i.created_at >= NOW() - INTERVAL '30 days')  AS interventions_30j,
  -- Compteurs 90 jours
  (SELECT COUNT(*) FROM interventions i WHERE i.equipe_id = e.id AND i.created_at >= NOW() - INTERVAL '90 days')  AS interventions_90j,
  -- Totaux tout temps
  (SELECT COUNT(*) FROM patients      p WHERE p.equipe_id = e.id)  AS patients_total,
  (SELECT COUNT(*) FROM interventions i WHERE i.equipe_id = e.id)  AS interventions_total,
  (SELECT COUNT(*) FROM materiels     m WHERE m.equipe_id = e.id)  AS materiels_total
FROM equipes e;

-- Vérif
SELECT 'Migration OK' AS info,
  (SELECT COUNT(*) FROM information_schema.columns WHERE column_name = 'equipe_id' AND table_name IN ('patients','interventions','materiels','commandes','achats','signalements','transferts','demandes_internes')) AS nb_cols_equipe,
  (SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_equipe_stats') AS view_exists;
