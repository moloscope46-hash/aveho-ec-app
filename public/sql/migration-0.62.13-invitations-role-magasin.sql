-- =============================================================
-- migration-0.62.13-invitations-role-magasin.sql
-- Ajoute role_professionnel + magasin_fournisseur_id à invitations
-- pour pré-rattacher un user magasin dès la création
-- 100% idempotent
-- =============================================================

ALTER TABLE IF EXISTS invitations
  ADD COLUMN IF NOT EXISTS role_professionnel TEXT,
  ADD COLUMN IF NOT EXISTS magasin_fournisseur_id UUID;

CREATE INDEX IF NOT EXISTS idx_invitations_role ON invitations(role_professionnel) WHERE role_professionnel IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_magasin ON invitations(magasin_fournisseur_id) WHERE magasin_fournisseur_id IS NOT NULL;

-- Vérif
SELECT 'Colonnes ajoutées' AS info,
  COUNT(*) FILTER (WHERE column_name = 'role_professionnel') AS has_role,
  COUNT(*) FILTER (WHERE column_name = 'magasin_fournisseur_id') AS has_magasin
FROM information_schema.columns
WHERE table_name = 'invitations';
