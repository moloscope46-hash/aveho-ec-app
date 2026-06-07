-- =============================================================
-- migration-0.61.0-rbeu-notifications-pwa.sql
-- Mega pack 0.61.0 : RBEU (Décret 2025-247) + Préférences notifications + PWA push
-- 100% idempotent
-- =============================================================

-- ==========================================
-- 1. TABLE beneficiaires_effectifs (RBEU)
-- Décret 2025-247 du 17 mars 2025
-- ==========================================
CREATE TABLE IF NOT EXISTS beneficiaires_effectifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID,
  etablissement_id UUID,
  -- Identité
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  nom_naissance TEXT,
  date_naissance DATE,
  lieu_naissance TEXT,
  pays_naissance TEXT DEFAULT 'France',
  nationalite TEXT DEFAULT 'française',
  -- Adresse personnelle
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'France',
  -- Détention (critères Tracfin)
  pct_capital NUMERIC(5,2),       -- % détention du capital (>25% = bénéficiaire)
  pct_droits_vote NUMERIC(5,2),   -- % droits de vote (>25% = bénéficiaire)
  qualite TEXT,                   -- "Associé", "Dirigeant", "Mandataire social", "Représentant légal"
  type_controle TEXT,             -- "direct", "indirect", "controle_de_fait"
  modalites_controle TEXT,        -- description libre
  date_debut_qualite DATE,
  date_fin_qualite DATE,
  -- Justificatifs
  piece_identite_type TEXT,       -- "CNI", "Passeport", "Titre séjour"
  piece_identite_numero TEXT,
  piece_identite_url TEXT,        -- URL du document scanné
  justificatif_domicile_url TEXT,
  -- Workflow validation
  statut TEXT DEFAULT 'brouillon', -- brouillon | en_validation | valide | archive | obsolete
  validee_at TIMESTAMPTZ,
  validee_par UUID,
  archivee_at TIMESTAMPTZ,
  notes TEXT,
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_be_struct ON beneficiaires_effectifs(structure_id);
CREATE INDEX IF NOT EXISTS idx_be_etab ON beneficiaires_effectifs(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_be_statut ON beneficiaires_effectifs(statut);

ALTER TABLE beneficiaires_effectifs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "be_all" ON beneficiaires_effectifs;
CREATE POLICY "be_all" ON beneficiaires_effectifs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 2. TABLE rbeu_declarations (historique des dépôts)
-- ==========================================
CREATE TABLE IF NOT EXISTS rbeu_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID,
  etablissement_id UUID,
  numero TEXT,                       -- "RBEU-2026-001"
  date_declaration DATE,
  type_declaration TEXT,             -- "initiale", "modificative", "annuelle"
  beneficiaires_count INTEGER,
  attestation_url TEXT,              -- URL du PDF attestation
  attestation_signee_par UUID,
  attestation_signee_at TIMESTAMPTZ,
  observations TEXT,
  statut TEXT DEFAULT 'projet',      -- projet | depose | accepte | refuse
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_rbeu_struct ON rbeu_declarations(structure_id);
CREATE INDEX IF NOT EXISTS idx_rbeu_etab ON rbeu_declarations(etablissement_id);

ALTER TABLE rbeu_declarations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rbeu_all" ON rbeu_declarations;
CREATE POLICY "rbeu_all" ON rbeu_declarations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 3. TABLE notifications_preferences (par user)
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  -- Canaux activés
  email_actif BOOLEAN DEFAULT true,
  sms_actif BOOLEAN DEFAULT false,
  push_actif BOOLEAN DEFAULT false,
  -- Types de notifs (configuration fine)
  notif_di_nouvelle BOOLEAN DEFAULT true,
  notif_di_validee BOOLEAN DEFAULT true,
  notif_di_refusee BOOLEAN DEFAULT true,
  notif_sav_executee BOOLEAN DEFAULT true,
  notif_rapport_valide BOOLEAN DEFAULT true,
  notif_transfert_etape BOOLEAN DEFAULT true,
  notif_stock_bas BOOLEAN DEFAULT true,
  notif_rbeu_renouvellement BOOLEAN DEFAULT true,
  notif_digest_hebdo BOOLEAN DEFAULT false,
  -- Coordonnées
  email TEXT,
  telephone_sms TEXT,
  -- Push subscription (Web Push API)
  push_subscription JSONB,
  push_endpoint TEXT,
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "np_self" ON notifications_preferences;
CREATE POLICY "np_self" ON notifications_preferences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 4. TABLE notifications_templates (charte Aveho)
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,         -- "di_nouvelle", "sav_executee", etc.
  nom TEXT,
  sujet_email TEXT,
  corps_email_html TEXT,             -- {{variables}} pour interpolation
  corps_email_text TEXT,
  sujet_sms TEXT,
  corps_sms TEXT,
  push_titre TEXT,
  push_message TEXT,
  variables JSONB,                   -- liste des variables disponibles
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nt_read" ON notifications_templates;
DROP POLICY IF EXISTS "nt_write" ON notifications_templates;
CREATE POLICY "nt_read" ON notifications_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "nt_write" ON notifications_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed initial : templates Aveho de base
INSERT INTO notifications_templates (code, nom, sujet_email, corps_email_html, push_titre, push_message)
VALUES
  ('di_nouvelle', 'DI - Nouvelle demande reçue', 'Nouvelle DI {{numero}} à traiter',
    '<p>Bonjour {{nom}},</p><p>Une nouvelle DI <strong>{{numero}}</strong> a été émise par {{demandeur}}.</p><p>{{nb_lignes}} ligne(s) à traiter.</p><p><a href="{{url}}">Voir la DI</a></p>',
    'Nouvelle DI', 'DI {{numero}} à traiter'),
  ('sav_executee', 'SAV - Bilan exécuté', 'Bilan SAV {{numero}} exécuté - {{verdict}}',
    '<p>Bonjour {{nom}},</p><p>Le bilan SAV <strong>{{numero}}</strong> a été exécuté.</p><p>Verdict : <strong>{{verdict}}</strong> ({{nb_ok}}/{{nb_total}} points OK)</p><p><a href="{{url}}">Voir le rapport</a></p>',
    'Bilan SAV exécuté', '{{numero}} : {{verdict}}'),
  ('rapport_valide', 'SAV - Rapport validé par l''EC', 'Rapport SAV {{numero}} validé',
    '<p>Bonjour,</p><p>Le rapport SAV <strong>{{numero}}</strong> a été validé par {{validateur}}.</p><p>{{commentaire}}</p>',
    'Rapport validé', '{{numero}} signé par {{validateur}}'),
  ('stock_bas', 'Alerte stock bas', 'Stock bas : {{article}}',
    '<p>L''article <strong>{{article}}</strong> est en-dessous de son stock minimum ({{stock_actuel}} restant).</p>',
    'Stock bas', '{{article}} : {{stock_actuel}} restant'),
  ('rbeu_renouvellement', 'RBEU - Renouvellement requis', 'RBEU à renouveler avant {{date_limite}}',
    '<p>Bonjour,</p><p>Votre déclaration RBEU doit être renouvelée avant le <strong>{{date_limite}}</strong>.</p>',
    'RBEU à renouveler', 'Échéance : {{date_limite}}')
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- 5. TABLE notifications_log (historique envois)
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  template_code TEXT,
  canal TEXT,                        -- "email", "sms", "push", "in_app"
  destinataire TEXT,                 -- email ou téléphone
  sujet TEXT,
  corps TEXT,
  variables_used JSONB,
  envoye BOOLEAN DEFAULT false,
  erreur TEXT,
  envoye_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nlog_user ON notifications_log(user_id);
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nlog_all" ON notifications_log;
CREATE POLICY "nlog_all" ON notifications_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 6. Storage bucket pour pièces RBEU (PDF, photos pièces identité)
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('rbeu-documents', 'rbeu-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "rbeu_docs_auth_read" ON storage.objects;
CREATE POLICY "rbeu_docs_auth_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'rbeu-documents');
DROP POLICY IF EXISTS "rbeu_docs_auth_write" ON storage.objects;
CREATE POLICY "rbeu_docs_auth_write" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'rbeu-documents') WITH CHECK (bucket_id = 'rbeu-documents');

-- ==========================================
-- 7. VUE v_rbeu_etat (synthèse par établissement)
-- ==========================================
DROP VIEW IF EXISTS v_rbeu_etat;
CREATE VIEW v_rbeu_etat AS
SELECT
  e.id AS etablissement_id,
  e.nom AS etablissement_nom,
  e.structure_id,
  COUNT(b.id) AS nb_beneficiaires,
  COUNT(b.id) FILTER (WHERE b.statut = 'valide') AS nb_valides,
  COUNT(b.id) FILTER (WHERE b.statut = 'brouillon') AS nb_brouillons,
  COUNT(b.id) FILTER (WHERE b.statut = 'en_validation') AS nb_en_validation,
  COUNT(b.id) FILTER (WHERE b.statut = 'obsolete') AS nb_obsoletes,
  MAX(b.updated_at) AS derniere_modification,
  -- Dernière déclaration
  (SELECT MAX(date_declaration) FROM rbeu_declarations WHERE etablissement_id = e.id) AS derniere_declaration,
  -- Renouvellement (annuel)
  CASE
    WHEN (SELECT MAX(date_declaration) FROM rbeu_declarations WHERE etablissement_id = e.id) IS NULL THEN 'jamais_declare'
    WHEN (SELECT MAX(date_declaration) FROM rbeu_declarations WHERE etablissement_id = e.id) < CURRENT_DATE - INTERVAL '11 months' THEN 'a_renouveler'
    WHEN (SELECT MAX(date_declaration) FROM rbeu_declarations WHERE etablissement_id = e.id) < CURRENT_DATE - INTERVAL '12 months' THEN 'depasse'
    ELSE 'a_jour'
  END AS etat_renouvellement
FROM etablissements e
LEFT JOIN beneficiaires_effectifs b ON b.etablissement_id = e.id AND b.statut != 'archive'
GROUP BY e.id, e.nom, e.structure_id;

-- ==========================================
-- VÉRIFICATION
-- ==========================================
SELECT 'TABLES' AS info, table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'beneficiaires_effectifs', 'rbeu_declarations',
  'notifications_preferences', 'notifications_templates', 'notifications_log'
) ORDER BY table_name;

SELECT 'TEMPLATES' AS info, code FROM notifications_templates ORDER BY code;
SELECT 'BUCKETS' AS info, id FROM storage.buckets WHERE id IN ('sav-photos', 'rbeu-documents');
