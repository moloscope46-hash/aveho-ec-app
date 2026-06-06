-- =============================================================
-- Migration 0.58.52 : table membres_equipe + RLS
-- =============================================================
-- Fix définitif du 404 sur la table membres_equipe.
-- Crée la table d'appartenance user↔équipe avec RLS appropriée.
--
-- Architecture :
--   equipes (déjà existante)
--     ↳ membres_equipe (user_id, equipe_id) ← cette migration
-- =============================================================

-- 1) Table membres_equipe
CREATE TABLE IF NOT EXISTS membres_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipe_id UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  role TEXT,  -- ex: 'membre', 'responsable', 'expert' (optionnel)
  ajoute_le TIMESTAMPTZ DEFAULT now(),
  ajoute_par UUID REFERENCES auth.users(id),
  UNIQUE (user_id, equipe_id)
);

COMMENT ON TABLE membres_equipe IS '0.58.52 - Appartenance user ↔ équipe (relation n:n)';
COMMENT ON COLUMN membres_equipe.role IS 'Rôle optionnel dans l''équipe : membre, responsable, expert, etc.';

-- 2) Index utiles
CREATE INDEX IF NOT EXISTS idx_membres_equipe_user ON membres_equipe(user_id);
CREATE INDEX IF NOT EXISTS idx_membres_equipe_equipe ON membres_equipe(equipe_id);

-- 3) RLS : activation
ALTER TABLE membres_equipe ENABLE ROW LEVEL SECURITY;

-- 3a) SELECT : tout user authentifié peut voir les memberships de sa structure
DROP POLICY IF EXISTS "Select membres_equipe in own structure" ON membres_equipe;
CREATE POLICY "Select membres_equipe in own structure"
  ON membres_equipe FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipes e
      JOIN membres_structure ms ON ms.structure_id = e.structure_id
      WHERE e.id = membres_equipe.equipe_id
        AND ms.user_id = auth.uid()
    )
  );

-- 3b) INSERT/UPDATE/DELETE : seulement admin de la structure
DROP POLICY IF EXISTS "Manage membres_equipe (admin)" ON membres_equipe;
CREATE POLICY "Manage membres_equipe (admin)"
  ON membres_equipe FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipes e
      JOIN membres_structure ms ON ms.structure_id = e.structure_id
      JOIN roles r ON r.id = ms.role_id
      WHERE e.id = membres_equipe.equipe_id
        AND ms.user_id = auth.uid()
        AND r.nom = 'Administrateur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM equipes e
      JOIN membres_structure ms ON ms.structure_id = e.structure_id
      JOIN roles r ON r.id = ms.role_id
      WHERE e.id = membres_equipe.equipe_id
        AND ms.user_id = auth.uid()
        AND r.nom = 'Administrateur'
    )
  );

-- =============================================================
-- Vérification post-déploiement (optionnel)
-- =============================================================
-- SELECT count(*) FROM membres_equipe;
-- SELECT viewname FROM pg_tables WHERE tablename = 'membres_equipe';
