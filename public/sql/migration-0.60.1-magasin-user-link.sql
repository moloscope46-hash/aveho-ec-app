-- =============================================================
-- migration-0.60.1-magasin-user-link.sql
-- - ALTER membres_structure : ajout magasin_fournisseur_id (rattachement user → magasin)
-- - ALTER magasins : ajout etablissement_rattache_id + responsable_user_id
-- - Vue v_magasins_disponibles (magasins non encore rattachés)
-- - Index UNIQUE pour empêcher 2 utilisateurs sur même magasin fournisseur
-- =============================================================

-- ==========================================
-- ALTER membres_structure : rattachement à un magasin fournisseur
-- ==========================================
ALTER TABLE membres_structure
  ADD COLUMN IF NOT EXISTS magasin_fournisseur_id UUID;

CREATE INDEX IF NOT EXISTS idx_ms_magasin_four
  ON membres_structure(magasin_fournisseur_id)
  WHERE magasin_fournisseur_id IS NOT NULL;

-- Index unique : un magasin ne peut être rattaché qu'à un seul utilisateur
-- (si tu veux plusieurs users par magasin, supprime cette contrainte)
DROP INDEX IF EXISTS uq_ms_magasin_four;
CREATE UNIQUE INDEX uq_ms_magasin_four
  ON membres_structure(magasin_fournisseur_id)
  WHERE magasin_fournisseur_id IS NOT NULL;

-- ==========================================
-- ALTER magasins : rattachement à un établissement EC
-- ==========================================
ALTER TABLE magasins
  ADD COLUMN IF NOT EXISTS etablissement_rattache_id UUID,
  ADD COLUMN IF NOT EXISTS responsable_user_id UUID;

CREATE INDEX IF NOT EXISTS idx_magasins_etab_rattache
  ON magasins(etablissement_rattache_id)
  WHERE etablissement_rattache_id IS NOT NULL;

-- ==========================================
-- VUE v_magasins_disponibles
-- Magasins non rattachés à un user (pour propose dans création utilisateur)
-- ==========================================
CREATE OR REPLACE VIEW v_magasins_disponibles AS
SELECT
  m.id,
  m.nom,
  m.ville,
  m.code_postal,
  m.etablissement_rattache_id,
  m.structure_id,
  CASE
    WHEN ms.user_id IS NOT NULL THEN true
    ELSE false
  END AS est_rattache,
  ms.user_id AS rattache_user_id
FROM magasins m
LEFT JOIN membres_structure ms ON ms.magasin_fournisseur_id = m.id
WHERE m.actif = true OR m.actif IS NULL
ORDER BY m.nom;

-- ==========================================
-- VÉRIFICATION
-- ==========================================
SELECT 'COLUMNS ADDED' AS info, table_name, column_name FROM information_schema.columns
WHERE (table_name = 'membres_structure' AND column_name = 'magasin_fournisseur_id')
   OR (table_name = 'magasins' AND column_name IN ('etablissement_rattache_id', 'responsable_user_id'))
ORDER BY table_name, column_name;
