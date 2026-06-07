-- =============================================================
-- migration-0.61.3-flotte-tournees.sql
-- - Table vehicules_magasin (flotte du magasin)
-- - Table tournees (sessions de livraison)
-- - Table tournees_etapes (points d'arrêt)
-- - ALTER etablissements + depots avec lat/lng pour carte
-- 100% idempotent
-- =============================================================

-- ==========================================
-- 1. Flotte de véhicules
-- ==========================================
CREATE TABLE IF NOT EXISTS vehicules_magasin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magasin_id UUID,
  structure_id UUID,
  immatriculation TEXT,
  marque TEXT,
  modele TEXT,
  type_vehicule TEXT,            -- "utilitaire", "camion", "voiture", "scooter"
  capacite_kg NUMERIC,
  capacite_m3 NUMERIC,
  carburant TEXT,                -- "diesel", "essence", "electrique", "hybride"
  kilometrage NUMERIC,
  date_mise_en_circulation DATE,
  prochain_entretien_km NUMERIC,
  prochain_entretien_date DATE,
  prochain_ct DATE,
  assurance_compagnie TEXT,
  assurance_date_fin DATE,
  chauffeur_principal_user_id UUID,
  statut TEXT DEFAULT 'disponible',  -- disponible, en_tournee, maintenance, hors_service
  couleur TEXT,
  photo_url TEXT,
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_veh_magasin ON vehicules_magasin(magasin_id);
CREATE INDEX IF NOT EXISTS idx_veh_statut ON vehicules_magasin(statut);

ALTER TABLE vehicules_magasin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "veh_all" ON vehicules_magasin;
CREATE POLICY "veh_all" ON vehicules_magasin FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 2. Tournées de livraison
-- ==========================================
CREATE TABLE IF NOT EXISTS tournees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magasin_id UUID,
  structure_id UUID,
  numero TEXT,                     -- TRN-YYYYMMDD-XXXX
  nom TEXT,                        -- "Tournée Lyon Nord matin"
  date_tournee DATE,
  heure_depart TIME,
  heure_retour_prevue TIME,
  vehicule_id UUID,
  chauffeur_user_id UUID,
  statut TEXT DEFAULT 'planifiee', -- planifiee, en_cours, terminee, annulee
  point_depart_label TEXT,
  point_depart_lat NUMERIC,
  point_depart_lng NUMERIC,
  point_retour_label TEXT,
  point_retour_lat NUMERIC,
  point_retour_lng NUMERIC,
  distance_estimee_km NUMERIC,
  distance_reelle_km NUMERIC,
  duree_estimee_min INTEGER,
  duree_reelle_min INTEGER,
  notes TEXT,
  nb_etapes INTEGER DEFAULT 0,
  nb_completees INTEGER DEFAULT 0,
  demarrage_at TIMESTAMPTZ,
  termine_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_trn_magasin ON tournees(magasin_id);
CREATE INDEX IF NOT EXISTS idx_trn_date ON tournees(date_tournee);
CREATE INDEX IF NOT EXISTS idx_trn_statut ON tournees(statut);

ALTER TABLE tournees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trn_all" ON tournees;
CREATE POLICY "trn_all" ON tournees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 3. Étapes de tournée (points d'arrêt)
-- ==========================================
CREATE TABLE IF NOT EXISTS tournees_etapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournee_id UUID NOT NULL,
  ordre INTEGER DEFAULT 1,
  type_etape TEXT DEFAULT 'livraison',  -- livraison, collecte, sav, transfert, autre
  -- Lien optionnel vers une DI
  demande_id UUID,
  etablissement_id UUID,
  depot_id UUID,
  patient_id UUID,
  -- Adresse + géoloc
  label TEXT,                          -- "Hôpital X - Réception"
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  -- Workflow
  statut TEXT DEFAULT 'a_faire',       -- a_faire, en_cours, terminee, echec, annulee
  heure_arrivee_prevue TIME,
  duree_estimee_min INTEGER DEFAULT 15,
  arrivee_at TIMESTAMPTZ,
  depart_at TIMESTAMPTZ,
  signature_recepteur TEXT,
  signature_url TEXT,
  notes TEXT,
  photo_preuve_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etp_tournee ON tournees_etapes(tournee_id);
CREATE INDEX IF NOT EXISTS idx_etp_demande ON tournees_etapes(demande_id);
CREATE INDEX IF NOT EXISTS idx_etp_etab ON tournees_etapes(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_etp_statut ON tournees_etapes(statut);

ALTER TABLE tournees_etapes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "etp_all" ON tournees_etapes;
CREATE POLICY "etp_all" ON tournees_etapes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 4. Géoloc dans etablissements + depots (si pas déjà fait)
-- ==========================================
ALTER TABLE etablissements
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;

ALTER TABLE depots
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- ==========================================
-- 5. Vue : DI à livrer (à intégrer dans tournée)
-- ==========================================
DROP VIEW IF EXISTS v_di_a_livrer;
CREATE VIEW v_di_a_livrer AS
SELECT
  d.id,
  d.numero,
  d.statut,
  d.type_demande,
  d.priorite,
  d.created_at,
  d.validee_at,
  d.magasin_id,
  d.etablissement_id,
  d.depot_destination_id,
  d.structure_id,
  e.nom AS etablissement_nom,
  e.ville AS etablissement_ville,
  e.latitude AS etablissement_lat,
  e.longitude AS etablissement_lng,
  dep.nom AS depot_nom,
  dep.adresse AS depot_adresse,
  dep.latitude AS depot_lat,
  dep.longitude AS depot_lng,
  (SELECT COUNT(*) FROM demandes_internes_lignes WHERE demande_id = d.id) AS nb_lignes
FROM demandes_internes d
LEFT JOIN etablissements e ON e.id = d.etablissement_id
LEFT JOIN depots dep ON dep.id = d.depot_destination_id
WHERE d.statut IN ('validee', 'en_preparation')
  AND d.type_demande IN ('di', 'transfert', 'sav')
ORDER BY d.priorite DESC, d.validee_at ASC;

-- ==========================================
-- VÉRIFICATION
-- ==========================================
SELECT 'TABLES' AS info, table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('vehicules_magasin', 'tournees', 'tournees_etapes')
ORDER BY table_name;
