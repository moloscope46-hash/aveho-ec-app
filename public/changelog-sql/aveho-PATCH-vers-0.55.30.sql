-- ============================================================
--  AVEHO EC — Patch 0.55.30
--  - Hotfix : ajoute groupement_id sur etablissements (manquait)
--  - Nouvelle table partenaires_rpps (contacts non-utilisateurs)
--  - Helper RPC ajout d'utilisateur à un établissement (bâtiment)
--  100% idempotent.
-- ============================================================

-- ============================================================
-- 1) HOTFIX : ajoute groupement_id sur etablissements
-- ============================================================
alter table etablissements
  add column if not exists groupement_id uuid;

create index if not exists idx_etablissements_groupement
  on etablissements(groupement_id) where groupement_id is not null;

-- Ajoute aussi sur groupements une colonne nom si manquante (sécurité)
do $$
begin
  if not exists (select 1 from pg_tables where tablename = 'groupements') then
    create table groupements (
      id uuid primary key default gen_random_uuid(),
      structure_id uuid not null references structures(id) on delete cascade,
      nom text not null,
      description text,
      created_at timestamptz not null default now(),
      archive boolean not null default false
    );
    create index idx_groupements_struct on groupements(structure_id);
    alter table groupements enable row level security;
    create policy groupements_member_rw on groupements for all using (
      structure_id in (select structure_id from membres_structure where user_id = auth.uid())
    ) with check (
      structure_id in (select structure_id from membres_structure where user_id = auth.uid())
    );
  end if;
end $$;

-- ============================================================
-- 2) Table partenaires_rpps — contacts non-utilisateurs de l'app
--    (médecins prescripteurs, IDE libéraux qui interviennent, etc.)
-- ============================================================
create table if not exists partenaires_rpps (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references structures(id) on delete cascade,
  -- Identité (récupérée depuis API FHIR ANS)
  rpps text,
  adeli text,
  civilite text,
  nom text not null,
  prenom text,
  profession text,
  specialite text,
  mode_exercice text,
  -- Coordonnées
  adresse text,
  cp text,
  commune text,
  telephone text,
  telephone_mobile text,
  email text,
  -- Métadonnées
  notes text,
  tags text[] default '{}',
  -- Liens éventuels avec patients (pour prescripteurs)
  est_prescripteur boolean not null default false,
  est_intervenant boolean not null default false,
  -- Établissement(s) auxquels ce partenaire est associé (optionnel)
  etablissement_ids uuid[] default '{}',
  -- Audit
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  archive boolean not null default false
);

-- Index recherche / unicité
create index if not exists idx_partenaires_rpps_struct on partenaires_rpps(structure_id) where archive = false;
create index if not exists idx_partenaires_rpps_rpps on partenaires_rpps(structure_id, rpps) where rpps is not null;
create index if not exists idx_partenaires_rpps_nom on partenaires_rpps(structure_id, nom);
create index if not exists idx_partenaires_rpps_profession on partenaires_rpps(structure_id, profession);

-- Contrainte d'unicité : un même RPPS ne peut exister qu'une fois par structure
create unique index if not exists uniq_partenaires_rpps_per_struct
  on partenaires_rpps(structure_id, rpps)
  where rpps is not null and archive = false;

-- RLS
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

-- Trigger pour updated_at
create or replace function trg_partenaires_rpps_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_partenaires_rpps_updated_at on partenaires_rpps;
create trigger trg_partenaires_rpps_updated_at
  before update on partenaires_rpps
  for each row execute function trg_partenaires_rpps_updated_at();

-- ============================================================
-- 3) RPC : ajouter un utilisateur à un établissement (bâtiment)
-- ============================================================
create or replace function add_user_to_etablissement(
  p_user_id uuid,
  p_etablissement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_struct_id uuid;
begin
  -- Vérifier que l'établissement appartient à une structure dont l'appelant est admin
  select e.structure_id into v_struct_id
  from etablissements e
  where e.id = p_etablissement_id;

  if v_struct_id is null then
    return jsonb_build_object('ok', false, 'error', 'Établissement introuvable');
  end if;

  select bool_or(coalesce((r.droits->>'utilisateurs_write')::boolean, false)
                 or coalesce((r.droits->>'parametres_admin')::boolean, false)) into v_is_admin
  from membres_structure ms
  left join roles r on r.id = ms.role_id
  where ms.user_id = auth.uid()
    and ms.structure_id = v_struct_id;

  if not v_is_admin then
    return jsonb_build_object('ok', false, 'error', 'Permission refusée');
  end if;

  -- Vérifier que l'user est membre de la même structure
  if not exists (
    select 1 from membres_structure
    where user_id = p_user_id and structure_id = v_struct_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Utilisateur non rattaché à la structure');
  end if;

  -- Insérer si pas déjà présent
  insert into membres_etablissements (user_id, etablissement_id, structure_id)
  values (p_user_id, p_etablissement_id, v_struct_id)
  on conflict (user_id, etablissement_id) do nothing;

  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$$;

revoke all on function add_user_to_etablissement(uuid, uuid) from public;
grant execute on function add_user_to_etablissement(uuid, uuid) to authenticated;

create or replace function remove_user_from_etablissement(
  p_user_id uuid,
  p_etablissement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_struct_id uuid;
begin
  select e.structure_id into v_struct_id
  from etablissements e
  where e.id = p_etablissement_id;

  if v_struct_id is null then
    return jsonb_build_object('ok', false, 'error', 'Établissement introuvable');
  end if;

  select bool_or(coalesce((r.droits->>'utilisateurs_write')::boolean, false)
                 or coalesce((r.droits->>'parametres_admin')::boolean, false)) into v_is_admin
  from membres_structure ms
  left join roles r on r.id = ms.role_id
  where ms.user_id = auth.uid()
    and ms.structure_id = v_struct_id;

  if not v_is_admin then
    return jsonb_build_object('ok', false, 'error', 'Permission refusée');
  end if;

  delete from membres_etablissements
  where user_id = p_user_id and etablissement_id = p_etablissement_id;

  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$$;

revoke all on function remove_user_from_etablissement(uuid, uuid) from public;
grant execute on function remove_user_from_etablissement(uuid, uuid) to authenticated;

-- ============================================================
-- 4) Vue v_partenaires_rpps avec compteurs
-- ============================================================
drop view if exists v_partenaires_rpps;
create view v_partenaires_rpps as
select
  p.*,
  array_length(p.etablissement_ids, 1) as nb_etablissements_lies
from partenaires_rpps p;

alter view v_partenaires_rpps set (security_invoker = true);

-- Fin du patch 0.55.30
