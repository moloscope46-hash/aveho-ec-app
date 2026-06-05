-- =============================================================
-- 0.58.24 (FIX v2) : Fix RLS audit_log (403 Forbidden)
-- =============================================================
-- À exécuter dans Supabase SQL Editor
-- Projet : rnvlzddgxiuslgljkobm
--
-- ⚠ CORRECTION v2 (5 juin 2026) : nom de table correct
--   AVANT (incorrect) : membres_structures (avec 's')
--   APRÈS (correct)   : membres_structure (sans 's')
--   Colonne correcte  : actif (et non archive)
--
-- Symptôme prod : POST /rest/v1/audit_log retourne 403 (Forbidden)
-- Cause : la RLS d'INSERT sur audit_log rejette les inserts depuis le
--         client authentifié.
-- =============================================================

-- 1. Vérifier les policies actuelles (DEBUG facultatif)
-- SELECT * FROM pg_policies WHERE tablename = 'audit_log';

-- 2. Supprimer l'ancienne policy INSERT si elle existe
DROP POLICY IF EXISTS "audit_log_insert_authenticated" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert_v2" ON audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert audit_log" ON audit_log;

-- 3. Créer une nouvelle policy INSERT permissive mais sécurisée
--    L'user_id doit correspondre à auth.uid()
--    + appartenance via la table membres_structure (singulier !)
--    + colonne actif (et non archive)
CREATE POLICY "audit_log_insert_v2" ON audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  -- L'user_id doit correspondre à l'utilisateur connecté
  user_id = auth.uid()
  AND
  -- La structure_id doit appartenir à l'user (via table membres_structure)
  EXISTS (
    SELECT 1 FROM membres_structure
    WHERE membres_structure.user_id = auth.uid()
      AND membres_structure.structure_id = audit_log.structure_id
      AND (membres_structure.actif IS NULL OR membres_structure.actif = true)
  )
);

-- 4. Activer RLS si pas déjà actif
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 5. Vérifier que ça marche : on devrait voir cette policy
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'audit_log';
