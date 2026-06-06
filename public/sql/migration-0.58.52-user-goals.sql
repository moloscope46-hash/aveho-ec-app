-- =============================================================
-- Migration 0.58.52 : table user_goals (objectifs personnels)
-- =============================================================
-- Permet de synchroniser les objectifs personnels (widget Objectifs)
-- entre les appareils du même user (et préparation au partage équipe).
-- =============================================================

CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  target NUMERIC NOT NULL DEFAULT 0,
  current NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  color_id TEXT NOT NULL DEFAULT 'blue',  -- id couleur dans GOAL_COLORS
  position INTEGER NOT NULL DEFAULT 0,    -- ordre d'affichage
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE user_goals IS '0.58.52 - Objectifs personnels de chaque user (widget Mes objectifs)';

-- Index
CREATE INDEX IF NOT EXISTS idx_user_goals_user ON user_goals(user_id, position);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_user_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_goals_updated_at ON user_goals;
CREATE TRIGGER trigger_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_goals_updated_at();

-- RLS : chaque user voit/édite uniquement ses objectifs
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own goals" ON user_goals;
CREATE POLICY "Read own goals"
  ON user_goals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Insert own goals" ON user_goals;
CREATE POLICY "Insert own goals"
  ON user_goals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Update own goals" ON user_goals;
CREATE POLICY "Update own goals"
  ON user_goals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Delete own goals" ON user_goals;
CREATE POLICY "Delete own goals"
  ON user_goals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
