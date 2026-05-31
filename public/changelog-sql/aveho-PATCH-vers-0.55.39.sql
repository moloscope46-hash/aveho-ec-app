-- ============================================================
--  AVEHO EC — Patch 0.55.39
--  Compteur de requêtes API externes (Google Places, etc.)
--  + vue agrégée par mois pour la page paramètres
--  100% idempotent.
-- ============================================================

-- ============================================================
-- 1) Table de log des appels API externes
-- ============================================================
create table if not exists api_usage_log (
  id bigserial primary key,
  structure_id uuid references structures(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  api_name text not null,                  -- 'google_places', 'rpps', 'finess', 'sirene', 'ban_insee', 'wikipedia'
  endpoint text,                            -- 'findplacefromtext', 'details', etc.
  status text not null default 'ok',       -- 'ok' | 'error' | 'no_key' | 'cache_hit'
  http_status int,
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_usage_api on api_usage_log(api_name, created_at desc);
create index if not exists idx_api_usage_month on api_usage_log(api_name, date_trunc('month', created_at));
create index if not exists idx_api_usage_struct on api_usage_log(structure_id, created_at desc) where structure_id is not null;

alter table api_usage_log enable row level security;

do $$
begin
  -- Tous les utilisateurs authentifiés peuvent INSERER (pour les call API depuis le serveur)
  if not exists (select 1 from pg_policies where tablename = 'api_usage_log' and policyname = 'api_usage_insert_auth') then
    create policy api_usage_insert_auth on api_usage_log for insert with check (true);
  end if;
  -- Seuls les admins parametres_admin peuvent lire
  if not exists (select 1 from pg_policies where tablename = 'api_usage_log' and policyname = 'api_usage_read_admin') then
    create policy api_usage_read_admin on api_usage_log for select using (
      exists (
        select 1 from membres_structure ms
        left join roles r on r.id = ms.role_id
        where ms.user_id = auth.uid()
          and coalesce((r.droits->>'parametres_admin')::boolean, false) = true
      )
    );
  end if;
end $$;

-- ============================================================
-- 2) Vue agrégée par mois courant
-- ============================================================
drop view if exists v_api_usage_current_month;
create view v_api_usage_current_month as
select
  api_name,
  count(*) filter (where status = 'ok') as calls_ok,
  count(*) filter (where status = 'error') as calls_error,
  count(*) filter (where status = 'no_key') as calls_no_key,
  count(*) filter (where status = 'cache_hit') as calls_cached,
  count(*) as calls_total,
  avg(duration_ms) filter (where status = 'ok' and duration_ms is not null)::int as avg_duration_ms,
  min(created_at) as first_call_this_month,
  max(created_at) as last_call
from api_usage_log
where created_at >= date_trunc('month', now())
group by api_name;

alter view v_api_usage_current_month set (security_invoker = true);

-- ============================================================
-- 3) RPC pour récupérer le récap pour la page paramètres
-- ============================================================
create or replace function get_api_usage_stats()
returns table (
  api_name text,
  calls_ok bigint,
  calls_error bigint,
  calls_no_key bigint,
  calls_cached bigint,
  calls_total bigint,
  avg_duration_ms int,
  last_call timestamptz
)
language sql security definer set search_path = public as $$
  select
    api_name,
    calls_ok,
    calls_error,
    calls_no_key,
    calls_cached,
    calls_total,
    avg_duration_ms,
    last_call
  from v_api_usage_current_month
  order by calls_total desc;
$$;

revoke all on function get_api_usage_stats() from public;
grant execute on function get_api_usage_stats() to authenticated;

-- ============================================================
-- 4) RPC pour incrémenter (appelée depuis les route handlers serveur)
--    via supabase admin client. On laisse aussi authenticated l'utiliser
--    pour les appels client-side optionnels.
-- ============================================================
create or replace function log_api_call(
  p_api_name text,
  p_endpoint text default null,
  p_status text default 'ok',
  p_http_status int default null,
  p_error_message text default null,
  p_duration_ms int default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_struct_id uuid;
begin
  -- Trouve la structure du user courant
  select structure_id into v_struct_id
  from membres_structure
  where user_id = auth.uid()
  limit 1;

  insert into api_usage_log
    (structure_id, user_id, api_name, endpoint, status, http_status, error_message, duration_ms)
  values
    (v_struct_id, auth.uid(), p_api_name, p_endpoint, p_status, p_http_status, p_error_message, p_duration_ms);
end;
$$;

grant execute on function log_api_call(text, text, text, int, text, int) to authenticated;

-- ============================================================
-- 5) Nettoyage auto : supprimer les logs > 90 jours (best effort)
--    À déclencher manuellement ou via pg_cron si dispo
-- ============================================================
create or replace function cleanup_old_api_logs() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_deleted int;
begin
  delete from api_usage_log where created_at < now() - interval '90 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function cleanup_old_api_logs() to authenticated;

-- Fin du patch 0.55.39
