# Aveho — Espace Collectivité — Procédure d'installation (Alpha 0.1)

## 1. Prérequis
- Un compte **Supabase** (gratuit) — https://supabase.com
- Un compte **Vercel** (gratuit) — https://vercel.com
- Node.js 18+ installé sur ton PC (pour tester en local)
- (Optionnel, pour les emails) un compte **Resend** — https://resend.com

## 2. Base de données Supabase
1. Crée un projet Supabase. Note l'**URL du projet** et la **clé anon** (Settings → API).
2. Ouvre **SQL Editor** et exécute les scripts du dossier `supabase/` **dans l'ordre** :
   1. `schema.sql`
   2. `02_referentiel.sql`
   3. `03_stock.sql`
   4. `04_interventions.sql`
   5. `05_etablissement.sql`
   6. `06_utilisateurs.sql`
   7. `07_collectivite.sql`
3. Crée ton compte : Authentication → Users → Add user (email + mot de passe).
4. Rattache ton compte à la collectivité de démo : dans SQL Editor, exécute
   `insert into membres_structure (user_id, structure_id) values ('TON_USER_ID', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');`
   (récupère TON_USER_ID dans Authentication → Users).

## 3. Lancer en local
```
npm install
cp .env.local.example .env.local   # puis renseigne URL + clé anon
npm run dev
```
Ouvre http://localhost:3000

## 4. Déployer sur Vercel (pour la PWA + HTTPS)
1. Pousse le projet sur GitHub.
2. Sur Vercel : New Project → importe le repo.
3. Variables d'environnement : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. L'appli est en HTTPS → la PWA devient installable (bouton mobile / PC).

## 5. Emails de bienvenue (optionnel mais recommandé)
1. Crée un compte Resend, récupère une **API key**, vérifie un domaine d'envoi.
2. Déploie l'Edge Function :
   ```
   supabase functions deploy invite-user
   supabase secrets set RESEND_API_KEY=xxx SITE_URL=https://ton-app.vercel.app
   ```
3. Dans `supabase/functions/invite-user/index.ts`, colle le contenu de `_email-template.html` dans la constante TEMPLATE, et remplace l'expéditeur par ton domaine vérifié.
4. Désormais, "Inviter un utilisateur" (page Utilisateurs) crée le compte ET envoie le mail de bienvenue.

> Sans cette étape, les invitations sont **enregistrées** dans l'app mais l'email n'est pas envoyé automatiquement.

## Notes Alpha 0.1
- Le filtrage par établissement et les droits de rôle sont gérés côté application (pas encore verrouillés en RLS par établissement/service).
- Les transferts tracent le mouvement mais ne décrémentent pas encore le stock à réception.
- SSO / carte CPS : UX en place, non branchés (nécessitent des fournisseurs externes).
