-- ============================================================
--  AVEHO EC — Patch 0.41.0
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  1) I - RPC get_rgpd_heatmap_drill : drill cellule heatmap RGPD
--  2) L - Table maintenance_recurrences : échéances récurrentes
--  3) L - Vue v_stats_maintenances : KPIs par type
--  4) A - Tableau accueil_widget_config : widgets configurables avancés (optionnel, pour étendre la 0.6)
-- ============================================================

-- ============================================================
-- I - RPC drill-down heatmap signatures RGPD
-- ============================================================
-- Retourne les consentements signés d'un créneau précis sur 90 jours.
-- Reproduit la mécanique de get_heatmap_drill mais pour consentements_rgpd.
create or replace function get_rgpd_heatmap_drill(
  p_structure_id uuid,
  p_jour_semaine int,    -- 0 = dim, 1 = lun, ..., 6 = sam
  p_heure int,           -- 0-23
  p_limit int default 50
)
returns table (
  id uuid,
  patient_id uuid,
  patient_nom_prenom text,
  finalites_acceptees text[],
  version_template text,
  created_at timestamptz,
  jour_label text
)
language sql
stable
security invoker
as $$
  select 
    c.id,
    c.patient_id,
    coalesce(p.nom || ' ' || coalesce(p.prenom, ''), '—') as patient_nom_prenom,
    c.finalites_acceptees,
    c.version_template,
    c.created_at,
    to_char(c.created_at, 'TMDy DD/MM HH24:MI') as jour_label
  from consentements_rgpd c
  left join patients p on p.id = c.patient_id
  where c.structure_id = p_structure_id
    and c.statut = 'signe'
    and not c.archive
    and c.created_at >= now() - interval '90 days'
    and extract(dow from c.created_at)::int = p_jour_semaine
    and extract(hour from c.created_at)::int = p_heure
  order by c.created_at desc
  limit p_limit;
$$;
grant execute on function get_rgpd_heatmap_drill(uuid, int, int, int) to authenticated;

-- ============================================================
-- L - Table récurrences de maintenance
-- ============================================================
-- Liée à un matériel. Génère des rappels sur intervalle.
create table if not exists maintenance_recurrences (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references structures(id) on delete cascade,
  materiel_id uuid references materiels(id) on delete cascade,
  type text not null,                  -- 'Préventive' | 'Calibration' | 'Vérification' | 'Autre'
  libelle text,
  frequence_jours int not null,        -- ex: 90 (trimestriel), 365 (annuel)
  derniere_realisee timestamptz,
  prochaine_due date,
  actif boolean default true,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);
alter table maintenance_recurrences enable row level security;
drop policy if exists "maint_recur_select_struct" on maintenance_recurrences;
drop policy if exists "maint_recur_write_struct" on maintenance_recurrences;
create policy "maint_recur_select_struct" on maintenance_recurrences for select
  using (structure_id in (select mes_structures()));
create policy "maint_recur_write_struct" on maintenance_recurrences for all
  using (structure_id in (select mes_structures()));

create index if not exists idx_maint_recur_struct on maintenance_recurrences (structure_id);
create index if not exists idx_maint_recur_due on maintenance_recurrences (prochaine_due) where actif;

-- ============================================================
-- L - Vue stats maintenances par type
-- ============================================================
-- Note : table maintenances utilise statut='Faite' (pas 'Clôturée')
-- et date_realisee::date (pas cloturee_le::timestamptz)
create or replace view v_stats_maintenances as
select 
  m.structure_id,
  m.type,
  count(*) as nb_total,
  count(*) filter (where m.created_at >= now() - interval '30 days') as nb_30j,
  count(*) filter (where m.created_at >= now() - interval '7 days') as nb_7j,
  count(*) filter (where m.statut = 'Faite') as nb_cloturees,
  count(*) filter (where m.statut in ('Planifiée', 'À faire', 'En retard')) as nb_en_cours,
  avg(m.date_realisee - m.created_at::date)
    filter (where m.date_realisee is not null) as duree_moy_jours
from maintenances m
group by m.structure_id, m.type;

-- ============================================================
-- H - Trigger notif réponse signalement
-- ============================================================
-- Quand reponse passe de NULL à non-NULL, met reponse_notifie = false (à notifier).
-- L'envoi effectif est géré côté JS/Edge Function.
create or replace function trg_signalement_notif_reponse() returns trigger
language plpgsql as $$
begin
  if (OLD.reponse is null and NEW.reponse is not null)
     or (OLD.reponse is not null and NEW.reponse is not null and OLD.reponse <> NEW.reponse) then
    -- Marquer comme "à notifier" si pas encore notifié et qu'il y a un created_by (opt-in)
    if NEW.created_by is not null then
      NEW.reponse_notifie := false;
    end if;
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_signal_notif_reponse on signalements;
create trigger trg_signal_notif_reponse
  before update on signalements
  for each row execute function trg_signalement_notif_reponse();

-- ============================================================
-- FIN DU PATCH 0.41.0
-- ============================================================
-- Vérifications :
--
--   -- RPC drill RGPD
--   select * from get_rgpd_heatmap_drill(
--     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 1, 14, 20);
--
--   -- Table récurrences
--   select count(*) from maintenance_recurrences;
--
--   -- Vue stats maintenances
--   select * from v_stats_maintenances 
--   where structure_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
