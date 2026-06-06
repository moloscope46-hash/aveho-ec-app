-- =============================================================
-- fix-missing-columns-0.59.4.sql
-- Cause des erreurs PGRST204 et 400 dans la console :
--   "Could not find the 'chambre_id' column of 'patients'"
--   patients?select=chambre_id... 400
--   materiels?select=chambre_id... 400
--   articles?structure_id=eq... 400
--   services?select=batiment_id... 400
--
-- Ces colonnes auraient dû être ajoutées par les migrations
-- 0.58.81 / 0.58.85 / 0.58.99 / 0.59.0 mais elles ne semblent pas
-- toutes appliquées. Ce SQL est idempotent (ADD COLUMN IF NOT EXISTS).
-- =============================================================

-- ==========================================
-- PATIENTS — colonne chambre_id (critique)
-- ==========================================
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS etablissement_id UUID,
  ADD COLUMN IF NOT EXISTS batiment_id UUID,
  ADD COLUMN IF NOT EXISTS service_id UUID,
  ADD COLUMN IF NOT EXISTS chambre_id UUID,
  ADD COLUMN IF NOT EXISTS lit_id UUID,
  ADD COLUMN IF NOT EXISTS collaborateur_id UUID,
  ADD COLUMN IF NOT EXISTS pathologie_id UUID,
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS antecedents TEXT,
  ADD COLUMN IF NOT EXISTS traitements TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS gir INTEGER,
  ADD COLUMN IF NOT EXISTS mobilite TEXT,
  ADD COLUMN IF NOT EXISTS regime_alimentaire TEXT,
  ADD COLUMN IF NOT EXISTS medecin_traitant TEXT,
  ADD COLUMN IF NOT EXISTS medecin_traitant_telephone TEXT,
  ADD COLUMN IF NOT EXISTS contact_urgence_nom TEXT,
  ADD COLUMN IF NOT EXISTS contact_urgence_telephone TEXT,
  ADD COLUMN IF NOT EXISTS contact_urgence_lien TEXT,
  ADD COLUMN IF NOT EXISTS nom_jeune_fille TEXT,
  ADD COLUMN IF NOT EXISTS lieu_naissance TEXT,
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS civilite TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_chambre ON patients(chambre_id);
CREATE INDEX IF NOT EXISTS idx_patients_etab ON patients(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_patients_service ON patients(service_id);
CREATE INDEX IF NOT EXISTS idx_patients_collab ON patients(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_patients_pathologie ON patients(pathologie_id);

-- ==========================================
-- MATERIELS — colonne chambre_id (pour matériel installé)
-- ==========================================
ALTER TABLE materiels
  ADD COLUMN IF NOT EXISTS chambre_id UUID,
  ADD COLUMN IF NOT EXISTS service_id UUID,
  ADD COLUMN IF NOT EXISTS etablissement_id UUID,
  ADD COLUMN IF NOT EXISTS num_serie TEXT,
  ADD COLUMN IF NOT EXISTS num_parc TEXT,
  ADD COLUMN IF NOT EXISTS num_lot TEXT,
  ADD COLUMN IF NOT EXISTS etat TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_materiels_chambre ON materiels(chambre_id);
CREATE INDEX IF NOT EXISTS idx_materiels_service ON materiels(service_id);

-- ==========================================
-- ARTICLES — structure_id (sinon le filtre plante)
-- ==========================================
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS libelle TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS prix_vente_ht NUMERIC,
  ADD COLUMN IF NOT EXISTS type_article TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_structure ON articles(structure_id);

-- ==========================================
-- SERVICES — batiment_id (cascade hierarchy)
-- ==========================================
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS batiment_id UUID,
  ADD COLUMN IF NOT EXISTS etage_id UUID,
  ADD COLUMN IF NOT EXISTS etablissement_id UUID,
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS icone TEXT;

CREATE INDEX IF NOT EXISTS idx_services_batiment ON services(batiment_id);

-- ==========================================
-- CHAMBRES — service_id + structure_id
-- ==========================================
ALTER TABLE chambres
  ADD COLUMN IF NOT EXISTS service_id UUID,
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS etablissement_id UUID;

CREATE INDEX IF NOT EXISTS idx_chambres_service ON chambres(service_id);

-- ==========================================
-- Vérification
-- ==========================================
SELECT
  table_name,
  column_name
FROM information_schema.columns
WHERE table_name IN ('patients', 'materiels', 'articles', 'services', 'chambres')
  AND column_name IN ('chambre_id', 'service_id', 'batiment_id', 'structure_id', 'etablissement_id', 'collaborateur_id', 'pathologie_id')
ORDER BY table_name, column_name;
