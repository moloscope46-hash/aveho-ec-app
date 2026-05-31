-- ============================================================
--  AVEHO EC — Patch 0.37.0 (Drill-down heatmap + tendances N vs N-1)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  1) v_stats_activite_global : KPIs globaux + mois courant vs mois précédent
--  2) v_stats_activite_drill_heatmap : détail par jour/heure pour drill-down
--
--  La vue v_stats_rgpd_global a déjà des champs mois courant/précédent
--  (livrés en 0.30), donc on n'a rien à ajouter côté RGPD.
-- ============================================================

-- ============================================================
-- 1) Vue : Stats activité globales + tendances N vs N-1
-- ============================================================
-- Au modèle de v_stats_rgpd_global : KPIs globaux + comparaison
-- mois en cours vs mois précédent pour les badges de tendance.
create or replace view v_stats_activite_global as
select 
  a.structure_id,
  -- Compteurs globaux (90 derniers jours)
  count(*) filter (where a.created_at >= now() - interval '90 days') as actions_90j,
  count(*) filter (where a.created_at >= now() - interval '30 days') as actions_30j,
  count(*) filter (where a.created_at >= now() - interval '7 days') as actions_7j,
  count(distinct a.user_id) filter (where a.created_at >= now() - interval '30 days') as users_actifs_30j,

  -- Ce mois en cours
  count(*) filter (where a.created_at >= date_trunc('month', current_date)) as actions_ce_mois,
  count(*) filter (where 
    a.created_at >= date_trunc('month', current_date) 
    and a.action = 'creer' and a.entite = 'intervention'
  ) as di_ce_mois,
  count(*) filter (where 
    a.created_at >= date_trunc('month', current_date) 
    and a.action = 'creer' and a.entite = 'achat'
  ) as achats_ce_mois,
  count(*) filter (where 
    a.created_at >= date_trunc('month', current_date) 
    and a.action = 'creer' and a.entite = 'transfert'
  ) as transferts_ce_mois,
  count(distinct a.user_id) filter (where 
    a.created_at >= date_trunc('month', current_date)
  ) as users_ce_mois,
  count(*) filter (where 
    a.created_at >= date_trunc('month', current_date) 
    and a.action = 'valider'
  ) as validations_ce_mois,

  -- Mois précédent (pour calculer la tendance)
  count(*) filter (where 
    a.created_at >= date_trunc('month', current_date - interval '1 month')
    and a.created_at < date_trunc('month', current_date)
  ) as actions_mois_dernier,
  count(*) filter (where 
    a.created_at >= date_trunc('month', current_date - interval '1 month')
    and a.created_at < date_trunc('month', current_date)
    and a.action = 'creer' and a.entite = 'intervention'
  ) as di_mois_dernier,
  count(*) filter (where 
    a.created_at >= date_trunc('month', current_date - interval '1 month')
    and a.created_at < date_trunc('month', current_date)
    and a.action = 'creer' and a.entite = 'achat'
  ) as achats_mois_dernier,
  count(*) filter (where 
    a.created_at >= date_trunc('month', current_date - interval '1 month')
    and a.created_at < date_trunc('month', current_date)
    and a.action = 'creer' and a.entite = 'transfert'
  ) as transferts_mois_dernier,
  count(distinct a.user_id) filter (where 
    a.created_at >= date_trunc('month', current_date - interval '1 month')
    and a.created_at < date_trunc('month', current_date)
  ) as users_mois_dernier,
  count(*) filter (where 
    a.created_at >= date_trunc('month', current_date - interval '1 month')
    and a.created_at < date_trunc('month', current_date)
    and a.action = 'valider'
  ) as validations_mois_dernier
from audit_log a
group by a.structure_id;

-- ============================================================
-- 2) RPC pour drill-down heatmap (détail jour × heure)
-- ============================================================
-- Retourne les actions d'un créneau précis (jour de semaine × heure)
-- sur les 90 derniers jours. Utilisé par la modale drill-down.
--
-- Pourquoi RPC et pas vue : on a besoin de paramétrer dow + heure
-- + structure_id. Une vue paramétrée n'est pas idiomatique en PG.
create or replace function get_heatmap_drill(
  p_structure_id uuid,
  p_jour_semaine int,    -- 0 = dim, 1 = lun, ..., 6 = sam (convention PG)
  p_heure int,           -- 0-23
  p_limit int default 50
)
returns table (
  id uuid,
  action text,
  entite text,
  entite_id uuid,
  user_email text,
  user_id uuid,
  details jsonb,
  created_at timestamptz,
  jour_label text
)
language sql
stable
security invoker
as $$
  select 
    a.id,
    a.action,
    a.entite,
    a.entite_id,
    a.user_email,
    a.user_id,
    a.details,
    a.created_at,
    to_char(a.created_at, 'TMDy DD/MM HH24:MI') as jour_label
  from audit_log a
  where a.structure_id = p_structure_id
    and a.created_at >= now() - interval '90 days'
    and extract(dow from a.created_at)::int = p_jour_semaine
    and extract(hour from a.created_at)::int = p_heure
  order by a.created_at desc
  limit p_limit;
$$;

-- Grant pour les utilisateurs authentifiés (RLS audit_log s'applique de toute façon)
grant execute on function get_heatmap_drill(uuid, int, int, int) to authenticated;

-- ============================================================
-- FIN DU PATCH 0.37.0
-- ============================================================
-- Vérifications :
--
--   -- Vue globale
--   select * from v_stats_activite_global 
--   where structure_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
--
--   -- Drill-down d'un créneau (ex: lundi 14h)
--   select * from get_heatmap_drill(
--     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 
--     1,    -- lundi
--     14,   -- 14h
--     20
--   );
