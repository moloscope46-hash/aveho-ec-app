-- =============================================================
--  audit-rls-supabase.sql (Alpha 0.57.18)
--
--  Script d'audit + fix automatique RLS pour Aveho EC.
--
--  PARTIE 1 : AUDIT (lecture seule) — à lancer en premier
--             Liste les tables SANS RLS, les views exposant auth.users,
--             les fonctions SECURITY DEFINER, les policies actuelles.
--
--  PARTIE 2 : FIX SQL (à valider avant exécution)
--             Active RLS sur toutes les tables publiques sans policies.
--             Crée des policies par défaut "structure_id = current user".
--
--  ⚠️ À LANCER DEPUIS : Supabase Dashboard → SQL Editor
--     Recommandation : faire un SNAPSHOT/BACKUP avant la PARTIE 2.
-- =============================================================

-- ============================================================
-- PARTIE 1 : AUDIT (à lancer en premier — lecture seule)
-- ============================================================

-- 1.1 Tables du schéma public SANS RLS activé
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  '🚨 RLS DÉSACTIVÉ — TABLE PUBLIQUEMENT ACCESSIBLE' AS warning
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- 1.2 Tables avec RLS activé MAIS aucune policy (= bloque tout)
-- Ces tables sont en lecture/écriture IMPOSSIBLE même pour les users légitimes
SELECT
  t.tablename,
  '⚠️ RLS activé mais 0 policy → personne ne peut lire/écrire (cassé)' AS warning
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
GROUP BY t.schemaname, t.tablename
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;

-- 1.3 Views qui exposent auth.users (warning Supabase Advisor)
SELECT
  schemaname,
  viewname,
  '🚨 VIEW EXPOSE AUTH.USERS — données utilisateur publiques' AS warning,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND (
    definition ILIKE '%auth.users%'
    OR definition ILIKE '%auth.identities%'
    OR definition ILIKE '%auth.sessions%'
  )
ORDER BY viewname;

-- 1.4 Fonctions SECURITY DEFINER dans public (privilege escalation potentielle)
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_mode,
  pg_get_function_identity_arguments(p.oid) AS args,
  CASE WHEN p.prosecdef THEN '⚠️ Vérifier que search_path est figé' ELSE '✅ OK' END AS audit
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- 1.5 Récap policies par table (visibilité de ce qui existe)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd AS command,
  roles,
  qual AS using_expr,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 1.6 Tables qui n'ont JAMAIS GRANT pour anon/authenticated
-- (= n'apparaissent pas dans l'API REST Supabase)
SELECT
  t.tablename,
  string_agg(DISTINCT grantee || ':' || privilege_type, ', ') AS grants
FROM pg_tables t
LEFT JOIN information_schema.role_table_grants r
  ON r.table_name = t.tablename
  AND r.table_schema = t.schemaname
  AND r.grantee IN ('anon', 'authenticated', 'service_role')
WHERE t.schemaname = 'public'
GROUP BY t.tablename
ORDER BY t.tablename;


-- ============================================================
-- PARTIE 2 : FIX AUTOMATIQUE (à valider avant exécution !)
-- ============================================================
--
-- Les blocs ci-dessous sont COMMENTÉS pour éviter l'exécution accidentelle.
-- Décommenter UN BLOC À LA FOIS après audit de la PARTIE 1.
--

-- ----- 2.1 ACTIVER RLS sur toutes les tables sans RLS -----
-- ⚠️ IMPORTANT : si une table n'a pas de policy ensuite, elle deviendra
-- INACCESSIBLE pour tous (sauf service_role et propriétaire).
-- Donc à utiliser SEULEMENT après avoir préparé les policies.

/*
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'RLS activé sur public.%', r.tablename;
  END LOOP;
END $$;
*/


-- ----- 2.2 POLICY GÉNÉRIQUE "lecture seule pour authenticated" -----
-- À utiliser pour les tables de référence (référentiel CCAM, NAF, etc.)
-- qui n'ont pas de structure_id mais doivent être lues par tous les users auth.

/*
-- Exemple pour une table 'referentiel_xxx' :
CREATE POLICY "Lecture authenticated"
  ON public.referentiel_xxx
  FOR SELECT
  TO authenticated
  USING (true);
*/


-- ----- 2.3 POLICY "isolation par structure" -----
-- Pour les tables qui ont une colonne structure_id (la plupart des tables métier Aveho).
-- Pattern : un user peut lire/écrire SEULEMENT les lignes de sa structure.

/*
-- Exemple pour une table 'patients' (à adapter au nom de ta table) :

-- Lecture : seulement les patients de ma structure
CREATE POLICY "Lecture par structure"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    structure_id IN (
      SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()
    )
  );

-- Insertion : seulement avec mon structure_id
CREATE POLICY "Insertion dans ma structure"
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    structure_id IN (
      SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()
    )
  );

-- Modification : seulement les patients de ma structure
CREATE POLICY "Modification dans ma structure"
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (
    structure_id IN (
      SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    structure_id IN (
      SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()
    )
  );

-- Suppression : seulement les patients de ma structure
CREATE POLICY "Suppression dans ma structure"
  ON public.patients
  FOR DELETE
  TO authenticated
  USING (
    structure_id IN (
      SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()
    )
  );
*/


-- ----- 2.4 FIX VIEWS EXPOSANT auth.users -----
-- Si la PARTIE 1.3 révèle des views qui exposent auth.users, voici comment fixer.

/*
-- Option A : SUPPRIMER la view si pas utile
DROP VIEW IF EXISTS public.vue_users_publique CASCADE;

-- Option B : Recréer la view en filtrant les colonnes sensibles
-- (à adapter au nom et au contenu de ta view)
DROP VIEW IF EXISTS public.vue_users_publique CASCADE;
CREATE VIEW public.vue_users_publique
  WITH (security_invoker = true)  -- IMPORTANT : 'invoker' applique RLS du caller, pas du créateur
  AS
SELECT
  id,
  -- email,                          -- ❌ NE PAS exposer
  -- encrypted_password,              -- ❌ JAMAIS
  -- raw_user_meta_data,              -- ❌ peut contenir des secrets
  created_at
FROM auth.users
WHERE id = auth.uid();              -- chaque user ne voit que sa propre ligne
*/


-- ----- 2.5 FIGER search_path sur les fonctions SECURITY DEFINER -----
-- Si la PARTIE 1.4 révèle des fonctions SECURITY DEFINER sans search_path,
-- elles peuvent être détournées par injection schema.

/*
-- Exemple : fixer une fonction my_function() en SECURITY DEFINER
ALTER FUNCTION public.my_function() SET search_path = public, pg_temp;
-- ou pour TOUTES les fonctions SECURITY DEFINER :
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp',
      r.proname, r.args
    );
    RAISE NOTICE 'search_path figé sur %.%(%)', r.schema, r.proname, r.args;
  END LOOP;
END $$;
*/

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
