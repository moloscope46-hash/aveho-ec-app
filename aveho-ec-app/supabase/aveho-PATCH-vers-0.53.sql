-- ============================================================
--  AVEHO EC — Patch 0.53.0
--  Chantiers livrés :
--    BM — Templates de signalements
--    BK — Comparaison périodes dans /statistiques-activite
-- ============================================================

-- BM. Table signalement_templates
create table if not exists signalement_templates (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade not null,
  nom text not null,
  type text not null,
  titre_modele text,
  description_modele text,
  icone text default 'ti-template',
  ordre int default 100,
  actif boolean not null default true,
  cree_par uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_signal_tpl_struct on signalement_templates (structure_id);
create index if not exists idx_signal_tpl_actif on signalement_templates (structure_id, actif);

alter table signalement_templates enable row level security;

drop policy if exists "signal_tpl_select" on signalement_templates;
create policy "signal_tpl_select" on signalement_templates
  for select using (structure_id in (select mes_structures()));

drop policy if exists "signal_tpl_insert" on signalement_templates;
create policy "signal_tpl_insert" on signalement_templates
  for insert with check (
    structure_id in (select mes_structures())
    and exists (
      select 1 from membres_structure ms
      join roles r on ms.role_id = r.id
      where ms.user_id = auth.uid()
        and ms.structure_id = signalement_templates.structure_id
        and (r.droits::text ilike '%manage_roles%' or r.nom = 'Administrateur')
    )
  );

drop policy if exists "signal_tpl_update" on signalement_templates;
create policy "signal_tpl_update" on signalement_templates
  for update using (
    structure_id in (select mes_structures())
    and exists (
      select 1 from membres_structure ms
      join roles r on ms.role_id = r.id
      where ms.user_id = auth.uid()
        and ms.structure_id = signalement_templates.structure_id
        and (r.droits::text ilike '%manage_roles%' or r.nom = 'Administrateur')
    )
  );

drop policy if exists "signal_tpl_delete" on signalement_templates;
create policy "signal_tpl_delete" on signalement_templates
  for delete using (
    structure_id in (select mes_structures())
    and exists (
      select 1 from membres_structure ms
      join roles r on ms.role_id = r.id
      where ms.user_id = auth.uid()
        and ms.structure_id = signalement_templates.structure_id
        and (r.droits::text ilike '%manage_roles%' or r.nom = 'Administrateur')
    )
  );

-- BK. Vue comparaison périodes
create or replace view v_stats_periode_comparee as
with periode_courante as (
  select
    structure_id,
    etablissement_id,
    'courante'::text as periode,
    count(*) filter (where entite = 'patient' and action = 'create') as nb_patients_crees,
    count(*) filter (where entite = 'intervention' and action = 'create') as nb_di,
    count(*) filter (where entite = 'transfert' and action = 'create') as nb_transferts,
    count(*) filter (where entite = 'commande' and action = 'create') as nb_commandes,
    count(*) filter (where entite = 'signalement' and action = 'create') as nb_signalements,
    count(distinct user_id) as nb_users_actifs
  from audit_log
  where created_at >= now() - interval '30 days'
  group by structure_id, etablissement_id
),
periode_precedente as (
  select
    structure_id,
    etablissement_id,
    'precedente'::text as periode,
    count(*) filter (where entite = 'patient' and action = 'create') as nb_patients_crees,
    count(*) filter (where entite = 'intervention' and action = 'create') as nb_di,
    count(*) filter (where entite = 'transfert' and action = 'create') as nb_transferts,
    count(*) filter (where entite = 'commande' and action = 'create') as nb_commandes,
    count(*) filter (where entite = 'signalement' and action = 'create') as nb_signalements,
    count(distinct user_id) as nb_users_actifs
  from audit_log
  where created_at >= now() - interval '60 days'
    and created_at < now() - interval '30 days'
  group by structure_id, etablissement_id
)
select * from periode_courante
union all
select * from periode_precedente;

grant select on v_stats_periode_comparee to authenticated;

-- Reload PostgREST cache
notify pgrst, 'reload schema';
