-- ============================================================
--  AVEHO EC — Patch 0.55.13 partie B
--  WebAuthn / Empreinte digitale pour login mobile.
--  Idempotent — à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) Table webauthn_credentials
-- ============================================================
-- Stocke les identifiants des credentials biométriques liés à un user.
-- Le credential_id est généré par le navigateur côté client (rawId
-- de PublicKeyCredential, encodé en base64url). Il sert à savoir
-- quels devices sont liés à quel compte.
--
-- Note : on NE STOCKE PAS la public_key ici, car on n'utilise pas
-- la vérification de signature serveur (pas d'Edge function dédiée).
-- L'auth biométrique sert juste de "preuve de présence physique"
-- pour autoriser la reconnexion via refresh_token Supabase stocké
-- localement dans IndexedDB (protégé par l'origin du site).
-- Cette approche est suffisante pour Aveho (équivalent app banque PWA).

create table if not exists webauthn_credentials (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  structure_id    uuid references structures(id) on delete cascade,
  credential_id   text not null,         -- base64url du rawId WebAuthn
  device_name     text,                  -- "iPhone de Marie", défini par user
  user_agent      text,                  -- aide à identifier l'appareil
  created_at      timestamptz default now(),
  last_used_at    timestamptz,
  active          boolean default true,
  
  -- Un même credential ne peut etre enregistre qu'une fois par user
  unique (user_id, credential_id)
);

create index if not exists idx_wac_user on webauthn_credentials(user_id) where active = true;
create index if not exists idx_wac_struct on webauthn_credentials(structure_id);

-- ============================================================
-- 2) RLS — user peut gerer ses propres credentials
-- ============================================================
alter table webauthn_credentials enable row level security;

drop policy if exists "webauthn_credentials select own" on webauthn_credentials;
create policy "webauthn_credentials select own" on webauthn_credentials
  for select using (user_id = auth.uid());

drop policy if exists "webauthn_credentials insert own" on webauthn_credentials;
create policy "webauthn_credentials insert own" on webauthn_credentials
  for insert with check (user_id = auth.uid());

drop policy if exists "webauthn_credentials update own" on webauthn_credentials;
create policy "webauthn_credentials update own" on webauthn_credentials
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "webauthn_credentials delete own" on webauthn_credentials;
create policy "webauthn_credentials delete own" on webauthn_credentials
  for delete using (user_id = auth.uid());

-- ============================================================
-- 3) Policy admin : voir tous les credentials de sa structure
--    (pour l'audit + revocation par admin)
-- ============================================================
drop policy if exists "webauthn_credentials select admin" on webauthn_credentials;
create policy "webauthn_credentials select admin" on webauthn_credentials
  for select using (
    structure_id in (select mes_structures())
  );

-- ============================================================
-- 4) Vue pour la liste des credentials côté profil/admin
-- ============================================================
create or replace view v_my_webauthn_credentials as
select
  wc.id,
  wc.user_id,
  wc.credential_id,
  wc.device_name,
  wc.user_agent,
  wc.created_at,
  wc.last_used_at,
  wc.active,
  -- Compte le nombre total de credentials actifs pour ce user
  count(*) over (partition by wc.user_id) as total_devices
from webauthn_credentials wc
where wc.user_id = auth.uid()
  and wc.active = true
order by wc.last_used_at desc nulls last, wc.created_at desc;

-- ============================================================
-- 5) RPC pour mettre à jour last_used_at facilement
-- ============================================================
create or replace function update_webauthn_last_used(p_credential_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update webauthn_credentials
     set last_used_at = now()
   where credential_id = p_credential_id
     and user_id = auth.uid();
end $$;

grant execute on function update_webauthn_last_used(text) to authenticated;

-- ============================================================
-- 6) RPC pour révoquer un credential (avec audit)
-- ============================================================
create or replace function revoke_webauthn_credential(p_credential_uuid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cred webauthn_credentials%rowtype;
begin
  select * into cred from webauthn_credentials
   where id = p_credential_uuid and user_id = auth.uid();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Credential introuvable');
  end if;

  update webauthn_credentials
     set active = false
   where id = p_credential_uuid;

  return jsonb_build_object('ok', true, 'device_name', cred.device_name);
end $$;

grant execute on function revoke_webauthn_credential(uuid) to authenticated;

-- Fin du patch 0.55.13 partie B
