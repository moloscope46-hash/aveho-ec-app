-- ============================================================
--  AVEHO EC — Patch 0.46.0
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  1) Y - Extension pg_stat_statements + vue agrégée
-- ============================================================

-- ============================================================
-- Y - pg_stat_statements : extension Postgres pour mesurer les
-- requêtes lentes. Déjà préinstallée sur Supabase (juste à activer).
-- ============================================================
create extension if not exists pg_stat_statements;

-- ============================================================
-- Vue pour exposer les top 50 requêtes lentes aux admins
-- (sans exposer les paramètres pour la confidentialité)
-- ============================================================
-- Cette vue est restreinte aux admins via une RPC security definer
-- (au lieu d'une vue avec RLS, car pg_stat_statements ne supporte pas RLS).
create or replace function get_top_slow_queries(p_limit int default 50)
returns table (
  query text,
  calls bigint,
  total_exec_time double precision,
  mean_exec_time double precision,
  min_exec_time double precision,
  max_exec_time double precision,
  stddev_exec_time double precision,
  rows bigint
)
language sql
security definer
as $$
  select 
    -- Anonymise la query : on enlève les valeurs litérales
    regexp_replace(
      regexp_replace(
        regexp_replace(s.query, '''[^'']*''', '?', 'g'),
        '\$\d+', '$N', 'g'
      ),
      '\d+', 'N', 'g'
    ) as query,
    s.calls,
    s.total_exec_time,
    s.mean_exec_time,
    s.min_exec_time,
    s.max_exec_time,
    s.stddev_exec_time,
    s.rows
  from pg_stat_statements s
  where s.query not like '%pg_stat_statements%'
    and s.query not like '%pg_catalog%'
    and s.query not like 'COMMIT%'
    and s.query not like 'BEGIN%'
    and s.query not like 'SET %'
  order by s.mean_exec_time desc
  limit p_limit;
$$;

grant execute on function get_top_slow_queries(int) to authenticated;

-- ============================================================
-- RPC pour reset les stats (utile après une optim pour mesurer)
-- ============================================================
create or replace function reset_query_stats()
returns void
language sql
security definer
as $$
  select pg_stat_statements_reset();
$$;

grant execute on function reset_query_stats() to authenticated;

-- ============================================================
-- Recharger le cache PostgREST (réflexe 0.43)
-- ============================================================
notify pgrst, 'reload schema';

-- ============================================================
-- FIN DU PATCH 0.46.0
-- ============================================================
-- Vérification :
--   select * from get_top_slow_queries(10);
--   → tu dois voir les 10 requêtes les plus lentes en moyenne
