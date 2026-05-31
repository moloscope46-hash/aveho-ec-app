-- ============================================================
--  AVEHO EC — Patch consolidé vers 0.15
--  Si tu as la 0.1 installée et fonctionnelle, exécute ce
--  script unique pour passer directement à la 0.15.
--  Idempotent : peut être rejoué sans risque.
--  À exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) ALIAS permissions_json sur la table roles (compat code app)
-- ============================================================
alter table roles add column if not exists permissions_json jsonb;
update roles set permissions_json = droits where permissions_json is null;

-- ============================================================
-- 2) Récupération de commande_lignes si supprimée par mégarde
-- ============================================================
create table if not exists commande_lignes (
  id            uuid primary key default gen_random_uuid(),
  commande_id   uuid references commandes(id) on delete cascade,
  promotion_id  uuid references promotions(id),
  libelle       text not null,
  prix_unitaire numeric not null,
  quantite      int default 1
);
alter table commande_lignes enable row level security;
drop policy if exists "Lignes commandes via commande" on commande_lignes;
create policy "Lignes commandes via commande" on commande_lignes
  for all using (
    exists (
      select 1 from commandes c
      where c.id = commande_lignes.commande_id
        and c.structure_id in (select mes_structures())
    )
  );

-- ============================================================
-- 3) Signalements (0.12)
-- ============================================================
create table if not exists signalements (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade not null,
  etablissement_id uuid references etablissements(id) on delete cascade,
  type text not null,
  titre text not null,
  description text not null,
  signature text,
  statut text not null default 'Nouveau',
  reponse text,
  reponse_par text,
  reponse_le timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_signal_struct on signalements (structure_id);
create index if not exists idx_signal_statut on signalements (statut);
create index if not exists idx_signal_type on signalements (type);
alter table signalements enable row level security;
drop policy if exists "signal_insert" on signalements;
drop policy if exists "signal_select" on signalements;
drop policy if exists "signal_update" on signalements;
drop policy if exists "signal_delete" on signalements;
create policy "signal_insert" on signalements for insert
  with check (structure_id in (select mes_structures()));
create policy "signal_select" on signalements for select
  using (structure_id in (select mes_structures()));
create policy "signal_update" on signalements for update
  using (structure_id in (select mes_structures()));
create policy "signal_delete" on signalements for delete
  using (structure_id in (select mes_structures()));

-- ============================================================
-- 4) Module Achats (0.15) — workflow commandes d'achat fournisseur
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

-- ============================================================
-- FIN DU PATCH 0.15
-- ============================================================
-- Apporte : signalements, achats + achats_lignes, alias permissions_json,
-- récupération commande_lignes si supprimée.
-- N'inclut PAS : étiquettes, maintenances, tags, etc. Ces tables
-- doivent être créées en exécutant aussi les scripts 13/14/15
-- s'ils n'ont pas déjà été appliqués. Vérifier avec :
--   select tablename from pg_tables where schemaname='public' order by tablename;
