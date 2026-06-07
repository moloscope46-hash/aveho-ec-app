-- =============================================================
-- migration-0.60.6-transferts-signature-storage.sql
-- - ALTER demandes_internes : statuts transfert + signature rapport SAV
-- - Création du bucket Supabase Storage 'sav-photos' (via SQL)
-- - Vue v_analytics_sav pour le dashboard
-- =============================================================

-- ==========================================
-- 1. ALTER demandes_internes : workflow transfert + signature
-- ==========================================
ALTER TABLE demandes_internes
  ADD COLUMN IF NOT EXISTS transfert_preparation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfert_preparation_par UUID,
  ADD COLUMN IF NOT EXISTS transfert_transit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfert_transit_par UUID,
  ADD COLUMN IF NOT EXISTS transfert_livre_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfert_livre_par UUID,
  ADD COLUMN IF NOT EXISTS rapport_sav_valide_par_ec UUID,
  ADD COLUMN IF NOT EXISTS rapport_sav_validee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rapport_sav_signature TEXT,
  ADD COLUMN IF NOT EXISTS rapport_sav_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS rapport_sav_commentaire_ec TEXT;

-- ==========================================
-- 2. STORAGE BUCKETS — Supabase Storage
-- (Crée le bucket sav-photos s'il n'existe pas, public en lecture)
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('sav-photos', 'sav-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques d'accès au bucket
-- Lecture publique (les URLs des photos sont publiques)
DROP POLICY IF EXISTS "sav_photos_public_read" ON storage.objects;
CREATE POLICY "sav_photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'sav-photos');

-- Upload pour utilisateurs authentifiés
DROP POLICY IF EXISTS "sav_photos_auth_insert" ON storage.objects;
CREATE POLICY "sav_photos_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sav-photos');

-- Update pour propriétaire
DROP POLICY IF EXISTS "sav_photos_auth_update" ON storage.objects;
CREATE POLICY "sav_photos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'sav-photos');

-- Delete pour propriétaire
DROP POLICY IF EXISTS "sav_photos_auth_delete" ON storage.objects;
CREATE POLICY "sav_photos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'sav-photos');

-- ==========================================
-- 3. VUE v_analytics_sav pour dashboard
-- ==========================================
DROP VIEW IF EXISTS v_analytics_sav;
CREATE VIEW v_analytics_sav AS
SELECT
  d.id AS demande_id,
  d.numero,
  d.statut,
  d.created_at,
  d.validee_at,
  d.cloturee_at,
  d.priorite,
  d.magasin_id,
  d.structure_id,
  d.bilan_sav_id,
  d.article_concerne_id,
  d.rapport_sav_validee_at,
  b.nom AS bilan_nom,
  b.code AS bilan_code,
  -- Durée totale (création → clôture en heures)
  EXTRACT(EPOCH FROM (COALESCE(d.cloturee_at, d.validee_at, NOW()) - d.created_at)) / 3600 AS duree_heures,
  -- Compteurs résultats
  (SELECT COUNT(*) FROM sav_executions e WHERE e.demande_id = d.id AND e.resultat = 'OK') AS nb_ok,
  (SELECT COUNT(*) FROM sav_executions e WHERE e.demande_id = d.id AND e.resultat = 'KO') AS nb_ko,
  (SELECT COUNT(*) FROM sav_executions e WHERE e.demande_id = d.id AND e.resultat = 'NA') AS nb_na,
  (SELECT COUNT(*) FROM sav_executions e WHERE e.demande_id = d.id AND e.valeur_mesure IS NOT NULL) AS nb_mesures,
  -- Verdict
  CASE
    WHEN (SELECT COUNT(*) FROM sav_executions e WHERE e.demande_id = d.id AND e.resultat = 'KO') > 0 THEN 'NON_CONFORME'
    WHEN (SELECT COUNT(*) FROM sav_executions e WHERE e.demande_id = d.id) > 0 THEN 'CONFORME'
    ELSE 'EN_ATTENTE'
  END AS verdict
FROM demandes_internes d
LEFT JOIN bilans_sav b ON b.id = d.bilan_sav_id
WHERE d.type_demande = 'sav'
ORDER BY d.created_at DESC;

-- ==========================================
-- VÉRIFICATION
-- ==========================================
SELECT 'COLUMNS DI' AS info, column_name FROM information_schema.columns
WHERE table_name = 'demandes_internes' AND column_name IN (
  'transfert_preparation_at', 'transfert_transit_at', 'transfert_livre_at',
  'rapport_sav_valide_par_ec', 'rapport_sav_signature', 'rapport_sav_signature_url'
) ORDER BY column_name;

SELECT 'BUCKET' AS info, id, name, public FROM storage.buckets WHERE id = 'sav-photos';

SELECT 'VUE' AS info, table_name FROM information_schema.views WHERE table_name = 'v_analytics_sav';
