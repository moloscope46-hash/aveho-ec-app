-- =============================================================
--  fix-views-auth-exposed.sql (Alpha 0.57.20)
--
--  Fix des views qui exposent auth.users (Supabase Security Advisor)
--  Suite à l'audit RLS livré dans 0.57.18-19 :
--   - 2 views exposent auth.users en clair (lecture par n'importe quel
--     user authentifié, cross-structure) :
--       1. v_users_emails    (utilisée par signalements pour notif)
--       2. v_users_complete  (plus utilisée dans le code, mais préservée)
--
--  Stratégie : recréer avec security_invoker = true + filtre par structure
--  → un user ne voit que les autres users de sa propre structure.
--
--  ⚠️ AVANT D'EXÉCUTER : SNAPSHOT Supabase
--     Dashboard → Database → Backups → "Create snapshot"
-- =============================================================


-- ============================================================
-- ÉTAPE 1 : SAUVEGARDE des definitions actuelles (pour rollback)
-- ============================================================
-- Garde les definitions originales dans un commentaire au cas où

/*
v_users_emails (ORIGINAL — exposait tous les users) :

CREATE VIEW public.v_users_emails AS
SELECT id AS user_id,
  email,
  (raw_user_meta_data ->> 'nom_affiche'::text) AS nom_affiche,
  created_at
FROM auth.users;

v_users_complete (ORIGINAL — exposait tous les users cross-structure) :

CREATE VIEW public.v_users_complete AS
SELECT ms.user_id, ms.structure_id, ms.role_id, r.nom AS role_nom,
  ms.nom_affiche, ms.nom, ms.prenom, ms.telephone, ms.mobile,
  ms.poste, ms.fonction_detail, ms.photo_url, ms.notes,
  ms.date_arrivee, ms.actif, ms.archive, ms.restreint_services, ms.preferences,
  u.email, u.last_sign_in_at, u.created_at AS user_created_at,
  u.email_confirmed_at, (u.email_confirmed_at IS NOT NULL) AS email_verifie
FROM membres_structure ms
LEFT JOIN auth.users u ON u.id = ms.user_id
LEFT JOIN roles r ON r.id = ms.role_id;
*/


-- ============================================================
-- ÉTAPE 2 : FIX v_users_emails (utilisée par signalements)
-- ============================================================
-- Drop + recréer avec :
--  - security_invoker = true : applique le RLS du caller (pas du créateur)
--  - Filtre : un user ne voit que les autres membres de sa(ses) structure(s)
--  - Lui-même est toujours inclus

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
  -- Le user lui-même peut toujours voir son propre email
  SELECT auth.uid()
  UNION
  -- + tous les autres users qui sont dans la même structure que moi
  SELECT ms2.user_id
  FROM public.membres_structure ms2
  WHERE ms2.structure_id IN (
    SELECT ms1.structure_id
    FROM public.membres_structure ms1
    WHERE ms1.user_id = auth.uid()
  )
);

-- Grant SELECT pour authenticated (sinon plus accessible)
GRANT SELECT ON public.v_users_emails TO authenticated;


-- ============================================================
-- ÉTAPE 3 : FIX v_users_complete (préservée par sécurité)
-- ============================================================
-- Même pattern : security_invoker + filtre par structure

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
  -- Filtre : seulement les membres de mes structures
  SELECT structure_id
  FROM public.membres_structure
  WHERE user_id = auth.uid()
);

GRANT SELECT ON public.v_users_complete TO authenticated;


-- ============================================================
-- ÉTAPE 4 : VÉRIFICATION POST-FIX
-- ============================================================

-- 4.1 Confirmer que les views ont security_invoker = true
SELECT
  schemaname,
  viewname,
  (SELECT array_to_string(reloptions, ', ')
   FROM pg_class
   WHERE relname = viewname AND relkind = 'v') AS options
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('v_users_emails', 'v_users_complete');
-- → Attendu : options contient 'security_invoker=true' pour les 2

-- 4.2 Vérifier qu'on peut bien LIRE en tant qu'utilisateur authentifié
-- (à lancer en étant connecté à Supabase Auth)
SELECT count(*) AS nb_users_visibles FROM public.v_users_emails;
-- → Attendu : voit uniquement les users de ma structure (et moi-même)

SELECT count(*) AS nb_users_visibles_complete FROM public.v_users_complete;
-- → Attendu : pareil


-- ============================================================
-- ÉTAPE 5 : TEST FONCTIONNEL CÔTÉ APP
-- ============================================================
-- Après exécution, tester dans Aveho EC que :
--  1. Page /signalements : créer un signalement, qu'un autre user de TA structure
--     y répond, et vérifier que tu reçois bien la notif email (si configurée)
--     → confirme que v_users_emails fonctionne toujours pour les cas légitimes
--  2. Aller dans Supabase Dashboard → Database → Advisors
--     → l'alerte "auth_users_exposed" doit avoir disparu


-- ============================================================
-- ÉTAPE 6 : ROLLBACK D'URGENCE (si problème)
-- ============================================================
-- Si après le fix, /signalements ne fonctionne plus pour les notifs :
-- décommenter et exécuter le bloc ci-dessous pour revenir à l'ancienne version.

/*
DROP VIEW IF EXISTS public.v_users_emails CASCADE;
CREATE VIEW public.v_users_emails AS
SELECT id AS user_id,
  email,
  (raw_user_meta_data ->> 'nom_affiche'::text) AS nom_affiche,
  created_at
FROM auth.users;

GRANT SELECT ON public.v_users_emails TO authenticated;
*/


-- ============================================================
-- FIN
-- ============================================================
