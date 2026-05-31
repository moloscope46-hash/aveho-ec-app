-- ============================================================
--  AVEHO EC — Assignation explicite des DI (Alpha 0.6)
--  Ajoute un utilisateur assigné optionnel sur les interventions.
--  Couplé avec la notification ciblée (logEvent.notifUserId).
--  À exécuter APRÈS 11_rls_etanche.sql
-- ============================================================

alter table interventions
  add column if not exists assignee_id uuid references auth.users(id) on delete set null,
  add column if not exists assignee_email text;   -- snapshot pour affichage rapide

create index if not exists idx_interv_assignee on interventions (assignee_id);
