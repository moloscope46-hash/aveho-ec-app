# Aveho — Espace Collectivité (mini-logiciel)

Application **Next.js + Supabase** : promotions des magasins, panier, validation de commande
et historique, le tout **cloisonné par structure** (chaque collectivité ne voit que ses
propres commandes, via les règles RLS de Supabase).

C'est un vrai logiciel fonctionnel : auth réelle, base de données réelle, déployable.

---

## Ce que ça fait

- **Connexion** par email / mot de passe (création de compte incluse).
- **Promotions** : cartes FLASH / DESTOCKAGE / NOUVEAU / PROMO / BONUS / ECO chargées depuis la base.
- **Panier** : on ajoute des promos, on ajuste les quantités.
- **Commande** : la validation crée une commande + ses lignes en base.
- **Historique** : liste des commandes de MA structure, dépliables ligne par ligne.
- **Cloisonnement** : les règles RLS garantissent qu'un utilisateur ne voit que les commandes de sa structure.

---

## Prérequis

- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit)
- [Node.js](https://nodejs.org) 18+ installé (pour tester en local, optionnel)

---


> **Mise à jour schéma** : si tu avais déjà créé la base avant le bloc « Magasins »,
> ré-exécute `supabase/schema.sql` (les `create table if not exists` n'ajoutent pas les
> nouvelles colonnes). Pour une base existante, ajoute-les à la main :
> `alter table magasins add column if not exists distance text, add column if not exists delai text, add column if not exists nb_articles int default 0, add column if not exists favori boolean default false, add column if not exists photo text, add column if not exists couleur text default '#5a8f8f';`

## Étape 1 — Créer le projet Supabase

1. Va sur https://supabase.com → **New project**.
2. Note le mot de passe de la base (tu peux le garder de côté).
3. Attends que le projet soit prêt (~2 min).

## Étape 2 — Créer les tables

1. Dans Supabase, ouvre **SQL Editor** → **New query**.
2. Copie-colle tout le contenu de `supabase/schema.sql`.
3. Clique **Run**. Ça crée les tables, les règles RLS, et insère des promotions + 2 structures de démo.
3. (Bloc référentiel) Exécute `supabase/02_referentiel.sql` (patients / articles / materiels / interventions + RLS).
4. (Bloc stock) Exécute `supabase/03_stock.sql` (dépôts / zones / stock_articles / transferts + RLS + démo).
5. (Bloc DI) Exécute `supabase/04_interventions.sql` (DI reliées matériel/patient/emplacement + transfert généré).
6. (Bloc établissement) Exécute `supabase/05_etablissement.sql` (bâtiments/étages/services/chambres/lits + RLS + démo).
7. (Bloc utilisateurs) Exécute `supabase/06_utilisateurs.sql` (rôles, services, invitations + RLS).
8. (Bloc collectivité) Exécute `supabase/07_collectivite.sql` (fiche collectivité, établissements, etablissement_id partout, rattachement utilisateur↔établissement + démo).


## Étape 3 — Récupérer les clés API

Dans Supabase → **Project Settings** → **API**, copie :
- **Project URL** → c'est `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → c'est `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Étape 4 — (Optionnel) Tester en local

```bash
cp .env.local.example .env.local      # puis colle tes 2 clés dedans
npm install
npm run dev                            # ouvre http://localhost:3000
```

## Étape 5 — Créer ton compte et te rattacher à une structure

1. Lance l'app (local ou déployée), clique **Créer un compte**, inscris-toi avec ton email.
   - Astuce : dans Supabase → **Authentication** → **Providers** → Email, tu peux désactiver
     « Confirm email » pendant les tests pour te connecter tout de suite.
2. Récupère ton identifiant : Supabase → **Authentication** → **Users** → copie ton `User UID`.
3. Rattache-toi à une structure : **SQL Editor**, exécute (en remplaçant l'UID) :

```sql
insert into membres_structure (user_id, structure_id, role)
values ('TON-USER-UID', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin');
```

(`aaaaaaaa-...` = Hôpital Cédric ; `bbbbbbbb-...` = EHPAD Bellevue.)

Sans ce rattachement, tu vois les promotions mais tu ne peux pas valider de commande
(c'est justement le cloisonnement qui fait son travail).

### Connexion par lien magique (magic link)
Le login propose « Recevoir un lien de connexion » (Supabase `signInWithOtp`). Active *Email > Magic Link* dans Supabase > Authentication > Providers, et configure les Redirect URLs (Site URL + /accueil).


## Application installable (PWA)
L'appli est une **PWA** : une fois déployée en HTTPS (Vercel), elle s'installe comme une vraie application.
- **Mobile** (Android/Chrome) : un bouton « Installer l'application Aveho » apparaît en bas. Sur **iPhone/Safari**, un bandeau explique : Partager → « Sur l'écran d'accueil » (iOS n'a pas de bouton automatique).
- **PC** (Chrome/Edge) : un bouton « Installer l'app » en haut à droite, ou l'icône d'installation dans la barre d'adresse.
- Fichiers : `public/manifest.json`, `public/sw.js` (service worker), `public/icons/`, composant `app/InstallPWA.js`.
- ⚠️ La PWA ne fonctionne **qu'en HTTPS** : en local (`npm run dev` sur http://localhost) l'installation peut ne pas être proposée, c'est normal. Teste sur l'URL Vercel.

## Étape 6 — Déployer sur Vercel

1. Mets ce dossier sur un dépôt GitHub (ou utilise `vercel` en CLI).
2. Va sur https://vercel.com → **Add New Project** → importe le dépôt.
3. Dans **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL` = ton Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ta clé anon
4. **Deploy**. Au bout d'une minute, tu as une URL publique.

Pense à ajouter cette URL Vercel dans Supabase → **Authentication** → **URL Configuration**
(Site URL + Redirect URLs) pour que l'auth fonctionne en production.

---

## Structure du code

```
app/
  layout.js          police + icônes
  globals.css        charte Aveho (fond foncé, cartes promo)
  page.js            redirection login/promotions
  login/page.js      connexion + inscription
  magasins/page.js   choix du magasin fournisseur (tuiles + photos)
  patients/page.js   CRUD patients finaux
  articles/page.js   CRUD articles (catalogue)
  materiels/page.js  CRUD matériels (série/parc/lot, lié article+patient)
  crud.js            composant CRUD générique réutilisable
  depots/page.js     CRUD dépôts (général EHPAD + déportés) & zones
  stock/page.js      stock articles par dépôt/zone + seuils d'alerte
  transferts/page.js transferts source↔destination + workflow statut
  interventions/page.js DI reliées matériel/patient/dépôt + génère un transfert
  etablissement/page.js schéma plan+arbre, KPIs, filtres croisés liés
  etablissement/lib.js  logique pure filtres/KPIs (testable)
  utilisateurs/page.js  membres, rôles personnalisables+droits, services, invitations
  kpis.js            rangée de KPIs réutilisable (toutes les pages)
  collectivite/page.js fiche collectivité (infos sociales) + CRUD établissements
  vue-globale/page.js  vue agrégée multi-établissements (écran de choix au login)
  promotions/page.js promotions depuis la base, ajout panier
  panier/page.js     récap + validation -> crée la commande
  commandes/page.js  historique cloisonné par structure
  TopBar.js          navigation + déconnexion
  useCart.js         panier (localStorage)
lib/supabase.js      client Supabase
lib/useAuth.js       garde auth + structure (factorisé)
lib/format.js        helpers (€, dates, statuts)
public/magasins/     photos de façades (figeac.jpg, brive.jpg…)
supabase/schema.sql       tables coeur + RLS + démo
supabase/02_referentiel.sql patients/articles/materiels/interventions + RLS
supabase/03_stock.sql       dépôts/zones/stock/transferts + RLS + démo
```

## Prochaines briques possibles

- Choix du magasin fournisseur en amont (la vue « Choisissez votre magasin »).
- Plusieurs structures par utilisateur + sélecteur de structure.
- Statuts de commande pilotés côté magasin (workflow — cf. tickets Jira).
- Notifications, documents, factures.
