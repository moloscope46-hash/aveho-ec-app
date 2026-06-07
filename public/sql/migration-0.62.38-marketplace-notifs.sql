-- =============================================================
-- migration-0.62.38-marketplace-notifs.sql
-- Marketplace inter-magasins + Notifications push + Chat realtime
-- 100% idempotent
-- =============================================================

-- 1. Table offres marketplace (avec géoloc)
CREATE TABLE IF NOT EXISTS marketplace_offres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  magasin_id UUID NOT NULL,                   -- magasin qui propose
  type_offre TEXT DEFAULT 'reassort',          -- reassort / depannage / cession / location
  article_id UUID,
  libelle_article TEXT NOT NULL,
  quantite INTEGER DEFAULT 1,
  prix_ht NUMERIC(10,2),
  statut TEXT DEFAULT 'disponible',            -- disponible / reservee / vendue / expiree / annulee
  description TEXT,
  -- Géoloc auto via api-adresse data.gouv.fr
  ville TEXT,
  code_postal TEXT,
  adresse TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geoloc_source TEXT,                          -- 'api-adresse', 'manuel', 'magasin'
  -- Workflow
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reserved_by_magasin_id UUID,
  reserved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- Multimédia
  photo_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_marketplace_magasin ON marketplace_offres(magasin_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_statut ON marketplace_offres(statut);
CREATE INDEX IF NOT EXISTS idx_marketplace_type ON marketplace_offres(type_offre);
CREATE INDEX IF NOT EXISTS idx_marketplace_geoloc ON marketplace_offres(latitude, longitude) WHERE latitude IS NOT NULL;

-- 2. Chat marketplace : messages entre magasins sur une offre
CREATE TABLE IF NOT EXISTS marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offre_id UUID NOT NULL REFERENCES marketplace_offres(id) ON DELETE CASCADE,
  sender_user_id UUID,
  sender_magasin_id UUID,
  sender_nom TEXT,
  message TEXT NOT NULL,
  pj_url TEXT,                                 -- pièce jointe (image/pdf)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_msg_offre ON marketplace_messages(offre_id, created_at);

-- Activer Realtime sur ces tables (à faire aussi manuellement dans Supabase Studio)
-- ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_offres;

-- 3. Table notifications push (queue à traiter par edge function)
CREATE TABLE IF NOT EXISTS notifications_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,                                -- destinataire
  type TEXT,                                   -- 'etape_terminee', 'nouvelle_di', 'message_marketplace', etc.
  titre TEXT NOT NULL,
  message TEXT,
  url_action TEXT,                             -- URL à ouvrir si l'user click
  payload JSONB DEFAULT '{}',
  channel TEXT DEFAULT 'web_push',             -- 'web_push', 'email', 'sms'
  status TEXT DEFAULT 'pending',               -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_queue_user ON notifications_queue(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_queue_status ON notifications_queue(status) WHERE status = 'pending';

-- 4. Push subscriptions (web-push) : tokens d'abonnement push de chaque user
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_sub_endpoint ON push_subscriptions(endpoint);

-- 5. RLS
ALTER TABLE marketplace_offres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketplace_offres_select ON marketplace_offres;
CREATE POLICY marketplace_offres_select ON marketplace_offres FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS marketplace_offres_insert ON marketplace_offres;
CREATE POLICY marketplace_offres_insert ON marketplace_offres FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS marketplace_offres_update ON marketplace_offres;
CREATE POLICY marketplace_offres_update ON marketplace_offres FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE marketplace_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketplace_msg_select ON marketplace_messages;
CREATE POLICY marketplace_msg_select ON marketplace_messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS marketplace_msg_insert ON marketplace_messages;
CREATE POLICY marketplace_msg_insert ON marketplace_messages FOR INSERT TO authenticated WITH CHECK (sender_user_id = auth.uid());

ALTER TABLE notifications_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notif_select ON notifications_queue;
CREATE POLICY notif_select ON notifications_queue FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_sub_select ON push_subscriptions;
CREATE POLICY push_sub_select ON push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS push_sub_insert ON push_subscriptions;
CREATE POLICY push_sub_insert ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS push_sub_delete ON push_subscriptions;
CREATE POLICY push_sub_delete ON push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Vérif
SELECT 'marketplace_offres' AS info, (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'marketplace_offres') AS exists
UNION ALL SELECT 'marketplace_messages', (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'marketplace_messages')
UNION ALL SELECT 'notifications_queue', (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notifications_queue')
UNION ALL SELECT 'push_subscriptions', (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'push_subscriptions');
