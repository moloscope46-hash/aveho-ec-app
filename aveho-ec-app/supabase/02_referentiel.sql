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
