-- ============================================================
--  AVEHO EC — SCRIPT CONSOLIDÉ 0.15
--  Crée toute la base from scratch pour Aveho Espace Collectivité.
--  Équivalent à exécuter dans l'ordre : schema.sql + 02 à 17.
--  Idempotent : peut être rejoué sans casser une base existante.
--  À exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- Section : schema.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Espace Collectivité  ·  Schéma Supabase
--  Promotions · Commandes · Historique · cloisonné par structure
--  À exécuter dans Supabase > SQL Editor
-- ============================================================

-- ---------- TABLES DE RÉFÉRENCE ----------

-- Une collectivité cliente (EHPAD, hôpital, foyer…)
create table if not exists structures (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  type        text,                       -- 'EHPAD', 'Hôpital'…
  ville       text,
  created_at  timestamptz default now()
);

-- Les magasins Aveho fournisseurs
create table if not exists magasins (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,              -- 'Aveho Figeac'
  ville       text,
  distance    text,                       -- 'à 12 km'
  delai       text,                       -- '24-48h'
  nb_articles int default 0,
  favori      boolean default false,
  photo       text,                       -- nom de fichier dans /public/magasins (ex: 'figeac.jpg')
  couleur     text default '#5a8f8f',     -- couleur d'enseigne / CTA
  created_at  timestamptz default now()
);

-- Rattachement utilisateur (auth.users) -> structure
-- Détermine ce que chaque utilisateur a le droit de voir.
create table if not exists membres_structure (
  user_id      uuid references auth.users(id) on delete cascade,
  structure_id uuid references structures(id) on delete cascade,
  role         text default 'membre',     -- 'membre', 'admin'
  primary key (user_id, structure_id)
);

-- Promotions publiées par les magasins
create table if not exists promotions (
  id           uuid primary key default gen_random_uuid(),
  magasin_id   uuid references magasins(id) on delete cascade,
  type         text not null,             -- 'FLASH','DESTOCKAGE','NOUVEAU','PROMO','BONUS','ECO'
  titre        text not null,
  sous_titre   text,
  prix_avant   numeric,
  prix_apres   numeric not null,
  unite        text default '/mois',      -- '/mois' ou '' (achat ferme)
  remise_pct   int,
  fin_le       date,                      -- date de fin de la promo
  emoji        text,                      -- petit visuel ('😷','🛏️'…)
  actif        boolean default true,
  created_at   timestamptz default now()
);

-- Commandes passées par une structure auprès d'un magasin
create table if not exists commandes (
  id            uuid primary key default gen_random_uuid(),
  structure_id  uuid references structures(id) on delete cascade,
  magasin_id    uuid references magasins(id),
  numero        text,                      -- 'CMD-1042'
  statut        text default 'En cours',   -- 'En cours','Validée','Livrée'
  total         numeric default 0,
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now()
);

-- Lignes d'une commande
create table if not exists commande_lignes (
  id            uuid primary key default gen_random_uuid(),
  commande_id   uuid references commandes(id) on delete cascade,
  promotion_id  uuid references promotions(id),
  libelle       text not null,
  prix_unitaire numeric not null,
  quantite      int default 1
);

-- ---------- ROW LEVEL SECURITY ----------
-- Principe : un utilisateur ne voit/écrit QUE les données de sa/ses structure(s).

alter table structures        enable row level security;
alter table magasins          enable row level security;
alter table membres_structure enable row level security;
alter table promotions        enable row level security;
alter table commandes         enable row level security;
alter table commande_lignes   enable row level security;

-- Helper : structures de l'utilisateur courant
create or replace function mes_structures()
returns setof uuid language sql security definer stable as $$
  select structure_id from membres_structure where user_id = auth.uid()
$$;

-- structures : je vois celles dont je suis membre
create policy "voir mes structures" on structures
  for select using ( id in (select mes_structures()) );

-- membres_structure : je vois mes propres rattachements
create policy "voir mes rattachements" on membres_structure
  for select using ( user_id = auth.uid() );

-- magasins : tout le monde de connecté peut voir les magasins (catalogue public interne)
create policy "magasins visibles" on magasins
  for select using ( auth.role() = 'authenticated' );

-- promotions : visibles à tout utilisateur connecté (publiées par les magasins)
create policy "promotions visibles" on promotions
  for select using ( auth.role() = 'authenticated' and actif = true );

-- commandes : je ne vois que celles de mes structures
create policy "voir commandes de ma structure" on commandes
  for select using ( structure_id in (select mes_structures()) );

create policy "creer commande pour ma structure" on commandes
  for insert with check ( structure_id in (select mes_structures()) );

create policy "modifier commande de ma structure" on commandes
  for update using ( structure_id in (select mes_structures()) );

-- lignes : accessibles si la commande parente appartient à ma structure
create policy "voir lignes de mes commandes" on commande_lignes
  for select using (
    commande_id in (select id from commandes where structure_id in (select mes_structures()))
  );

create policy "creer lignes pour mes commandes" on commande_lignes
  for insert with check (
    commande_id in (select id from commandes where structure_id in (select mes_structures()))
  );

-- ---------- DONNÉES DE DÉMO ----------
-- (à exécuter une fois ; remplace les emails par les tiens après inscription)

insert into magasins (id, nom, ville, distance, delai, nb_articles, favori, photo, couleur) values
  ('11111111-1111-1111-1111-111111111111','Aveho Figeac','Figeac · Lot (46)','à 12 km','24-48h',1240,true,'figeac.jpg','#5a8f8f'),
  ('22222222-2222-2222-2222-222222222222','Aveho Brive','Brive · Corrèze (19)','à 58 km','48h',980,false,'brive.jpg','#7a6fb0'),
  ('33333333-3333-3333-3333-333333333333','Aveho Cahors','Cahors · Lot (46)','à 65 km','48-72h',1110,false,'cahors.jpg','#c0407a'),
  ('44444444-4444-4444-4444-444444444444','Aveho Toulouse Sud','Toulouse · Haute-Garonne (31)','à 120 km','72h',1530,false,'toulouse.jpg','#5aa05a')
on conflict do nothing;

insert into structures (id, nom, type, ville) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Hôpital Cédric','Hôpital','Figeac'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','EHPAD Bellevue','EHPAD','Saint-Céré')
on conflict do nothing;

insert into promotions (magasin_id, type, titre, sous_titre, prix_avant, prix_apres, unite, remise_pct, fin_le, emoji) values
  ('11111111-1111-1111-1111-111111111111','FLASH','CPAP ResMed AirSense 11','Modèle 2026, livraison 24h',95,68,'/mois',28, current_date + 38,'😷'),
  ('11111111-1111-1111-1111-111111111111','DESTOCKAGE','Lit Hill-Rom Centra 3 fonctions','Fin de série Hill-Rom Centra · stock 28 u.',115,85,'/mois',26, current_date + 53,'🛏️'),
  ('22222222-2222-2222-2222-222222222222','NOUVEAU','CPAP Philips DreamStation 2','Modèle 2026 — autodiagnostic intégré',92,72,'/mois',22, current_date + 130,'😴'),
  ('33333333-3333-3333-3333-333333333333','PROMO','Mölnlycke Infinity TPN','Promo cicatrisation été 2026',180,128,'/mois',29, current_date + 69,'💉'),
  ('11111111-1111-1111-1111-111111111111','BONUS','Pompe ambulatoire CADD-Solis VIP','+ 10 sets perfusion offerts',280,215,'/mois',23, current_date + 70,'💉'),
  ('44444444-4444-4444-4444-444444444444','ECO','Concentrateur Inogen At Home 1400','Achat ferme — silencieux 40 dB',1540,1197,'',22, current_date + 84,'🫁')
on conflict do nothing;

-- IMPORTANT : après ta 1re inscription (email), récupère ton user_id dans
-- Authentication > Users, puis rattache-toi à une structure :
--
--   insert into membres_structure (user_id, structure_id, role)
--   values ('TON-USER-ID', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin');

-- ============================================================
-- Section : 02_referentiel.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Bloc Patients / Articles / Matériels  (+ interventions)
--  À exécuter dans Supabase > SQL Editor APRÈS schema.sql
--  CRUD complet, cloisonné par structure via RLS.
-- ============================================================

-- ---------- PATIENTS FINAUX ----------
create table if not exists patients (
  id            uuid primary key default gen_random_uuid(),
  structure_id  uuid references structures(id) on delete cascade,
  nom           text not null,
  prenom        text,
  chambre       text,
  batiment      text,
  date_entree   date,
  created_at    timestamptz default now()
);

-- ---------- ARTICLES (référence catalogue) ----------
create table if not exists articles (
  id            uuid primary key default gen_random_uuid(),
  structure_id  uuid references structures(id) on delete cascade,
  reference     text,                 -- code article / LPP
  libelle       text not null,
  famille       text,                 -- 'Lit médicalisé', 'Fauteuil'…
  created_at    timestamptz default now()
);

-- ---------- MATÉRIELS (exemplaire physique) ----------
create table if not exists materiels (
  id            uuid primary key default gen_random_uuid(),
  structure_id  uuid references structures(id) on delete cascade,
  article_id    uuid references articles(id) on delete set null,
  patient_id    uuid references patients(id) on delete set null,
  libelle       text not null,        -- repris/compatible avec l'article
  num_serie     text,
  num_parc      text,
  num_lot       text,
  etat          text default 'Disponible',  -- 'En location','Maintenance','Disponible'…
  created_at    timestamptz default now()
);

-- ---------- lien interventions -> matériel / patient (si déjà créée ailleurs) ----------
create table if not exists interventions (
  id            uuid primary key default gen_random_uuid(),
  structure_id  uuid references structures(id) on delete cascade,
  numero        text,
  type          text,                 -- 'Panne / réparation'…
  urgence       text default 'Normal',
  materiel_id   uuid references materiels(id) on delete set null,
  patient_id    uuid references patients(id) on delete set null,
  description   text,
  statut        text default 'Nouvelle',
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now()
);

-- ---------- RLS ----------
alter table patients      enable row level security;
alter table articles      enable row level security;
alter table materiels     enable row level security;
alter table interventions enable row level security;

-- Patrons identiques : on ne voit/écrit que dans ses structures.
-- (mes_structures() est défini dans schema.sql)

-- PATIENTS
create policy "patients select" on patients for select using ( structure_id in (select mes_structures()) );
create policy "patients insert" on patients for insert with check ( structure_id in (select mes_structures()) );
create policy "patients update" on patients for update using ( structure_id in (select mes_structures()) );
create policy "patients delete" on patients for delete using ( structure_id in (select mes_structures()) );

-- ARTICLES
create policy "articles select" on articles for select using ( structure_id in (select mes_structures()) );
create policy "articles insert" on articles for insert with check ( structure_id in (select mes_structures()) );
create policy "articles update" on articles for update using ( structure_id in (select mes_structures()) );
create policy "articles delete" on articles for delete using ( structure_id in (select mes_structures()) );

-- MATÉRIELS
create policy "materiels select" on materiels for select using ( structure_id in (select mes_structures()) );
create policy "materiels insert" on materiels for insert with check ( structure_id in (select mes_structures()) );
create policy "materiels update" on materiels for update using ( structure_id in (select mes_structures()) );
create policy "materiels delete" on materiels for delete using ( structure_id in (select mes_structures()) );

-- INTERVENTIONS
create policy "interventions select" on interventions for select using ( structure_id in (select mes_structures()) );
create policy "interventions insert" on interventions for insert with check ( structure_id in (select mes_structures()) );
create policy "interventions update" on interventions for update using ( structure_id in (select mes_structures()) );
create policy "interventions delete" on interventions for delete using ( structure_id in (select mes_structures()) );

-- ---------- DONNÉES DE DÉMO (structure Hôpital Cédric) ----------
insert into patients (structure_id, nom, prenom, chambre, batiment, date_entree) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','MARTIN','Jeanne','104','A','2024-03-12'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','DURAND','Robert','210','B','2023-09-05'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','PETIT','Simone','118','A','2025-01-21')
on conflict do nothing;

insert into articles (structure_id, reference, libelle, famille) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','LIT-1402','Lit médicalisé Euro 1402','Lit médicalisé'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','FAU-A3','Fauteuil Action 3','Fauteuil roulant'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','DEA-COOL','Déambulateur Cool','Aide à la marche')
on conflict do nothing;

-- NB : les matériels de démo se créent plus simplement via l'UI (besoin des id article/patient).

-- ============================================================
-- Section : 03_stock.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Bloc Gestion de stock
--  Dépôts (déporté magasin + général EHPAD), zones, stock, transferts
--  À exécuter APRÈS schema.sql et 02_referentiel.sql
-- ============================================================

-- ---------- DÉPÔTS ----------
-- type 'deporte'  : stock du magasin avancé sur site (magasin_id renseigné)
-- type 'general'  : dépôt propriété EHPAD (magasin_id null)
create table if not exists depots (
  id            uuid primary key default gen_random_uuid(),
  structure_id  uuid references structures(id) on delete cascade,
  magasin_id    uuid references magasins(id) on delete set null,  -- null = dépôt général EHPAD
  type          text not null default 'general',                  -- 'deporte' | 'general'
  nom           text not null,
  created_at    timestamptz default now()
);

-- ---------- ZONES DE STOCKAGE (dans un dépôt, surtout le général) ----------
create table if not exists zones (
  id            uuid primary key default gen_random_uuid(),
  structure_id  uuid references structures(id) on delete cascade,
  depot_id      uuid references depots(id) on delete cascade,
  nom           text not null,                 -- 'Réserve A', 'Local perfusion'…
  created_at    timestamptz default now()
);

-- ---------- STOCK ARTICLE (quantités) ----------
-- emplacement = un dépôt et, optionnellement, une zone
create table if not exists stock_articles (
  id            uuid primary key default gen_random_uuid(),
  structure_id  uuid references structures(id) on delete cascade,
  article_id    uuid references articles(id) on delete cascade,
  depot_id      uuid references depots(id) on delete cascade,
  zone_id       uuid references zones(id) on delete set null,
  quantite      int not null default 0,
  seuil_alerte  int default 0,
  created_at    timestamptz default now()
);

-- Le matériel unitaire (table materiels du bloc référentiel) reçoit son emplacement :
alter table materiels add column if not exists depot_id uuid references depots(id) on delete set null;
alter table materiels add column if not exists zone_id  uuid references zones(id)  on delete set null;
-- (la chambre d'un matériel est portée par patient_id -> chambre du patient)

-- ---------- TRANSFERTS ----------
-- Source / destination polymorphes : type + id.
--   emplacement_type : 'magasin' | 'depot' | 'zone' | 'chambre'
--   contenu          : 'article' (avec quantite) | 'materiel' (unitaire)
create table if not exists transferts (
  id              uuid primary key default gen_random_uuid(),
  structure_id    uuid references structures(id) on delete cascade,
  numero          text,
  motif           text default 'Réapprovisionnement',  -- 'Réapprovisionnement','Retour','Prêt'…
  statut          text default 'Demandé',               -- 'Demandé','Validé','Reçu'
  src_type        text not null,                         -- magasin|depot|zone|chambre
  src_id          uuid,                                  -- id de l'emplacement source (chambre: patient_id)
  src_label       text,                                  -- libellé figé pour affichage
  dst_type        text not null,
  dst_id          uuid,
  dst_label       text,
  contenu         text not null default 'article',       -- 'article' | 'materiel'
  article_id      uuid references articles(id) on delete set null,
  materiel_id     uuid references materiels(id) on delete set null,
  libelle         text,                                  -- libellé de ce qui est transféré
  quantite        int default 1,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now()
);

-- ---------- RLS ----------
alter table depots         enable row level security;
alter table zones          enable row level security;
alter table stock_articles enable row level security;
alter table transferts     enable row level security;

create policy "depots all" on depots for all
  using ( structure_id in (select mes_structures()) )
  with check ( structure_id in (select mes_structures()) );

create policy "zones all" on zones for all
  using ( structure_id in (select mes_structures()) )
  with check ( structure_id in (select mes_structures()) );

create policy "stock_articles all" on stock_articles for all
  using ( structure_id in (select mes_structures()) )
  with check ( structure_id in (select mes_structures()) );

create policy "transferts all" on transferts for all
  using ( structure_id in (select mes_structures()) )
  with check ( structure_id in (select mes_structures()) );

-- ---------- DONNÉES DE DÉMO (Hôpital Cédric) ----------
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  mag uuid := '11111111-1111-1111-1111-111111111111';  -- Aveho Figeac
  dep_general uuid; dep_deporte uuid; z1 uuid; z2 uuid;
  art_lit uuid; art_fau uuid;
begin
  -- dépôts
  insert into depots (structure_id, magasin_id, type, nom)
    values (sid, null, 'general', 'Dépôt général EHPAD') returning id into dep_general;
  insert into depots (structure_id, magasin_id, type, nom)
    values (sid, mag, 'deporte', 'Dépôt déporté Aveho Figeac') returning id into dep_deporte;

  -- zones du dépôt général
  insert into zones (structure_id, depot_id, nom) values (sid, dep_general, 'Réserve A') returning id into z1;
  insert into zones (structure_id, depot_id, nom) values (sid, dep_general, 'Local perfusion') returning id into z2;

  -- stock article (quantités) : on prend 2 articles existants
  select id into art_lit from articles where structure_id = sid and reference = 'LIT-1402' limit 1;
  select id into art_fau from articles where structure_id = sid and reference = 'FAU-A3' limit 1;
  if art_lit is not null then
    insert into stock_articles (structure_id, article_id, depot_id, zone_id, quantite, seuil_alerte)
      values (sid, art_lit, dep_general, z1, 4, 2);
  end if;
  if art_fau is not null then
    insert into stock_articles (structure_id, article_id, depot_id, zone_id, quantite, seuil_alerte)
      values (sid, art_fau, dep_deporte, null, 6, 3);
  end if;
end $$;

-- ============================================================
-- Section : 04_interventions.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Bloc Demandes d'intervention (mise à jour)
--  Relie les DI aux matériels/patients/emplacements et au transfert généré.
--  À exécuter APRÈS 02_referentiel.sql et 03_stock.sql
-- ============================================================

-- emplacement où se trouve le matériel concerné par la DI
alter table interventions add column if not exists depot_id    uuid references depots(id) on delete set null;
alter table interventions add column if not exists zone_id     uuid references zones(id)  on delete set null;
-- transfert éventuellement généré depuis la DI (ex: reprise -> dépôt)
alter table interventions add column if not exists transfert_id uuid references transferts(id) on delete set null;

-- (type, urgence, materiel_id, patient_id, description, statut existent déjà)

-- données de démo : 2 DI rattachées à du matériel réel de Hôpital Cédric
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  mat uuid; pat uuid;
begin
  select id into mat from materiels where structure_id = sid limit 1;
  select id into pat from patients  where structure_id = sid limit 1;
  if mat is not null then
    insert into interventions (structure_id, numero, type, urgence, materiel_id, patient_id, description, statut)
    values
      (sid, 'DI-4012', 'Panne / réparation', 'Urgent', mat, pat, 'Roue avant bloquée, frein HS', 'Planifiée'),
      (sid, 'DI-3998', 'Maintenance préventive', 'Normal', mat, pat, 'Contrôle annuel', 'Nouvelle');
  end if;
end $$;

-- ============================================================
-- Section : 05_etablissement.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Bloc Mon établissement
--  Bâtiment > Étage > Service > Chambre > Lit, lits reliés aux patients
--  À exécuter APRÈS 02_referentiel.sql
-- ============================================================

create table if not exists batiments (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  nom text not null, created_at timestamptz default now()
);
create table if not exists etages (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  batiment_id uuid references batiments(id) on delete cascade,
  nom text not null, created_at timestamptz default now()
);
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  etage_id uuid references etages(id) on delete cascade,
  nom text not null, created_at timestamptz default now()
);
create table if not exists chambres (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  nom text not null, created_at timestamptz default now()
);
create table if not exists lits (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  chambre_id uuid references chambres(id) on delete cascade,
  nom text not null,
  patient_id uuid references patients(id) on delete set null,
  created_at timestamptz default now()
);

alter table batiments enable row level security;
alter table etages    enable row level security;
alter table services  enable row level security;
alter table chambres  enable row level security;
alter table lits      enable row level security;

create policy "batiments all" on batiments for all using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "etages all"    on etages    for all using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "services all"  on services  for all using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "chambres all"  on chambres  for all using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "lits all"      on lits      for all using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));

-- ---------- DÉMO (Hôpital Cédric) ----------
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  b1 uuid; e1 uuid; e2 uuid; s1 uuid; s2 uuid; s3 uuid; c uuid;
  p1 uuid; p2 uuid; p3 uuid;
begin
  select id into p1 from patients where structure_id=sid and nom='MARTIN' limit 1;
  select id into p2 from patients where structure_id=sid and nom='DURAND' limit 1;
  select id into p3 from patients where structure_id=sid and nom='PETIT'  limit 1;

  insert into batiments (structure_id,nom) values (sid,'Bâtiment Principal') returning id into b1;
  insert into etages (structure_id,batiment_id,nom) values (sid,b1,'Rez-de-chaussée') returning id into e1;
  insert into etages (structure_id,batiment_id,nom) values (sid,b1,'1er étage') returning id into e2;

  insert into services (structure_id,etage_id,nom) values (sid,e1,'Médecine générale') returning id into s1;
  insert into services (structure_id,etage_id,nom) values (sid,e1,'Soins de suite') returning id into s2;
  insert into services (structure_id,etage_id,nom) values (sid,e2,'Gériatrie') returning id into s3;

  insert into chambres (structure_id,service_id,nom) values (sid,s1,'104') returning id into c;
  insert into lits (structure_id,chambre_id,nom,patient_id) values (sid,c,'1',p1),(sid,c,'2',null);
  insert into chambres (structure_id,service_id,nom) values (sid,s1,'105') returning id into c;
  insert into lits (structure_id,chambre_id,nom,patient_id) values (sid,c,'1',null),(sid,c,'2',null);
  insert into chambres (structure_id,service_id,nom) values (sid,s2,'118') returning id into c;
  insert into lits (structure_id,chambre_id,nom,patient_id) values (sid,c,'1',p3);
  insert into chambres (structure_id,service_id,nom) values (sid,s3,'210') returning id into c;
  insert into lits (structure_id,chambre_id,nom,patient_id) values (sid,c,'1',p2),(sid,c,'2',null);
  insert into chambres (structure_id,service_id,nom) values (sid,s3,'211') returning id into c;
  insert into lits (structure_id,chambre_id,nom,patient_id) values (sid,c,'1',null);
end $$;

-- ============================================================
-- Section : 06_utilisateurs.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Bloc Utilisateurs, rôles & droits
--  Rôles personnalisables · rattachement établissement + services
--  · restriction de visibilité · à exécuter APRÈS 05_etablissement.sql
-- ============================================================

-- ---------- RÔLES (personnalisables, par structure) ----------
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  nom text not null,                 -- 'Admin', 'Cadre de santé', 'Soignant'…
  description text,
  -- droits par module : objet json { "module": ["read","write"] }
  droits jsonb not null default '{}'::jsonb,
  systeme boolean default false,     -- rôle de base non supprimable
  created_at timestamptz default now()
);

-- Alpha 0.15 : alias permissions_json = droits pour compat avec le code app
alter table roles add column if not exists permissions_json jsonb;
update roles set permissions_json = droits where permissions_json is null;

-- ---------- PROFIL UTILISATEUR (étend membres_structure) ----------
-- On enrichit le rattachement existant : rôle + nom affiché.
alter table membres_structure add column if not exists role_id uuid references roles(id) on delete set null;
alter table membres_structure add column if not exists nom_affiche text;
alter table membres_structure add column if not exists actif boolean default true;
alter table membres_structure add column if not exists restreint_services boolean default false; -- true = ne voit que ses services

-- ---------- RATTACHEMENT UTILISATEUR <-> SERVICE ----------
create table if not exists membres_services (
  user_id uuid references auth.users(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  structure_id uuid references structures(id) on delete cascade,
  primary key (user_id, service_id)
);

-- ---------- INVITATIONS (rattacher un futur utilisateur par email) ----------
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  email text not null,
  role_id uuid references roles(id) on delete set null,
  nom_affiche text,
  statut text default 'En attente',   -- 'En attente','Acceptée'
  created_at timestamptz default now()
);

-- ---------- RLS ----------
alter table roles            enable row level security;
alter table membres_services enable row level security;
alter table invitations      enable row level security;

create policy "roles all" on roles for all
  using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "membres_services all" on membres_services for all
  using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "invitations all" on invitations for all
  using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));

-- membres_structure : autoriser la gestion par les membres de la même structure (pas seulement soi)
drop policy if exists "voir mes rattachements" on membres_structure;
create policy "membres_structure select" on membres_structure for select
  using (structure_id in (select mes_structures()) or user_id = auth.uid());
create policy "membres_structure write" on membres_structure for all
  using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));

-- ---------- DÉMO : rôles de base + profil de l'utilisateur courant ----------
do $$
declare sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
begin
  insert into roles (structure_id, nom, description, droits, systeme) values
    (sid,'Administrateur','Accès complet',
      '{"patients":["read","write"],"materiels":["read","write"],"articles":["read","write"],"stock":["read","write"],"transferts":["read","write"],"interventions":["read","write"],"commandes":["read","write"],"etablissement":["read","write"],"utilisateurs":["read","write"]}'::jsonb, true),
    (sid,'Cadre de santé','Gestion services & soins',
      '{"patients":["read","write"],"materiels":["read","write"],"interventions":["read","write"],"etablissement":["read","write"],"stock":["read"]}'::jsonb, true),
    (sid,'Soignant','Saisie au lit du patient',
      '{"patients":["read"],"materiels":["read"],"interventions":["read","write"],"etablissement":["read"]}'::jsonb, true),
    (sid,'Lecture seule','Consultation uniquement',
      '{"patients":["read"],"materiels":["read"],"interventions":["read"],"etablissement":["read"],"stock":["read"],"commandes":["read"]}'::jsonb, true)
  on conflict do nothing;
end $$;

-- ============================================================
-- Section : 07_collectivite.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Bloc Collectivité & Établissements
--  La 'structure' = Collectivité propriétaire.
--  Nouvelle table 'etablissements' dessous. Tout le contenu
--  reçoit un etablissement_id. À exécuter APRÈS 06_utilisateurs.sql
-- ============================================================

-- ---------- FICHE COLLECTIVITÉ (infos sociales) ----------
-- On enrichit 'structures' (= la collectivité).
alter table structures add column if not exists raison_sociale text;
alter table structures add column if not exists siret text;
alter table structures add column if not exists finess_juridique text;
alter table structures add column if not exists adresse text;
alter table structures add column if not exists code_postal text;
alter table structures add column if not exists telephone text;
alter table structures add column if not exists email text;
alter table structures add column if not exists forme_juridique text;  -- 'Association','Public','SAS'…

-- ---------- ÉTABLISSEMENTS (sous la collectivité) ----------
create table if not exists etablissements (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,   -- collectivité
  nom text not null,
  type text,                          -- 'EHPAD','Hôpital','Foyer'…
  finess text,                        -- FINESS géographique
  siret text,
  adresse text,
  code_postal text,
  ville text,
  telephone text,
  email text,
  capacite int,                       -- nombre de lits autorisés
  actif boolean default true,
  created_at timestamptz default now()
);

alter table etablissements enable row level security;
create policy "etablissements all" on etablissements for all
  using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));

-- ---------- AJOUT etablissement_id PARTOUT ----------
-- Le contenu appartient à un établissement (RLS reste sur structure_id = collectivité).
alter table patients      add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;
alter table articles      add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;
alter table materiels     add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;
alter table interventions add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;
alter table depots        add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;
alter table zones         add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;
alter table stock_articles add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;
alter table transferts    add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;
alter table commandes     add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;
alter table batiments     add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;
-- (etages/services/chambres/lits héritent via batiment -> etablissement)

-- ---------- RATTACHEMENT UTILISATEUR <-> ÉTABLISSEMENT ----------
create table if not exists membres_etablissements (
  user_id uuid references auth.users(id) on delete cascade,
  etablissement_id uuid references etablissements(id) on delete cascade,
  structure_id uuid references structures(id) on delete cascade,
  primary key (user_id, etablissement_id)
);
alter table membres_etablissements enable row level security;
create policy "membres_etab all" on membres_etablissements for all
  using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));

-- ---------- DÉMO : créer 2 établissements + rattacher le contenu existant ----------
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  etab1 uuid; etab2 uuid;
begin
  -- compléter la fiche collectivité
  update structures set raison_sociale='Groupe Hospitalier Cédric', siret='12345678900012',
    finess_juridique='460000001', forme_juridique='Public', ville='Figeac', code_postal='46100'
    where id = sid;

  insert into etablissements (structure_id,nom,type,finess,ville,code_postal,capacite,actif)
    values (sid,'Hôpital Cédric','Hôpital','460010189','Figeac','46100',62,true) returning id into etab1;
  insert into etablissements (structure_id,nom,type,finess,ville,code_postal,capacite,actif)
    values (sid,'EHPAD Les Tilleuls','EHPAD','460010234','Capdenac','12700',45,true) returning id into etab2;

  -- rattacher tout le contenu existant à l'établissement 1
  update patients      set etablissement_id=etab1 where structure_id=sid and etablissement_id is null;
  update articles      set etablissement_id=etab1 where structure_id=sid and etablissement_id is null;
  update materiels     set etablissement_id=etab1 where structure_id=sid and etablissement_id is null;
  update interventions set etablissement_id=etab1 where structure_id=sid and etablissement_id is null;
  update depots        set etablissement_id=etab1 where structure_id=sid and etablissement_id is null;
  update zones         set etablissement_id=etab1 where structure_id=sid and etablissement_id is null;
  update stock_articles set etablissement_id=etab1 where structure_id=sid and etablissement_id is null;
  update transferts    set etablissement_id=etab1 where structure_id=sid and etablissement_id is null;
  update commandes     set etablissement_id=etab1 where structure_id=sid and etablissement_id is null;
  update batiments     set etablissement_id=etab1 where structure_id=sid and etablissement_id is null;

  -- rattacher tous les membres aux 2 établissements
  insert into membres_etablissements (user_id, etablissement_id, structure_id)
    select user_id, etab1, sid from membres_structure where structure_id=sid
    on conflict do nothing;
  insert into membres_etablissements (user_id, etablissement_id, structure_id)
    select user_id, etab2, sid from membres_structure where structure_id=sid
    on conflict do nothing;
end $$;

-- ============================================================
-- Section : 08_notifications.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Bloc Notifications (Alpha 0.3)
--  Table notifications + RLS par collectivité.
--  À exécuter APRÈS 07_collectivite.sql
-- ============================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,  -- destinataire (null = tous les membres)
  type text not null,                                         -- 'transfert','di','invitation','commande','systeme'
  titre text not null,
  message text,
  lien text,                                                  -- chemin relatif (ex: '/transferts')
  lue boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notif_user on notifications (user_id, lue, created_at desc);
create index if not exists idx_notif_struct on notifications (structure_id, created_at desc);

alter table notifications enable row level security;

-- Politique : je vois mes notifs personnelles + celles destinées "à tous" dans ma collectivité
create policy "notif_select" on notifications for select
  using (
    structure_id in (select mes_structures())
    and (user_id is null or user_id = auth.uid())
  );

-- Création : un admin ou un service peut créer une notif pour quelqu'un dans sa collectivité
create policy "notif_insert" on notifications for insert
  with check (structure_id in (select mes_structures()));

-- Mise à jour : on ne peut marquer comme lue QUE ses propres notifs
create policy "notif_update" on notifications for update
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

-- Suppression : optionnelle, on autorise pour ses propres notifs
create policy "notif_delete" on notifications for delete
  using (user_id = auth.uid());

-- Quelques notifs de démo pour voir la cloche s'animer
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
begin
  insert into notifications (structure_id, type, titre, message, lien)
  values
    (sid, 'systeme', 'Bienvenue dans Aveho EC', 'Votre Espace Collectivité est prêt. Explorez les modules depuis le menu.', null),
    (sid, 'transfert', 'Nouveau transfert à valider', 'Un transfert de réapprovisionnement est en attente.', '/transferts'),
    (sid, 'di', 'DI urgente sur matériel', 'Une demande d''intervention urgente vient d''être créée.', '/interventions')
  on conflict do nothing;
end $$;

-- ============================================================
-- Section : 09_parametres.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Bloc Paramètres collectivité (Alpha 0.3)
--  Stocke les préférences d'affichage et libellés personnalisés
--  par collectivité, en JSON.
--  À exécuter APRÈS 08_notifications.sql
-- ============================================================

alter table structures add column if not exists parametres jsonb default '{}'::jsonb;

-- exemples de paramètres stockés dans `parametres` :
--   libelle_patient        -> "Résident" (pour les EHPAD) au lieu de "Patient"
--   libelle_chambre        -> "Logement" au lieu de "Chambre"
--   devise                 -> "EUR" / "CHF"
--   format_date            -> "fr-FR" / "en-US"
--   theme                  -> "navy" / "clair"
--   afficher_promotions    -> true/false
--   notif_email            -> true/false

-- ============================================================
-- Section : 10_audit.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Bloc Audit log (Alpha 0.4)
--  Table d'historique des actions : qui a fait quoi, quand.
--  À exécuter APRÈS 09_parametres.sql
-- ============================================================

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  etablissement_id uuid references etablissements(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,                  -- snapshot de l'email au cas où l'user est supprimé
  action text not null,             -- 'creer','modifier','supprimer','valider','recevoir','inviter','connexion'
  entite text not null,             -- 'patient','materiel','transfert','di','commande',...
  entite_id uuid,                   -- ID de l'objet concerné (peut être null)
  details jsonb,                    -- payload libre : champs changés, ancien/nouveau, etc.
  created_at timestamptz default now()
);
create index if not exists idx_audit_struct on audit_log (structure_id, created_at desc);
create index if not exists idx_audit_user on audit_log (user_id, created_at desc);
create index if not exists idx_audit_entite on audit_log (entite, entite_id);

alter table audit_log enable row level security;

-- Lecture : tout membre de la collectivité peut consulter l'historique
create policy "audit_select" on audit_log for select
  using (structure_id in (select mes_structures()));

-- Insertion : tout membre peut insérer dans sa propre collectivité (l'app pose user_id = auth.uid())
create policy "audit_insert" on audit_log for insert
  with check (structure_id in (select mes_structures()));

-- Pas de suppression ni mise à jour : l'audit log est immutable.

-- ============================================================
-- Section : 11_rls_etanche.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — RLS étanche par établissement (Alpha 0.5)
--  Ajoute une COUCHE supplémentaire de RLS au niveau établissement,
--  en plus de la RLS collectivité existante. Les deux s'appliquent
--  conjointement (AND).
--
--  PRINCIPE :
--    - Si l'utilisateur a au moins un rattachement membres_etablissements,
--      il ne voit QUE les données des établissements auxquels il est rattaché.
--    - Si l'utilisateur n'a AUCUN rattachement etab (= admin collectivité),
--      il voit tout dans sa collectivité (fallback).
--
--  À exécuter APRÈS 10_audit.sql.
-- ============================================================

-- ---------- FONCTION : établissements accessibles par l'utilisateur ----------
-- Retourne les UUIDs des établissements auxquels l'utilisateur est rattaché.
-- Si l'utilisateur n'a aucun rattachement, retourne TOUS les établissements
-- de sa collectivité (= comportement "admin collectivité").
create or replace function mes_etablissements()
returns table(etab_id uuid)
language sql security definer set search_path = public
as $$
  with rattachements as (
    select etablissement_id from membres_etablissements where user_id = auth.uid()
  )
  select etablissement_id from membres_etablissements where user_id = auth.uid()
  union
  select e.id from etablissements e
  where not exists (select 1 from rattachements)
    and e.structure_id in (select mes_structures());
$$;

-- ---------- DROP des anciennes politiques (pour les remplacer proprement) ----------
-- Pour chaque table avec etablissement_id, on remplace la politique "*_all"
-- par deux politiques distinctes : select (étanche etab) + write (étanche etab).
do $$
declare
  tables_etab text[] := array['patients','articles','materiels','interventions','depots','zones','stock_articles','transferts','commandes','batiments'];
  t text;
begin
  foreach t in array tables_etab loop
    execute format('drop policy if exists "%s all" on %I', t, t);
    execute format('drop policy if exists "%s_select_etab" on %I', t, t);
    execute format('drop policy if exists "%s_write_etab" on %I', t, t);
  end loop;
end $$;

-- ---------- POLITIQUES ÉTANCHES par établissement ----------
-- patients
create policy "patients_select_etab" on patients for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "patients_write_etab" on patients for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- articles
create policy "articles_select_etab" on articles for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "articles_write_etab" on articles for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- materiels
create policy "materiels_select_etab" on materiels for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "materiels_write_etab" on materiels for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- interventions
create policy "interventions_select_etab" on interventions for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "interventions_write_etab" on interventions for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- depots, zones, stock_articles
create policy "depots_select_etab" on depots for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "depots_write_etab" on depots for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

create policy "zones_select_etab" on zones for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "zones_write_etab" on zones for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

create policy "stock_articles_select_etab" on stock_articles for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "stock_articles_write_etab" on stock_articles for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- transferts, commandes
create policy "transferts_select_etab" on transferts for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "transferts_write_etab" on transferts for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

create policy "commandes_select_etab" on commandes for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "commandes_write_etab" on commandes for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- batiments (et donc indirectement etages, services, chambres, lits via cascade RLS héritée)
create policy "batiments_select_etab" on batiments for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "batiments_write_etab" on batiments for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- ---------- ÉTAGES / SERVICES / CHAMBRES / LITS ----------
-- Ces tables n'ont pas de structure_id ni etablissement_id, mais elles sont
-- liées à un bâtiment (cascade). On ajoute une RLS via EXISTS sur la chaîne.
drop policy if exists "etages_rls" on etages;
create policy "etages_rls" on etages for all
  using (exists (select 1 from batiments b where b.id = etages.batiment_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))))
  with check (exists (select 1 from batiments b where b.id = etages.batiment_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))));

drop policy if exists "services_rls" on services;
create policy "services_rls" on services for all
  using (exists (select 1 from etages e join batiments b on b.id = e.batiment_id
    where e.id = services.etage_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))))
  with check (exists (select 1 from etages e join batiments b on b.id = e.batiment_id
    where e.id = services.etage_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))));

drop policy if exists "chambres_rls" on chambres;
create policy "chambres_rls" on chambres for all
  using (exists (select 1 from services s join etages e on e.id = s.etage_id join batiments b on b.id = e.batiment_id
    where s.id = chambres.service_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))))
  with check (exists (select 1 from services s join etages e on e.id = s.etage_id join batiments b on b.id = e.batiment_id
    where s.id = chambres.service_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))));

drop policy if exists "lits_rls" on lits;
create policy "lits_rls" on lits for all
  using (exists (select 1 from chambres c join services s on s.id = c.service_id join etages e on e.id = s.etage_id join batiments b on b.id = e.batiment_id
    where c.id = lits.chambre_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))))
  with check (exists (select 1 from chambres c join services s on s.id = c.service_id join etages e on e.id = s.etage_id join batiments b on b.id = e.batiment_id
    where c.id = lits.chambre_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))));

-- ---------- TEST DE COHÉRENCE ----------
-- Pour vérifier que tout est en place après exécution :
-- select tablename, policyname from pg_policies where schemaname='public' and policyname like '%etab%' order by tablename;

-- ============================================================
-- Section : 12_di_assignation.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Assignation explicite des DI (Alpha 0.6)
--  Ajoute un utilisateur assigné optionnel sur les interventions.
--  Couplé avec la notification ciblée (logEvent.notifUserId).
--  À exécuter APRÈS 11_rls_etanche.sql
-- ============================================================

alter table interventions
  add column if not exists assignee_id uuid references auth.users(id) on delete set null,
  add column if not exists assignee_email text;   -- snapshot pour affichage rapide

create index if not exists idx_interv_assignee on interventions (assignee_id);

-- ============================================================
-- Section : 13_etiquettes.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Étiquettes patients (Alpha 0.9)
--  Permet d'étiqueter les patients avec des marqueurs colorés
--  personnalisables par collectivité (chronique, allergie, etc.).
--  À exécuter APRÈS 12_di_assignation.sql
-- ============================================================

-- Table des étiquettes possibles, définies par collectivité
create table if not exists etiquettes (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade not null,
  libelle text not null,                  -- ex: "Chronique", "Sortie prévue"
  couleur text not null default '#7CC8C8', -- code hex
  description text,
  created_at timestamptz default now()
);
create index if not exists idx_etiquettes_struct on etiquettes (structure_id);
alter table etiquettes enable row level security;
create policy "etiquettes_select" on etiquettes for select
  using (structure_id in (select mes_structures()));
create policy "etiquettes_write" on etiquettes for all
  using (structure_id in (select mes_structures()))
  with check (structure_id in (select mes_structures()));

-- Table de liaison patient ↔ étiquettes (n:n)
create table if not exists patient_etiquettes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade not null,
  etiquette_id uuid references etiquettes(id) on delete cascade not null,
  structure_id uuid references structures(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (patient_id, etiquette_id)
);
create index if not exists idx_pat_etq_pat on patient_etiquettes (patient_id);
create index if not exists idx_pat_etq_etq on patient_etiquettes (etiquette_id);
alter table patient_etiquettes enable row level security;
create policy "pat_etq_select" on patient_etiquettes for select
  using (structure_id in (select mes_structures()));
create policy "pat_etq_write" on patient_etiquettes for all
  using (structure_id in (select mes_structures()))
  with check (structure_id in (select mes_structures()));

-- Quelques étiquettes démo (insérées seulement si la collectivité existe)
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
begin
  if exists (select 1 from structures where id = sid) then
    insert into etiquettes (structure_id, libelle, couleur, description) values
      (sid, 'Chronique', '#7a6fb0', 'Patient avec affection longue durée'),
      (sid, 'Sortie prévue', '#5aa05a', 'Sortie programmée dans les 7 jours'),
      (sid, 'Allergie connue', '#e35d5b', 'Allergie médicamenteuse documentée'),
      (sid, 'À surveiller', '#EF9F27', 'Suivi médical renforcé'),
      (sid, 'Isolement', '#C9867F', 'Isolement contact ou respiratoire')
    on conflict do nothing;
  end if;
end $$;

-- ============================================================
-- Section : 14_maintenance.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Maintenance préventive du matériel (Alpha 0.10)
--  Permet de planifier les contrôles périodiques du matériel
--  (révision annuelle, étalonnage, vérification sécurité, etc.)
--  À exécuter APRÈS 13_etiquettes.sql
-- ============================================================

create table if not exists maintenances (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade not null,
  etablissement_id uuid references etablissements(id) on delete cascade,
  materiel_id uuid references materiels(id) on delete cascade not null,
  type text not null,                       -- ex: "Révision annuelle", "Étalonnage", "Contrôle sécurité"
  date_prevue date not null,                -- date planifiée
  date_realisee date,                       -- renseignée quand effectuée
  statut text not null default 'Planifiée', -- "Planifiée" | "À faire" | "Faite" | "En retard" | "Annulée"
  intervenant text,                         -- nom du technicien/prestataire (libre)
  notes text,
  assignee_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_maint_struct on maintenances (structure_id);
create index if not exists idx_maint_mat on maintenances (materiel_id);
create index if not exists idx_maint_date on maintenances (date_prevue);
create index if not exists idx_maint_statut on maintenances (statut);

-- RLS
alter table maintenances enable row level security;
create policy "maint_select" on maintenances for select
  using (structure_id in (select mes_structures()));
create policy "maint_write" on maintenances for all
  using (structure_id in (select mes_structures()))
  with check (structure_id in (select mes_structures()));

-- Trigger : recalcul du statut "En retard" automatiquement à la lecture (via vue)
-- On garde simple : le calcul du statut En retard est fait côté app

-- Quelques maintenances démo
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  eid uuid;
  mid uuid;
begin
  if exists (select 1 from structures where id = sid) then
    select id into eid from etablissements where structure_id = sid limit 1;
    select id into mid from materiels where structure_id = sid limit 1;
    if mid is not null then
      insert into maintenances (structure_id, etablissement_id, materiel_id, type, date_prevue, statut, intervenant, notes) values
        (sid, eid, mid, 'Révision annuelle', current_date + interval '15 days', 'Planifiée', 'Tech Aveho', 'Vérification générale et nettoyage'),
        (sid, eid, mid, 'Contrôle sécurité', current_date - interval '5 days', 'En retard', 'Bureau Veritas', 'Test électrique annuel obligatoire'),
        (sid, eid, mid, 'Étalonnage', current_date + interval '45 days', 'Planifiée', null, null)
      on conflict do nothing;
    end if;
  end if;
end $$;

-- ============================================================
-- Section : 15_tags_materiel.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Tags matériel + récurrence maintenance (Alpha 0.11)
--  Ajoute :
--   - Table tags_materiel + relation many-to-many materiel_tags
--   - Colonnes recurrence_jours + parent_id sur maintenances
--  À exécuter APRÈS 14_maintenance.sql
-- ============================================================

-- 1) Tags matériel (similaire aux étiquettes patients)
create table if not exists tags_materiel (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade not null,
  libelle text not null,
  couleur text not null default '#7CC8C8',
  description text,
  created_at timestamptz default now()
);
create index if not exists idx_tagsmat_struct on tags_materiel (structure_id);
alter table tags_materiel enable row level security;
create policy "tagsmat_select" on tags_materiel for select
  using (structure_id in (select mes_structures()));
create policy "tagsmat_write" on tags_materiel for all
  using (structure_id in (select mes_structures()))
  with check (structure_id in (select mes_structures()));

-- 2) Relation many-to-many matériel ↔ tags
create table if not exists materiel_tags (
  id uuid primary key default gen_random_uuid(),
  materiel_id uuid references materiels(id) on delete cascade not null,
  tag_id uuid references tags_materiel(id) on delete cascade not null,
  structure_id uuid references structures(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (materiel_id, tag_id)
);
create index if not exists idx_mt_mat on materiel_tags (materiel_id);
create index if not exists idx_mt_tag on materiel_tags (tag_id);
alter table materiel_tags enable row level security;
create policy "mt_select" on materiel_tags for select
  using (structure_id in (select mes_structures()));
create policy "mt_write" on materiel_tags for all
  using (structure_id in (select mes_structures()))
  with check (structure_id in (select mes_structures()));

-- 3) Récurrence sur maintenances : nombre de jours entre 2 occurrences
--    + parent_id pour tracer la chaîne (laisser null si pas récurrent)
alter table maintenances
  add column if not exists recurrence_jours integer,
  add column if not exists parent_id uuid references maintenances(id) on delete set null,
  add column if not exists di_id uuid references interventions(id) on delete set null,
  add column if not exists notif_j7_envoyee boolean default false;

create index if not exists idx_maint_parent on maintenances (parent_id);
create index if not exists idx_maint_di on maintenances (di_id);

-- 4) Tags démo pour la collectivité de test
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
begin
  if exists (select 1 from structures where id = sid) then
    insert into tags_materiel (structure_id, libelle, couleur, description) values
      (sid, 'Critique', '#e35d5b', 'Matériel essentiel à la prise en charge'),
      (sid, 'Sous garantie', '#5aa05a', 'Couverture constructeur en cours'),
      (sid, 'À remplacer', '#EF9F27', 'Fin de vie programmée'),
      (sid, 'Hors service', '#8a98a8', 'Inutilisable temporairement'),
      (sid, 'À surveiller', '#7a6fb0', 'Comportement anormal détecté')
    on conflict do nothing;
  end if;
end $$;

-- ============================================================
-- Section : 16_signalements.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Signalements anonymes (Alpha 0.12)
--  Boîte à idées / problèmes terrain. Visibles par tous les
--  membres de la collectivité, sans identifier l'auteur (sauf
--  si la personne signe explicitement via le champ signature).
--  À exécuter APRÈS 15_tags_materiel.sql
-- ============================================================

create table if not exists signalements (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade not null,
  etablissement_id uuid references etablissements(id) on delete cascade,
  type text not null,             -- "Problème" | "Idée" | "Question" | "Autre"
  titre text not null,
  description text not null,
  signature text,                  -- optionnel : nom/poste si l'auteur veut signer
  statut text not null default 'Nouveau', -- "Nouveau" | "En cours" | "Traité" | "Archivé"
  reponse text,                    -- réponse de la direction si elle en fait une
  reponse_par text,                -- qui a répondu (visible publiquement)
  reponse_le timestamptz,
  created_at timestamptz default now()
  -- NOTE : pas de user_id sur cette table. Volontaire pour l'anonymat.
);
create index if not exists idx_signal_struct on signalements (structure_id);
create index if not exists idx_signal_statut on signalements (statut);
create index if not exists idx_signal_type on signalements (type);

alter table signalements enable row level security;

drop policy if exists "signal_insert" on signalements;
drop policy if exists "signal_select" on signalements;
drop policy if exists "signal_update" on signalements;
drop policy if exists "signal_delete" on signalements;

-- Tous les membres peuvent créer un signalement
create policy "signal_insert" on signalements for insert
  with check (structure_id in (select mes_structures()));

-- Tous les membres voient tous les signalements (transparence)
create policy "signal_select" on signalements for select
  using (structure_id in (select mes_structures()));

-- Modification ouverte aux membres (l'app applique son propre filtrage admin)
create policy "signal_update" on signalements for update
  using (structure_id in (select mes_structures()));

create policy "signal_delete" on signalements for delete
  using (structure_id in (select mes_structures()));

-- ============================================================
-- Section : 17_commandes.sql
-- ============================================================
-- ============================================================
--  AVEHO EC — Module Achats (Alpha 0.15)
--  Renommé pour ne pas entrer en conflit avec la table commandes
--  existante (workflow panier magasin de la 0.1).
--  Workflow : demande → validation manager → bon de commande
-- ============================================================

create table if not exists achats (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade not null,
  etablissement_id uuid references etablissements(id) on delete cascade,
  numero text not null,
  fournisseur text,
  motif text not null,
  budget_estime numeric(10,2),
  budget_reel numeric(10,2),
  statut text not null default 'Brouillon',
  date_souhaitee date,
  date_commande date,
  date_reception date,
  demandeur_id uuid references auth.users(id) on delete set null,
  valideur_id uuid references auth.users(id) on delete set null,
  motif_refus text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_achats_struct on achats (structure_id);
create index if not exists idx_achats_statut on achats (statut);
create index if not exists idx_achats_numero on achats (numero);

create table if not exists achats_lignes (
  id uuid primary key default gen_random_uuid(),
  achat_id uuid references achats(id) on delete cascade not null,
  structure_id uuid references structures(id) on delete cascade not null,
  designation text not null,
  article_id uuid references articles(id) on delete set null,
  quantite numeric(10,2) not null default 1,
  prix_unitaire numeric(10,2),
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_achatsl_achat on achats_lignes (achat_id);

alter table achats enable row level security;
alter table achats_lignes enable row level security;

drop policy if exists "achats_select" on achats;
drop policy if exists "achats_insert" on achats;
drop policy if exists "achats_update" on achats;
drop policy if exists "achats_delete" on achats;
drop policy if exists "achatsl_select" on achats_lignes;
drop policy if exists "achatsl_write" on achats_lignes;

create policy "achats_select" on achats for select
  using (structure_id in (select mes_structures()));
create policy "achats_insert" on achats for insert
  with check (structure_id in (select mes_structures()));
create policy "achats_update" on achats for update
  using (structure_id in (select mes_structures()));
create policy "achats_delete" on achats for delete
  using (structure_id in (select mes_structures()));

create policy "achatsl_select" on achats_lignes for select
  using (structure_id in (select mes_structures()));
create policy "achatsl_write" on achats_lignes for all
  using (structure_id in (select mes_structures()))
  with check (structure_id in (select mes_structures()));
