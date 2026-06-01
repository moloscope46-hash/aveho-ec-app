-- ============================================================
--  AVEHO EC — Patch 0.56.20 v2 (tolérant aux fonctions absentes)
--  Grants manquants + search_path sur SECURITY DEFINER
--
--  v2 : tout passe par des boucles DO qui ignorent les erreurs
--       (pour pas planter si une fonction n'existe pas)
-- ============================================================

-- 1) Grant execute sur toutes les fonctions de public où
--    authenticated n'a pas déjà l'execute
do $$
declare
  fn record;
  granted_count int := 0;
  failed_count int := 0;
begin
  for fn in
    select
      n.nspname || '.' || p.proname ||
      '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' as full_name,
      p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not has_function_privilege('authenticated', p.oid, 'execute')
  loop
    begin
      execute format('grant execute on function %s to authenticated', fn.full_name);
      granted_count := granted_count + 1;
    exception when others then
      failed_count := failed_count + 1;
      raise notice 'GRANT FAILED: % (%)', fn.proname, sqlerrm;
    end;
  end loop;
  raise notice '=== GRANTS : % réussis, % échoués ===', granted_count, failed_count;
end $$;

-- 2) ALTER FUNCTION ... SET search_path sur les SECURITY DEFINER vulnérables
do $$
declare
  fn record;
  altered_count int := 0;
  failed_count int := 0;
begin
  for fn in
    select
      n.nspname || '.' || p.proname ||
      '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' as full_name,
      p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
        where cfg like 'search_path=%'
      )
  loop
    begin
      execute format('alter function %s set search_path = public, pg_temp', fn.full_name);
      altered_count := altered_count + 1;
    exception when others then
      failed_count := failed_count + 1;
      raise notice 'ALTER FAILED: % (%)', fn.proname, sqlerrm;
    end;
  end loop;
  raise notice '=== SEARCH_PATH : % définis, % échoués ===', altered_count, failed_count;
end $$;

-- 3) Vérification finale
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and not has_function_privilege('authenticated', p.oid, 'execute'))
  as fonctions_sans_grant,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef = true
     and not exists (select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg where cfg like 'search_path=%'))
  as definer_sans_search_path;
