-- =============================================================
--  aveho-supabase-securite-combine.sql (Alpha 0.57.26)
--
--  Script TOUT-EN-UN à exécuter dans Supabase SQL Editor pour
--  appliquer les 3 patchs de sécurité du marathon 0.57.19-22 :
--
--   PARTIE A : RLS sur caisses_assurance_maladie + mutuelles (0.57.19)
--   PARTIE B : Sécurisation des 2 views auth.users (0.57.20)
--   PARTIE C : Tracking statut mail invitations (0.57.22)
--
--  ⚠️ IMPORTANT - À FAIRE AVANT :
--   1. Snapshot Supabase Dashboard → Database → Backups → Create snapshot
--   2. Lire chaque partie pour comprendre l'impact
--   3. Exécuter UNE PARTIE À LA FOIS et tester l'app entre chaque
--
--  Toutes les opérations sont IDEMPOTENTES (IF NOT EXISTS / DROP IF EXISTS).
--  Tu peux relancer le script plusieurs fois sans casser quoi que ce soit.
-- =============================================================


-- =====================================================================
-- PARTIE A : RLS sur caisses + mutuelles (depuis 0.57.19)
-- =====================================================================
-- Contexte : ces 2 tables référentiels étaient SANS RLS → accessibles
-- en lecture/écriture publique. Maintenant : lecture authenticated only,
-- écriture réservée au service_role (backend Aveho).

-- A.1 : Vérification pré-fix (lecture seule)
SELECT
  table_name,
  COUNT(*) FILTER (WHERE column_name = 'structure_id') AS has_structure_id
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('caisses_assurance_maladie', 'mutuelles')
GROUP BY table_name;
-- Attendu : has_structure_id = 0 (référentiels partagés sans isolation)


-- A.2 : Activer RLS sur caisses_assurance_maladie
ALTER TABLE public.caisses_assurance_maladie ENABLE ROW LEVEL SECURITY;

-- A.3 : Policy lecture pour authenticated
-- (DROP IF EXISTS pour idempotence si déjà créé)
DROP POLICY IF EXISTS "Lecture caisses pour utilisateurs authentifiés"
  ON public.caisses_assurance_maladie;

CREATE POLICY "Lecture caisses pour utilisateurs authentifiés"
  ON public.caisses_assurance_maladie
  FOR SELECT
  TO authenticated
  USING (true);


-- A.4 : Activer RLS sur mutuelles
ALTER TABLE public.mutuelles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture mutuelles pour utilisateurs authentifiés"
  ON public.mutuelles;

CREATE POLICY "Lecture mutuelles pour utilisateurs authentifiés"
  ON public.mutuelles
  FOR SELECT
  TO authenticated
  USING (true);


-- A.5 : Vérification post-fix
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS nb_policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN ('caisses_assurance_maladie', 'mutuelles')
GROUP BY t.tablename, t.rowsecurity;
-- Attendu :
--   caisses_assurance_maladie | true | 1
--   mutuelles                 | true | 1


-- =====================================================================
-- PARTIE B : Sécurisation views auth.users (depuis 0.57.20)
-- =====================================================================
-- Contexte : v_users_emails et v_users_complete exposaient tous les
-- emails / last_sign_in_at cross-structure. Maintenant : filtrage par
-- structure du caller via security_invoker = true.


-- B.1 : Drop + recréer v_users_emails (utilisée par /signalements)
DROP VIEW IF EXISTS public.v_users_emails CASCADE;

CREATE VIEW public.v_users_emails
  WITH (security_invoker = true)
  AS
SELECT
  u.id AS user_id,
  u.email,
  (u.raw_user_meta_data ->> 'nom_affiche'::text) AS nom_affiche,
  u.created_at
FROM auth.users u
WHERE u.id IN (
  -- Le user lui-même
  SELECT auth.uid()
  UNION
  -- + les autres users de SA structure
  SELECT ms2.user_id
  FROM public.membres_structure ms2
  WHERE ms2.structure_id IN (
    SELECT ms1.structure_id
    FROM public.membres_structure ms1
    WHERE ms1.user_id = auth.uid()
  )
);

GRANT SELECT ON public.v_users_emails TO authenticated;


-- B.2 : Drop + recréer v_users_complete
DROP VIEW IF EXISTS public.v_users_complete CASCADE;

CREATE VIEW public.v_users_complete
  WITH (security_invoker = true)
  AS
SELECT
  ms.user_id,
  ms.structure_id,
  ms.role_id,
  r.nom AS role_nom,
  ms.nom_affiche,
  ms.nom,
  ms.prenom,
  ms.telephone,
  ms.mobile,
  ms.poste,
  ms.fonction_detail,
  ms.photo_url,
  ms.notes,
  ms.date_arrivee,
  ms.actif,
  ms.archive,
  ms.restreint_services,
  ms.preferences,
  u.email,
  u.last_sign_in_at,
  u.created_at AS user_created_at,
  u.email_confirmed_at,
  (u.email_confirmed_at IS NOT NULL) AS email_verifie
FROM public.membres_structure ms
LEFT JOIN auth.users u ON u.id = ms.user_id
LEFT JOIN public.roles r ON r.id = ms.role_id
WHERE ms.structure_id IN (
  SELECT structure_id
  FROM public.membres_structure
  WHERE user_id = auth.uid()
);

GRANT SELECT ON public.v_users_complete TO authenticated;


-- B.3 : Vérification post-fix (security_invoker bien activé)
SELECT
  schemaname,
  viewname,
  (SELECT array_to_string(reloptions, ', ')
   FROM pg_class
   WHERE relname = viewname AND relkind = 'v') AS options
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('v_users_emails', 'v_users_complete');
-- Attendu : options contient 'security_invoker=true' pour les 2


-- =====================================================================
-- PARTIE C : Tracking statut mail invitations (depuis 0.57.22)
-- =====================================================================
-- Ajoute 3 colonnes à la table invitations pour tracker l'envoi du mail
-- (envoyé, échoué, nombre de tentatives).

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS mail_envoye_at TIMESTAMPTZ NULL;

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS mail_erreur TEXT NULL;

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS mail_tentatives INTEGER DEFAULT 0;


-- C.1 : Backfill optionnel (les invitations > 1h sont supposées avoir été tentées)
UPDATE public.invitations
SET mail_tentatives = 1
WHERE mail_tentatives = 0
  AND created_at < now() - interval '1 hour';


-- C.2 : Index partiel sur mail_erreur (pour requêtes "invitations en échec")
CREATE INDEX IF NOT EXISTS idx_invitations_mail_erreur
  ON public.invitations(mail_erreur)
  WHERE mail_erreur IS NOT NULL;


-- C.3 : Commentaires documentation
COMMENT ON COLUMN public.invitations.mail_envoye_at IS
  'Date d''envoi réussi du mail d''invitation via Edge Function invite-user. NULL = pas encore envoyé ou échec.';

COMMENT ON COLUMN public.invitations.mail_erreur IS
  'Message d''erreur du dernier essai d''envoi (Resend / Edge Function). NULL si succès ou pas encore tenté.';

COMMENT ON COLUMN public.invitations.mail_tentatives IS
  'Nombre total de tentatives d''envoi (création initiale + renvois). Default 0.';


-- C.4 : Vérification post-migration
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'invitations'
  AND column_name IN ('mail_envoye_at', 'mail_erreur', 'mail_tentatives')
ORDER BY column_name;


-- C.5 : Stats actuelles
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE mail_envoye_at IS NOT NULL) AS mails_envoyes,
  COUNT(*) FILTER (WHERE mail_erreur IS NOT NULL) AS mails_en_echec,
  COUNT(*) FILTER (WHERE mail_envoye_at IS NULL AND mail_erreur IS NULL) AS jamais_tente,
  ROUND(AVG(mail_tentatives)::numeric, 2) AS moyenne_tentatives
FROM public.invitations;


-- =====================================================================
-- VÉRIFICATION GLOBALE FINALE
-- =====================================================================
-- Confirme que tout est OK après application des 3 parties

SELECT
  '✅ A. RLS caisses' AS check_name,
  CASE WHEN rowsecurity THEN '✓ OK' ELSE '❌ FAIL' END AS status
FROM pg_tables WHERE tablename = 'caisses_assurance_maladie'
UNION ALL
SELECT '✅ A. RLS mutuelles',
  CASE WHEN rowsecurity THEN '✓ OK' ELSE '❌ FAIL' END
FROM pg_tables WHERE tablename = 'mutuelles'
UNION ALL
SELECT '✅ B. v_users_emails security_invoker',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relname = 'v_users_emails' AND c.relkind = 'v'
    AND 'security_invoker=true' = ANY(c.reloptions)
  ) THEN '✓ OK' ELSE '❌ FAIL' END
UNION ALL
SELECT '✅ B. v_users_complete security_invoker',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relname = 'v_users_complete' AND c.relkind = 'v'
    AND 'security_invoker=true' = ANY(c.reloptions)
  ) THEN '✓ OK' ELSE '❌ FAIL' END
UNION ALL
SELECT '✅ C. invitations.mail_envoye_at',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitations' AND column_name = 'mail_envoye_at'
  ) THEN '✓ OK' ELSE '❌ FAIL' END
UNION ALL
SELECT '✅ C. invitations.mail_erreur',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitations' AND column_name = 'mail_erreur'
  ) THEN '✓ OK' ELSE '❌ FAIL' END
UNION ALL
SELECT '✅ C. invitations.mail_tentatives',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitations' AND column_name = 'mail_tentatives'
  ) THEN '✓ OK' ELSE '❌ FAIL' END;


-- =====================================================================
-- FIN — Tu devrais voir 7 lignes "✓ OK" dans le tableau final
-- =====================================================================
