-- ============================================================
--  AVEHO EC — Patch 0.56.6
--  Sync Google Reviews : stockage des avis + cron de sync
--
--  Ajoute le google_place_id sur etablissements + table des
--  avis + RPC + cron 6h.
--  100% idempotent.
-- ============================================================

-- 1) Colonnes Google Places sur etablissements
alter table etablissements
  add column if not exists google_place_id text,         -- ChIJ... (clé Google Places)
  add column if not exists google_rating numeric(2, 1),  -- 4.7
  add column if not exists google_ratings_count int,     -- nb total d'avis
  add column if not exists google_last_sync_at timestamptz,
  add column if not exists google_sync_status text;      -- 'ok' / 'no_place_id' / 'api_error' / 'rate_limited'

create index if not exists idx_etablissements_google_place_id on etablissements(google_place_id)
  where google_place_id is not null;

-- 2) Table etablissements_avis_google
create table if not exists etablissements_avis_google (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissements(id) on delete cascade,
  structure_id uuid not null,

  -- Identification de l'avis Google (clé d'unicité)
  google_review_id text,                  -- hash time+author si pas d'ID stable Google
  author_name text not null,
  author_url text,
  author_profile_photo_url text,
  language text,                          -- 'fr', 'en', ...

  -- Contenu
  rating int not null check (rating between 1 and 5),
  relative_time_description text,         -- "il y a 2 mois"
  publish_time timestamptz,               -- date absolue de l'avis
  text_content text,                      -- corps de l'avis (peut être long)
  text_translated text,                   -- traduction FR si l'avis est en autre langue

  -- Réponse de l'établissement (si présente)
  reply_text text,
  reply_publish_time timestamptz,

  -- Méta
  fetched_at timestamptz default now(),
  raw_payload jsonb,                      -- copie brute pour debug futur

  constraint avis_google_unique unique nulls not distinct (etablissement_id, author_name, publish_time)
);

create index if not exists idx_avis_google_etab on etablissements_avis_google(etablissement_id, publish_time desc);
create index if not exists idx_avis_google_struct on etablissements_avis_google(structure_id, publish_time desc);
create index if not exists idx_avis_google_rating on etablissements_avis_google(rating);
create index if not exists idx_avis_google_fetched on etablissements_avis_google(fetched_at desc);

-- 3) RLS : isolation par structure
alter table etablissements_avis_google enable row level security;

drop policy if exists "avis_google_select" on etablissements_avis_google;
create policy "avis_google_select" on etablissements_avis_google for select to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "avis_google_insert" on etablissements_avis_google;
create policy "avis_google_insert" on etablissements_avis_google for insert to authenticated
  with check (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "avis_google_update" on etablissements_avis_google;
create policy "avis_google_update" on etablissements_avis_google for update to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

drop policy if exists "avis_google_delete" on etablissements_avis_google;
create policy "avis_google_delete" on etablissements_avis_google for delete to authenticated
  using (structure_id in (select structure_id from membres_structure where user_id = auth.uid()));

-- 4) Log des runs de sync (pour debug + UI admin)
create table if not exists google_sync_logs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz default now(),
  trigger_source text,                    -- 'cron' / 'manual'
  etablissements_total int default 0,
  etablissements_ok int default 0,
  etablissements_errors int default 0,
  nouveaux_avis int default 0,
  duration_ms int,
  details jsonb
);

create index if not exists idx_google_sync_logs_run_at on google_sync_logs(run_at desc);

alter table google_sync_logs enable row level security;
drop policy if exists "sync_logs_select" on google_sync_logs;
create policy "sync_logs_select" on google_sync_logs for select to authenticated using (true);

-- 5) RPC : insert batch des avis (depuis Edge Function)
create or replace function upsert_avis_google_batch(
  p_etablissement_id uuid,
  p_structure_id uuid,
  p_avis jsonb
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int := 0;
begin
  with src as (
    select * from jsonb_to_recordset(p_avis) as r(
      google_review_id text, author_name text, author_url text,
      author_profile_photo_url text, language text,
      rating int, relative_time_description text, publish_time timestamptz,
      text_content text, text_translated text,
      reply_text text, reply_publish_time timestamptz,
      raw_payload jsonb
    )
  ),
  ins as (
    insert into etablissements_avis_google (
      etablissement_id, structure_id,
      google_review_id, author_name, author_url, author_profile_photo_url, language,
      rating, relative_time_description, publish_time,
      text_content, text_translated,
      reply_text, reply_publish_time, raw_payload, fetched_at
    )
    select
      p_etablissement_id, p_structure_id,
      google_review_id, author_name, author_url, author_profile_photo_url, language,
      rating, relative_time_description, publish_time,
      text_content, text_translated,
      reply_text, reply_publish_time, raw_payload, now()
    from src
    where author_name is not null and rating is not null
    on conflict (etablissement_id, author_name, publish_time) do update set
      text_content = excluded.text_content,
      text_translated = excluded.text_translated,
      reply_text = excluded.reply_text,
      reply_publish_time = excluded.reply_publish_time,
      raw_payload = excluded.raw_payload,
      fetched_at = now()
    returning 1
  )
  select count(*) into inserted_count from ins;

  return inserted_count;
end;
$$;

grant execute on function upsert_avis_google_batch to authenticated;

-- 6) RPC : stats avis Google
create or replace function avis_google_stats() returns table (
  total_etablissements_avec_place_id bigint,
  total_avis bigint,
  avis_5_etoiles bigint,
  avis_4_etoiles bigint,
  avis_3_etoiles bigint,
  avis_2_etoiles bigint,
  avis_1_etoile bigint,
  rating_moyen numeric,
  dernier_avis_date timestamptz,
  derniere_sync timestamptz
)
language sql
security definer
set search_path = public
as $$
  with etabs as (
    select * from etablissements
    where structure_id in (select structure_id from membres_structure where user_id = auth.uid())
  ),
  avis as (
    select a.* from etablissements_avis_google a
    where a.structure_id in (select structure_id from membres_structure where user_id = auth.uid())
  )
  select
    (select count(*) from etabs where google_place_id is not null) as total_etablissements_avec_place_id,
    (select count(*) from avis) as total_avis,
    (select count(*) from avis where rating = 5) as avis_5_etoiles,
    (select count(*) from avis where rating = 4) as avis_4_etoiles,
    (select count(*) from avis where rating = 3) as avis_3_etoiles,
    (select count(*) from avis where rating = 2) as avis_2_etoiles,
    (select count(*) from avis where rating = 1) as avis_1_etoile,
    (select round(avg(rating)::numeric, 2) from avis) as rating_moyen,
    (select max(publish_time) from avis) as dernier_avis_date,
    (select max(google_last_sync_at) from etabs) as derniere_sync;
$$;

grant execute on function avis_google_stats to authenticated;

-- 7) Cron Supabase (pg_cron) — toutes les 6h
-- Note : nécessite l'extension pg_cron activée (sur Supabase, à activer depuis Database > Extensions)
-- L'appel HTTP vers l'Edge Function est fait via net.http_post (extension pg_net, déjà active sur Supabase)

-- Crée un job qui appelle l'Edge Function toutes les 6h
-- Configuration : URL de l'Edge Function + secret service_role (côté Vercel ENV variable côté Function)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Supprime l'ancien job s'il existe
    perform cron.unschedule('sync-google-reviews-cron') where exists (
      select 1 from cron.job where jobname = 'sync-google-reviews-cron'
    );

    -- Crée le nouveau job (configurable via cron.schedule)
    perform cron.schedule(
      'sync-google-reviews-cron',
      '0 */6 * * *',  -- minuit, 6h, 12h, 18h
      $job$
        select net.http_post(
          url := (select current_setting('app.settings.sync_google_reviews_url', true)),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select current_setting('app.settings.service_role_key', true))
          ),
          body := jsonb_build_object('trigger_source', 'cron')
        );
      $job$
    );
  else
    raise notice 'Extension pg_cron non activée — installer manuellement depuis Database > Extensions';
  end if;
end $$;

-- Fin du patch 0.56.6
