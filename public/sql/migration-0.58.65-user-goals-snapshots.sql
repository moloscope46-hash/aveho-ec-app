-- =============================================================
-- Migration 0.58.65 : snapshots serveur des stats objectifs équipe
-- =============================================================
-- Table pour stocker un snapshot quotidien des stats par user.
-- Alimenté par l'Edge Function `goals-snapshot-cron` exécutée
-- chaque nuit via pg_cron (00:30 UTC).
-- Permet d'afficher la courbe d'évolution 7j/30j même si l'user
-- ne s'est pas connecté tous les jours (vs localStorage 0.58.63).
-- =============================================================

CREATE TABLE IF NOT EXISTS user_goals_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  -- Stats agrégées au moment du snapshot
  avg_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,  -- ex: 67.50
  nb_atteints INTEGER NOT NULL DEFAULT 0,
  nb_total INTEGER NOT NULL DEFAULT 0,
  taux_atteinte NUMERIC(5, 2) NOT NULL DEFAULT 0,
  -- Détail par équipe (JSONB pour flexibilité)
  team_stats JSONB DEFAULT '[]'::jsonb,
  -- Snapshot raw des goals (utile pour audit)
  goals_raw JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Unicité : un snapshot par user par jour
  UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_user_goals_snapshots_user_date
  ON user_goals_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_goals_snapshots_structure
  ON user_goals_snapshots(structure_id, snapshot_date DESC);

-- RLS : chaque user voit ses snapshots + les membres de sa structure pour les stats partagées
ALTER TABLE user_goals_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_goals_snapshots_read_own_or_struct"
  ON user_goals_snapshots FOR SELECT
  USING (
    user_id = auth.uid()
    OR structure_id IN (
      SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "user_goals_snapshots_insert_service_role_only"
  ON user_goals_snapshots FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Nettoyage auto : on garde 90 jours d'historique max
-- (à appeler depuis le CRON après chaque insert pour éviter croissance)
COMMENT ON TABLE user_goals_snapshots IS '0.58.65 - Snapshots quotidiens des stats objectifs (CRON 00:30 UTC, rétention 90j)';

-- =============================================================
-- Vérification :
-- SELECT * FROM user_goals_snapshots WHERE user_id = auth.uid() ORDER BY snapshot_date DESC LIMIT 30;
-- =============================================================
