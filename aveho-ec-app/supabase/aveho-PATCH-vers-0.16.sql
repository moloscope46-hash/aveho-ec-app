-- ============================================================
--  AVEHO EC — Patch 0.16.0 (Archivage utilisateurs + infos)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- 1) Colonne archive sur membres_structure
-- Permet de cacher un membre de la liste tout en gardant
-- son historique d'audit. Différent de actif (qui est plus
-- proche d'un "suspendu temporaire").
alter table membres_structure 
  add column if not exists archive boolean not null default false;
create index if not exists idx_ms_archive 
  on membres_structure (structure_id, archive);

-- 2) Colonnes d'infos utilisateur (optionnelles)
alter table membres_structure
  add column if not exists telephone text,
  add column if not exists poste text,
  add column if not exists notes text,
  add column if not exists date_arrivee date;

-- 3) Colonne archive sur invitations (pour cacher les vieilles)
alter table invitations
  add column if not exists archive boolean not null default false;

-- 4) Vue d'aide : dernière activité par user (basée sur audit_log)
create or replace view v_user_activity as
select 
  user_id,
  count(*) as nb_actions,
  max(created_at) as derniere_activite,
  count(*) filter (where created_at > now() - interval '7 days') as actions_7j,
  count(*) filter (where created_at > now() - interval '30 days') as actions_30j
from audit_log
where user_id is not null
group by user_id;

-- Sécurité de base : la vue suit les RLS de audit_log automatiquement
-- (puisqu'elle interroge audit_log qui est RLS-protégé).
