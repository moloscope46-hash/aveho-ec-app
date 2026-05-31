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
