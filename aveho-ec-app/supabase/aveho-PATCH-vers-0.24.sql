-- ============================================================
--  AVEHO EC — Patch 0.24.0 (Finition RGPD : auto-archivage + audit export)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) Configuration : seuil d'auto-archivage (jours après expiration)
-- ============================================================
-- Par défaut 180 jours (6 mois). Configurable par collectivité.
do $$
begin
  update structures
  set parametres = jsonb_set(coalesce(parametres, '{}'::jsonb), '{auto_archive_apres_jours}', '180'::jsonb, true)
  where not (parametres ? 'auto_archive_apres_jours') or parametres is null;
end $$;

-- ============================================================
-- 2) Fonction d'auto-archivage
-- ============================================================
-- À appeler depuis une Edge Function cron mensuel.
-- Archive les consentements signés expirés depuis > N jours
-- (N configuré par structure dans parametres.auto_archive_apres_jours).
-- Retourne le nombre de consentements archivés et un résumé par structure.
create or replace function auto_archive_consents_expires()
returns table (
  structure_id uuid,
  collectivite_nom text,
  count_archives int,
  exemple_consent_ids uuid[]
)
language plpgsql
security definer
as $$
begin
  return query
  with structures_config as (
    select 
      s.id,
      s.nom,
      coalesce((s.parametres->>'auto_archive_apres_jours')::int, 180) as seuil_jours
    from structures s
  ),
  a_archiver as (
    select 
      c.id,
      c.structure_id,
      sc.nom as collectivite_nom
    from consentements_rgpd c
    join structures_config sc on sc.id = c.structure_id
    where c.statut = 'signe'
      and not c.archive
      and c.date_expiration is not null
      and c.date_expiration < (current_date - (sc.seuil_jours || ' days')::interval)
  ),
  archive_result as (
    update consentements_rgpd
    set archive = true,
        notes = coalesce(notes || E'\n', '') || 
                'Auto-archivé le ' || to_char(current_date, 'DD/MM/YYYY') || 
                ' (expiré depuis plus de ' || 
                (select coalesce((s.parametres->>'auto_archive_apres_jours')::int, 180) 
                 from structures s where s.id = consentements_rgpd.structure_id) ||
                ' jours).'
    where id in (select id from a_archiver)
    returning consentements_rgpd.id, consentements_rgpd.structure_id
  )
  select 
    ar.structure_id,
    (select nom from structures where id = ar.structure_id) as collectivite_nom,
    count(*)::int as count_archives,
    array_agg(ar.id) filter (where ar.id is not null) as exemple_consent_ids
  from archive_result ar
  group by ar.structure_id;
end;
$$;

revoke execute on function auto_archive_consents_expires() from public;
revoke execute on function auto_archive_consents_expires() from anon;
grant execute on function auto_archive_consents_expires() to authenticated;

-- ============================================================
-- 3) Vue pour preview "que va archiver le cron mensuel"
-- ============================================================
-- Permet à l'admin de voir ce qui sera archivé au prochain passage du cron,
-- sans déclencher l'archivage.
create or replace view v_consents_a_auto_archiver as
select 
  c.id,
  c.structure_id,
  c.patient_id,
  c.patient_nom_prenom,
  c.date_signature,
  c.date_expiration,
  (current_date - c.date_expiration)::int as jours_depuis_expiration,
  coalesce((s.parametres->>'auto_archive_apres_jours')::int, 180) as seuil_jours_config,
  s.nom as collectivite_nom
from consentements_rgpd c
join structures s on s.id = c.structure_id
where c.statut = 'signe'
  and not c.archive
  and c.date_expiration is not null
  and c.date_expiration < (current_date - 
    (coalesce((s.parametres->>'auto_archive_apres_jours')::int, 180) || ' days')::interval)
order by c.date_expiration asc;

-- ============================================================
-- 4) Vue pour export CSV des vérifications (avec colonnes plates)
-- ============================================================
-- Optimisée pour export Excel/CSV. Pas de JSON ni d'array.
create or replace view v_audit_verifications_export as
select 
  v.id as verification_id,
  to_char(v.verified_at, 'YYYY-MM-DD HH24:MI:SS') as verification_date,
  case when v.hash_match then 'Valide' else 'Invalide' end as resultat,
  c.patient_nom_prenom as patient,
  to_char(c.date_signature, 'YYYY-MM-DD') as consent_signe_le,
  to_char(c.date_expiration, 'YYYY-MM-DD') as consent_expire_le,
  c.statut as consent_statut,
  case when c.archive then 'Oui' else 'Non' end as consent_archive,
  v.ip_address as origine_ip,
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
  end as systeme,
  v.hash_provided as hash_fourni,
  c.signature_hash as hash_attendu,
  c.structure_id,
  c.etablissement_id
from consent_verifications v
left join consentements_rgpd c on c.id = v.consentement_id
order by v.verified_at desc;

-- ============================================================
-- FIN DU PATCH 0.24.0
-- ============================================================
-- Vérifications :
--
--   -- Combien de consentements à auto-archiver ?
--   select count(*), sum(jours_depuis_expiration) from v_consents_a_auto_archiver;
--
--   -- Test de la fonction d'auto-archivage (à utiliser avec prudence !)
--   -- select * from auto_archive_consents_expires();
--
--   -- Export CSV des vérifications via PostgREST/Supabase REST :
--   --   GET /rest/v1/v_audit_verifications_export?structure_id=eq.<uuid>
