-- =============================================================
-- Migration 0.58.55 : partage objectifs équipe + badge collaborateur
-- =============================================================
-- 1) Étend user_goals avec team_id pour partage d'objectifs entre membres d'une équipe
-- 2) Ajoute est_collaborateur à partenaires_rpps pour marquer les partenaires
--    qui sont aussi utilisateurs internes (badge "Collaborateur")
-- =============================================================

-- ============================================================================
-- A) user_goals : extension team_id (partage équipe)
-- ============================================================================

ALTER TABLE user_goals
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES equipes(id) ON DELETE SET NULL;

ALTER TABLE user_goals
  ADD COLUMN IF NOT EXISTS shared BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN user_goals.team_id IS '0.58.55 - Équipe avec laquelle l''objectif est partagé (NULL = privé)';
COMMENT ON COLUMN user_goals.shared IS '0.58.55 - L''objectif est-il partagé avec l''équipe team_id ?';

-- Index pour lookup rapide des objectifs partagés par équipe
CREATE INDEX IF NOT EXISTS idx_user_goals_team ON user_goals(team_id, shared) WHERE team_id IS NOT NULL;

-- Mise à jour des policies RLS : permettre la lecture des objectifs partagés
-- avec mes équipes (en plus de mes propres objectifs)
DROP POLICY IF EXISTS "Read own goals" ON user_goals;
CREATE POLICY "Read own or shared goals"
  ON user_goals FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      shared = TRUE
      AND team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM membres_equipe
        WHERE membres_equipe.equipe_id = user_goals.team_id
          AND membres_equipe.user_id = auth.uid()
      )
    )
  );

-- INSERT / UPDATE / DELETE restent inchangées : seul le propriétaire peut modifier

-- ============================================================================
-- B) partenaires_rpps : badge est_collaborateur
-- ============================================================================

ALTER TABLE partenaires_rpps
  ADD COLUMN IF NOT EXISTS est_collaborateur BOOLEAN DEFAULT FALSE;

ALTER TABLE partenaires_rpps
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN partenaires_rpps.est_collaborateur IS '0.58.55 - Le partenaire est aussi un utilisateur interne de la plateforme ?';
COMMENT ON COLUMN partenaires_rpps.user_id IS '0.58.55 - Lien optionnel vers le user auth.users si le partenaire est aussi utilisateur';

-- Index pour filtre rapide
CREATE INDEX IF NOT EXISTS idx_partenaires_rpps_collaborateur
  ON partenaires_rpps(structure_id, est_collaborateur) WHERE est_collaborateur = TRUE;

-- =============================================================
-- Vérifications
-- =============================================================
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name IN ('user_goals', 'partenaires_rpps')
--   AND column_name IN ('team_id', 'shared', 'est_collaborateur', 'user_id');
