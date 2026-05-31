-- ============================================================
--  AVEHO EC — Patch 0.51.0
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  AZ - Vue v_annonces_stats (taux de dismiss par annonce)
--  BA - Recherche full-text dans audit_log.details (index gin)
-- ============================================================

-- ============================================================
-- AZ - Vue statistiques annonces
-- Pour chaque annonce, calculer :
--   - nb_destinataires (membres de la structure au moment du calcul)
--   - nb_dismisses (combien d'users l'ont dismissée)
--   - taux_dismiss (en %)
-- ============================================================
create or replace view v_annonces_stats as
select 
  a.id,
  a.structure_id,
  a.titre,
  a.niveau,
  a.date_debut,
  a.date_fin,
  a.active,
  a.created_at,
  -- Nombre de destinataires (membres actifs de la structure)
  (select count(*) from membres_structure ms 
   where ms.structure_id = a.structure_id) as nb_destinataires,
  -- Nombre de dismisses
  (select count(*) from annonces_dismissees ad 
   where ad.annonce_id = a.id) as nb_dismisses,
  -- Taux de dismiss en %
  case 
    when (select count(*) from membres_structure ms 
          where ms.structure_id = a.structure_id) > 0 
    then round(
      100.0 * (select count(*) from annonces_dismissees ad 
               where ad.annonce_id = a.id)::numeric 
      / (select count(*) from membres_structure ms 
         where ms.structure_id = a.structure_id)::numeric, 
      1
    )
    else 0
  end as taux_dismiss_pct
from annonces a;

grant select on v_annonces_stats to authenticated;

-- ============================================================
-- BA - Index GIN sur audit_log.details pour recherche full-text
-- L'opérateur jsonb @@ et @? bénéficient d'un index GIN sur jsonb
-- Combiné avec un ::text ilike pour la recherche libre.
-- ============================================================
create index if not exists idx_audit_log_details_gin 
  on audit_log using gin (details);

-- Index supplémentaire pour la recherche en text cast (pattern '%texte%')
-- Note: trigram extension peut booster, mais pas universellement dispo.
-- On reste sur l'index gin classique pour la recherche jsonb structurée.

-- ============================================================
-- Reload PostgREST cache (réflexe 4)
-- ============================================================
notify pgrst, 'reload schema';

-- ============================================================
-- FIN DU PATCH 0.51.0
-- ============================================================
-- Vérifications :
--   select id, titre, nb_destinataires, nb_dismisses, taux_dismiss_pct 
--     from v_annonces_stats limit 5;
--   -- L'index GIN devrait être visible :
--   select indexname from pg_indexes 
--     where tablename = 'audit_log' and indexname like 'idx_audit_log_details%';
