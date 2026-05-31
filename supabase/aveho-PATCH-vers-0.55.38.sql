-- ============================================================
--  AVEHO EC — Patch 0.55.38
--  Système d'alertes commentaires Google :
--   - Préférences par utilisateur (par étab : on/off)
--   - Table notifications alertes
--   - Historique des avis vus (pour ne pas re-alerter)
--  100% idempotent.
-- ============================================================

-- ============================================================
-- 1) Préférences utilisateur — alertes par établissement
-- ============================================================
create table if not exists user_review_alert_prefs (
  user_id uuid not null references auth.users(id) on delete cascade,
  structure_id uuid not null references structures(id) on delete cascade,
  etablissement_id uuid not null,  -- peut référencer etablissements OU etablissements_partenaires
  etablissement_kind text not null default 'mine',  -- 'mine' | 'partner'
  enabled boolean not null default true,
  min_rating int default 1,  -- alerte si rating >= ce seuil (1-5)
  max_rating int default 5,  -- alerte si rating <= ce seuil (utile pour mauvais avis)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, etablissement_id)
);

create index if not exists idx_review_prefs_user on user_review_alert_prefs(user_id) where enabled = true;
create index if not exists idx_review_prefs_struct on user_review_alert_prefs(structure_id, etablissement_id) where enabled = true;

alter table user_review_alert_prefs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'user_review_alert_prefs' and policyname = 'review_prefs_self_rw') then
    create policy review_prefs_self_rw on user_review_alert_prefs for all using (
      user_id = auth.uid()
    ) with check (
      user_id = auth.uid()
    );
  end if;
end $$;

-- ============================================================
-- 2) Avis Google déjà vus (pour ne pas re-notifier)
-- ============================================================
create table if not exists google_reviews_seen (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references structures(id) on delete cascade,
  etablissement_id uuid not null,
  google_place_id text not null,
  google_review_id text not null,  -- l'auteur+temps font l'ID unique chez Google
  author_name text,
  rating int,
  text text,
  published_at timestamptz,
  fetched_at timestamptz not null default now()
);

create unique index if not exists uniq_google_review on google_reviews_seen(structure_id, etablissement_id, google_review_id);
create index if not exists idx_google_reviews_etab on google_reviews_seen(etablissement_id, fetched_at desc);

alter table google_reviews_seen enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'google_reviews_seen' and policyname = 'google_reviews_member_r') then
    create policy google_reviews_member_r on google_reviews_seen for select using (
      structure_id in (select structure_id from membres_structure where user_id = auth.uid())
    );
  end if;
end $$;

-- ============================================================
-- 3) RPC : récupérer les préférences d'alerte d'un user
-- ============================================================
create or replace function get_my_review_alert_prefs()
returns table (
  etablissement_id uuid,
  etablissement_kind text,
  enabled boolean,
  min_rating int,
  max_rating int
)
language sql security definer set search_path = public as $$
  select etablissement_id, etablissement_kind, enabled, min_rating, max_rating
  from user_review_alert_prefs
  where user_id = auth.uid();
$$;

revoke all on function get_my_review_alert_prefs() from public;
grant execute on function get_my_review_alert_prefs() to authenticated;

-- ============================================================
-- 4) RPC : mettre à jour préférences (upsert)
-- ============================================================
create or replace function set_review_alert_pref(
  p_etablissement_id uuid,
  p_etablissement_kind text,
  p_structure_id uuid,
  p_enabled boolean,
  p_min_rating int default 1,
  p_max_rating int default 5
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  -- Vérif accès structure
  if not exists (
    select 1 from membres_structure
    where user_id = auth.uid() and structure_id = p_structure_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Permission refusée');
  end if;

  insert into user_review_alert_prefs
    (user_id, structure_id, etablissement_id, etablissement_kind, enabled, min_rating, max_rating)
  values
    (auth.uid(), p_structure_id, p_etablissement_id, p_etablissement_kind, p_enabled, p_min_rating, p_max_rating)
  on conflict (user_id, etablissement_id) do update
    set enabled = excluded.enabled,
        min_rating = excluded.min_rating,
        max_rating = excluded.max_rating,
        etablissement_kind = excluded.etablissement_kind,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function set_review_alert_pref(uuid, text, uuid, boolean, int, int) from public;
grant execute on function set_review_alert_pref(uuid, text, uuid, boolean, int, int) to authenticated;

-- ============================================================
-- 5) Notifications types (rappel — table 'notifications' déjà existante)
--    On rajoute juste un type 'google_review' dans le check si pas déjà
--    Pas de modification de schéma nécessaire ici.
-- ============================================================

-- Fin du patch 0.55.38
