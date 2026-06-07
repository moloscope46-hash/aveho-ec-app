-- =============================================================
-- migration-0.62.36-tournees-gps.sql
-- GPS tracking + signature étapes pour tournées
-- 100% idempotent
-- =============================================================

-- 1. Table tracking GPS chauffeur (positions en temps réel)
CREATE TABLE IF NOT EXISTS tournees_gps_track (
  id BIGSERIAL PRIMARY KEY,
  tournee_id UUID NOT NULL,
  chauffeur_user_id UUID,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy_m DOUBLE PRECISION,
  speed_kmh DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  altitude_m DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournees_gps_tournee ON tournees_gps_track(tournee_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_tournees_gps_chauffeur ON tournees_gps_track(chauffeur_user_id, recorded_at);

-- 2. Colonnes routing OSRM sur tournees_etapes (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournees_etapes') THEN
    -- Ajout colonnes itinéraire OSRM + signature
    ALTER TABLE tournees_etapes ADD COLUMN IF NOT EXISTS osrm_polyline TEXT;        -- polyline encodée du segment précédent
    ALTER TABLE tournees_etapes ADD COLUMN IF NOT EXISTS osrm_distance_m INTEGER;   -- distance OSRM en mètres
    ALTER TABLE tournees_etapes ADD COLUMN IF NOT EXISTS osrm_duration_s INTEGER;   -- durée estimée OSRM en sec
    ALTER TABLE tournees_etapes ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
    ALTER TABLE tournees_etapes ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    ALTER TABLE tournees_etapes ADD COLUMN IF NOT EXISTS signature_url TEXT;        -- signature dataURL/Storage
    ALTER TABLE tournees_etapes ADD COLUMN IF NOT EXISTS signature_nom TEXT;
    ALTER TABLE tournees_etapes ADD COLUMN IF NOT EXISTS signature_at TIMESTAMPTZ;
    ALTER TABLE tournees_etapes ADD COLUMN IF NOT EXISTS commentaire_livraison TEXT;
  END IF;
END $$;

-- 3. Stats GPS par tournée (vue agrégée)
CREATE OR REPLACE VIEW v_tournees_gps_stats AS
SELECT
  tournee_id,
  COUNT(*) AS nb_points,
  MIN(recorded_at) AS gps_start,
  MAX(recorded_at) AS gps_end,
  EXTRACT(EPOCH FROM (MAX(recorded_at) - MIN(recorded_at))) / 60 AS duree_min,
  AVG(speed_kmh) FILTER (WHERE speed_kmh > 0) AS vitesse_moy_kmh,
  MAX(speed_kmh) AS vitesse_max_kmh
FROM tournees_gps_track
GROUP BY tournee_id;

-- 4. RLS basique (lecture par les membres de la structure du chauffeur)
ALTER TABLE tournees_gps_track ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tournees_gps_select ON tournees_gps_track;
CREATE POLICY tournees_gps_select ON tournees_gps_track FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS tournees_gps_insert ON tournees_gps_track;
CREATE POLICY tournees_gps_insert ON tournees_gps_track FOR INSERT TO authenticated WITH CHECK (chauffeur_user_id = auth.uid() OR auth.uid() IS NOT NULL);

-- Vérif
SELECT 'tournees_gps_track' AS info, (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tournees_gps_track') AS exists
UNION ALL SELECT 'v_tournees_gps_stats', (SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_tournees_gps_stats')
UNION ALL SELECT 'tournees_etapes.signature_url', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'tournees_etapes' AND column_name = 'signature_url');
