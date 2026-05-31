-- ============================================================
--  AVEHO EC — Patch 0.50.0
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  AO - Table annonces (broadcast admin → users)
--  AS - Workflow achats multi-étapes (seuil + double validation)
-- ============================================================

-- ============================================================
-- AO - Table annonces
-- Permet aux admins de diffuser un message banner top à tous les
-- membres de leur structure. Un user peut le dismisser individuellement.
-- ============================================================
create table if not exists annonces (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references structures(id) on delete cascade,
  titre text not null,
  message text not null,
  niveau text not null default 'info',  -- info | warning | critique
  cree_par uuid references auth.users(id) on delete set null,
  cree_par_email text,                   -- snapshot
  date_debut timestamptz not null default now(),
  date_fin timestamptz,                  -- null = permanente
  active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_annonces_struct_active 
  on annonces (structure_id, active, date_debut desc);

-- RLS
alter table annonces enable row level security;

drop policy if exists "annonces_select_mes_structures" on annonces;
create policy "annonces_select_mes_structures"
  on annonces for select
  using (structure_id in (select mes_structures()));

drop policy if exists "annonces_insert_admin" on annonces;
create policy "annonces_insert_admin"
  on annonces for insert
  with check (
    structure_id in (select mes_structures()) 
    and exists (
      select 1 from membres_structure ms
      join roles r on r.id = ms.role_id
      where ms.user_id = auth.uid()
        and ms.structure_id = annonces.structure_id
        and (r.nom = 'Administrateur' or r.droits::text ilike '%manage_roles%')
    )
  );

drop policy if exists "annonces_update_admin" on annonces;
create policy "annonces_update_admin"
  on annonces for update
  using (
    structure_id in (select mes_structures()) 
    and exists (
      select 1 from membres_structure ms
      join roles r on r.id = ms.role_id
      where ms.user_id = auth.uid()
        and ms.structure_id = annonces.structure_id
        and (r.nom = 'Administrateur' or r.droits::text ilike '%manage_roles%')
    )
  );

drop policy if exists "annonces_delete_admin" on annonces;
create policy "annonces_delete_admin"
  on annonces for delete
  using (
    structure_id in (select mes_structures()) 
    and exists (
      select 1 from membres_structure ms
      join roles r on r.id = ms.role_id
      where ms.user_id = auth.uid()
        and ms.structure_id = annonces.structure_id
        and (r.nom = 'Administrateur' or r.droits::text ilike '%manage_roles%')
    )
  );

-- ============================================================
-- AO - Table annonces_dismissees (par user)
-- ============================================================
create table if not exists annonces_dismissees (
  user_id uuid not null references auth.users(id) on delete cascade,
  annonce_id uuid not null references annonces(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, annonce_id)
);

alter table annonces_dismissees enable row level security;

drop policy if exists "annonces_dismissees_select_own" on annonces_dismissees;
create policy "annonces_dismissees_select_own"
  on annonces_dismissees for select
  using (auth.uid() = user_id);

drop policy if exists "annonces_dismissees_insert_own" on annonces_dismissees;
create policy "annonces_dismissees_insert_own"
  on annonces_dismissees for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- AS - Workflow achats multi-étapes
-- Ajout du seuil de validation à 2 niveaux
-- ============================================================
alter table achats 
  add column if not exists seuil_double_validation numeric(10,2),  -- au-delà → 2nd valideur requis
  add column if not exists second_valideur_id uuid references auth.users(id) on delete set null,
  add column if not exists date_second_validation timestamptz,
  add column if not exists workflow_etape text;  -- "demande" | "premiere_valid" | "double_valid_attente" | "double_valid" | "envoye" | "recu"

create index if not exists idx_achats_workflow_etape on achats (workflow_etape);

-- ============================================================
-- AS - Vue v_achats_a_valider_par_user
-- Liste les achats que l'user courant peut valider à chaque étape.
-- ============================================================
create or replace view v_achats_a_valider as
select 
  a.*,
  case 
    when a.statut = 'Brouillon' or a.statut = 'En attente' then 'premiere_valid'
    when a.statut = 'Validé' 
         and a.seuil_double_validation is not null 
         and a.budget_estime > a.seuil_double_validation
         and a.second_valideur_id is null
      then 'double_valid_attente'
    else null
  end as etape_valid_courante,
  case
    when a.budget_estime is not null 
         and a.seuil_double_validation is not null 
         and a.budget_estime > a.seuil_double_validation 
      then true
    else false
  end as necessite_double_validation
from achats a;

grant select on v_achats_a_valider to authenticated;

-- ============================================================
-- Reload PostgREST cache (réflexe 0.43)
-- ============================================================
notify pgrst, 'reload schema';

-- ============================================================
-- FIN DU PATCH 0.50.0
-- ============================================================
-- Vérifications :
--   -- Annonces
--   select * from annonces order by created_at desc limit 5;
--   -- Achats workflow
--   select numero, statut, workflow_etape, etape_valid_courante 
--     from v_achats_a_valider 
--     limit 5;
