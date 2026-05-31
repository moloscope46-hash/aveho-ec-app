-- ============================================================
--  AVEHO EC — Patch 0.55.34
--  Rappel idempotent des tables précédentes (au cas où 0.55.30
--  n'aurait pas été joué). Si tu vois encore l'erreur 404 sur
--  partenaires_rpps, c'est ce patch qui répare.
--  100% idempotent — peut être rejoué sans effet de bord.
-- ============================================================

-- ============================================================
-- 1) Table partenaires_rpps (rappel de 0.55.30)
-- ============================================================
create table if not exists partenaires_rpps (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references structures(id) on delete cascade,
  rpps text,
  adeli text,
  civilite text,
  nom text not null,
  prenom text,
  profession text,
  specialite text,
  mode_exercice text,
  adresse text,
  cp text,
  commune text,
  telephone text,
  telephone_mobile text,
  email text,
  notes text,
  tags text[] default '{}',
  est_prescripteur boolean not null default false,
  est_intervenant boolean not null default false,
  etablissement_ids uuid[] default '{}',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  archive boolean not null default false
);

create index if not exists idx_partenaires_rpps_struct on partenaires_rpps(structure_id) where archive = false;
create index if not exists idx_partenaires_rpps_rpps on partenaires_rpps(structure_id, rpps) where rpps is not null;
create unique index if not exists uniq_partenaires_rpps_per_struct
  on partenaires_rpps(structure_id, rpps)
  where rpps is not null and archive = false;

alter table partenaires_rpps enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'partenaires_rpps' and policyname = 'partenaires_rpps_member_rw') then
    create policy partenaires_rpps_member_rw on partenaires_rpps for all using (
      structure_id in (select structure_id from membres_structure where user_id = auth.uid())
    ) with check (
      structure_id in (select structure_id from membres_structure where user_id = auth.uid())
    );
  end if;
end $$;

-- Vue avec compteur nb_etablissements
drop view if exists v_partenaires_rpps;
create view v_partenaires_rpps as
select p.*, array_length(p.etablissement_ids, 1) as nb_etablissements_lies
from partenaires_rpps p;
alter view v_partenaires_rpps set (security_invoker = true);

-- ============================================================
-- 2) Table etablissements_partenaires (rappel de 0.55.31)
-- ============================================================
create table if not exists etablissements_partenaires (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references structures(id) on delete cascade,
  nom text not null,
  type text,
  type_relation text,
  finess text,
  siret text,
  siren text,
  adresse text,
  cp text,
  ville text,
  pays text default 'France',
  latitude numeric,
  longitude numeric,
  contact_nom text,
  contact_fonction text,
  telephone text,
  email text,
  site_web text,
  notes text,
  tags text[] default '{}',
  groupement_id uuid,
  link_to_etablissement_id uuid references etablissements(id) on delete set null,
  actif boolean not null default true,
  archive boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists idx_etab_part_struct on etablissements_partenaires(structure_id) where archive = false;
alter table etablissements_partenaires enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'etablissements_partenaires' and policyname = 'etab_part_member_rw') then
    create policy etab_part_member_rw on etablissements_partenaires for all using (
      structure_id in (select structure_id from membres_structure where user_id = auth.uid())
    ) with check (
      structure_id in (select structure_id from membres_structure where user_id = auth.uid())
    );
  end if;
end $$;

-- ============================================================
-- 3) Colonnes etablissements (rappel de 0.55.33)
-- ============================================================
alter table etablissements
  add column if not exists adresse text,
  add column if not exists cp text,
  add column if not exists pays text default 'France',
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists finess text,
  add column if not exists siret text,
  add column if not exists siren text,
  add column if not exists contact_nom text,
  add column if not exists contact_fonction text,
  add column if not exists telephone text,
  add column if not exists email text,
  add column if not exists site_web text,
  add column if not exists notes text,
  add column if not exists tags text[] default '{}'::text[],
  add column if not exists est_partenaire boolean default false,
  add column if not exists groupement_id uuid;

-- Fin du patch 0.55.34
