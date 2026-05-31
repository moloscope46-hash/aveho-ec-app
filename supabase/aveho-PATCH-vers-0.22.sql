-- ============================================================
--  AVEHO EC — Patch 0.22.0 (RGPD pro : PDF + QR + renouvellement)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) Durée de validité du consentement
-- ============================================================
-- Par défaut 3 ans (1095 jours). Configurable par collectivité via
-- structures.parametres.consent_validite_jours (jsonb).
-- date_expiration calculée à la signature et stockée pour query rapide.
alter table consentements_rgpd
  add column if not exists date_expiration date,
  add column if not exists renouvellement_demande boolean not null default false,
  add column if not exists renouvellement_demande_at timestamptz,
  add column if not exists notification_30j_envoyee boolean not null default false;

-- Backfill date_expiration pour les consentements existants (3 ans après signature)
update consentements_rgpd
set date_expiration = (date_signature + interval '3 years')::date
where date_expiration is null
  and statut = 'signe';

-- Index pour les requêtes du cron de renouvellement
create index if not exists idx_consent_expiration 
  on consentements_rgpd (date_expiration) 
  where statut = 'signe' and not archive;

-- ============================================================
-- 2) Table d'audit des vérifications de hash (page publique)
-- ============================================================
-- Quand un auditeur scanne le QR, on enregistre la consultation
-- pour traçabilité (qui, quand, IP, depuis quel User-Agent).
-- N'expose JAMAIS le consentement complet, juste un statut bool.
create table if not exists consent_verifications (
  id uuid primary key default gen_random_uuid(),
  consentement_id uuid not null references consentements_rgpd(id) on delete cascade,
  hash_provided text not null,
  hash_match boolean not null,
  verified_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  -- Métadonnée optionnelle saisie par le vérifieur
  verified_by_note text
);

create index if not exists idx_verif_consent on consent_verifications (consentement_id);
create index if not exists idx_verif_date on consent_verifications (verified_at desc);

-- RLS : seuls les membres de la structure du consentement peuvent voir les vérifications
alter table consent_verifications enable row level security;

drop policy if exists "verif_select" on consent_verifications;
create policy "verif_select" on consent_verifications for select
  using (
    consentement_id in (
      select c.id from consentements_rgpd c
      join membres_structure ms on ms.structure_id = c.structure_id
      where ms.user_id = auth.uid()
    )
  );

-- Insert via Edge Function uniquement (service role bypass RLS)
-- Pas de policy insert pour les utilisateurs normaux

-- ============================================================
-- 3) RPC publique pour vérification d'intégrité
-- ============================================================
-- Appelée depuis la page /verifier/<consent_id> sans auth.
-- Vérifie si le hash fourni correspond, retourne un minimum
-- d'infos non-sensibles (statut, date, établissement).
-- Le service role peut l'appeler via Edge Function.

create or replace function verify_consent_hash(
  consent_id uuid,
  provided_hash text,
  client_ip text default null,
  client_ua text default null
)
returns table (
  is_valid boolean,
  statut text,
  date_signature timestamptz,
  date_expiration date,
  patient_initials text,
  etablissement_nom text,
  collectivite_nom text,
  expired boolean
)
language plpgsql
security definer
as $$
declare
  c record;
  matches boolean;
  initials text;
begin
  -- Récupérer le consentement
  select * into c from consentements_rgpd where id = consent_id;
  
  if not found then
    -- Trace tentative sur ID inconnu (peu d'info volée)
    return query select 
      false, 'introuvable'::text, null::timestamptz, null::date,
      null::text, null::text, null::text, false;
    return;
  end if;
  
  -- Vérifier le hash
  matches := (c.signature_hash = provided_hash);
  
  -- Trace audit
  insert into consent_verifications (
    consentement_id, hash_provided, hash_match, ip_address, user_agent
  ) values (
    consent_id, provided_hash, matches, client_ip, client_ua
  );
  
  -- Construire les initiales du patient (anonymisation partielle)
  if c.patient_nom_prenom is not null then
    initials := upper(
      substring(split_part(c.patient_nom_prenom, ' ', 1) from 1 for 1) ||
      coalesce(substring(split_part(c.patient_nom_prenom, ' ', -1) from 1 for 1), '')
    );
  end if;
  
  return query select 
    matches,
    c.statut,
    c.date_signature,
    c.date_expiration,
    initials,
    c.etablissement_nom,
    c.collectivite_nom,
    (c.date_expiration is not null and c.date_expiration < current_date);
end;
$$;

-- Permettre l'appel par les utilisateurs anonymes (page publique)
grant execute on function verify_consent_hash(uuid, text, text, text) to anon;
grant execute on function verify_consent_hash(uuid, text, text, text) to authenticated;

-- ============================================================
-- 4) Vue : consentements arrivant à expiration dans 30 jours
-- ============================================================
create or replace view v_consents_a_renouveler as
select 
  c.id,
  c.patient_id,
  c.patient_nom_prenom,
  c.structure_id,
  c.etablissement_id,
  c.date_signature,
  c.date_expiration,
  (c.date_expiration - current_date) as jours_restants,
  c.notification_30j_envoyee
from consentements_rgpd c
where c.statut = 'signe'
  and not c.archive
  and c.date_expiration is not null
  and c.date_expiration <= (current_date + interval '30 days')
  and c.date_expiration >= current_date  -- pas déjà expiré
order by c.date_expiration asc;

-- ============================================================
-- 5) Vue : consentements expirés (statut "expire" virtuel)
-- ============================================================
create or replace view v_consents_expires as
select 
  c.*,
  (current_date - c.date_expiration) as jours_depuis_expiration
from consentements_rgpd c
where c.statut = 'signe'
  and not c.archive
  and c.date_expiration is not null
  and c.date_expiration < current_date;

-- ============================================================
-- FIN DU PATCH 0.22.0
-- ============================================================
-- Vérifications :
--
--   -- Date expiration backfillée ?
--   select count(*) from consentements_rgpd where date_expiration is null and statut = 'signe';
--
--   -- Combien à renouveler dans 30j ?
--   select count(*) from v_consents_a_renouveler;
--
--   -- Combien expirés ?
--   select count(*) from v_consents_expires;
--
--   -- Test RPC publique (en SQL Editor connecté) :
--   select * from verify_consent_hash('un-uuid-existant'::uuid, 'un-hash', null, null);
