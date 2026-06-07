-- =============================================================
-- HOTFIX-aveho-0.61.5-MEGA-TOUTES-TABLES.sql
-- À EXÉCUTER EN PRIORITÉ : crée TOUTES les tables manquantes
-- depuis 0.60.0 jusqu'à 0.61.4 si elles n'existent pas.
-- 100% idempotent — peut être ré-exécuté sans risque.
-- =============================================================

-- =====================================================================
-- BLOC 1 : Tables SAV (0.60.0)
-- =====================================================================
CREATE TABLE IF NOT EXISTS bilans_sav (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID,
  magasin_id UUID,
  nom TEXT NOT NULL,
  code TEXT,
  description TEXT,
  duree_estimee_min INTEGER DEFAULT 30,
  icone TEXT,
  couleur TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_bilans_struct ON bilans_sav(structure_id);
CREATE INDEX IF NOT EXISTS idx_bilans_magasin ON bilans_sav(magasin_id);
ALTER TABLE bilans_sav ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bs_all" ON bilans_sav;
CREATE POLICY "bs_all" ON bilans_sav FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bilans_sav_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id UUID NOT NULL,
  ordre INTEGER DEFAULT 1,
  libelle TEXT NOT NULL,
  description TEXT,
  type_controle TEXT DEFAULT 'oui_non',
  unite TEXT,
  valeur_min NUMERIC,
  valeur_max NUMERIC,
  est_obligatoire BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bsp_bilan ON bilans_sav_points(bilan_id);
ALTER TABLE bilans_sav_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsp_all" ON bilans_sav_points;
CREATE POLICY "bsp_all" ON bilans_sav_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bilans_sav_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id UUID NOT NULL,
  article_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bilan_id, article_id)
);
CREATE INDEX IF NOT EXISTS idx_bsa_bilan ON bilans_sav_articles(bilan_id);
CREATE INDEX IF NOT EXISTS idx_bsa_article ON bilans_sav_articles(article_id);
ALTER TABLE bilans_sav_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsa_all" ON bilans_sav_articles;
CREATE POLICY "bsa_all" ON bilans_sav_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS sav_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id UUID,
  bilan_id UUID,
  structure_id UUID,
  magasin_id UUID,
  verdict TEXT,
  notes TEXT,
  executee_at TIMESTAMPTZ DEFAULT NOW(),
  executee_par UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sav_exec_demande ON sav_executions(demande_id);
CREATE INDEX IF NOT EXISTS idx_sav_exec_bilan ON sav_executions(bilan_id);
CREATE INDEX IF NOT EXISTS idx_sav_exec_magasin ON sav_executions(magasin_id);
ALTER TABLE sav_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "se_all" ON sav_executions;
CREATE POLICY "se_all" ON sav_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ALTER demandes_internes
ALTER TABLE demandes_internes
  ADD COLUMN IF NOT EXISTS type_demande TEXT DEFAULT 'di',
  ADD COLUMN IF NOT EXISTS bilan_sav_id UUID,
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS depot_source_id UUID,
  ADD COLUMN IF NOT EXISTS depot_destination_id UUID,
  ADD COLUMN IF NOT EXISTS transfert_preparation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfert_transit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfert_livre_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rapport_sav_valide_par_ec UUID,
  ADD COLUMN IF NOT EXISTS rapport_sav_validee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rapport_sav_signature TEXT,
  ADD COLUMN IF NOT EXISTS rapport_sav_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS rapport_sav_commentaire_ec TEXT,
  ADD COLUMN IF NOT EXISTS cloturee_at TIMESTAMPTZ;

-- Droits magasin
CREATE TABLE IF NOT EXISTS etablissements_magasins_droits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id UUID NOT NULL,
  magasin_id UUID NOT NULL,
  structure_id UUID,
  droit_commande BOOLEAN DEFAULT true,
  droit_sav BOOLEAN DEFAULT true,
  droit_transfert BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(etablissement_id, magasin_id)
);
ALTER TABLE etablissements_magasins_droits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emd_all" ON etablissements_magasins_droits;
CREATE POLICY "emd_all" ON etablissements_magasins_droits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Membres magasin
CREATE TABLE IF NOT EXISTS membres_structure_magasins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  magasin_id UUID NOT NULL,
  structure_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, magasin_id)
);
ALTER TABLE membres_structure_magasins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msm_all" ON membres_structure_magasins;
CREATE POLICY "msm_all" ON membres_structure_magasins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================================
-- BLOC 2 : Bucket Storage SAV-photos (0.60.6)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('sav-photos', 'sav-photos', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "sav_photos_read" ON storage.objects;
CREATE POLICY "sav_photos_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sav-photos');
DROP POLICY IF EXISTS "sav_photos_write" ON storage.objects;
CREATE POLICY "sav_photos_write" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'sav-photos') WITH CHECK (bucket_id = 'sav-photos');

-- =====================================================================
-- BLOC 3 : Vue v_analytics_sav (CORRIGÉE — sav_executions au lieu de bilans_sav_executions)
-- =====================================================================
DROP VIEW IF EXISTS v_analytics_sav;
CREATE OR REPLACE VIEW v_analytics_sav AS
SELECT
  se.id, se.demande_id, se.bilan_id AS bilan_sav_id,
  se.verdict, se.executee_at, se.structure_id, se.magasin_id, se.created_at,
  bs.nom AS bilan_nom,
  (SELECT COUNT(*) FROM bilans_sav_points WHERE bilan_id = se.bilan_id) AS nb_points_total
FROM sav_executions se
LEFT JOIN bilans_sav bs ON bs.id = se.bilan_id;

-- =====================================================================
-- BLOC 4 : Inventaires (0.61.1)
-- =====================================================================
CREATE TABLE IF NOT EXISTS inventaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID,
  depot_id UUID NOT NULL,
  numero TEXT,
  statut TEXT DEFAULT 'en_cours',
  date_debut TIMESTAMPTZ DEFAULT NOW(),
  date_fin TIMESTAMPTZ,
  notes TEXT,
  nb_articles_comptes INTEGER DEFAULT 0,
  nb_exact INTEGER DEFAULT 0,
  nb_surstock INTEGER DEFAULT 0,
  nb_manquants INTEGER DEFAULT 0,
  ecart_valeur_total NUMERIC(12,2),
  valide_par UUID,
  valide_at TIMESTAMPTZ,
  ajustement_stock_genere BOOLEAN DEFAULT false,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);
ALTER TABLE inventaires ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_all" ON inventaires;
CREATE POLICY "inv_all" ON inventaires FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventaires_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventaire_id UUID NOT NULL,
  article_id UUID,
  libelle TEXT,
  code TEXT,
  quantite_theorique NUMERIC,
  quantite_comptee NUMERIC,
  ecart NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inventaires_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invl_all" ON inventaires_lignes;
CREATE POLICY "invl_all" ON inventaires_lignes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS stock_mouvements
  ADD COLUMN IF NOT EXISTS inventaire_id UUID,
  ADD COLUMN IF NOT EXISTS source_motif TEXT;

-- =====================================================================
-- BLOC 5 : Flotte véhicules + tournées (0.61.3)
-- =====================================================================
CREATE TABLE IF NOT EXISTS vehicules_magasin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magasin_id UUID,
  structure_id UUID,
  immatriculation TEXT,
  marque TEXT,
  modele TEXT,
  type_vehicule TEXT,
  capacite_kg NUMERIC,
  capacite_m3 NUMERIC,
  carburant TEXT,
  kilometrage NUMERIC,
  date_mise_en_circulation DATE,
  prochain_entretien_km NUMERIC,
  prochain_entretien_date DATE,
  prochain_ct DATE,
  assurance_compagnie TEXT,
  assurance_date_fin DATE,
  chauffeur_principal_user_id UUID,
  statut TEXT DEFAULT 'disponible',
  couleur TEXT,
  photo_url TEXT,
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_veh_magasin ON vehicules_magasin(magasin_id);
ALTER TABLE vehicules_magasin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "veh_all" ON vehicules_magasin;
CREATE POLICY "veh_all" ON vehicules_magasin FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS tournees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magasin_id UUID,
  structure_id UUID,
  numero TEXT,
  nom TEXT,
  date_tournee DATE,
  heure_depart TIME,
  heure_retour_prevue TIME,
  vehicule_id UUID,
  chauffeur_user_id UUID,
  statut TEXT DEFAULT 'planifiee',
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
ALTER TABLE tournees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trn_all" ON tournees;
CREATE POLICY "trn_all" ON tournees FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS tournees_etapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournee_id UUID NOT NULL,
  ordre INTEGER DEFAULT 1,
  type_etape TEXT DEFAULT 'livraison',
  demande_id UUID,
  etablissement_id UUID,
  depot_id UUID,
  patient_id UUID,
  label TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  statut TEXT DEFAULT 'a_faire',
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
ALTER TABLE tournees_etapes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "etp_all" ON tournees_etapes;
CREATE POLICY "etp_all" ON tournees_etapes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Géoloc dans etablissements + depots
ALTER TABLE IF EXISTS etablissements ADD COLUMN IF NOT EXISTS latitude NUMERIC, ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE IF EXISTS depots ADD COLUMN IF NOT EXISTS latitude NUMERIC, ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- =====================================================================
-- BLOC 6 : Catalogue magasin + Mercuriales (0.61.4)
-- =====================================================================
ALTER TABLE IF EXISTS articles
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS est_catalogue_magasin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prix_public_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS prix_achat_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS famille TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE TABLE IF NOT EXISTS articles_rattachements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_etablissement_id UUID NOT NULL,
  article_magasin_id UUID NOT NULL,
  magasin_id UUID,
  etablissement_id UUID,
  prix_negocie_ht NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(article_etablissement_id, article_magasin_id)
);
ALTER TABLE articles_rattachements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ar_all" ON articles_rattachements;
CREATE POLICY "ar_all" ON articles_rattachements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS mercuriales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT,
  nom TEXT NOT NULL,
  magasin_id UUID,
  structure_id UUID,
  etablissement_id UUID,
  type_document TEXT DEFAULT 'mercuriale',
  date_debut DATE,
  date_fin DATE,
  statut TEXT DEFAULT 'brouillon',
  remise_globale_pct NUMERIC(5,2) DEFAULT 0,
  conditions_paiement TEXT,
  conditions_livraison TEXT,
  notes TEXT,
  pdf_url TEXT,
  signee_par UUID,
  signee_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);
ALTER TABLE mercuriales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mer_all" ON mercuriales;
CREATE POLICY "mer_all" ON mercuriales FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS mercuriales_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mercuriale_id UUID NOT NULL,
  article_id UUID,
  libelle TEXT,
  code TEXT,
  prix_unitaire_ht NUMERIC(10,2),
  remise_pct NUMERIC(5,2) DEFAULT 0,
  prix_negocie_ht NUMERIC(10,2),
  quantite_min INTEGER,
  quantite_max INTEGER,
  unite TEXT,
  ordre INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mercuriales_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merl_all" ON mercuriales_lignes;
CREATE POLICY "merl_all" ON mercuriales_lignes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP VIEW IF EXISTS v_catalogue_magasin;
CREATE OR REPLACE VIEW v_catalogue_magasin AS
SELECT
  a.id, a.libelle, a.code, a.reference, a.unite,
  a.prix_public_ht, a.prix_achat_ht,
  a.magasin_id, a.structure_id, a.est_catalogue_magasin,
  a.actif, a.created_at,
  (SELECT COUNT(DISTINCT etablissement_id) FROM articles_rattachements WHERE article_magasin_id = a.id) AS nb_etabs_rattaches,
  (SELECT COUNT(DISTINCT m.id) FROM mercuriales m
   JOIN mercuriales_lignes ml ON ml.mercuriale_id = m.id
   WHERE ml.article_id = a.id AND m.statut = 'active') AS nb_mercuriales_actives
FROM articles a
WHERE a.est_catalogue_magasin = true;

-- =====================================================================
-- BLOC 7 : Vue DI à livrer (0.61.3)
-- =====================================================================
DROP VIEW IF EXISTS v_di_a_livrer;
CREATE OR REPLACE VIEW v_di_a_livrer AS
SELECT
  d.id, d.numero, d.statut, d.type_demande, d.priorite, d.created_at, d.validee_at,
  d.magasin_id, d.etablissement_id, d.depot_destination_id, d.structure_id,
  e.nom AS etablissement_nom, e.ville AS etablissement_ville,
  e.latitude AS etablissement_lat, e.longitude AS etablissement_lng,
  dep.nom AS depot_nom, dep.adresse AS depot_adresse,
  dep.latitude AS depot_lat, dep.longitude AS depot_lng,
  (SELECT COUNT(*) FROM demandes_internes_lignes WHERE demande_id = d.id) AS nb_lignes
FROM demandes_internes d
LEFT JOIN etablissements e ON e.id = d.etablissement_id
LEFT JOIN depots dep ON dep.id = d.depot_destination_id
WHERE d.statut IN ('validee', 'en_preparation')
  AND COALESCE(d.type_demande, 'di') IN ('di', 'transfert', 'sav')
ORDER BY d.priorite DESC NULLS LAST, d.validee_at ASC NULLS LAST;

-- =====================================================================
-- VÉRIFICATION FINALE
-- =====================================================================
SELECT 'TABLES CRÉÉES' AS info, COUNT(*) AS nb FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'bilans_sav', 'bilans_sav_points', 'bilans_sav_articles', 'sav_executions',
  'etablissements_magasins_droits', 'membres_structure_magasins',
  'inventaires', 'inventaires_lignes',
  'vehicules_magasin', 'tournees', 'tournees_etapes',
  'articles_rattachements', 'mercuriales', 'mercuriales_lignes'
);

SELECT 'VUES CRÉÉES' AS info, table_name FROM information_schema.views
WHERE table_schema = 'public' AND table_name IN (
  'v_analytics_sav', 'v_catalogue_magasin', 'v_di_a_livrer'
) ORDER BY table_name;
