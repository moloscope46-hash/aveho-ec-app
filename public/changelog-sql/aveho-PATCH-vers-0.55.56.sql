-- ============================================================
--  AVEHO EC — Patch 0.55.56
--  Plan B RPPS : table de cache local du référentiel RPPS
--  Quand l'API ANS plante (403/timeout/5xx en prod Vercel),
--  on fallback sur cette table.
--
--  Seedée depuis le dump open data data.gouv.fr (~1,7M praticiens)
--  Mise à jour mensuelle manuelle ou via job cron.
--
--  100% idempotent.
-- ============================================================

create table if not exists rpps_dump (
  -- Identifiants
  rpps text primary key,                     -- 11 chiffres (clé unique nationale)
  adeli text,                                -- ancien identifiant (encore présent sur certains)

  -- État civil
  civilite text,                             -- M / Mme / Dr / Pr
  nom text not null,
  prenom text,

  -- Profession
  profession_code text,                      -- code G07 (ANS)
  profession_libelle text not null,          -- "Médecin", "Infirmier", etc.
  specialite_code text,                      -- code G15
  specialite_libelle text,                   -- "Cardiologie", etc.

  -- Mode d'exercice
  categorie_pro text,                        -- libéral / salarié / hospitalier
  mode_exercice text,

  -- Lieu d'exercice (peut être 0 à N — on prend le 1er enregistré)
  raison_sociale_lieu text,
  finess text,                               -- établissement si rattaché
  adresse text,
  complement_adresse text,
  code_postal text,
  ville text,
  code_insee_commune text,                   -- 5 chiffres INSEE
  telephone text,
  email text,
  latitude numeric(10, 7),                   -- géoloc si dispo
  longitude numeric(10, 7),

  -- Méta
  date_extrait date,                         -- date du dump source
  hash_check text,                           -- pour détecter les changements à la prochaine maj
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index pour recherches fréquentes
create index if not exists idx_rpps_dump_nom on rpps_dump using gin (to_tsvector('french', coalesce(nom,'') || ' ' || coalesce(prenom,'')));
create index if not exists idx_rpps_dump_nom_lower on rpps_dump (lower(nom));
create index if not exists idx_rpps_dump_profession on rpps_dump (profession_libelle);
create index if not exists idx_rpps_dump_specialite on rpps_dump (specialite_libelle);
create index if not exists idx_rpps_dump_cp on rpps_dump (code_postal);
create index if not exists idx_rpps_dump_ville on rpps_dump (lower(ville));
create index if not exists idx_rpps_dump_insee on rpps_dump (code_insee_commune)
  where code_insee_commune is not null;
create index if not exists idx_rpps_dump_coords on rpps_dump (latitude, longitude)
  where latitude is not null and longitude is not null;

-- Table de méta-info sur le seed (1 ligne)
create table if not exists rpps_dump_meta (
  id int primary key default 1,
  total_records int default 0,
  source_url text,
  source_extract_date date,
  last_seed_at timestamptz,
  last_seed_user_id uuid references auth.users(id),
  seed_status text default 'idle',           -- idle / seeding / completed / failed
  seed_message text,
  constraint single_row check (id = 1)
);

insert into rpps_dump_meta (id) values (1) on conflict do nothing;

-- RLS — lecture publique pour les utilisateurs authentifiés, écriture admin only
alter table rpps_dump enable row level security;
alter table rpps_dump_meta enable row level security;

drop policy if exists "rpps_dump read auth" on rpps_dump;
create policy "rpps_dump read auth" on rpps_dump for select to authenticated using (true);

drop policy if exists "rpps_dump_meta read auth" on rpps_dump_meta;
create policy "rpps_dump_meta read auth" on rpps_dump_meta for select to authenticated using (true);

-- Pour les inserts/updates, on passe par la fonction RPC ci-dessous (security definer)

-- Fonction RPC : recherche fallback locale (utilisée si API ANS KO)
-- Signature compatible avec ce qu'attend le code côté Next.js
create or replace function search_rpps_local(
  p_query text default null,
  p_profession text default null,
  p_code_postal text default null,
  p_ville text default null,
  p_limit int default 50
) returns table (
  rpps text,
  nom text,
  prenom text,
  civilite text,
  profession_libelle text,
  specialite_libelle text,
  raison_sociale_lieu text,
  finess text,
  adresse text,
  code_postal text,
  ville text,
  telephone text,
  email text,
  latitude numeric,
  longitude numeric,
  source text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.rpps, r.nom, r.prenom, r.civilite,
    r.profession_libelle, r.specialite_libelle,
    r.raison_sociale_lieu, r.finess,
    r.adresse, r.code_postal, r.ville,
    r.telephone, r.email,
    r.latitude, r.longitude,
    'dump_local'::text as source
  from rpps_dump r
  where
    (p_query is null or p_query = '' or (
      lower(r.nom) like '%' || lower(p_query) || '%'
      or lower(r.prenom) like '%' || lower(p_query) || '%'
      or r.rpps = p_query
    ))
    and (p_profession is null or p_profession = '' or
         lower(r.profession_libelle) like '%' || lower(p_profession) || '%')
    and (p_code_postal is null or p_code_postal = '' or r.code_postal = p_code_postal)
    and (p_ville is null or p_ville = '' or lower(r.ville) = lower(p_ville))
  limit greatest(1, least(p_limit, 200));
end;
$$;

grant execute on function search_rpps_local to authenticated;

-- Fonction RPC : statut du dump local
create or replace function rpps_dump_status() returns table (
  total_records int,
  source_extract_date date,
  last_seed_at timestamptz,
  seed_status text,
  seed_message text,
  age_jours int
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(m.total_records, 0),
    m.source_extract_date,
    m.last_seed_at,
    coalesce(m.seed_status, 'idle'),
    m.seed_message,
    case when m.last_seed_at is null then null
         else extract(day from (now() - m.last_seed_at))::int
    end as age_jours
  from rpps_dump_meta m
  where m.id = 1;
$$;

grant execute on function rpps_dump_status to authenticated;

-- Fin du patch 0.55.56
