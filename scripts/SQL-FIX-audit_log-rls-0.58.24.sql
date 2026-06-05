-- =============================================================
-- 0.58.24 : Fix RLS audit_log (403 Forbidden)
-- =============================================================
-- À exécuter dans Supabase SQL Editor
-- Projet : rnvlzddgxiuslgljkobm
--
-- Symptôme prod : POST /rest/v1/audit_log retourne 403 (Forbidden)
-- Cause : la RLS d'INSERT sur audit_log rejette les inserts depuis le
--         client authentifié (probablement parce qu'elle ne reconnaît
--         pas l'appartenance à la structure).
--
-- Fix : recréer la policy INSERT avec un check plus permissif basé
--       sur la présence de structure_id appartenant à l'utilisateur.
-- =============================================================

-- 1. Vérifier les policies actuelles (DEBUG)
-- SELECT * FROM pg_policies WHERE tablename = 'audit_log';

-- 2. Supprimer l'ancienne policy INSERT si elle existe
DROP POLICY IF EXISTS "audit_log_insert_authenticated" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert audit_log" ON audit_log;

-- 3. Créer une nouvelle policy INSERT permissive mais sécurisée
--    L'user doit être authentifié + le user_id du log correspondre à auth.uid()
--    + la structure_id doit être une de celles auxquelles il appartient
CREATE POLICY "audit_log_insert_v2" ON audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  -- L'user_id doit correspondre à l'utilisateur connecté
  user_id = auth.uid()
  AND
  -- La structure_id doit appartenir à l'user (via table membres_structures)
  EXISTS (
    SELECT 1 FROM membres_structures
    WHERE membres_structures.user_id = auth.uid()
      AND membres_structures.structure_id = audit_log.structure_id
      AND (membres_structures.archive IS NULL OR membres_structures.archive = false)
  )
);

-- 4. Activer RLS si pas déjà actif
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 5. Vérifier que ça marche : on devrait pouvoir voir cette policy
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'audit_log';
