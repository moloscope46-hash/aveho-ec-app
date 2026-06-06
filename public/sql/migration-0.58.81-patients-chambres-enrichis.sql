-- =============================================================
-- Migration 0.58.81 — Patients enrichis + téléphone chambre
-- Philosophie 0.58.78 : que des ALTER, jamais de nouvelle table
-- =============================================================

-- ============================================================
-- 1) Téléphone et infos enrichies sur les CHAMBRES
-- ============================================================
ALTER TABLE chambres
  ADD COLUMN IF NOT EXISTS telephone TEXT,                       -- ligne directe chambre
  ADD COLUMN IF NOT EXISTS code_acces TEXT,                      -- digicode / clé
  ADD COLUMN IF NOT EXISTS type_chambre TEXT,                    -- 'simple', 'double', 'medical', 'isolement'
  ADD COLUMN IF NOT EXISTS lits_max INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS equipements JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 2) Infos enrichies sur les PATIENTS (toutes optionnelles)
-- ============================================================
ALTER TABLE patients
  -- Coordonnées
  ADD COLUMN IF NOT EXISTS telephone TEXT,                       -- téléphone perso/portable du patient
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,

  -- Identité étendue
  ADD COLUMN IF NOT EXISTS nom_jeune_fille TEXT,
  ADD COLUMN IF NOT EXISTS civilite TEXT,                        -- 'M.', 'Mme', 'Dr', etc.
  ADD COLUMN IF NOT EXISTS lieu_naissance TEXT,

  -- Contact urgence
  ADD COLUMN IF NOT EXISTS contact_urgence_nom TEXT,
  ADD COLUMN IF NOT EXISTS contact_urgence_telephone TEXT,
  ADD COLUMN IF NOT EXISTS contact_urgence_lien TEXT,             -- 'conjoint', 'enfant', 'parent', 'tuteur'

  -- Médical
  ADD COLUMN IF NOT EXISTS medecin_traitant TEXT,
  ADD COLUMN IF NOT EXISTS medecin_traitant_telephone TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS regime_alimentaire TEXT,
  ADD COLUMN IF NOT EXISTS pathologies TEXT,
  ADD COLUMN IF NOT EXISTS traitement_en_cours TEXT,
  ADD COLUMN IF NOT EXISTS gir INTEGER,                          -- niveau GIR (1-6)
  ADD COLUMN IF NOT EXISTS mobilite TEXT,                        -- 'autonome', 'assistance', 'fauteuil', 'alité'

  -- Administratif
  ADD COLUMN IF NOT EXISTS num_secu TEXT,
  ADD COLUMN IF NOT EXISTS num_mutuelle TEXT,
  ADD COLUMN IF NOT EXISTS mutuelle TEXT,
  ADD COLUMN IF NOT EXISTS couverture_sociale TEXT,              -- 'CMU', 'ALD', 'CSS'

  -- Affectation actuelle
  ADD COLUMN IF NOT EXISTS date_entree DATE,
  ADD COLUMN IF NOT EXISTS date_sortie DATE,
  ADD COLUMN IF NOT EXISTS statut_sejour TEXT DEFAULT 'En cours',  -- 'En cours', 'Sortie', 'Permission', 'Hospitalisation', 'Décès'
  ADD COLUMN IF NOT EXISTS motif_sortie TEXT,

  -- Notes
  ADD COLUMN IF NOT EXISTS notes_internes TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_patients_chambre ON patients(chambre_id) WHERE chambre_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_statut ON patients(statut_sejour);
CREATE INDEX IF NOT EXISTS idx_patients_date_entree ON patients(date_entree) WHERE date_entree IS NOT NULL;

-- ============================================================
-- 3) Vue récapitulative pour la liste patients
-- ============================================================
DROP VIEW IF EXISTS v_patients_complet CASCADE;

CREATE VIEW v_patients_complet AS
SELECT
  p.*,
  c.nom AS chambre_nom,
  c.telephone AS chambre_telephone,
  c.type_chambre,
  s.nom AS service_nom,
  b.nom AS batiment_nom,
  CASE
    WHEN p.date_naissance IS NOT NULL THEN
      DATE_PART('year', AGE(p.date_naissance))::INTEGER
    ELSE NULL
  END AS age
FROM patients p
LEFT JOIN chambres c ON c.id = p.chambre_id
LEFT JOIN services s ON s.id = c.service_id
LEFT JOIN batiments b ON b.id = s.batiment_id;

COMMENT ON VIEW v_patients_complet IS '0.58.81 - Patient avec chambre.telephone et hiérarchie complète';
