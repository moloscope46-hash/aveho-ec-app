-- =============================================================
-- migration-0.62.39-marketplace-FIX.sql
-- Fix : ajoute les colonnes manquantes si marketplace_offres existait déjà partiellement
-- 100% idempotent, à relancer même après l'erreur 0.62.38
-- =============================================================

-- 1. Table marketplace_offres : ALTER défensif (créée potentiellement en 0.61.x sans toutes les colonnes)
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS magasin_id UUID;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS type_offre TEXT DEFAULT 'reassort';
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS article_id UUID;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS libelle_article TEXT;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS quantite INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS prix_ht NUMERIC(10,2);
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'disponible';
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS ville TEXT;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS code_postal TEXT;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS geoloc_source TEXT;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS reserved_by_magasin_id UUID;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS marketplace_offres ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Si pas existante : la créer minimale (les ALTER au-dessus n'auraient rien fait)
CREATE TABLE IF NOT EXISTS marketplace_offres (id UUID PRIMARY KEY DEFAULT gen_random_uuid());

-- Re-tenter les ALTER (la table existe maintenant à coup sûr)
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS magasin_id UUID;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS type_offre TEXT DEFAULT 'reassort';
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS article_id UUID;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS libelle_article TEXT;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS quantite INTEGER DEFAULT 1;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS prix_ht NUMERIC(10,2);
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'disponible';
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS ville TEXT;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS code_postal TEXT;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS geoloc_source TEXT;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS reserved_by_magasin_id UUID;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE marketplace_offres ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_magasin ON marketplace_offres(magasin_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_statut ON marketplace_offres(statut);
CREATE INDEX IF NOT EXISTS idx_marketplace_type ON marketplace_offres(type_offre);
CREATE INDEX IF NOT EXISTS idx_marketplace_geoloc ON marketplace_offres(latitude, longitude) WHERE latitude IS NOT NULL;

-- 2. Table marketplace_messages : ALTER défensif
CREATE TABLE IF NOT EXISTS marketplace_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE marketplace_messages ADD COLUMN IF NOT EXISTS offre_id UUID;
ALTER TABLE marketplace_messages ADD COLUMN IF NOT EXISTS sender_user_id UUID;
ALTER TABLE marketplace_messages ADD COLUMN IF NOT EXISTS sender_magasin_id UUID;
ALTER TABLE marketplace_messages ADD COLUMN IF NOT EXISTS sender_nom TEXT;
ALTER TABLE marketplace_messages ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE marketplace_messages ADD COLUMN IF NOT EXISTS pj_url TEXT;
ALTER TABLE marketplace_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
-- FK CASCADE si pas déjà présente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'marketplace_messages_offre_id_fkey') THEN
    BEGIN
      ALTER TABLE marketplace_messages ADD CONSTRAINT marketplace_messages_offre_id_fkey FOREIGN KEY (offre_id) REFERENCES marketplace_offres(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_marketplace_msg_offre ON marketplace_messages(offre_id, created_at);

-- 3. notifications_queue : créer/ALTER
CREATE TABLE IF NOT EXISTS notifications_queue (id BIGSERIAL PRIMARY KEY);
ALTER TABLE notifications_queue ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE notifications_queue ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE notifications_queue ADD COLUMN IF NOT EXISTS titre TEXT;
ALTER TABLE notifications_queue ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications_queue ADD COLUMN IF NOT EXISTS url_action TEXT;
ALTER TABLE notifications_queue ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}';
ALTER TABLE notifications_queue ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web_push';
ALTER TABLE notifications_queue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE notifications_queue ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE notifications_queue ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE notifications_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_notif_queue_user ON notifications_queue(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_queue_status ON notifications_queue(status) WHERE status = 'pending';

-- 4. push_subscriptions : créer/ALTER
CREATE TABLE IF NOT EXISTS push_subscriptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS endpoint TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS p256dh TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS auth TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_push_sub_endpoint') THEN
    BEGIN
      CREATE UNIQUE INDEX idx_push_sub_endpoint ON push_subscriptions(endpoint);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

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
CREATE POLICY marketplace_msg_insert ON marketplace_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

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
SELECT 'OK' AS info,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'marketplace_offres' AND column_name = 'magasin_id') AS magasin_id_existe,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'marketplace_offres' AND column_name = 'latitude') AS latitude_existe;
