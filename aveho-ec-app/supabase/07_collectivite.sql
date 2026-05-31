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
