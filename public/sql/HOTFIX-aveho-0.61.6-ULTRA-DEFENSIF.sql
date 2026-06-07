-- =============================================================
-- HOTFIX-aveho-0.61.6-ULTRA-DEFENSIF.sql
-- Variante ultra-defensive : ALTER ADD COLUMN IF NOT EXISTS partout
-- AVANT les CREATE INDEX et VIEWS. Gère le cas où les tables existent
-- déjà mais avec des colonnes anciennes.
-- 100% idempotent.
-- =============================================================

-- =====================================================================
-- BLOC 1 : Tables SAV — ALTER ADD COLUMN d'abord (au cas où tables existent)
-- =====================================================================
CREATE TABLE IF NOT EXISTS bilans_sav (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bilans_sav
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS duree_estimee_min INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS icone TEXT,
  ADD COLUMN IF NOT EXISTS couleur TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID;
CREATE INDEX IF NOT EXISTS idx_bilans_struct ON bilans_sav(structure_id);
CREATE INDEX IF NOT EXISTS idx_bilans_magasin ON bilans_sav(magasin_id);
ALTER TABLE bilans_sav ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bs_all" ON bilans_sav;
CREATE POLICY "bs_all" ON bilans_sav FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bilans_sav_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id UUID NOT NULL,
  libelle TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bilans_sav_points
  ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS type_controle TEXT DEFAULT 'oui_non',
  ADD COLUMN IF NOT EXISTS unite TEXT,
  ADD COLUMN IF NOT EXISTS valeur_min NUMERIC,
  ADD COLUMN IF NOT EXISTS valeur_max NUMERIC,
  ADD COLUMN IF NOT EXISTS est_obligatoire BOOLEAN DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_bsp_bilan ON bilans_sav_points(bilan_id);
ALTER TABLE bilans_sav_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsp_all" ON bilans_sav_points;
CREATE POLICY "bsp_all" ON bilans_sav_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bilans_sav_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id UUID NOT NULL,
  article_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bsa_bilan ON bilans_sav_articles(bilan_id);
CREATE INDEX IF NOT EXISTS idx_bsa_article ON bilans_sav_articles(article_id);
ALTER TABLE bilans_sav_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsa_all" ON bilans_sav_articles;
CREATE POLICY "bsa_all" ON bilans_sav_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS sav_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sav_executions
  ADD COLUMN IF NOT EXISTS demande_id UUID,
  ADD COLUMN IF NOT EXISTS bilan_id UUID,
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS verdict TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS executee_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS executee_par UUID;
CREATE INDEX IF NOT EXISTS idx_sav_exec_demande ON sav_executions(demande_id);
CREATE INDEX IF NOT EXISTS idx_sav_exec_bilan ON sav_executions(bilan_id);
CREATE INDEX IF NOT EXISTS idx_sav_exec_magasin ON sav_executions(magasin_id);
ALTER TABLE sav_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "se_all" ON sav_executions;
CREATE POLICY "se_all" ON sav_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- demandes_internes : ajouts
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
  ADD COLUMN IF NOT EXISTS cloturee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priorite TEXT;

-- Droits magasin
CREATE TABLE IF NOT EXISTS etablissements_magasins_droits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id UUID NOT NULL,
  magasin_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE etablissements_magasins_droits
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS droit_commande BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS droit_sav BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS droit_transfert BOOLEAN DEFAULT true;
ALTER TABLE etablissements_magasins_droits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emd_all" ON etablissements_magasins_droits;
CREATE POLICY "emd_all" ON etablissements_magasins_droits FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS membres_structure_magasins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  magasin_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE membres_structure_magasins
  ADD COLUMN IF NOT EXISTS structure_id UUID;
ALTER TABLE membres_structure_magasins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msm_all" ON membres_structure_magasins;
CREATE POLICY "msm_all" ON membres_structure_magasins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================================
-- BLOC 2 : Bucket Storage
-- =====================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('sav-photos', 'sav-photos', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "sav_photos_read" ON storage.objects;
CREATE POLICY "sav_photos_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sav-photos');
DROP POLICY IF EXISTS "sav_photos_write" ON storage.objects;
CREATE POLICY "sav_photos_write" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'sav-photos') WITH CHECK (bucket_id = 'sav-photos');

-- =====================================================================
-- BLOC 3 : Vue v_analytics_sav
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
-- BLOC 4 : Inventaires
-- =====================================================================
CREATE TABLE IF NOT EXISTS inventaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  depot_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inventaires
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
  ADD COLUMN IF NOT EXISTS ecart_valeur_total NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS valide_par UUID,
  ADD COLUMN IF NOT EXISTS valide_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ajustement_stock_genere BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE inventaires ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_all" ON inventaires;
CREATE POLICY "inv_all" ON inventaires FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventaires_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventaire_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inventaires_lignes
  ADD COLUMN IF NOT EXISTS article_id UUID,
  ADD COLUMN IF NOT EXISTS libelle TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS quantite_theorique NUMERIC,
  ADD COLUMN IF NOT EXISTS quantite_comptee NUMERIC,
  ADD COLUMN IF NOT EXISTS ecart NUMERIC,
  ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE inventaires_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invl_all" ON inventaires_lignes;
CREATE POLICY "invl_all" ON inventaires_lignes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS stock_mouvements
  ADD COLUMN IF NOT EXISTS inventaire_id UUID,
  ADD COLUMN IF NOT EXISTS source_motif TEXT;

-- =====================================================================
-- BLOC 5 : Flotte + tournées
-- =====================================================================
CREATE TABLE IF NOT EXISTS vehicules_magasin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vehicules_magasin
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
  ADD COLUMN IF NOT EXISTS prochain_entretien_km NUMERIC,
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
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID;
CREATE INDEX IF NOT EXISTS idx_veh_magasin ON vehicules_magasin(magasin_id);
ALTER TABLE vehicules_magasin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "veh_all" ON vehicules_magasin;
CREATE POLICY "veh_all" ON vehicules_magasin FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS tournees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tournees
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
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID;
CREATE INDEX IF NOT EXISTS idx_trn_magasin ON tournees(magasin_id);
CREATE INDEX IF NOT EXISTS idx_trn_date ON tournees(date_tournee);
ALTER TABLE tournees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trn_all" ON tournees;
CREATE POLICY "trn_all" ON tournees FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS tournees_etapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournee_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tournees_etapes
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
CREATE INDEX IF NOT EXISTS idx_etp_tournee ON tournees_etapes(tournee_id);
ALTER TABLE tournees_etapes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "etp_all" ON tournees_etapes;
CREATE POLICY "etp_all" ON tournees_etapes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Géoloc dans etablissements + depots
ALTER TABLE IF EXISTS etablissements ADD COLUMN IF NOT EXISTS latitude NUMERIC, ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE IF EXISTS depots ADD COLUMN IF NOT EXISTS latitude NUMERIC, ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- =====================================================================
-- BLOC 6 : Catalogue magasin + Mercuriales
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE articles_rattachements
  ADD COLUMN IF NOT EXISTS magasin_id UUID,
  ADD COLUMN IF NOT EXISTS etablissement_id UUID,
  ADD COLUMN IF NOT EXISTS prix_negocie_ht NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE articles_rattachements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ar_all" ON articles_rattachements;
CREATE POLICY "ar_all" ON articles_rattachements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS mercuriales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mercuriales
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
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE mercuriales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mer_all" ON mercuriales;
CREATE POLICY "mer_all" ON mercuriales FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS mercuriales_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mercuriale_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mercuriales_lignes
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

DROP VIEW IF EXISTS v_catalogue_magasin;
CREATE OR REPLACE VIEW v_catalogue_magasin AS
SELECT a.id, a.libelle, a.code, a.reference, a.unite,
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
-- BLOC 7 : Vue DI à livrer
-- =====================================================================
DROP VIEW IF EXISTS v_di_a_livrer;
CREATE OR REPLACE VIEW v_di_a_livrer AS
SELECT
  d.id, d.numero, d.statut, COALESCE(d.type_demande, 'di') AS type_demande,
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

-- =====================================================================
-- VÉRIFICATION FINALE
-- =====================================================================
SELECT 'TABLES OK' AS info, COUNT(*) AS nb FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'bilans_sav', 'bilans_sav_points', 'bilans_sav_articles', 'sav_executions',
  'etablissements_magasins_droits', 'membres_structure_magasins',
  'inventaires', 'inventaires_lignes',
  'vehicules_magasin', 'tournees', 'tournees_etapes',
  'articles_rattachements', 'mercuriales', 'mercuriales_lignes'
);

SELECT 'VUES OK' AS info, COUNT(*) AS nb FROM information_schema.views
WHERE table_schema = 'public' AND table_name IN (
  'v_analytics_sav', 'v_catalogue_magasin', 'v_di_a_livrer'
);
