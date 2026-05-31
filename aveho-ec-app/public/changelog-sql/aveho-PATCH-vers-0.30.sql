-- ============================================================
--  AVEHO EC — Patch 0.30.0 (Statistiques RGPD avancées)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  Crée des vues d'agrégation pour le dashboard stats RGPD :
--   - v_stats_rgpd_par_mois : nombre de signatures/refus par mois
--   - v_stats_rgpd_par_etab : compteurs par établissement
--   - v_stats_rgpd_expirations : expirations à 30/60/90 jours
--   - v_stats_rgpd_finalites : popularité des finalités acceptées/refusées
--   - v_stats_rgpd_global : compteurs globaux pour KPIs
-- ============================================================

-- ============================================================
-- 1) Vue : Stats par mois (12 derniers mois)
-- ============================================================
-- Une ligne par mois × structure, avec compteurs signés/refusés/archivés.
-- Utilisée pour le graphique en barres ou courbe sur 12 mois glissants.
create or replace view v_stats_rgpd_par_mois as
with mois as (
  -- Génère les 12 derniers mois (incluant le mois en cours)
  select 
    date_trunc('month', current_date - (i || ' months')::interval)::date as mois_debut,
    to_char(date_trunc('month', current_date - (i || ' months')::interval), 'YYYY-MM') as mois_iso,
    to_char(date_trunc('month', current_date - (i || ' months')::interval), 'TMMon YYYY') as mois_label
  from generate_series(0, 11) i
),
struct_mois as (
  select m.mois_debut, m.mois_iso, m.mois_label, s.id as structure_id, s.nom as structure_nom
  from mois m
  cross join structures s
)
select 
  sm.structure_id,
  sm.structure_nom,
  sm.mois_iso,
  sm.mois_label,
  sm.mois_debut,
  count(c.id) filter (where c.statut = 'signe' and not c.archive) as nb_signes,
  count(c.id) filter (where c.statut = 'refuse' and not c.archive) as nb_refuses,
  count(c.id) filter (where c.archive) as nb_archives,
  count(c.id) as nb_total
from struct_mois sm
left join consentements_rgpd c 
  on c.structure_id = sm.structure_id
  and c.created_at >= sm.mois_debut
  and c.created_at < (sm.mois_debut + interval '1 month')
group by sm.structure_id, sm.structure_nom, sm.mois_iso, sm.mois_label, sm.mois_debut
order by sm.structure_id, sm.mois_debut;

-- ============================================================
-- 2) Vue : Stats par établissement
-- ============================================================
create or replace view v_stats_rgpd_par_etab as
select 
  c.structure_id,
  c.etablissement_id,
  e.nom as etablissement_nom,
  count(c.id) filter (where c.statut = 'signe' and not c.archive) as nb_signes,
  count(c.id) filter (where c.statut = 'refuse' and not c.archive) as nb_refuses,
  count(c.id) filter (where c.archive) as nb_archives,
  count(c.id) filter (where 
    c.statut = 'signe' and not c.archive 
    and c.date_expiration is not null 
    and c.date_expiration <= (current_date + interval '30 days')
    and c.date_expiration >= current_date
  ) as nb_a_renouveler_30j,
  count(c.id) filter (where 
    c.statut = 'signe' and not c.archive 
    and c.date_expiration is not null 
    and c.date_expiration < current_date
  ) as nb_expires,
  count(c.id) as nb_total
from consentements_rgpd c
left join etablissements e on e.id = c.etablissement_id
group by c.structure_id, c.etablissement_id, e.nom
order by nb_signes desc;

-- ============================================================
-- 3) Vue : Expirations à venir (30 / 60 / 90 jours)
-- ============================================================
create or replace view v_stats_rgpd_expirations as
select 
  c.structure_id,
  count(c.id) filter (where
    c.date_expiration >= current_date 
    and c.date_expiration <= (current_date + interval '30 days')
  ) as nb_30j,
  count(c.id) filter (where
    c.date_expiration > (current_date + interval '30 days')
    and c.date_expiration <= (current_date + interval '60 days')
  ) as nb_31_60j,
  count(c.id) filter (where
    c.date_expiration > (current_date + interval '60 days')
    and c.date_expiration <= (current_date + interval '90 days')
  ) as nb_61_90j,
  count(c.id) filter (where
    c.date_expiration < current_date
  ) as nb_deja_expires
from consentements_rgpd c
where c.statut = 'signe' 
  and not c.archive 
  and c.date_expiration is not null
group by c.structure_id;

-- ============================================================
-- 4) Vue : Popularité des finalités
-- ============================================================
-- Pour chaque finalité possible, combien de fois elle a été acceptée
-- (finalites_acceptees est un text[] PostgreSQL natif, pas un jsonb)
create or replace view v_stats_rgpd_finalites as
with signes as (
  select structure_id, finalites_acceptees, id
  from consentements_rgpd
  where statut = 'signe' and not archive
    and finalites_acceptees is not null
),
finalites_explose as (
  select 
    structure_id,
    unnest(finalites_acceptees) as finalite_id
  from signes
)
select 
  structure_id,
  finalite_id,
  count(*) as nb_acceptations
from finalites_explose
group by structure_id, finalite_id
order by structure_id, nb_acceptations desc;

-- ============================================================
-- 5) Vue : Stats globales (KPIs)
-- ============================================================
create or replace view v_stats_rgpd_global as
select 
  structure_id,
  -- Compteurs globaux
  count(*) filter (where statut = 'signe' and not archive) as actifs,
  count(*) filter (where statut = 'refuse' and not archive) as refus,
  count(*) filter (where archive) as archives,
  count(*) as total,
  -- Mois en cours
  count(*) filter (where 
    statut = 'signe' and not archive 
    and created_at >= date_trunc('month', current_date)
  ) as signes_ce_mois,
  count(*) filter (where 
    statut = 'refuse' and not archive 
    and created_at >= date_trunc('month', current_date)
  ) as refus_ce_mois,
  -- Mois précédent (pour calculer la tendance)
  count(*) filter (where 
    statut = 'signe' and not archive 
    and created_at >= date_trunc('month', current_date - interval '1 month')
    and created_at < date_trunc('month', current_date)
  ) as signes_mois_dernier,
  -- Taux de refus (ratio refus / (signe + refus))
  case 
    when count(*) filter (where statut in ('signe','refuse') and not archive) > 0
    then round(
      100.0 * count(*) filter (where statut = 'refuse' and not archive)
      / count(*) filter (where statut in ('signe','refuse') and not archive),
      1
    )
    else 0
  end as taux_refus_pct,
  -- Vérifications QR (depuis consent_verifications)
  (select count(*) from consent_verifications v 
   join consentements_rgpd c on c.id = v.consentement_id 
   where c.structure_id = consentements_rgpd.structure_id) as nb_verifications,
  (select count(*) from consent_verifications v 
   join consentements_rgpd c on c.id = v.consentement_id 
   where c.structure_id = consentements_rgpd.structure_id and v.hash_match = true) as nb_verifs_valides,
  (select count(*) from consent_verifications v 
   join consentements_rgpd c on c.id = v.consentement_id 
   where c.structure_id = consentements_rgpd.structure_id and v.hash_match = false) as nb_verifs_invalides
from consentements_rgpd
group by structure_id;

-- ============================================================
-- FIN DU PATCH 0.30.0
-- ============================================================
-- Vérifications :
--
--   select * from v_stats_rgpd_global where structure_id = auth.uid();
--   select mois_iso, nb_signes, nb_refuses from v_stats_rgpd_par_mois 
--     where structure_id = 'XXX' order by mois_debut;
--   select * from v_stats_rgpd_expirations where structure_id = 'XXX';
--   select * from v_stats_rgpd_par_etab where structure_id = 'XXX';
--   select * from v_stats_rgpd_finalites where structure_id = 'XXX';
