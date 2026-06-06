-- =============================================================
-- Migration 0.58.53 : extension partenaires_rpps + types
-- =============================================================
-- Ajoute le flag est_pharmacien aux partenaires_rpps existants.
-- Les pharmacies en tant qu'établissements sont déjà dans etablissements
-- avec est_partenaire=true et profession_principale='pharmacie'.
-- =============================================================

-- Flag pharmacien sur partenaires_rpps (un pharmacien d'officine peut être
-- listé comme partenaire individuel, en plus de l'officine entité)
ALTER TABLE partenaires_rpps
  ADD COLUMN IF NOT EXISTS est_pharmacien BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN partenaires_rpps.est_pharmacien IS '0.58.53 - Le partenaire est-il un pharmacien (officine, hospitalier, etc.) ?';

-- Index pour les filtres rapides par type
CREATE INDEX IF NOT EXISTS idx_partenaires_rpps_types ON partenaires_rpps(structure_id, archive, est_prescripteur, est_intervenant, est_pharmacien);

-- =============================================================
-- Vérification (optionnel)
-- =============================================================
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'partenaires_rpps' AND column_name LIKE 'est_%';
