-- =============================================================
--  fix-rls-aveho.sql (Alpha 0.57.19)
--
--  Script de FIX RLS personnalisé pour Aveho EC après audit.
--
--  CONTEXTE AUDIT (PARTIE 1 lancée par utilisateur le 2 juin 2026) :
--   - 68 tables totales dans le schéma public
--   - 66 tables ont déjà RLS activé ✅
--   - 2 tables SANS RLS (signalées par Supabase Security Advisor) :
--       1. caisses_assurance_maladie  (référentiel des caisses CPAM)
--       2. mutuelles                  (référentiel des mutuelles santé)
--
--  CES 2 TABLES SONT DES RÉFÉRENTIELS PARTAGÉS :
--   - Elles n'ont PAS de colonne structure_id (donnée commune à tous les PSAD)
--   - Lecture : doit être autorisée à tous les users authentifiés
--   - Écriture : RÉSERVÉE à un rôle admin Aveho (jamais aux users PSAD)
--
--  ⚠️ AVANT D'EXÉCUTER : faire un SNAPSHOT Supabase
--     Dashboard → Database → Backups → "Create snapshot"
-- =============================================================


-- ============================================================
-- ÉTAPE 1 : VÉRIFICATION PRÉ-FIX (lecture seule)
-- ============================================================
-- Confirmer que c'est bien ces 2 tables et qu'elles ont les bonnes colonnes

SELECT
  table_name,
  COUNT(*) FILTER (WHERE column_name = 'structure_id') AS has_structure_id,
  COUNT(*) AS nb_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('caisses_assurance_maladie', 'mutuelles')
GROUP BY table_name;
-- → Attendu : has_structure_id = 0 (référentiel partagé)


-- ============================================================
-- ÉTAPE 2 : ACTIVER RLS + POLICY LECTURE pour caisses_assurance_maladie
-- ============================================================

-- 2.1 Activer Row Level Security
ALTER TABLE public.caisses_assurance_maladie ENABLE ROW LEVEL SECURITY;

-- 2.2 Policy : tout user authentifié peut LIRE le référentiel
CREATE POLICY "Lecture caisses pour utilisateurs authentifiés"
  ON public.caisses_assurance_maladie
  FOR SELECT
  TO authenticated
  USING (true);

-- 2.3 Policy : SEUL le service_role peut INSERT/UPDATE/DELETE
-- (Le service_role est utilisé en backend Aveho pour les imports CSV/RPPS)
-- Note : pas besoin de créer une policy explicite pour service_role car il
-- bypass RLS par défaut. Mais on bloque explicitement authenticated en INSERT/UPDATE/DELETE
-- en ne créant AUCUNE policy → refus par défaut.

-- Vérifier : un user authenticated ne peut QUE lire, pas modifier.


-- ============================================================
-- ÉTAPE 3 : ACTIVER RLS + POLICY LECTURE pour mutuelles
-- ============================================================

ALTER TABLE public.mutuelles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture mutuelles pour utilisateurs authentifiés"
  ON public.mutuelles
  FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- ÉTAPE 4 : INVESTIGATION view exposant auth.users
-- ============================================================
-- D'après l'alerte Supabase, il y a aussi une view qui expose auth.users.
-- Liste-la pour qu'on décide quoi faire :

SELECT
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND (
    definition ILIKE '%auth.users%'
    OR definition ILIKE '%auth.identities%'
    OR definition ILIKE '%auth.sessions%'
  );
-- → Copie-colle le résultat dans ta réponse pour qu'on fixe ensemble la view.


-- ============================================================
-- ÉTAPE 5 : VÉRIFICATION POST-FIX
-- ============================================================
-- Vérifier que les 2 tables ont maintenant RLS activé + 1 policy chacune

SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS nb_policies,
  string_agg(p.policyname || ' (' || p.cmd || ')', ', ') AS policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN ('caisses_assurance_maladie', 'mutuelles')
GROUP BY t.tablename, t.rowsecurity;

-- → Attendu :
--   caisses_assurance_maladie | true | 1 | Lecture caisses... (SELECT)
--   mutuelles                 | true | 1 | Lecture mutuelles... (SELECT)


-- ============================================================
-- ÉTAPE 6 : TEST FONCTIONNEL CÔTÉ APP
-- ============================================================
-- Après exécution, tester dans l'app Aveho que :
--  1. La recherche de caisses (/api/caisses?q=Paris) renvoie des résultats
--  2. La recherche de mutuelles (/api/mutuelles?q=Harmonie) renvoie des résultats
--  3. La création de patient (qui auto-link caisse/mutuelle via OCR) fonctionne
--  4. Aller dans Supabase Dashboard → Database → Advisors → Performance and Security Lints
--     et vérifier que les 2 alertes "rls_disabled_in_public" sont parties.

-- ============================================================
-- FIN
-- ============================================================
