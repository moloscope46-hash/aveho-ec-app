-- ============================================================
--  AVEHO EC — Patch 0.16.1 (Migration consolidée)
--  Couvre roadmap 0.16 originelle : auto-rattachement admin,
--  due_date interventions, clarification schéma rôles,
--  modèles d'étiquettes par défaut.
--  Idempotent, à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) Auto-rattachement admin aux établissements
-- ============================================================
-- Trigger : quand un user est ajouté en membres_structure avec
-- role='admin' (ou role_id pointant un rôle système admin),
-- on l'auto-rattache à TOUS les établissements de la structure.
-- Évite le piège #7 (admin structure ≠ admin établissement).

create or replace function auto_rattach_admin_etabs()
returns trigger
language plpgsql
security definer
as $$
declare
  is_admin boolean;
begin
  -- Détecte si le nouveau membre est admin
  -- Soit via role text legacy (='admin'), soit via role_id qui pointe un rôle système admin
  is_admin := (new.role = 'admin') OR EXISTS (
    select 1 from roles r 
    where r.id = new.role_id 
      and (r.nom = 'Administrateur' or r.systeme = true)
  );
  
  if is_admin then
    -- Rattacher à tous les établissements de la structure
    insert into membres_etablissements (user_id, etablissement_id)
    select new.user_id, e.id
    from etablissements e
    where e.structure_id = new.structure_id
      and not exists (
        select 1 from membres_etablissements me
        where me.user_id = new.user_id and me.etablissement_id = e.id
      );
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_auto_rattach_admin on membres_structure;
create trigger trg_auto_rattach_admin
  after insert or update of role, role_id on membres_structure
  for each row
  execute function auto_rattach_admin_etabs();

-- Idem quand on crée un nouvel établissement : rattacher tous les admins existants
create or replace function auto_rattach_admins_to_new_etab()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into membres_etablissements (user_id, etablissement_id)
  select ms.user_id, new.id
  from membres_structure ms
  left join roles r on r.id = ms.role_id
  where ms.structure_id = new.structure_id
    and (ms.role = 'admin' or r.nom = 'Administrateur' or r.systeme = true)
    and not exists (
      select 1 from membres_etablissements me
      where me.user_id = ms.user_id and me.etablissement_id = new.id
    );
  return new;
end;
$$;

drop trigger if exists trg_rattach_admins_new_etab on etablissements;
create trigger trg_rattach_admins_new_etab
  after insert on etablissements
  for each row
  execute function auto_rattach_admins_to_new_etab();

-- Rattrapage pour les admins existants qui n'auraient pas été rattachés
insert into membres_etablissements (user_id, etablissement_id)
select ms.user_id, e.id
from membres_structure ms
left join roles r on r.id = ms.role_id
join etablissements e on e.structure_id = ms.structure_id
where (ms.role = 'admin' or r.nom = 'Administrateur' or r.systeme = true)
  and not exists (
    select 1 from membres_etablissements me
    where me.user_id = ms.user_id and me.etablissement_id = e.id
  );

-- ============================================================
-- 2) Colonne interventions.due_date
-- ============================================================
alter table interventions 
  add column if not exists due_date date;
create index if not exists idx_intervention_duedate 
  on interventions (due_date) where due_date is not null;

-- ============================================================
-- 3) Clarification schéma rôles (legacy role text vs role_id uuid)
-- ============================================================
-- La colonne membres_structure.role (text) est legacy 0.1.
-- La colonne role_id (uuid) référence roles.id (moderne).
-- On synchronise : si role_id est set et role est null, on déduit le role text.

update membres_structure ms
set role = case 
  when r.nom = 'Administrateur' or r.systeme = true then 'admin'
  when r.nom = 'Lecture seule' then 'lecture'
  else 'membre'
end
from roles r
where ms.role_id = r.id 
  and (ms.role is null or ms.role = '');

-- Et inversement : si role text est set mais pas role_id, on rattache
-- au rôle système correspondant dans la structure
update membres_structure ms
set role_id = r.id
from roles r
where r.structure_id = ms.structure_id
  and ms.role_id is null
  and (
    (ms.role = 'admin' and (r.nom = 'Administrateur' or r.systeme = true and lower(r.nom) like '%admin%'))
    or (ms.role = 'lecture' and r.nom = 'Lecture seule')
  );

-- ============================================================
-- 4) Modèles d'étiquettes par défaut (seeder)
-- ============================================================
-- 10 étiquettes types pour faciliter le démarrage des collectivités.
-- Insérés UNIQUEMENT pour les structures qui n'en ont aucune.

do $$
declare
  s_id uuid;
begin
  for s_id in (select id from structures) loop
    if not exists (select 1 from etiquettes where structure_id = s_id) then
      insert into etiquettes (structure_id, libelle, couleur) values
        (s_id, 'RGPD', '#7a6fb0'),
        (s_id, 'ALD', '#185FA5'),
        (s_id, 'Dépendance', '#C9867F'),
        (s_id, 'Fragile', '#EF9F27'),
        (s_id, 'Isolement', '#e35d5b'),
        (s_id, 'Soins palliatifs', '#5a6776'),
        (s_id, 'Allergique', '#c0392b'),
        (s_id, 'MCI', '#7CC8C8'),
        (s_id, 'Douleur', '#a55a2a'),
        (s_id, 'Post-op', '#5aa05a');
    end if;
  end loop;
end $$;

-- ============================================================
-- FIN DU PATCH 0.16.1
-- ============================================================
-- Vérification rapide après exécution :
--
--   -- Triggers créés ?
--   select tgname from pg_trigger where tgname like 'trg_%rattach%' or tgname like '%admin%';
--
--   -- Combien d'admins ont été auto-rattachés ?
--   select count(distinct user_id) from membres_etablissements me
--   join membres_structure ms on ms.user_id = me.user_id
--   where ms.role = 'admin';
--
--   -- due_date ajouté ?
--   select column_name from information_schema.columns 
--   where table_name = 'interventions' and column_name = 'due_date';
--
--   -- Étiquettes seedées ?
--   select s.nom, count(e.id) as nb_etiquettes
--   from structures s left join etiquettes e on e.structure_id = s.id
--   group by s.nom;
