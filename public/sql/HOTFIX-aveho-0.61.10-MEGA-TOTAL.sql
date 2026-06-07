-- =============================================================
-- HOTFIX-aveho-0.61.10-MEGA-TOTAL.sql
-- LE SQL ULTIME : INCLUT TOUT depuis 0.60.0 jusqu'à 0.61.10
-- À EXÉCUTER UNE FOIS, RÉ-EXÉCUTABLE SANS RISQUE (100% idempotent)
-- Toutes les colonnes ajoutées via ALTER ADD COLUMN IF NOT EXISTS
-- =============================================================

-- ##################################################################
-- ## membres_structure : colonnes utilisées partout
-- ##################################################################
CREATE TABLE IF NOT EXISTS membres_structure (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE membres_structure
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS prenom TEXT,
  ADD COLUMN IF NOT EXISTS nom TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS role_professionnel TEXT,
  ADD COLUMN IF NOT EXISTS nom_affiche TEXT,
  ADD COLUMN IF NOT EXISTS fonction_detail TEXT,
  ADD COLUMN IF NOT EXISTS magasin_fournisseur_id UUID,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS rpps TEXT,
  ADD COLUMN IF NOT EXISTS adeli TEXT,
  ADD COLUMN IF NOT EXISTS rpps_profession TEXT,
  ADD COLUMN IF NOT EXISTS pharmacie_id UUID,
  ADD COLUMN IF NOT EXISTS service_id UUID;
CREATE INDEX IF NOT EXISTS idx_ms_user ON membres_structure(user_id);
CREATE INDEX IF NOT EXISTS idx_ms_role ON membres_structure(role_professionnel);

-- ##################################################################
-- ## magasins_fournisseurs
-- ##################################################################
CREATE TABLE IF NOT EXISTS magasins_fournisseurs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom TEXT NOT NULL);
ALTER TABLE magasins_fournisseurs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS pays TEXT DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS finess TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;
ALTER TABLE magasins_fournisseurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mf_all" ON magasins_fournisseurs;
CREATE POLICY "mf_all" ON magasins_fournisseurs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ##################################################################
-- ## SAV
-- ##################################################################
CREATE TABLE IF NOT EXISTS bilans_sav (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom TEXT NOT NULL);
ALTER TABLE bilans_sav
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS duree_estimee_min INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS icone TEXT,
  ADD COLUMN IF NOT EXISTS couleur TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE bilans_sav ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bs_all" ON bilans_sav;
CREATE POLICY "bs_all" ON bilans_sav FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bilans_sav_points (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bilan_id UUID NOT NULL, libelle TEXT NOT NULL);
ALTER TABLE bilans_sav_points
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS type_controle TEXT DEFAULT 'oui_non',
  ADD COLUMN IF NOT EXISTS unite TEXT,
  ADD COLUMN IF NOT EXISTS valeur_min NUMERIC,
  ADD COLUMN IF NOT EXISTS valeur_max NUMERIC,
  ADD COLUMN IF NOT EXISTS est_obligatoire BOOLEAN DEFAULT true;
ALTER TABLE bilans_sav_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsp_all" ON bilans_sav_points;
CREATE POLICY "bsp_all" ON bilans_sav_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bilans_sav_articles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bilan_id UUID NOT NULL, article_id UUID NOT NULL);
ALTER TABLE bilans_sav_articles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bilans_sav_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsa_all" ON bilans_sav_articles;
CREATE POLICY "bsa_all" ON bilans_sav_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS sav_executions (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE sav_executions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS demande_id UUID,
  ADD COLUMN IF NOT EXISTS bilan_id UUID,
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS verdict TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS executee_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS executee_par UUID;
ALTER TABLE sav_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "se_all" ON sav_executions;
CREATE POLICY "se_all" ON sav_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ##################################################################
-- ## demandes_internes : ajouts
-- ##################################################################
ALTER TABLE IF EXISTS demandes_internes
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
  ADD COLUMN IF NOT EXISTS cloturee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priorite TEXT;

-- ##################################################################
-- ## Droits magasin
-- ##################################################################
CREATE TABLE IF NOT EXISTS etablissements_magasins_droits (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), etablissement_id UUID NOT NULL, magasin_id UUID NOT NULL);
ALTER TABLE etablissements_magasins_droits
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS droit_commande BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS droit_sav BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS droit_transfert BOOLEAN DEFAULT true;
ALTER TABLE etablissements_magasins_droits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emd_all" ON etablissements_magasins_droits;
CREATE POLICY "emd_all" ON etablissements_magasins_droits FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS membres_structure_magasins (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, magasin_id UUID NOT NULL);
ALTER TABLE membres_structure_magasins
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS structure_id UUID;
ALTER TABLE membres_structure_magasins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msm_all" ON membres_structure_magasins;
CREATE POLICY "msm_all" ON membres_structure_magasins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ##################################################################
-- ## Storage bucket sav-photos
-- ##################################################################
INSERT INTO storage.buckets (id, name, public) VALUES ('sav-photos', 'sav-photos', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "sav_photos_read" ON storage.objects;
CREATE POLICY "sav_photos_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sav-photos');
DROP POLICY IF EXISTS "sav_photos_write" ON storage.objects;
CREATE POLICY "sav_photos_write" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'sav-photos') WITH CHECK (bucket_id = 'sav-photos');

-- ##################################################################
-- ## Inventaires
-- ##################################################################
CREATE TABLE IF NOT EXISTS inventaires (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), depot_id UUID NOT NULL);
ALTER TABLE inventaires
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'en_cours',
  ADD COLUMN IF NOT EXISTS date_debut TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS date_fin TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS nb_articles_comptes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_exact INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_surstock INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_manquants INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valide_par UUID,
  ADD COLUMN IF NOT EXISTS valide_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ajustement_stock_genere BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE inventaires ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_all" ON inventaires;
CREATE POLICY "inv_all" ON inventaires FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventaires_lignes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), inventaire_id UUID NOT NULL);
ALTER TABLE inventaires_lignes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS article_id UUID,
  ADD COLUMN IF NOT EXISTS libelle TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS quantite_theorique NUMERIC,
  ADD COLUMN IF NOT EXISTS quantite_comptee NUMERIC,
  ADD COLUMN IF NOT EXISTS ecart NUMERIC;
ALTER TABLE inventaires_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invl_all" ON inventaires_lignes;
CREATE POLICY "invl_all" ON inventaires_lignes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS stock_mouvements
  ADD COLUMN IF NOT EXISTS inventaire_id UUID,
  ADD COLUMN IF NOT EXISTS source_motif TEXT;

-- ##################################################################
-- ## Flotte + tournées + GPS
-- ##################################################################
CREATE TABLE IF NOT EXISTS vehicules_magasin (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE vehicules_magasin
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS immatriculation TEXT,
  ADD COLUMN IF NOT EXISTS marque TEXT,
  ADD COLUMN IF NOT EXISTS modele TEXT,
  ADD COLUMN IF NOT EXISTS type_vehicule TEXT,
  ADD COLUMN IF NOT EXISTS capacite_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS capacite_m3 NUMERIC,
  ADD COLUMN IF NOT EXISTS carburant TEXT,
  ADD COLUMN IF NOT EXISTS kilometrage NUMERIC,
  ADD COLUMN IF NOT EXISTS date_mise_en_circulation DATE,
  ADD COLUMN IF NOT EXISTS prochain_entretien_date DATE,
  ADD COLUMN IF NOT EXISTS prochain_ct DATE,
  ADD COLUMN IF NOT EXISTS assurance_compagnie TEXT,
  ADD COLUMN IF NOT EXISTS assurance_date_fin DATE,
  ADD COLUMN IF NOT EXISTS chauffeur_principal_user_id UUID,
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'disponible',
  ADD COLUMN IF NOT EXISTS couleur TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE vehicules_magasin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "veh_all" ON vehicules_magasin;
CREATE POLICY "veh_all" ON vehicules_magasin FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS tournees (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE tournees
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS nom TEXT,
  ADD COLUMN IF NOT EXISTS date_tournee DATE,
  ADD COLUMN IF NOT EXISTS heure_depart TIME,
  ADD COLUMN IF NOT EXISTS heure_retour_prevue TIME,
  ADD COLUMN IF NOT EXISTS vehicule_id UUID,
  ADD COLUMN IF NOT EXISTS chauffeur_user_id UUID,
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'planifiee',
  ADD COLUMN IF NOT EXISTS point_depart_label TEXT,
  ADD COLUMN IF NOT EXISTS point_depart_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS point_depart_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS point_retour_label TEXT,
  ADD COLUMN IF NOT EXISTS point_retour_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS point_retour_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS distance_estimee_km NUMERIC,
  ADD COLUMN IF NOT EXISTS distance_reelle_km NUMERIC,
  ADD COLUMN IF NOT EXISTS duree_estimee_min INTEGER,
  ADD COLUMN IF NOT EXISTS duree_reelle_min INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS nb_etapes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_completees INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demarrage_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS termine_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE tournees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trn_all" ON tournees;
CREATE POLICY "trn_all" ON tournees FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS tournees_etapes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tournee_id UUID NOT NULL);
ALTER TABLE tournees_etapes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS type_etape TEXT DEFAULT 'livraison',
  ADD COLUMN IF NOT EXISTS demande_id UUID,
  ADD COLUMN IF NOT EXISTS etablissement_id UUID,
  ADD COLUMN IF NOT EXISTS depot_id UUID,
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'a_faire',
  ADD COLUMN IF NOT EXISTS heure_arrivee_prevue TIME,
  ADD COLUMN IF NOT EXISTS duree_estimee_min INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS arrivee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS depart_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_recepteur TEXT,
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS photo_preuve_url TEXT;
ALTER TABLE tournees_etapes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "etp_all" ON tournees_etapes;
CREATE POLICY "etp_all" ON tournees_etapes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS tournees_gps_track (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tournee_id UUID NOT NULL, latitude NUMERIC NOT NULL, longitude NUMERIC NOT NULL);
ALTER TABLE tournees_gps_track
  ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS chauffeur_user_id UUID,
  ADD COLUMN IF NOT EXISTS accuracy_m NUMERIC,
  ADD COLUMN IF NOT EXISTS speed_kmh NUMERIC,
  ADD COLUMN IF NOT EXISTS heading_deg NUMERIC;
ALTER TABLE tournees_gps_track ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gps_all" ON tournees_gps_track;
CREATE POLICY "gps_all" ON tournees_gps_track FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ##################################################################
-- ## Geoloc
-- ##################################################################
ALTER TABLE IF EXISTS etablissements ADD COLUMN IF NOT EXISTS latitude NUMERIC, ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE IF EXISTS depots ADD COLUMN IF NOT EXISTS latitude NUMERIC, ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- ##################################################################
-- ## Articles + Mercuriales
-- ##################################################################
ALTER TABLE IF EXISTS articles
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS est_catalogue_magasin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prix_public_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS prix_achat_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS famille TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE TABLE IF NOT EXISTS articles_rattachements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), article_etablissement_id UUID NOT NULL, article_magasin_id UUID NOT NULL);
ALTER TABLE articles_rattachements
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS etablissement_id UUID,
  ADD COLUMN IF NOT EXISTS prix_negocie_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE articles_rattachements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ar_all" ON articles_rattachements;
CREATE POLICY "ar_all" ON articles_rattachements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS mercuriales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom TEXT NOT NULL);
ALTER TABLE mercuriales
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS etablissement_id UUID,
  ADD COLUMN IF NOT EXISTS type_document TEXT DEFAULT 'mercuriale',
  ADD COLUMN IF NOT EXISTS date_debut DATE,
  ADD COLUMN IF NOT EXISTS date_fin DATE,
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'brouillon',
  ADD COLUMN IF NOT EXISTS remise_globale_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conditions_paiement TEXT,
  ADD COLUMN IF NOT EXISTS conditions_livraison TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS signee_par UUID,
  ADD COLUMN IF NOT EXISTS signee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE mercuriales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mer_all" ON mercuriales;
CREATE POLICY "mer_all" ON mercuriales FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS mercuriales_lignes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), mercuriale_id UUID NOT NULL);
ALTER TABLE mercuriales_lignes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS article_id UUID,
  ADD COLUMN IF NOT EXISTS libelle TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS prix_unitaire_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS remise_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prix_negocie_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS quantite_min INTEGER,
  ADD COLUMN IF NOT EXISTS quantite_max INTEGER,
  ADD COLUMN IF NOT EXISTS unite TEXT,
  ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE mercuriales_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merl_all" ON mercuriales_lignes;
CREATE POLICY "merl_all" ON mercuriales_lignes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ##################################################################
-- ## Marketplace
-- ##################################################################
CREATE TABLE IF NOT EXISTS marketplace_offres (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), magasin_emetteur_id UUID NOT NULL);
ALTER TABLE marketplace_offres
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS type_offre TEXT DEFAULT 'demande',
  ADD COLUMN IF NOT EXISTS urgence TEXT DEFAULT 'normale',
  ADD COLUMN IF NOT EXISTS article_id UUID,
  ADD COLUMN IF NOT EXISTS libelle TEXT,
  ADD COLUMN IF NOT EXISTS quantite NUMERIC,
  ADD COLUMN IF NOT EXISTS unite TEXT,
  ADD COLUMN IF NOT EXISTS prix_propose_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS conditions TEXT,
  ADD COLUMN IF NOT EXISTS delai_max_jours INTEGER,
  ADD COLUMN IF NOT EXISTS date_limite DATE,
  ADD COLUMN IF NOT EXISTS zone_geographique TEXT,
  ADD COLUMN IF NOT EXISTS rayon_km INTEGER,
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS magasin_repondeur_id UUID,
  ADD COLUMN IF NOT EXISTS message_repondeur TEXT,
  ADD COLUMN IF NOT EXISTS prix_negocie_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS accepte_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE marketplace_offres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mkt_all" ON marketplace_offres;
CREATE POLICY "mkt_all" ON marketplace_offres FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS marketplace_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), offre_id UUID NOT NULL, message TEXT NOT NULL);
ALTER TABLE marketplace_messages
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS magasin_id UUID;
ALTER TABLE marketplace_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mktm_all" ON marketplace_messages;
CREATE POLICY "mktm_all" ON marketplace_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ##################################################################
-- ## Vues
-- ##################################################################
DROP VIEW IF EXISTS v_analytics_sav;
CREATE OR REPLACE VIEW v_analytics_sav AS
SELECT se.id, se.demande_id, se.bilan_id AS bilan_sav_id, se.verdict, se.executee_at,
  se.structure_id, se.magasin_id, COALESCE(se.executee_at, NOW()) AS created_at,
  bs.nom AS bilan_nom,
  (SELECT COUNT(*) FROM bilans_sav_points WHERE bilan_id = se.bilan_id) AS nb_points_total
FROM sav_executions se LEFT JOIN bilans_sav bs ON bs.id = se.bilan_id;

DROP VIEW IF EXISTS v_catalogue_magasin;
CREATE OR REPLACE VIEW v_catalogue_magasin AS
SELECT a.id, a.libelle, a.code, a.reference, a.unite, a.prix_public_ht, a.prix_achat_ht,
  a.magasin_id, a.structure_id, a.est_catalogue_magasin, a.actif, a.created_at,
  (SELECT COUNT(DISTINCT etablissement_id) FROM articles_rattachements WHERE article_magasin_id = a.id) AS nb_etabs_rattaches,
  (SELECT COUNT(DISTINCT m.id) FROM mercuriales m JOIN mercuriales_lignes ml ON ml.mercuriale_id = m.id
   WHERE ml.article_id = a.id AND m.statut = 'active') AS nb_mercuriales_actives
FROM articles a WHERE a.est_catalogue_magasin = true;

DROP VIEW IF EXISTS v_di_a_livrer;
CREATE OR REPLACE VIEW v_di_a_livrer AS
SELECT d.id, d.numero, d.statut, COALESCE(d.type_demande, 'di') AS type_demande,
  d.priorite, d.created_at, d.validee_at,
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
ORDER BY d.priorite DESC NULLS LAST, d.validee_at ASC NULLS LAST;

DROP VIEW IF EXISTS v_collaborateurs;
CREATE OR REPLACE VIEW v_collaborateurs AS
SELECT m.user_id, m.prenom, m.nom, m.email, m.telephone,
  m.role_professionnel, m.service_id, m.structure_id,
  m.magasin_fournisseur_id, m.photo_url, m.fonction_detail, m.created_at
FROM membres_structure m;

-- ##################################################################
-- ## VÉRIFICATION
-- ##################################################################
SELECT '✓ TABLES' AS info, COUNT(*) AS nb FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'membres_structure', 'magasins_fournisseurs',
  'bilans_sav', 'bilans_sav_points', 'bilans_sav_articles', 'sav_executions',
  'etablissements_magasins_droits', 'membres_structure_magasins',
  'inventaires', 'inventaires_lignes',
  'vehicules_magasin', 'tournees', 'tournees_etapes', 'tournees_gps_track',
  'articles_rattachements', 'mercuriales', 'mercuriales_lignes',
  'marketplace_offres', 'marketplace_messages'
);
SELECT '✓ VUES' AS info, COUNT(*) AS nb FROM information_schema.views
WHERE table_schema = 'public' AND table_name IN ('v_analytics_sav', 'v_catalogue_magasin', 'v_di_a_livrer', 'v_collaborateurs');
