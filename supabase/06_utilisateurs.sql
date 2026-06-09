-- ============================================================
--  AVEHO EC — Bloc Utilisateurs, rôles & droits
--  Rôles personnalisables · rattachement établissement + services
--  · restriction de visibilité · à exécuter APRÈS 05_etablissement.sql
-- ============================================================

-- ---------- RÔLES (personnalisables, par structure) ----------
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  nom text not null,                 -- 'Admin', 'Cadre de santé', 'Soignant'…
  description text,
  -- droits par module : objet json { "module": ["read","write"] }
  droits jsonb not null default '{}'::jsonb,
  systeme boolean default false,     -- rôle de base non supprimable
  created_at timestamptz default now()
);

-- ---------- PROFIL UTILISATEUR (étend membres_structure) ----------
-- On enrichit le rattachement existant : rôle + nom affiché.
alter table membres_structure add column if not exists role_id uuid references roles(id) on delete set null;
alter table membres_structure add column if not exists nom_affiche text;
alter table membres_structure add column if not exists actif boolean default true;
alter table membres_structure add column if not exists restreint_services boolean default false; -- true = ne voit que ses services

-- ---------- RATTACHEMENT UTILISATEUR <-> SERVICE ----------
create table if not exists membres_services (
  user_id uuid references auth.users(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  structure_id uuid references structures(id) on delete cascade,
  primary key (user_id, service_id)
);

-- ---------- INVITATIONS (rattacher un futur utilisateur par email) ----------
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  email text not null,
  role_id uuid references roles(id) on delete set null,
  nom_affiche text,
  statut text default 'En attente',   -- 'En attente','Acceptée'
  created_at timestamptz default now()
);

-- ---------- RLS ----------
alter table roles            enable row level security;
alter table membres_services enable row level security;
alter table invitations      enable row level security;

create policy "roles all" on roles for all
  using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "membres_services all" on membres_services for all
  using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "invitations all" on invitations for all
  using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));

-- membres_structure : autoriser la gestion par les membres de la même structure (pas seulement soi)
drop policy if exists "voir mes rattachements" on membres_structure;
create policy "membres_structure select" on membres_structure for select
  using (structure_id in (select mes_structures()) or user_id = auth.uid());
create policy "membres_structure write" on membres_structure for all
  using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));

-- ---------- DÉMO : rôles de base + profil de l'utilisateur courant ----------
do $$
declare sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
begin
  insert into roles (structure_id, nom, description, droits, systeme) values
    (sid,'Administrateur','Accès complet',
      '{"patients":["read","write"],"materiels":["read","write"],"articles":["read","write"],"stock":["read","write"],"transferts":["read","write"],"interventions":["read","write"],"commandes":["read","write"],"etablissement":["read","write"],"utilisateurs":["read","write"]}'::jsonb, true),
    (sid,'Cadre de santé','Gestion services & soins',
      '{"patients":["read","write"],"materiels":["read","write"],"interventions":["read","write"],"etablissement":["read","write"],"stock":["read"]}'::jsonb, true),
    (sid,'Soignant','Saisie au lit du patient',
      '{"patients":["read"],"materiels":["read"],"interventions":["read","write"],"etablissement":["read"]}'::jsonb, true),
    (sid,'Lecture seule','Consultation uniquement',
      '{"patients":["read"],"materiels":["read"],"interventions":["read"],"etablissement":["read"],"stock":["read"],"commandes":["read"]}'::jsonb, true)
  on conflict do nothing;
end $$;
