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
