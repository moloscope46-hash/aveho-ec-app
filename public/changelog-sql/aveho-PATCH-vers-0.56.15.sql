-- ============================================================
--  AVEHO EC — Patch 0.56.15 (v2 corrigée)
--  Module équipes : rattachement bâtiment + services + users.
--  Création automatique d'une équipe par défaut à la création
--  d'un bâtiment via trigger.
--
--  Correction v2 (par rapport à v1) : membres_structure n'a PAS
--  de colonne 'email' — on récupère l'email depuis auth.users
-- ============================================================

-- 1) Table équipes
create table if not exists equipes (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references structures(id) on delete cascade,
  batiment_id uuid references batiments(id) on delete cascade,
  nom text not null,
  description text,
  couleur text default '#185FA5',
  est_par_defaut boolean default false,
  archive boolean default false,
  created_at timestamptz default now(),
  created_by uuid,
  updated_at timestamptz default now()
);

create index if not exists idx_equipes_struct on equipes(structure_id) where archive = false;
create index if not exists idx_equipes_batiment on equipes(batiment_id) where archive = false;

alter table equipes enable row level security;

drop policy if exists "equipes_select" on equipes;
create policy "equipes_select" on equipes for select to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "equipes_insert" on equipes;
create policy "equipes_insert" on equipes for insert to authenticated
  with check (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "equipes_update" on equipes;
create policy "equipes_update" on equipes for update to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "equipes_delete" on equipes;
create policy "equipes_delete" on equipes for delete to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

-- 2) Table de liaison équipe ↔ users
create table if not exists equipes_membres (
  equipe_id uuid not null references equipes(id) on delete cascade,
  user_id uuid not null,
  role_dans_equipe text default 'membre' check (role_dans_equipe in ('responsable', 'membre')),
  added_at timestamptz default now(),
  added_by uuid,
  primary key (equipe_id, user_id)
);

create index if not exists idx_equipes_membres_user on equipes_membres(user_id);

alter table equipes_membres enable row level security;

drop policy if exists "equipes_membres_select" on equipes_membres;
create policy "equipes_membres_select" on equipes_membres for select to authenticated
  using (equipe_id in (
    select id from equipes
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
  ));

drop policy if exists "equipes_membres_insert" on equipes_membres;
create policy "equipes_membres_insert" on equipes_membres for insert to authenticated
  with check (equipe_id in (
    select id from equipes
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
  ));

drop policy if exists "equipes_membres_delete" on equipes_membres;
create policy "equipes_membres_delete" on equipes_membres for delete to authenticated
  using (equipe_id in (
    select id from equipes
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
  ));

-- 3) Table de liaison équipe ↔ services
create table if not exists equipes_services (
  equipe_id uuid not null references equipes(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (equipe_id, service_id)
);

create index if not exists idx_equipes_services_service on equipes_services(service_id);

alter table equipes_services enable row level security;

drop policy if exists "equipes_services_select" on equipes_services;
create policy "equipes_services_select" on equipes_services for select to authenticated
  using (equipe_id in (
    select id from equipes
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
  ));

drop policy if exists "equipes_services_insert" on equipes_services;
create policy "equipes_services_insert" on equipes_services for insert to authenticated
  with check (equipe_id in (
    select id from equipes
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
  ));

drop policy if exists "equipes_services_delete" on equipes_services;
create policy "equipes_services_delete" on equipes_services for delete to authenticated
  using (equipe_id in (
    select id from equipes
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
  ));

-- 4) Trigger : équipe auto à la création d'un bâtiment
create or replace function trigger_create_default_team()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into equipes (structure_id, batiment_id, nom, description, couleur, est_par_defaut)
  values (
    new.structure_id,
    new.id,
    'Équipe ' || new.nom,
    'Équipe par défaut créée automatiquement à la création du bâtiment',
    '#185FA5',
    true
  );
  return new;
end;
$$;

drop trigger if exists trg_create_default_team on batiments;
create trigger trg_create_default_team
  after insert on batiments
  for each row execute function trigger_create_default_team();

-- 5) RPC équipes avec stats
create or replace function equipes_avec_stats(p_batiment_id uuid default null)
returns table (
  id uuid,
  structure_id uuid,
  batiment_id uuid,
  batiment_nom text,
  nom text,
  description text,
  couleur text,
  est_par_defaut boolean,
  archive boolean,
  nb_membres bigint,
  nb_services bigint,
  services_noms text[],
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.structure_id,
    e.batiment_id,
    (select nom from batiments where id = e.batiment_id) as batiment_nom,
    e.nom,
    e.description,
    e.couleur,
    e.est_par_defaut,
    e.archive,
    (select count(*) from equipes_membres where equipe_id = e.id) as nb_membres,
    (select count(*) from equipes_services where equipe_id = e.id) as nb_services,
    array(
      select s.nom from equipes_services es
      join services s on s.id = es.service_id
      where es.equipe_id = e.id
      order by s.nom
    ) as services_noms,
    e.created_at
  from equipes e
  where e.structure_id in (select structure_id from membres_structure where user_id = auth.uid())
    and (p_batiment_id is null or e.batiment_id = p_batiment_id)
    and e.archive = false
  order by e.batiment_id nulls last, e.nom;
$$;

grant execute on function equipes_avec_stats to authenticated;

-- ============================================================
-- 6) RPC équipe détail (v2 : email depuis auth.users)
-- ============================================================

create or replace function equipe_detail(p_equipe_id uuid)
returns table (
  user_id uuid,
  nom_affiche text,
  email text,
  role_dans_equipe text,
  added_at timestamptz,
  fonction_detail text
)
language sql
security definer
set search_path = public
as $$
  select
    em.user_id,
    ms.nom_affiche,
    au.email::text,
    em.role_dans_equipe,
    em.added_at,
    ms.fonction_detail
  from equipes_membres em
  left join membres_structure ms on ms.user_id = em.user_id
  left join auth.users au on au.id = em.user_id
  where em.equipe_id = p_equipe_id
    and em.equipe_id in (
      select id from equipes
      where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
    )
  order by em.role_dans_equipe desc, ms.nom_affiche;
$$;

grant execute on function equipe_detail to authenticated;

-- 7) RPC mes équipes
create or replace function mes_equipes()
returns table (
  equipe_id uuid,
  equipe_nom text,
  batiment_nom text,
  couleur text,
  role_dans_equipe text,
  nb_membres bigint
)
language sql
security definer
set search_path = public
as $$
  select
    e.id as equipe_id,
    e.nom as equipe_nom,
    (select nom from batiments where id = e.batiment_id) as batiment_nom,
    e.couleur,
    em.role_dans_equipe,
    (select count(*) from equipes_membres where equipe_id = e.id) as nb_membres
  from equipes_membres em
  join equipes e on e.id = em.equipe_id
  where em.user_id = auth.uid()
    and e.archive = false
  order by e.nom;
$$;

grant execute on function mes_equipes to authenticated;

-- Fin du patch 0.56.15 v2
