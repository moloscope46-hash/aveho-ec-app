-- ============================================================
--  AVEHO EC — Patch 0.55.17
--  Détection faciale en plus de l'empreinte (même WebAuthn,
--  séparation logique via auth_method).
--  Idempotent — à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) Colonne auth_method sur webauthn_credentials
-- ============================================================
-- Permet de différencier empreinte et détection faciale dans l'UI,
-- même si techniquement c'est le même WebAuthn (l'OS choisit Touch/Face
-- selon le device). La distinction permet d'avoir 2 credentials par
-- user/device (un pour empreinte si dispo, un pour face si dispo).
alter table webauthn_credentials
  add column if not exists auth_method text not null default 'empreinte';

-- Contrainte de validation des valeurs
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'wac_auth_method_check'
  ) then
    alter table webauthn_credentials
      add constraint wac_auth_method_check 
      check (auth_method in ('empreinte', 'face'));
  end if;
end $$;

-- Index pour requêtes par user × méthode
create index if not exists idx_wac_user_method 
  on webauthn_credentials(user_id, auth_method) 
  where active = true;

-- ============================================================
-- 2) Vue v_users_auth_methods
-- ============================================================
-- Pour la page /utilisateurs : pour chaque user de la structure
-- on indique s'il a configuré l'empreinte et/ou la détection faciale.
create or replace view v_users_auth_methods as
select 
  ms.user_id,
  ms.structure_id,
  ms.nom_affiche,
  exists(
    select 1 from webauthn_credentials wc 
    where wc.user_id = ms.user_id 
      and wc.auth_method = 'empreinte' 
      and wc.active = true
  ) as has_empreinte,
  exists(
    select 1 from webauthn_credentials wc 
    where wc.user_id = ms.user_id 
      and wc.auth_method = 'face' 
      and wc.active = true
  ) as has_face,
  (
    select count(*) from webauthn_credentials wc 
    where wc.user_id = ms.user_id 
      and wc.active = true
  ) as total_devices
from membres_structure ms;

-- ============================================================
-- 3) Mettre à jour la vue v_my_webauthn_credentials
--    pour inclure auth_method
-- ============================================================
-- DROP nécessaire car CREATE OR REPLACE refuse de changer l'ordre
-- des colonnes existantes (Postgres erreur 42P16).
drop view if exists v_my_webauthn_credentials;

create view v_my_webauthn_credentials as
select
  wc.id,
  wc.user_id,
  wc.credential_id,
  wc.device_name,
  wc.user_agent,
  wc.auth_method,
  wc.created_at,
  wc.last_used_at,
  wc.active,
  count(*) over (partition by wc.user_id) as total_devices
from webauthn_credentials wc
where wc.user_id = auth.uid()
  and wc.active = true
order by wc.auth_method, wc.last_used_at desc nulls last, wc.created_at desc;

-- Fin du patch 0.55.17
