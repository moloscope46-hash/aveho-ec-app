-- =============================================================
-- Migration 0.58.79 — Workflow scan + emplacements + inventaire
-- Philosophie 0.58.78 conservée : que des ALTER, pas de nouvelle table
-- =============================================================

-- ============================================================
-- 1) Emplacement précis sur les matériels (libellé texte court)
-- ============================================================
-- Permet de noter "Étagère 3, casier B" sans créer de table emplacements
ALTER TABLE materiels
  ADD COLUMN IF NOT EXISTS emplacement TEXT;

CREATE INDEX IF NOT EXISTS idx_materiels_emplacement
  ON materiels(depot_id, emplacement)
  WHERE emplacement IS NOT NULL;

-- ============================================================
-- 2) Sous-emplacements via auto-référence depots.parent_depot_id
-- ============================================================
-- Un emplacement = un dépôt avec niveau_hierarchique='emplacement' et parent_depot_id pointant vers son dépôt parent
ALTER TABLE depots
  ADD COLUMN IF NOT EXISTS parent_depot_id UUID;

CREATE INDEX IF NOT EXISTS idx_depots_parent
  ON depots(parent_depot_id)
  WHERE parent_depot_id IS NOT NULL;

-- ============================================================
-- 3) Tracking d'inventaire sur les dépôts
-- ============================================================
ALTER TABLE depots
  ADD COLUMN IF NOT EXISTS inventaire_dernier TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inventaire_dernier_par UUID,
  ADD COLUMN IF NOT EXISTS inventaire_ecarts_count INTEGER;

-- ============================================================
-- 4) Workflow transfert : marquer si créé par scan
-- ============================================================
ALTER TABLE transferts
  ADD COLUMN IF NOT EXISTS cree_par_scan BOOLEAN DEFAULT false;

-- ============================================================
-- 5) Vue v_depots_hierarchie : inclure parent (sub-emplacement)
-- ============================================================
DROP VIEW IF EXISTS v_depots_hierarchie CASCADE;

CREATE OR REPLACE VIEW v_depots_hierarchie AS
SELECT
  d.id,
  d.nom,
  d.code,
  d.type,
  d.niveau_hierarchique,
  d.parent_depot_id,
  d.actif,
  d.securise,
  d.structure_id,
  d.etablissement_id,
  d.inventaire_dernier,
  b.nom AS batiment_nom,
  s.nom AS service_nom,
  c.nom AS chambre_nom,
  m.nom AS magasin_nom,
  parent.nom AS parent_nom,
  CONCAT_WS(' > ',
    b.nom,
    s.nom,
    c.nom,
    m.nom,
    parent.nom
  ) AS chemin_complet
FROM depots d
LEFT JOIN batiments b ON b.id = d.batiment_id
LEFT JOIN services s ON s.id = d.service_id
LEFT JOIN chambres c ON c.id = d.chambre_id
LEFT JOIN magasins m ON m.id = d.magasin_id
LEFT JOIN depots parent ON parent.id = d.parent_depot_id;

COMMENT ON VIEW v_depots_hierarchie IS '0.58.79 - Ajout chemin via parent_depot_id pour sous-emplacements';
