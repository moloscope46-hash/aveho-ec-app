-- =============================================================
-- migration-0.62.0-marketplace-geoloc-realtime.sql
-- - Géoloc offres marketplace (point_lat, point_lng)
-- - Activation Realtime sur marketplace_messages pour chat live
-- 100% idempotent
-- =============================================================

-- Ajoute géoloc dans marketplace_offres
ALTER TABLE IF EXISTS marketplace_offres
  ADD COLUMN IF NOT EXISTS point_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS point_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT;

-- Active Supabase Realtime sur marketplace_messages
-- (pour Postgres LISTEN/NOTIFY)
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_messages;

-- Vérification
SELECT 'marketplace_offres cols' AS info, column_name FROM information_schema.columns
WHERE table_name = 'marketplace_offres' AND column_name IN ('point_lat', 'point_lng')
ORDER BY column_name;

SELECT 'Realtime publication' AS info, schemaname || '.' || tablename AS tables
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'marketplace_messages';
