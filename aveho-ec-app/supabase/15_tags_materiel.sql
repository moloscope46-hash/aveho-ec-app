-- ============================================================
--  AVEHO EC — Tags matériel + récurrence maintenance (Alpha 0.11)
--  Ajoute :
--   - Table tags_materiel + relation many-to-many materiel_tags
--   - Colonnes recurrence_jours + parent_id sur maintenances
--  À exécuter APRÈS 14_maintenance.sql
-- ============================================================

-- 1) Tags matériel (similaire aux étiquettes patients)
create table if not exists tags_materiel (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade not null,
  libelle text not null,
  couleur text not null default '#7CC8C8',
  description text,
  created_at timestamptz default now()
);
create index if not exists idx_tagsmat_struct on tags_materiel (structure_id);
alter table tags_materiel enable row level security;
create policy "tagsmat_select" on tags_materiel for select
  using (structure_id in (select mes_structures()));
create policy "tagsmat_write" on tags_materiel for all
  using (structure_id in (select mes_structures()))
  with check (structure_id in (select mes_structures()));

-- 2) Relation many-to-many matériel ↔ tags
create table if not exists materiel_tags (
  id uuid primary key default gen_random_uuid(),
  materiel_id uuid references materiels(id) on delete cascade not null,
  tag_id uuid references tags_materiel(id) on delete cascade not null,
  structure_id uuid references structures(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (materiel_id, tag_id)
);
create index if not exists idx_mt_mat on materiel_tags (materiel_id);
create index if not exists idx_mt_tag on materiel_tags (tag_id);
alter table materiel_tags enable row level security;
create policy "mt_select" on materiel_tags for select
  using (structure_id in (select mes_structures()));
create policy "mt_write" on materiel_tags for all
  using (structure_id in (select mes_structures()))
  with check (structure_id in (select mes_structures()));

-- 3) Récurrence sur maintenances : nombre de jours entre 2 occurrences
--    + parent_id pour tracer la chaîne (laisser null si pas récurrent)
alter table maintenances
  add column if not exists recurrence_jours integer,
  add column if not exists parent_id uuid references maintenances(id) on delete set null,
  add column if not exists di_id uuid references interventions(id) on delete set null,
  add column if not exists notif_j7_envoyee boolean default false;

create index if not exists idx_maint_parent on maintenances (parent_id);
create index if not exists idx_maint_di on maintenances (di_id);

-- 4) Tags démo pour la collectivité de test
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
begin
  if exists (select 1 from structures where id = sid) then
    insert into tags_materiel (structure_id, libelle, couleur, description) values
      (sid, 'Critique', '#e35d5b', 'Matériel essentiel à la prise en charge'),
      (sid, 'Sous garantie', '#5aa05a', 'Couverture constructeur en cours'),
      (sid, 'À remplacer', '#EF9F27', 'Fin de vie programmée'),
      (sid, 'Hors service', '#8a98a8', 'Inutilisable temporairement'),
      (sid, 'À surveiller', '#7a6fb0', 'Comportement anormal détecté')
    on conflict do nothing;
  end if;
end $$;
