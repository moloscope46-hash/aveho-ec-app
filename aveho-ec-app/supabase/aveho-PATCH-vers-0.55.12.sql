-- ============================================================
--  AVEHO EC — Patch 0.55.12 partie A
--  Refonte gestion utilisateurs : champs étendus, token invitation,
--  vue complète, policy mot de passe.
--  Idempotent — à exécuter dans Supabase > SQL Editor.
--
--  Préalables : patches 0.16 (telephone/poste/notes/date_arrivee),
--  06_utilisateurs (roles, membres_structure, invitations, membres_services).
-- ============================================================

-- ============================================================
-- 1) Champs étendus sur membres_structure
-- ============================================================
-- Le `nom_affiche` existant est un texte libre. On ajoute nom + prénom
-- séparés (pour tri par nom de famille, import CSV...), mobile distinct
-- du téléphone fixe, fonction détaillée (ex. "Infirmière coordinatrice
-- pôle gériatrie"), photo de profil, et préférences perso jsonb.
alter table membres_structure
  add column if not exists nom text,
  add column if not exists prenom text,
  add column if not exists mobile text,
  add column if not exists fonction_detail text,
  add column if not exists photo_url text,
  add column if not exists preferences jsonb not null default '{}'::jsonb;

-- Index pour tri rapide par nom
create index if not exists idx_ms_nom on membres_structure (structure_id, nom);

-- ============================================================
-- 2) Invitations enrichies : token + expiration + activated_at
-- ============================================================
-- Le `id` existe déjà mais c'est un uuid interne. On ajoute un token
-- séparé qui sera l'identifiant visible dans le lien d'inscription :
-- aveho-ec-app.vercel.app/inscription/{token}
-- Le token expire à 7 jours (modifiable par l'admin via la relance).
alter table invitations
  add column if not exists token uuid not null default gen_random_uuid(),
  add column if not exists expires_at timestamptz default (now() + interval '7 days'),
  add column if not exists activated_at timestamptz,
  add column if not exists prenom text,
  add column if not exists telephone text,
  add column if not exists mobile text,
  add column if not exists fonction_detail text;

-- Index unique sur le token (pour lookup rapide depuis la page inscription)
create unique index if not exists ux_invitations_token on invitations(token);
create index if not exists idx_invitations_expires on invitations(expires_at) where activated_at is null;

-- ============================================================
-- 3) Vue v_users_complete pour la page admin
-- ============================================================
-- Combine auth.users (email, dernière co) + membres_structure (infos
-- collectivité) + roles (nom/permissions). Une ligne par couple
-- user × structure.
create or replace view v_users_complete as
select
  ms.user_id,
  ms.structure_id,
  ms.role_id,
  r.nom               as role_nom,
  ms.nom_affiche,
  ms.nom,
  ms.prenom,
  ms.telephone,
  ms.mobile,
  ms.poste,
  ms.fonction_detail,
  ms.photo_url,
  ms.notes,
  ms.date_arrivee,
  ms.actif,
  ms.archive,
  ms.restreint_services,
  ms.preferences,
  u.email,
  u.last_sign_in_at,
  u.created_at        as user_created_at,
  u.email_confirmed_at,
  (u.email_confirmed_at is not null) as email_verifie
from membres_structure ms
left join auth.users u on u.id = ms.user_id
left join roles r on r.id = ms.role_id;

-- ============================================================
-- 4) RPC validate_password_policy
-- ============================================================
-- Renvoie un objet json { ok: bool, score: 0..4, problems: [string] }
-- Policy : min 12 char, 1 maj, 1 min, 1 chiffre, 1 special,
-- pas dans la blacklist des mdp courants.
create or replace function validate_password_policy(p text)
returns jsonb
language plpgsql
immutable
as $$
declare
  problems text[] := '{}';
  score int := 0;
  common_passwords text[] := array[
    'password', 'azerty', 'motdepasse', '123456', '12345678',
    '1234567890', 'qwerty', 'password123', 'admin', 'aveho',
    'soleil', 'iloveyou', 'welcome', 'monkey', 'azerty123',
    'P@ssword1', 'Password1!', 'Admin123!'
  ];
begin
  if length(p) < 12 then
    problems := array_append(problems, 'Au moins 12 caracteres');
  else
    score := score + 1;
  end if;

  if p !~ '[A-Z]' then
    problems := array_append(problems, 'Au moins 1 majuscule');
  else
    score := score + 1;
  end if;

  if p !~ '[a-z]' then
    problems := array_append(problems, 'Au moins 1 minuscule');
  end if;

  if p !~ '[0-9]' then
    problems := array_append(problems, 'Au moins 1 chiffre');
  else
    score := score + 1;
  end if;

  if p !~ '[^A-Za-z0-9]' then
    problems := array_append(problems, 'Au moins 1 caractere special');
  else
    score := score + 1;
  end if;

  if lower(p) = any(common_passwords) then
    problems := array_append(problems, 'Mot de passe trop commun');
    score := 0;
  end if;

  return jsonb_build_object(
    'ok', array_length(problems, 1) is null,
    'score', score,
    'problems', to_jsonb(problems)
  );
end $$;

-- ============================================================
-- 5) RPC accept_invitation(token, password, infos)
-- ============================================================
-- Appelée depuis la page /inscription/{token} après que l'utilisateur
-- a renseigné son mot de passe et ses infos. Cette RPC :
--   1. Valide le token (existe + non expire + non active)
--   2. Crée/met à jour le membres_structure avec les infos
--   3. Marque l'invitation activée
--
-- NB : la creation du user auth.users elle-meme se fait cote app
-- (supabase.auth.signUp) car la RPC n'a pas acces au mot de passe
-- en clair. Cette RPC ne fait QUE la partie metier post-signup.
create or replace function accept_invitation(
  p_token uuid,
  p_user_id uuid,
  p_nom text,
  p_prenom text,
  p_telephone text default null,
  p_mobile text default null,
  p_fonction_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inv invitations%rowtype;
begin
  -- 1) Vérifier l'invitation
  select * into inv from invitations
   where token = p_token
     and activated_at is null
     and (expires_at is null or expires_at > now());

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invitation invalide, expiree ou deja utilisee');
  end if;

  -- 2) Créer/upserter le membres_structure
  insert into membres_structure (
    user_id, structure_id, role_id, nom_affiche,
    nom, prenom, telephone, mobile, fonction_detail,
    actif, archive
  ) values (
    p_user_id, inv.structure_id, inv.role_id,
    coalesce(inv.nom_affiche, p_prenom || ' ' || p_nom),
    p_nom, p_prenom, p_telephone, p_mobile, p_fonction_detail,
    true, false
  )
  on conflict (user_id, structure_id) do update set
    role_id = excluded.role_id,
    nom = coalesce(excluded.nom, membres_structure.nom),
    prenom = coalesce(excluded.prenom, membres_structure.prenom),
    telephone = coalesce(excluded.telephone, membres_structure.telephone),
    mobile = coalesce(excluded.mobile, membres_structure.mobile),
    fonction_detail = coalesce(excluded.fonction_detail, membres_structure.fonction_detail),
    actif = true;

  -- 3) Marquer l'invitation activée
  update invitations
     set activated_at = now(),
         statut = 'Acceptee'
   where id = inv.id;

  return jsonb_build_object(
    'ok', true,
    'structure_id', inv.structure_id,
    'role_id', inv.role_id
  );
end $$;

-- Grant pour usage public (la fonction est SECURITY DEFINER donc
-- contrôle elle-même la validité du token)
grant execute on function accept_invitation(uuid, uuid, text, text, text, text, text) to authenticated, anon;
grant execute on function validate_password_policy(text) to authenticated, anon;

-- ============================================================
-- 6) RPC get_invitation_preview(token)
-- ============================================================
-- Lit les infos publiques d'une invitation (sans data sensible) pour
-- pre-remplir le formulaire d'inscription. Accessible meme non-loggue
-- (acces par le token).
create or replace function get_invitation_preview(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inv invitations%rowtype;
  role_nom text;
  structure_nom text;
begin
  select * into inv from invitations where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invitation introuvable');
  end if;

  if inv.activated_at is not null then
    return jsonb_build_object('ok', false, 'error', 'Invitation deja activee');
  end if;

  if inv.expires_at is not null and inv.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'Invitation expiree');
  end if;

  select nom into role_nom from roles where id = inv.role_id;
  select nom into structure_nom from structures where id = inv.structure_id;

  return jsonb_build_object(
    'ok', true,
    'email', inv.email,
    'nom_affiche', inv.nom_affiche,
    'prenom', inv.prenom,
    'role_nom', role_nom,
    'structure_nom', structure_nom,
    'telephone', inv.telephone,
    'mobile', inv.mobile,
    'fonction_detail', inv.fonction_detail,
    'expires_at', inv.expires_at
  );
end $$;

grant execute on function get_invitation_preview(uuid) to authenticated, anon;

-- ============================================================
-- 7) Politique RLS : invitations accessibles en lecture pour
--    valider un token (qu'on soit logge ou non, vu que c'est la
--    page d'inscription qui est publique).
-- ============================================================
-- La RPC get_invitation_preview est SECURITY DEFINER, donc bypass RLS.
-- On n'a pas besoin de créer de policy publique sur la table elle-meme.

-- Fin du patch 0.55.12 partie A
