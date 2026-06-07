-- =============================================================
-- migration-0.61.9-marketplace-gps-track.sql
-- - Table marketplace_offres (réassorts urgents inter-magasins)
-- - Table tournees_gps_track (historique positions chauffeur)
-- 100% idempotent
-- =============================================================

-- ==========================================
-- 1. Marketplace inter-magasins
-- ==========================================
CREATE TABLE IF NOT EXISTS marketplace_offres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magasin_emetteur_id UUID NOT NULL,        -- magasin qui propose / demande
  structure_id UUID,
  type_offre TEXT DEFAULT 'demande',        -- 'demande' (j'ai besoin) ou 'offre' (je peux fournir)
  urgence TEXT DEFAULT 'normale',           -- 'normale', 'urgent', 'critique'
  article_id UUID,                          -- article concerné
  libelle TEXT,
  quantite NUMERIC,
  unite TEXT,
  prix_propose_ht NUMERIC(10,2),
  conditions TEXT,
  delai_max_jours INTEGER,
  date_limite DATE,
  zone_geographique TEXT,                   -- 'locale', 'regionale', 'nationale'
  rayon_km INTEGER,                          -- rayon de livraison accepté
  statut TEXT DEFAULT 'active',             -- active, en_negociation, acceptee, expiree, annulee
  magasin_repondeur_id UUID,                -- magasin qui répond
  message_repondeur TEXT,
  prix_negocie_ht NUMERIC(10,2),
  accepte_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_mkt_emetteur ON marketplace_offres(magasin_emetteur_id);
CREATE INDEX IF NOT EXISTS idx_mkt_statut ON marketplace_offres(statut);
CREATE INDEX IF NOT EXISTS idx_mkt_type ON marketplace_offres(type_offre);

ALTER TABLE marketplace_offres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mkt_all" ON marketplace_offres;
CREATE POLICY "mkt_all" ON marketplace_offres FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Messages de négociation
CREATE TABLE IF NOT EXISTS marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offre_id UUID NOT NULL,
  user_id UUID,
  magasin_id UUID,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mktm_offre ON marketplace_messages(offre_id);
ALTER TABLE marketplace_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mktm_all" ON marketplace_messages;
CREATE POLICY "mktm_all" ON marketplace_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 2. Historique GPS chauffeur
-- ==========================================
CREATE TABLE IF NOT EXISTS tournees_gps_track (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournee_id UUID NOT NULL,
  chauffeur_user_id UUID,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy_m NUMERIC,
  speed_kmh NUMERIC,
  heading_deg NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_tournee ON tournees_gps_track(tournee_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_gps_user ON tournees_gps_track(chauffeur_user_id);

ALTER TABLE tournees_gps_track ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gps_all" ON tournees_gps_track;
CREATE POLICY "gps_all" ON tournees_gps_track FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- VÉRIFICATION
-- ==========================================
SELECT 'TABLES OK' AS info, table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('marketplace_offres', 'marketplace_messages', 'tournees_gps_track')
ORDER BY table_name;
