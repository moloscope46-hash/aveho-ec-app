-- =============================================================
-- Migration 0.58.85 — Véhicules + Cuves oxygène + Dossier médical + Articles
-- =============================================================

-- ============================================================
-- 1) Nouvelle table vehicules (sanitaire/taxi/ambulance)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  etablissement_id UUID,
  type TEXT NOT NULL DEFAULT 'sanitaire',  -- 'sanitaire' | 'taxi' | 'ambulance' | 'vsl' | 'utilitaire' | 'autre'
  nom TEXT NOT NULL,                       -- ex: "Ambulance 1", "Taxi Renault"
  immatriculation TEXT,
  marque TEXT,
  modele TEXT,
  annee INTEGER,
  couleur TEXT DEFAULT '#185FA5',
  icone TEXT DEFAULT 'ti-ambulance',
  conducteur_id UUID,                       -- user assigné
  equipe_id UUID,
  -- Caractéristiques
  capacite_personnes INTEGER,
  capacite_brancards INTEGER DEFAULT 0,
  capacite_volume_m3 NUMERIC(6,2),
  -- Équipements (JSON pour flexibilité)
  equipements JSONB DEFAULT '[]'::jsonb,    -- ex: ["O2", "défibrillateur", "PMR"]
  -- Conformité
  date_mise_circulation DATE,
  prochaine_revision DATE,
  prochain_controle_technique DATE,
  prochaine_visite_sanitaire DATE,
  numero_agrement TEXT,                     -- agrément ARS pour sanitaire/ambulance
  -- État courant
  statut TEXT DEFAULT 'disponible',         -- 'disponible' | 'en_mission' | 'en_maintenance' | 'hors_service'
  kilometrage INTEGER,
  -- Notes
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_vehicules_structure ON vehicules(structure_id);
CREATE INDEX IF NOT EXISTS idx_vehicules_etab ON vehicules(etablissement_id) WHERE etablissement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicules_statut ON vehicules(statut);
CREATE INDEX IF NOT EXISTS idx_vehicules_type ON vehicules(type);

ALTER TABLE vehicules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicules_read_struct" ON vehicules;
CREATE POLICY "vehicules_read_struct" ON vehicules FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "vehicules_write_member" ON vehicules;
CREATE POLICY "vehicules_write_member" ON vehicules FOR ALL
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()))
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

-- ============================================================
-- 2) Rattachement dépôt mobile à véhicule
-- ============================================================
ALTER TABLE depots
  ADD COLUMN IF NOT EXISTS vehicule_id UUID;

CREATE INDEX IF NOT EXISTS idx_depots_vehicule
  ON depots(vehicule_id)
  WHERE vehicule_id IS NOT NULL;

-- ============================================================
-- 3) Cuves oxygène (gestion stock + remplissage)
-- ============================================================
CREATE TABLE IF NOT EXISTS cuves_oxygene (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  etablissement_id UUID,
  numero_serie TEXT,
  marque TEXT,                              -- 'Air Liquide', 'Linde', 'SOL', etc.
  modele TEXT,
  type_gaz TEXT DEFAULT 'oxygene',          -- 'oxygene' | 'air_medical' | 'azote'
  -- Capacité
  capacite_litres NUMERIC(8,2),             -- volume eau en L
  pression_max_bar NUMERIC(5,1),            -- pression nominale (200, 300 bar...)
  -- État courant
  niveau_actuel_pct INTEGER,                -- 0-100
  pression_actuelle_bar NUMERIC(5,1),
  statut TEXT DEFAULT 'pleine',             -- 'pleine' | 'partielle' | 'vide' | 'consigne' | 'maintenance'
  -- Affectation
  depot_id UUID,
  patient_id UUID,                          -- si affectée à un patient (NPAD à domicile)
  vehicule_id UUID,                         -- si dans un véhicule
  -- Conformité
  date_dernier_remplissage TIMESTAMPTZ,
  date_prochain_controle DATE,
  date_requalification DATE,                -- requalification décennale
  numero_lot_remplissage TEXT,
  fournisseur_remplissage TEXT,
  -- Traçabilité
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_cuves_structure ON cuves_oxygene(structure_id);
CREATE INDEX IF NOT EXISTS idx_cuves_statut ON cuves_oxygene(statut);
CREATE INDEX IF NOT EXISTS idx_cuves_depot ON cuves_oxygene(depot_id) WHERE depot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cuves_patient ON cuves_oxygene(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cuves_vehicule ON cuves_oxygene(vehicule_id) WHERE vehicule_id IS NOT NULL;

ALTER TABLE cuves_oxygene ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cuves_read_struct" ON cuves_oxygene;
CREATE POLICY "cuves_read_struct" ON cuves_oxygene FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "cuves_write_member" ON cuves_oxygene;
CREATE POLICY "cuves_write_member" ON cuves_oxygene FOR ALL
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()))
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

-- ============================================================
-- 4) Historique des remplissages de cuve
-- ============================================================
CREATE TABLE IF NOT EXISTS cuves_remplissages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  cuve_id UUID NOT NULL REFERENCES cuves_oxygene(id) ON DELETE CASCADE,
  date_remplissage TIMESTAMPTZ NOT NULL DEFAULT now(),
  niveau_avant_pct INTEGER,
  niveau_apres_pct INTEGER,
  pression_avant_bar NUMERIC(5,1),
  pression_apres_bar NUMERIC(5,1),
  volume_ajoute_l NUMERIC(8,2),
  numero_lot TEXT,
  fournisseur TEXT,
  technicien_id UUID,
  notes TEXT,
  cree_par_scan BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuves_rempl_cuve ON cuves_remplissages(cuve_id);
CREATE INDEX IF NOT EXISTS idx_cuves_rempl_date ON cuves_remplissages(date_remplissage DESC);

ALTER TABLE cuves_remplissages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cuves_rempl_read" ON cuves_remplissages;
CREATE POLICY "cuves_rempl_read" ON cuves_remplissages FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "cuves_rempl_write" ON cuves_remplissages;
CREATE POLICY "cuves_rempl_write" ON cuves_remplissages FOR INSERT
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

-- ============================================================
-- 5) Articles enrichis : ajouts pour stock + cuves + véhicules
-- ============================================================
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS type_article TEXT,                  -- 'consommable' | 'materiel' | 'cuve' | 'medicament' | 'autre'
  ADD COLUMN IF NOT EXISTS stock_min INTEGER,                  -- seuil d'alerte
  ADD COLUMN IF NOT EXISTS stock_max INTEGER,
  ADD COLUMN IF NOT EXISTS conditionnement TEXT,               -- 'unité', 'boîte de 12', 'palette'
  ADD COLUMN IF NOT EXISTS volume_unitaire_ml NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS poids_unitaire_g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fournisseur_principal TEXT,
  ADD COLUMN IF NOT EXISTS fournisseur_reference TEXT,
  ADD COLUMN IF NOT EXISTS delai_reappro_jours INTEGER,
  ADD COLUMN IF NOT EXISTS prix_achat_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS prix_vente_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tva_pct NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(type_article) WHERE type_article IS NOT NULL;

-- ============================================================
-- 6) Patient dossier médical : compléments
-- ============================================================
ALTER TABLE patients
  -- Antécédents structurés
  ADD COLUMN IF NOT EXISTS antecedents_chirurgicaux TEXT,
  ADD COLUMN IF NOT EXISTS antecedents_familiaux TEXT,
  ADD COLUMN IF NOT EXISTS antecedents_medicaux TEXT,
  -- Suivi médical
  ADD COLUMN IF NOT EXISTS taille_cm INTEGER,
  ADD COLUMN IF NOT EXISTS poids_kg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS groupe_sanguin TEXT,
  ADD COLUMN IF NOT EXISTS rhesus TEXT,
  -- Suivi soins
  ADD COLUMN IF NOT EXISTS infirmiere_referente TEXT,
  ADD COLUMN IF NOT EXISTS infirmiere_telephone TEXT,
  ADD COLUMN IF NOT EXISTS pharmacie_referente TEXT,
  ADD COLUMN IF NOT EXISTS pharmacie_telephone TEXT,
  ADD COLUMN IF NOT EXISTS kine_referent TEXT,
  ADD COLUMN IF NOT EXISTS kine_telephone TEXT;

-- ============================================================
-- 7) Vue stats stock global
-- ============================================================
DROP VIEW IF EXISTS v_stock_stats CASCADE;

CREATE VIEW v_stock_stats AS
SELECT
  a.structure_id,
  COUNT(DISTINCT a.id) AS nb_articles,
  COUNT(DISTINCT a.id) FILTER (WHERE a.stock_min IS NOT NULL) AS nb_articles_suivis,
  COUNT(DISTINCT a.id) FILTER (WHERE a.type_article = 'cuve') AS nb_cuves_referencees,
  COUNT(DISTINCT m.id) AS nb_materiels_total,
  COUNT(DISTINCT m.id) FILTER (WHERE m.etat = 'Disponible') AS nb_disponibles,
  COUNT(DISTINCT m.id) FILTER (WHERE m.etat IN ('En location', 'Affecté')) AS nb_affectes,
  COUNT(DISTINCT m.id) FILTER (WHERE m.etat IN ('Maintenance', 'En désinfection')) AS nb_indisponibles,
  COUNT(DISTINCT m.id) FILTER (WHERE m.etat IN ('Rebut', 'Retour fournisseur')) AS nb_sortis
FROM articles a
LEFT JOIN materiels m ON m.article_id = a.id
GROUP BY a.structure_id;

COMMENT ON VIEW v_stock_stats IS '0.58.85 - Stats stock pour dashboard';

-- ============================================================
-- Fin de migration
-- ============================================================
-- SELECT 'vehicules' AS t, COUNT(*) FROM vehicules
-- UNION ALL SELECT 'cuves_oxygene', COUNT(*) FROM cuves_oxygene
-- UNION ALL SELECT 'cuves_remplissages', COUNT(*) FROM cuves_remplissages;
