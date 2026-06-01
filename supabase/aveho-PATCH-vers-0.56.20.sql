-- ============================================================
--  AVEHO EC — Patch 0.56.20 — Hardening sécurité
--  Grants manquants sur 21 fonctions (sinon 403 au runtime)
--  + set search_path sur fonctions SECURITY DEFINER vulnérables
-- ============================================================

-- 1) Grant execute sur les fonctions oubliées
grant execute on function auto_rattach_admin_etabs() to authenticated;
grant execute on function auto_rattach_admins_to_new_etab() to authenticated;
grant execute on function ensure_single_active_template() to authenticated;
grant execute on function get_consent_validity_days() to authenticated;
grant execute on function mes_etablissements() to authenticated;
grant execute on function mes_structures() to authenticated;
grant execute on function patients_set_updated_at() to authenticated;
grant execute on function refresh_medecin_stats() to authenticated;
grant execute on function search_materiels(text) to authenticated;
grant execute on function search_patients(text) to authenticated;

-- Quelques autres potentiellement utiles si les signatures matchent :
do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname || '.' || p.proname ||
      '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' as full_name
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = false  -- pas SECURITY DEFINER
      and not exists (
        select 1 from pg_proc_acl pa
        join pg_authid r on r.oid = any(pa.aclitem::aclitem[]::oid[])
        where pa.objid = p.oid and r.rolname = 'authenticated'
      )
    limit 50
  loop
    begin
      execute format('grant execute on function %s to authenticated', fn.full_name);
      raise notice 'GRANT OK: %', fn.full_name;
    exception when others then
      raise notice 'GRANT FAILED: % (%)', fn.full_name, sqlerrm;
    end;
  end loop;
end $$;

-- 2) set search_path sur les fonctions SECURITY DEFINER qui n'en ont pas
-- (protection contre search path injection)
do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname || '.' || p.proname ||
      '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' as full_name,
      p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true   -- SECURITY DEFINER uniquement
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
        where cfg like 'search_path=%'
      )
  loop
    begin
      execute format('alter function %s set search_path = public, pg_temp', fn.full_name);
      raise notice 'SEARCH_PATH SET: %', fn.full_name;
    exception when others then
      raise notice 'SEARCH_PATH FAILED: % (%)', fn.full_name, sqlerrm;
    end;
  end loop;
end $$;

-- 3) Vérifier le résultat
select
  'fonctions definer sans search_path' as check_name,
  count(*) as remaining
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
  and not exists (
    select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
    where cfg like 'search_path=%'
  );
