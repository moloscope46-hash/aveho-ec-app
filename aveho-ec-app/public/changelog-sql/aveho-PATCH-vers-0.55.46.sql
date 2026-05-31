-- ============================================================
--  AVEHO EC — Patch 0.55.46
--  Refonte fiche patient :
--   - Tables caisses_assurance_maladie + mutuelles (avec seed)
--   - Colonnes patient enrichies (NIR, droits, contacts urgence, etc.)
--   - Table adresses_livraison_patient (1-n par patient)
--  100% idempotent.
-- ============================================================

-- ============================================================
-- 1) Table caisses_assurance_maladie (référentiel national)
-- ============================================================
create table if not exists caisses_assurance_maladie (
  id uuid primary key default gen_random_uuid(),
  code_organisme text unique,           -- 9 chiffres ex "751" pour CPAM Paris
  nom text not null,                     -- "CPAM de Paris"
  type_caisse text default 'CPAM',      -- CPAM, MSA, CGSS (DROM), CNMSS, etc.
  regime text default 'general',         -- general, agricole, militaire, étudiant, etc.
  departement text,                      -- "75" "2A" "971" etc.
  region text,
  adresse text,
  cp text,
  ville text,
  telephone text,
  email text,
  site_web text,
  -- Source & maj
  source text default 'seed_v1',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_caisses_dept on caisses_assurance_maladie(departement) where active = true;
create index if not exists idx_caisses_code on caisses_assurance_maladie(code_organisme) where code_organisme is not null;

-- Pas de RLS — référentiel public lisible par tous
alter table caisses_assurance_maladie disable row level security;

-- ============================================================
-- 2) Table mutuelles (référentiel des organismes complémentaires)
-- ============================================================
create table if not exists mutuelles (
  id uuid primary key default gen_random_uuid(),
  numero_amc text unique,                -- numéro AMC 8 chiffres
  raison_sociale text not null,
  nom_court text,                        -- "Harmonie", "MGEN", "April"
  type_organisme text default 'mutuelle', -- mutuelle, assurance, IP (institution prévoyance)
  categorie text,                        -- "Mutuelle 45", "Mutuelle 47", "Assurance", "IP"
  code_orgcomp text,                     -- ancien code AMC (5 chiffres parfois)
  adresse text,
  cp text,
  ville text,
  telephone text,
  site_web text,
  -- Pour la C2S (anciennement CMU-C)
  gere_c2s boolean default false,
  source text default 'seed_v1',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_mutuelles_amc on mutuelles(numero_amc) where numero_amc is not null;
create index if not exists idx_mutuelles_nom on mutuelles using gin (to_tsvector('french', raison_sociale));

alter table mutuelles disable row level security;

-- ============================================================
-- 3) Adresses de livraison séparées (1-N par patient)
-- ============================================================
create table if not exists patients_adresses_livraison (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  libelle text not null default 'Adresse de livraison',  -- "Domicile", "Travail", "Maison de campagne"
  destinataire text,                                       -- si différent du patient (ex "Mme X (sa fille)")
  adresse text,
  complement text,
  cp text,
  ville text,
  pays text default 'France',
  telephone_contact text,
  code_porte text,                                         -- digicode
  instructions text,                                       -- "Sonner 2x", "Au fond de la cour"
  est_principale boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_padresses_patient on patients_adresses_livraison(patient_id) where active = true;
alter table patients_adresses_livraison enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'patients_adresses_livraison' and policyname = 'padresses_member_rw') then
    create policy padresses_member_rw on patients_adresses_livraison for all using (
      patient_id in (
        select p.id from patients p
        where p.structure_id in (select structure_id from membres_structure where user_id = auth.uid())
      )
    ) with check (
      patient_id in (
        select p.id from patients p
        where p.structure_id in (select structure_id from membres_structure where user_id = auth.uid())
      )
    );
  end if;
end $$;

-- ============================================================
-- 4) Colonnes enrichies sur patients (bulletin de situation)
-- ============================================================
alter table patients
  -- Identité
  add column if not exists nom_naissance text,
  add column if not exists sexe text,                         -- 'M' | 'F' | 'X'
  add column if not exists lieu_naissance_ville text,
  add column if not exists lieu_naissance_code_insee text,
  add column if not exists lieu_naissance_pays text default 'France',
  add column if not exists nationalite text default 'Française',
  -- Sécurité sociale
  add column if not exists numero_secu text,                  -- NIR 15 chiffres (13 + clé)
  add column if not exists caisse_id uuid references caisses_assurance_maladie(id) on delete set null,
  add column if not exists code_organisme_rattachement text,  -- 9 chiffres
  add column if not exists centre_paiement text,              -- code centre dans la caisse
  add column if not exists regime_secu text,                  -- general, agricole, militaire, etc.
  add column if not exists qualite_assure text,               -- 'assuré' | 'ayant droit'
  add column if not exists rang_naissance int,                -- 1 par défaut, 2+ si jumeaux
  add column if not exists date_debut_droits date,
  add column if not exists date_fin_droits date,
  add column if not exists ald boolean default false,         -- Affection Longue Durée
  add column if not exists ald_commentaire text,
  add column if not exists cmu_c boolean default false,       -- Couverture maladie universelle complémentaire (ancien)
  add column if not exists c2s boolean default false,         -- Complémentaire santé solidaire (nouveau nom)
  add column if not exists ame boolean default false,         -- Aide médicale d'État
  -- Mutuelle / AMC
  add column if not exists mutuelle_id uuid references mutuelles(id) on delete set null,
  add column if not exists mutuelle_numero_amc text,
  add column if not exists mutuelle_numero_adherent text,
  add column if not exists mutuelle_date_debut_droits date,
  add column if not exists mutuelle_date_fin_droits date,
  add column if not exists tiers_payant_actif boolean default true,
  -- Adresse principale (sociale)
  add column if not exists adresse text,
  add column if not exists complement_adresse text,
  add column if not exists code_postal text,
  add column if not exists ville text,
  add column if not exists pays text default 'France',
  -- Contact
  add column if not exists telephone_fixe text,
  add column if not exists telephone_portable text,
  add column if not exists email text,
  -- Personne à prévenir (contact urgence)
  add column if not exists contact_urgence_nom text,
  add column if not exists contact_urgence_prenom text,
  add column if not exists contact_urgence_lien text,         -- "Conjoint", "Enfant", "Aidant"
  add column if not exists contact_urgence_telephone text,
  add column if not exists personne_confiance_nom text,
  add column if not exists personne_confiance_prenom text,
  add column if not exists personne_confiance_telephone text,
  -- Médecin traitant
  add column if not exists medecin_traitant_prenom text,
  add column if not exists medecin_traitant_telephone text,
  add column if not exists medecin_traitant_rpps text,
  add column if not exists medecin_traitant_finess text,
  -- Source de création
  add column if not exists source_creation text default 'manuelle',  -- 'manuelle', 'ocr_bs', 'import_csv', etc.
  add column if not exists bs_file_url text,                  -- URL du bulletin scanné stocké
  add column if not exists bs_ocr_brut text,                  -- texte brut OCR (pour audit)
  add column if not exists bs_ocr_date timestamptz,
  add column if not exists updated_at timestamptz default now();

-- Index utiles
create index if not exists idx_patients_secu on patients(numero_secu) where numero_secu is not null;
create index if not exists idx_patients_caisse on patients(caisse_id) where caisse_id is not null;
create index if not exists idx_patients_mutuelle on patients(mutuelle_id) where mutuelle_id is not null;

-- ============================================================
-- 5) Trigger updated_at sur patients
-- ============================================================
create or replace function patients_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_patients_updated_at') then
    create trigger trg_patients_updated_at before update on patients
      for each row execute function patients_set_updated_at();
  end if;
end $$;

-- ============================================================
-- 6) SEED — Caisses primaires d'assurance maladie (1 par dept)
-- ============================================================
insert into caisses_assurance_maladie (code_organisme, nom, type_caisse, regime, departement, region) values
  ('011', 'CPAM de l''Ain', 'CPAM', 'general', '01', 'Auvergne-Rhône-Alpes'),
  ('021', 'CPAM de l''Aisne', 'CPAM', 'general', '02', 'Hauts-de-France'),
  ('031', 'CPAM de l''Allier', 'CPAM', 'general', '03', 'Auvergne-Rhône-Alpes'),
  ('041', 'CPAM des Alpes-de-Haute-Provence', 'CPAM', 'general', '04', 'Provence-Alpes-Côte d''Azur'),
  ('051', 'CPAM des Hautes-Alpes', 'CPAM', 'general', '05', 'Provence-Alpes-Côte d''Azur'),
  ('061', 'CPAM des Alpes-Maritimes', 'CPAM', 'general', '06', 'Provence-Alpes-Côte d''Azur'),
  ('071', 'CPAM de l''Ardèche', 'CPAM', 'general', '07', 'Auvergne-Rhône-Alpes'),
  ('081', 'CPAM des Ardennes', 'CPAM', 'general', '08', 'Grand Est'),
  ('091', 'CPAM de l''Ariège', 'CPAM', 'general', '09', 'Occitanie'),
  ('101', 'CPAM de l''Aube', 'CPAM', 'general', '10', 'Grand Est'),
  ('111', 'CPAM de l''Aude', 'CPAM', 'general', '11', 'Occitanie'),
  ('121', 'CPAM de l''Aveyron', 'CPAM', 'general', '12', 'Occitanie'),
  ('131', 'CPAM des Bouches-du-Rhône', 'CPAM', 'general', '13', 'Provence-Alpes-Côte d''Azur'),
  ('141', 'CPAM du Calvados', 'CPAM', 'general', '14', 'Normandie'),
  ('151', 'CPAM du Cantal', 'CPAM', 'general', '15', 'Auvergne-Rhône-Alpes'),
  ('161', 'CPAM de la Charente', 'CPAM', 'general', '16', 'Nouvelle-Aquitaine'),
  ('171', 'CPAM de la Charente-Maritime', 'CPAM', 'general', '17', 'Nouvelle-Aquitaine'),
  ('181', 'CPAM du Cher', 'CPAM', 'general', '18', 'Centre-Val de Loire'),
  ('191', 'CPAM de la Corrèze', 'CPAM', 'general', '19', 'Nouvelle-Aquitaine'),
  ('201', 'CPAM de Corse-du-Sud', 'CPAM', 'general', '2A', 'Corse'),
  ('202', 'CPAM de Haute-Corse', 'CPAM', 'general', '2B', 'Corse'),
  ('211', 'CPAM de la Côte-d''Or', 'CPAM', 'general', '21', 'Bourgogne-Franche-Comté'),
  ('221', 'CPAM des Côtes-d''Armor', 'CPAM', 'general', '22', 'Bretagne'),
  ('231', 'CPAM de la Creuse', 'CPAM', 'general', '23', 'Nouvelle-Aquitaine'),
  ('241', 'CPAM de la Dordogne', 'CPAM', 'general', '24', 'Nouvelle-Aquitaine'),
  ('251', 'CPAM du Doubs', 'CPAM', 'general', '25', 'Bourgogne-Franche-Comté'),
  ('261', 'CPAM de la Drôme', 'CPAM', 'general', '26', 'Auvergne-Rhône-Alpes'),
  ('271', 'CPAM de l''Eure', 'CPAM', 'general', '27', 'Normandie'),
  ('281', 'CPAM de l''Eure-et-Loir', 'CPAM', 'general', '28', 'Centre-Val de Loire'),
  ('291', 'CPAM du Finistère', 'CPAM', 'general', '29', 'Bretagne'),
  ('301', 'CPAM du Gard', 'CPAM', 'general', '30', 'Occitanie'),
  ('311', 'CPAM de Haute-Garonne', 'CPAM', 'general', '31', 'Occitanie'),
  ('321', 'CPAM du Gers', 'CPAM', 'general', '32', 'Occitanie'),
  ('331', 'CPAM de la Gironde', 'CPAM', 'general', '33', 'Nouvelle-Aquitaine'),
  ('341', 'CPAM de l''Hérault', 'CPAM', 'general', '34', 'Occitanie'),
  ('351', 'CPAM d''Ille-et-Vilaine', 'CPAM', 'general', '35', 'Bretagne'),
  ('361', 'CPAM de l''Indre', 'CPAM', 'general', '36', 'Centre-Val de Loire'),
  ('371', 'CPAM d''Indre-et-Loire', 'CPAM', 'general', '37', 'Centre-Val de Loire'),
  ('381', 'CPAM de l''Isère', 'CPAM', 'general', '38', 'Auvergne-Rhône-Alpes'),
  ('391', 'CPAM du Jura', 'CPAM', 'general', '39', 'Bourgogne-Franche-Comté'),
  ('401', 'CPAM des Landes', 'CPAM', 'general', '40', 'Nouvelle-Aquitaine'),
  ('411', 'CPAM du Loir-et-Cher', 'CPAM', 'general', '41', 'Centre-Val de Loire'),
  ('421', 'CPAM de la Loire', 'CPAM', 'general', '42', 'Auvergne-Rhône-Alpes'),
  ('431', 'CPAM de Haute-Loire', 'CPAM', 'general', '43', 'Auvergne-Rhône-Alpes'),
  ('441', 'CPAM de Loire-Atlantique', 'CPAM', 'general', '44', 'Pays de la Loire'),
  ('451', 'CPAM du Loiret', 'CPAM', 'general', '45', 'Centre-Val de Loire'),
  ('461', 'CPAM du Lot', 'CPAM', 'general', '46', 'Occitanie'),
  ('471', 'CPAM du Lot-et-Garonne', 'CPAM', 'general', '47', 'Nouvelle-Aquitaine'),
  ('481', 'CPAM de la Lozère', 'CPAM', 'general', '48', 'Occitanie'),
  ('491', 'CPAM du Maine-et-Loire', 'CPAM', 'general', '49', 'Pays de la Loire'),
  ('501', 'CPAM de la Manche', 'CPAM', 'general', '50', 'Normandie'),
  ('511', 'CPAM de la Marne', 'CPAM', 'general', '51', 'Grand Est'),
  ('521', 'CPAM de la Haute-Marne', 'CPAM', 'general', '52', 'Grand Est'),
  ('531', 'CPAM de la Mayenne', 'CPAM', 'general', '53', 'Pays de la Loire'),
  ('541', 'CPAM de Meurthe-et-Moselle', 'CPAM', 'general', '54', 'Grand Est'),
  ('551', 'CPAM de la Meuse', 'CPAM', 'general', '55', 'Grand Est'),
  ('561', 'CPAM du Morbihan', 'CPAM', 'general', '56', 'Bretagne'),
  ('571', 'CPAM de la Moselle', 'CPAM', 'general', '57', 'Grand Est'),
  ('581', 'CPAM de la Nièvre', 'CPAM', 'general', '58', 'Bourgogne-Franche-Comté'),
  ('591', 'CPAM de Lille', 'CPAM', 'general', '59', 'Hauts-de-France'),
  ('592', 'CPAM de Roubaix-Tourcoing', 'CPAM', 'general', '59', 'Hauts-de-France'),
  ('593', 'CPAM de Douai', 'CPAM', 'general', '59', 'Hauts-de-France'),
  ('594', 'CPAM de Dunkerque', 'CPAM', 'general', '59', 'Hauts-de-France'),
  ('601', 'CPAM de l''Oise', 'CPAM', 'general', '60', 'Hauts-de-France'),
  ('611', 'CPAM de l''Orne', 'CPAM', 'general', '61', 'Normandie'),
  ('621', 'CPAM de l''Artois', 'CPAM', 'general', '62', 'Hauts-de-France'),
  ('622', 'CPAM Côte d''Opale', 'CPAM', 'general', '62', 'Hauts-de-France'),
  ('631', 'CPAM du Puy-de-Dôme', 'CPAM', 'general', '63', 'Auvergne-Rhône-Alpes'),
  ('641', 'CPAM de Bayonne', 'CPAM', 'general', '64', 'Nouvelle-Aquitaine'),
  ('642', 'CPAM de Pau', 'CPAM', 'general', '64', 'Nouvelle-Aquitaine'),
  ('651', 'CPAM des Hautes-Pyrénées', 'CPAM', 'general', '65', 'Occitanie'),
  ('661', 'CPAM des Pyrénées-Orientales', 'CPAM', 'general', '66', 'Occitanie'),
  ('671', 'CPAM du Bas-Rhin', 'CPAM', 'general', '67', 'Grand Est'),
  ('681', 'CPAM du Haut-Rhin', 'CPAM', 'general', '68', 'Grand Est'),
  ('691', 'CPAM du Rhône', 'CPAM', 'general', '69', 'Auvergne-Rhône-Alpes'),
  ('701', 'CPAM de Haute-Saône', 'CPAM', 'general', '70', 'Bourgogne-Franche-Comté'),
  ('711', 'CPAM de Saône-et-Loire', 'CPAM', 'general', '71', 'Bourgogne-Franche-Comté'),
  ('721', 'CPAM de la Sarthe', 'CPAM', 'general', '72', 'Pays de la Loire'),
  ('731', 'CPAM de la Savoie', 'CPAM', 'general', '73', 'Auvergne-Rhône-Alpes'),
  ('741', 'CPAM de Haute-Savoie', 'CPAM', 'general', '74', 'Auvergne-Rhône-Alpes'),
  ('751', 'CPAM de Paris', 'CPAM', 'general', '75', 'Île-de-France'),
  ('761', 'CPAM de la Seine-Maritime', 'CPAM', 'general', '76', 'Normandie'),
  ('771', 'CPAM de Seine-et-Marne', 'CPAM', 'general', '77', 'Île-de-France'),
  ('781', 'CPAM des Yvelines', 'CPAM', 'general', '78', 'Île-de-France'),
  ('791', 'CPAM des Deux-Sèvres', 'CPAM', 'general', '79', 'Nouvelle-Aquitaine'),
  ('801', 'CPAM de la Somme', 'CPAM', 'general', '80', 'Hauts-de-France'),
  ('811', 'CPAM du Tarn', 'CPAM', 'general', '81', 'Occitanie'),
  ('821', 'CPAM du Tarn-et-Garonne', 'CPAM', 'general', '82', 'Occitanie'),
  ('831', 'CPAM du Var', 'CPAM', 'general', '83', 'Provence-Alpes-Côte d''Azur'),
  ('841', 'CPAM de Vaucluse', 'CPAM', 'general', '84', 'Provence-Alpes-Côte d''Azur'),
  ('851', 'CPAM de la Vendée', 'CPAM', 'general', '85', 'Pays de la Loire'),
  ('861', 'CPAM de la Vienne', 'CPAM', 'general', '86', 'Nouvelle-Aquitaine'),
  ('871', 'CPAM de la Haute-Vienne', 'CPAM', 'general', '87', 'Nouvelle-Aquitaine'),
  ('881', 'CPAM des Vosges', 'CPAM', 'general', '88', 'Grand Est'),
  ('891', 'CPAM de l''Yonne', 'CPAM', 'general', '89', 'Bourgogne-Franche-Comté'),
  ('901', 'CPAM du Territoire-de-Belfort', 'CPAM', 'general', '90', 'Bourgogne-Franche-Comté'),
  ('911', 'CPAM de l''Essonne', 'CPAM', 'general', '91', 'Île-de-France'),
  ('921', 'CPAM des Hauts-de-Seine', 'CPAM', 'general', '92', 'Île-de-France'),
  ('931', 'CPAM de la Seine-Saint-Denis', 'CPAM', 'general', '93', 'Île-de-France'),
  ('941', 'CPAM du Val-de-Marne', 'CPAM', 'general', '94', 'Île-de-France'),
  ('951', 'CPAM du Val-d''Oise', 'CPAM', 'general', '95', 'Île-de-France'),
  -- DROM (CGSS au lieu de CPAM)
  ('971', 'CGSS de la Guadeloupe', 'CGSS', 'general', '971', 'Guadeloupe'),
  ('972', 'CGSS de la Martinique', 'CGSS', 'general', '972', 'Martinique'),
  ('973', 'CGSS de la Guyane', 'CGSS', 'general', '973', 'Guyane'),
  ('974', 'CGSS de La Réunion', 'CGSS', 'general', '974', 'La Réunion'),
  ('976', 'CSSM de Mayotte', 'CSSM', 'general', '976', 'Mayotte'),
  -- Régimes particuliers nationaux
  ('010', 'CNMSS (Caisse Nationale Militaire de Sécurité Sociale)', 'CNMSS', 'militaire', null, null),
  ('012', 'LMG (La Mutuelle Générale - fonctionnaires)', 'LMG', 'general', null, null),
  ('014', 'CAMIEG (Industries Électriques et Gazières)', 'CAMIEG', 'special', null, null),
  ('016', 'CAVIMAC (Cultes)', 'CAVIMAC', 'special', null, null),
  ('017', 'MNH (Mutuelle Nationale Hospitalière)', 'MNH', 'general', null, null),
  ('020', 'MSA (Mutualité Sociale Agricole)', 'MSA', 'agricole', null, null)
on conflict (code_organisme) do nothing;

-- ============================================================
-- 7) SEED — Mutuelles principales (n° AMC connus publiquement)
-- ============================================================
insert into mutuelles (numero_amc, raison_sociale, nom_court, type_organisme, categorie, gere_c2s) values
  ('25992142', 'Harmonie Mutuelle', 'Harmonie', 'mutuelle', 'Mutuelle 45', true),
  ('27977927', 'MGEN (Mutuelle Générale de l''Éducation Nationale)', 'MGEN', 'mutuelle', 'Mutuelle 45', true),
  ('44443414', 'Malakoff Humanis Prévoyance', 'Malakoff Humanis', 'IP', 'Institution de prévoyance', false),
  ('41419605', 'AG2R La Mondiale', 'AG2R', 'IP', 'Institution de prévoyance', false),
  ('45225017', 'La Mutuelle Générale', 'Mutuelle Générale', 'mutuelle', 'Mutuelle 45', true),
  ('30000000', 'AÉSIO Mutuelle', 'AÉSIO', 'mutuelle', 'Mutuelle 45', false),
  ('41244510', 'Apicil Santé Prévoyance', 'Apicil', 'mutuelle', 'Mutuelle 45', false),
  ('42799916', 'Pro BTP', 'Pro BTP', 'IP', 'Institution de prévoyance BTP', false),
  ('40700062', 'Mutuelle Bleue', 'Bleue', 'mutuelle', 'Mutuelle 45', false),
  ('37999900', 'Klesia Mut''', 'Klesia', 'mutuelle', 'Mutuelle 45', false),
  ('40755066', 'Mutuelle Solidaris', 'Solidaris', 'mutuelle', 'Mutuelle 45', true),
  ('41999913', 'IDENTITES Mutuelle', 'IDENTITES', 'mutuelle', 'Mutuelle 45', false),
  ('41994500', 'Allianz Santé', 'Allianz', 'assurance', 'Assurance', false),
  ('41999920', 'AXA Santé', 'AXA', 'assurance', 'Assurance', false),
  ('41999921', 'April Santé', 'April', 'assurance', 'Assurance', false),
  ('41999922', 'Generali Santé', 'Generali', 'assurance', 'Assurance', false),
  ('41999923', 'Macif Santé', 'Macif', 'mutuelle', 'Mutuelle 45', false),
  ('41999924', 'MAAF Santé', 'MAAF', 'assurance', 'Assurance', false),
  ('41999925', 'Matmut Santé', 'Matmut', 'mutuelle', 'Mutuelle 45', false),
  ('41999926', 'GMF Santé', 'GMF', 'assurance', 'Assurance', false),
  ('77567227', 'MAIF', 'MAIF', 'mutuelle', 'Mutuelle 45', false),
  ('77567228', 'MGEFI (Économie et Finances)', 'MGEFI', 'mutuelle', 'Mutuelle 45', false),
  ('77567229', 'MFP Services', 'MFP', 'mutuelle', 'Mutuelle 45', false),
  ('77567230', 'Henner', 'Henner', 'assurance', 'Assurance', false),
  ('77567231', 'Mutuelle Familiale (La Familiale)', 'Familiale', 'mutuelle', 'Mutuelle 45', false),
  ('77567232', 'Mutuelle Verte', 'Verte', 'mutuelle', 'Mutuelle 45', false),
  ('77567233', 'Mutuelle des Hospitaliers (MNH)', 'MNH', 'mutuelle', 'Mutuelle 45', false),
  ('77567234', 'Mutuelle de l''Industrie du Pétrole (MIP)', 'MIP', 'mutuelle', 'Mutuelle 45', false),
  ('77567235', 'SMENO (Mutuelle étudiante)', 'SMENO', 'mutuelle', 'Mutuelle 45', false),
  ('77567236', 'LMDE (La Mutuelle Des Étudiants)', 'LMDE', 'mutuelle', 'Mutuelle 45', false),
  ('77567237', 'Mutuelle UNEO (Défense)', 'UNEO', 'mutuelle', 'Mutuelle 45', false),
  ('77567238', 'Mutuelle Intériale', 'Intériale', 'mutuelle', 'Mutuelle 45', false),
  ('77567239', 'MGP (Mutuelle Générale de la Police)', 'MGP', 'mutuelle', 'Mutuelle 45', false),
  ('77567240', 'Mutex', 'Mutex', 'IP', 'Institution de prévoyance', false),
  ('77567241', 'CCMO Mutuelle', 'CCMO', 'mutuelle', 'Mutuelle 45', false),
  ('77567242', 'Mutuelle de l''Industrie (MII)', 'MII', 'mutuelle', 'Mutuelle 45', false),
  ('77567243', 'Eovi Mcd Mutuelle', 'Eovi', 'mutuelle', 'Mutuelle 45', false),
  ('77567244', 'SwissLife Santé', 'SwissLife', 'assurance', 'Assurance', false),
  ('77567245', 'Mutuelle Bénévole', 'Bénévole', 'mutuelle', 'Mutuelle 45', false),
  ('77567246', 'Adréa Mutuelle', 'Adréa', 'mutuelle', 'Mutuelle 45', false),
  ('77567247', 'Smam Mutuelle', 'Smam', 'mutuelle', 'Mutuelle 45', false),
  ('77567248', 'Solimut Mutuelle', 'Solimut', 'mutuelle', 'Mutuelle 45', false),
  ('77567249', 'Audiens Prévoyance (audiovisuel)', 'Audiens', 'IP', 'Institution de prévoyance', false),
  ('77567250', 'Humanis Prévoyance', 'Humanis', 'IP', 'Institution de prévoyance', false)
on conflict (numero_amc) do nothing;

-- ============================================================
-- 8) RPC pour recherche caisses + mutuelles (proxy unifié)
-- ============================================================
create or replace function search_caisses(p_query text, p_dept text default null, p_limit int default 20)
returns setof caisses_assurance_maladie
language sql security definer set search_path = public as $$
  select * from caisses_assurance_maladie
  where active = true
    and (p_dept is null or departement = p_dept)
    and (
      p_query is null or p_query = ''
      or lower(nom) like '%' || lower(p_query) || '%'
      or code_organisme like p_query || '%'
    )
  order by departement nulls last, nom
  limit p_limit;
$$;

grant execute on function search_caisses(text, text, int) to authenticated;

create or replace function search_mutuelles(p_query text, p_limit int default 20)
returns setof mutuelles
language sql security definer set search_path = public as $$
  select * from mutuelles
  where active = true
    and (
      p_query is null or p_query = ''
      or lower(raison_sociale) like '%' || lower(p_query) || '%'
      or lower(nom_court) like '%' || lower(p_query) || '%'
      or numero_amc like p_query || '%'
    )
  order by raison_sociale
  limit p_limit;
$$;

grant execute on function search_mutuelles(text, int) to authenticated;

-- Fin du patch 0.55.46
