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
