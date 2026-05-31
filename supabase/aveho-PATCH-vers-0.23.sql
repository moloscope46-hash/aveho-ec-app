-- ============================================================
--  AVEHO EC — Patch 0.23.0 (RGPD opérationnel : cron + admin + config)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) Durée de validité configurable par collectivité
-- ============================================================
-- On stocke dans structures.parametres (jsonb existant ou créé).
-- Par défaut 1095 jours (3 ans). L'utilisateur admin peut modifier
-- via la page /parametres.
alter table structures
  add column if not exists parametres jsonb default '{}'::jsonb;

-- Backfill : si pas encore défini, on met 1095 (3 ans)
update structures
set parametres = jsonb_set(coalesce(parametres, '{}'::jsonb), '{consent_validite_jours}', '1095'::jsonb, true)
where not (parametres ? 'consent_validite_jours') or parametres is null;

-- Helper SQL : retourne le nombre de jours de validité pour une structure
create or replace function get_consent_validity_days(p_structure_id uuid)
returns int
language sql
stable
as $$
  select coalesce(
    (parametres->>'consent_validite_jours')::int,
    1095
  )
  from structures
  where id = p_structure_id;
$$;

-- ============================================================
-- 2) Vue enrichie pour le cron de renouvellement
-- ============================================================
-- Cette vue est utilisée par l'Edge Function send-renouvellement-rappels.
-- Elle remonte les consentements qui :
--   - sont signés et non archivés
--   - expirent dans 0 à 30 jours (préavis)
--   - n'ont pas encore reçu de notification 30j
-- + les infos pour notifier : structure (push), DPO email si configuré
create or replace view v_consents_a_notifier as
select 
  c.id,
  c.structure_id,
  c.etablissement_id,
  c.patient_id,
  c.patient_nom_prenom,
  c.date_signature,
  c.date_expiration,
  (c.date_expiration - current_date)::int as jours_restants,
  s.nom as collectivite_nom,
  s.parametres->>'dpo_email' as dpo_email,
  e.nom as etablissement_nom
from consentements_rgpd c
left join structures s on s.id = c.structure_id
left join etablissements e on e.id = c.etablissement_id
where c.statut = 'signe'
  and not c.archive
  and c.date_expiration is not null
  and c.date_expiration <= (current_date + interval '30 days')
  and c.date_expiration >= current_date
  and not c.notification_30j_envoyee
order by c.date_expiration asc;

-- ============================================================
-- 3) Vue audit des vérifications publiques de hash (scans QR)
-- ============================================================
-- Utilisée par la page admin /consent-verifications.
-- Joint avec le consentement pour donner le contexte (patient anonymisé).
create or replace view v_audit_verifications as
select 
  v.id,
  v.consentement_id,
  v.verified_at,
  v.hash_match,
  v.hash_provided,
  v.ip_address,
  v.user_agent,
  v.verified_by_note,
  c.structure_id,
  c.etablissement_id,
  c.patient_nom_prenom,
  c.date_signature,
  c.statut as consent_statut,
  -- Détection navigateur/OS grossière depuis user_agent
  case 
    when v.user_agent ilike '%firefox%' then 'Firefox'
    when v.user_agent ilike '%edg/%' then 'Edge'
    when v.user_agent ilike '%chrome%' then 'Chrome'
    when v.user_agent ilike '%safari%' and v.user_agent not ilike '%chrome%' then 'Safari'
    else 'Autre'
  end as navigateur,
  case
    when v.user_agent ilike '%android%' then 'Android'
    when v.user_agent ilike '%iphone%' or v.user_agent ilike '%ipad%' then 'iOS'
    when v.user_agent ilike '%windows%' then 'Windows'
    when v.user_agent ilike '%mac os%' then 'macOS'
    when v.user_agent ilike '%linux%' then 'Linux'
    else 'Autre'
  end as os
from consent_verifications v
left join consentements_rgpd c on c.id = v.consentement_id
order by v.verified_at desc;

-- RLS : seuls les membres de la structure du consentement peuvent voir les vérifs
-- (déjà couvert par la policy de consent_verifications définie en 0.22)

-- ============================================================
-- 4) RPC pour marquer notification_30j_envoyee
-- ============================================================
-- Utilisée par l'Edge Function après envoi des rappels.
-- SECURITY DEFINER car bypass RLS (service_role).
create or replace function mark_consent_notified(consent_ids uuid[])
returns int
language sql
security definer
as $$
  update consentements_rgpd
  set notification_30j_envoyee = true
  where id = any(consent_ids);
  select cardinality(consent_ids);
$$;

revoke execute on function mark_consent_notified(uuid[]) from public;
revoke execute on function mark_consent_notified(uuid[]) from anon;
-- Authentifié OK (l'Edge Function utilise service_role qui contourne tout)
grant execute on function mark_consent_notified(uuid[]) to authenticated;

-- ============================================================
-- 5) Reset des flags notification quand on demande un renouvellement
-- ============================================================
-- Si l'utilisateur clique "Demander renouvellement" sur un consentement,
-- il faut que la prochaine signature recommence le cycle de notification.
-- Pas de logique côté SQL pour l'instant — c'est implicite : la nouvelle
-- ligne consentement aura notification_30j_envoyee=false par défaut.

-- ============================================================
-- FIN DU PATCH 0.23.0
-- ============================================================
-- Vérifications :
--
--   -- Paramètres structure ?
--   select id, nom, parametres->>'consent_validite_jours' as validite_jours,
--          parametres->>'dpo_email' as dpo_email
--   from structures;
--
--   -- Combien à notifier ?
--   select count(*) from v_consents_a_notifier;
--
--   -- Audit des vérifs ?
--   select count(*) from v_audit_verifications;
--
--   -- Test helper :
--   select get_consent_validity_days('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
