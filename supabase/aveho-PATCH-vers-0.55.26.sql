-- ============================================================
--  AVEHO EC — Patch 0.55.26 (Sécurité + Performance)
--  Durcissement RLS, GRANT explicits, index manquants.
--  100% idempotent et non destructif.
-- ============================================================

-- ============================================================
-- 1) Sécurité : security_invoker sur les vues récentes
--    Force les vues à respecter les policies RLS de l'appelant
--    plutôt que celles du créateur de la vue.
-- ============================================================
do $$
begin
  -- v_users_auth_methods (0.55.17)
  if exists (select 1 from pg_views where viewname = 'v_users_auth_methods') then
    execute 'alter view v_users_auth_methods set (security_invoker = true)';
  end if;
  -- v_my_webauthn_credentials (0.55.13)
  if exists (select 1 from pg_views where viewname = 'v_my_webauthn_credentials') then
    execute 'alter view v_my_webauthn_credentials set (security_invoker = true)';
  end if;
  -- v_user_complete (0.55.25)
  if exists (select 1 from pg_views where viewname = 'v_user_complete') then
    execute 'alter view v_user_complete set (security_invoker = true)';
  end if;
end $$;

-- ============================================================
-- 2) Index manquants pour performance
-- ============================================================
-- webauthn_credentials : recherche par user actif
create index if not exists idx_webauthn_user_active 
  on webauthn_credentials(user_id) 
  where active = true;

-- invitations : lookup par token non archivé
create index if not exists idx_invitations_token_active 
  on invitations(token) 
  where archive = false;

-- audit_log : queries structure_id + user_id + tri date
create index if not exists idx_audit_log_struct_user_date 
  on audit_log(structure_id, user_id, created_at desc);

-- app_logs : queries par user + date
create index if not exists idx_app_logs_user_date 
  on app_logs(user_id, created_at desc);

-- membres_structure : recherche par matricule (nouveau en 0.55.25)
create index if not exists idx_membres_matricule 
  on membres_structure(structure_id, matricule) 
  where matricule is not null and archive = false;

-- ============================================================
-- 3) GRANT explicites : retirer accès public sur les RPCs sensibles
-- ============================================================
do $$
declare 
  fn record;
begin
  for fn in 
    select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as full_name
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'reset_user_password',
        'get_invitation_full',
        'revoke_webauthn_credential',
        'update_webauthn_last_used'
      )
  loop
    begin
      execute format('revoke all on function %s from public', fn.full_name);
      execute format('grant execute on function %s to authenticated', fn.full_name);
    exception when others then
      raise notice 'Fonction non trouvée : %', fn.full_name;
    end;
  end loop;
end $$;

-- get_invitation_full : aussi accessible anon (pour la page d'inscription)
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_invitation_full'
  ) then
    execute 'grant execute on function get_invitation_full(uuid) to anon';
  end if;
end $$;

-- ============================================================
-- 4) Audit de sécurité : table pour stocker les snapshots
--    Permet de vérifier l'historique des changements de droits
-- ============================================================
create table if not exists security_audit_log (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  audit_type text not null,
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_security_audit_ts on security_audit_log(ts desc);

-- RLS : seuls les admins peuvent lire
alter table security_audit_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'security_audit_log' 
      and policyname = 'security_audit_log_admin_read'
  ) then
    create policy security_audit_log_admin_read on security_audit_log
      for select using (
        exists (
          select 1 from membres_structure ms
          left join roles r on r.id = ms.role_id
          where ms.user_id = auth.uid()
            and coalesce((r.droits->>'parametres_admin')::boolean, false) = true
        )
      );
  end if;
end $$;

-- Insertion : ouvert (les RPCs peuvent y écrire via security definer)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'security_audit_log' 
      and policyname = 'security_audit_log_insert'
  ) then
    create policy security_audit_log_insert on security_audit_log
      for insert with check (true);
  end if;
end $$;

-- ============================================================
-- 5) RPC d'audit : log_security_event
-- ============================================================
create or replace function log_security_event(
  p_type text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into security_audit_log (audit_type, details)
  values (p_type, p_details || jsonb_build_object('user_id', auth.uid()));
end;
$$;

revoke all on function log_security_event(text, jsonb) from public;
grant execute on function log_security_event(text, jsonb) to authenticated;

-- ============================================================
-- 6) Trigger d'audit sur changements rôle (sensible)
-- ============================================================
create or replace function trg_audit_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role_id is distinct from new.role_id then
    insert into security_audit_log (audit_type, details)
    values (
      'role_change',
      jsonb_build_object(
        'changed_by', auth.uid(),
        'target_user', new.user_id,
        'old_role_id', old.role_id,
        'new_role_id', new.role_id,
        'structure_id', new.structure_id
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_membres_structure_audit on membres_structure;
create trigger trg_membres_structure_audit
  after update on membres_structure
  for each row execute function trg_audit_role_change();

-- ============================================================
-- 7) VACUUM ANALYZE pour optimiser les statistiques planning
-- ============================================================
-- (laissé en commentaire — l'admin peut décider quand le lancer)
-- vacuum analyze webauthn_credentials;
-- vacuum analyze membres_structure;
-- vacuum analyze invitations;

-- Fin du patch 0.55.26
