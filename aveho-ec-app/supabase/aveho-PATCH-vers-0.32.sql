-- ============================================================
--  AVEHO EC — Patch 0.32.0 (Signalements perso opt-in)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  Ajoute une colonne created_by NULLABLE sur signalements.
--  L'anonymat reste le défaut : created_by est NULL sauf si
--  l'utilisateur a explicitement coché "Publier avec ma signature".
--  Permet de tracker ses propres signalements dans /profil et stats.
-- ============================================================

-- ============================================================
-- 1) Ajout colonne created_by NULLABLE (préserve l'anonymat)
-- ============================================================
alter table signalements
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- ============================================================
-- 2) Index sur created_by pour les requêtes /profil (rapide)
-- ============================================================
create index if not exists idx_signal_created_by 
  on signalements (created_by) 
  where created_by is not null;

-- ============================================================
-- 3) NOTE IMPORTANTE — Anonymat préservé
-- ============================================================
-- created_by est NULL par défaut.
-- L'UI ne renseigne created_by QUE si l'utilisateur a explicitement
-- choisi "Publier avec ma signature" (case à cocher décochée par défaut).
--
-- Aucune contrainte NOT NULL ajoutée. Aucune backfill rétroactive.
-- Les signalements existants restent anonymes.
--
-- RLS inchangé : tout membre de la collectivité voit tous les signalements
-- (anonymes ou signés), comme avant.

-- ============================================================
-- 4) Helper view : signalements signés par user
-- ============================================================
-- Utilisée par la stat activité par user (0.31) pour ajouter
-- un compteur nb_signalements_signes par user.
create or replace view v_signalements_par_user as
select 
  structure_id,
  created_by as user_id,
  count(*) as nb_signalements_signes,
  count(*) filter (where statut = 'Nouveau') as nb_nouveaux,
  count(*) filter (where statut = 'Traité') as nb_traites,
  max(created_at) as dernier_signalement
from signalements
where created_by is not null
group by structure_id, created_by;

-- ============================================================
-- FIN DU PATCH 0.32.0
-- ============================================================
-- Vérifications :
--
--   -- La colonne existe ?
--   select column_name, data_type, is_nullable 
--   from information_schema.columns 
--   where table_name = 'signalements' and column_name = 'created_by';
--
--   -- Combien de signalements signés ?
--   select count(*) as total, 
--          count(*) filter (where created_by is not null) as signes,
--          count(*) filter (where created_by is null) as anonymes
--   from signalements 
--   where structure_id = 'XXX';
