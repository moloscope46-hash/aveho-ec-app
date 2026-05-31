# 🚀 Aveho — Espace Collectivité — Installation de ZÉRO (test en local)

> Objectif : partir de rien et arriver à une appli **fonctionnelle** sur ton PC.
> Temps estimé : 20-30 min. Aucune connaissance technique avancée requise, suis dans l'ordre.

---

## ÉTAPE 0 — Installer les outils (une seule fois)

1. **Node.js** (pour faire tourner l'appli) : va sur https://nodejs.org → télécharge la version **LTS** → installe (clique suivant partout).
   - Vérifie : ouvre un terminal (sur Windows : tape "cmd" dans le menu démarrer) et tape `node -v`. Tu dois voir un numéro (ex : v20.x).

2. **Décompresse** le fichier `aveho-ec-app.zip` quelque part de simple, par exemple `C:\aveho-ec-app` (Windows) ou ton Bureau.

---

## ÉTAPE 1 — Créer la base de données (Supabase)

1. Va sur https://supabase.com → **Start your project** → crée un compte (gratuit, avec Google ou email).
2. Clique **New project**.
   - Name : `aveho-ec`
   - Database Password : choisis-en un et **note-le** quelque part.
   - Region : **West EU (Paris)** ou la plus proche.
   - Clique **Create new project**. Attends ~2 min que ça se prépare.

---

## ÉTAPE 2 — Exécuter les scripts SQL (dans l'ORDRE)

⚠️ **L'ordre est obligatoire**, chaque script dépend du précédent.

1. Dans Supabase, menu de gauche → **SQL Editor** → **+ New query**.
2. Ouvre le fichier `supabase/schema.sql` (dans le dossier décompressé), **copie tout**, colle dans l'éditeur, clique **RUN** (en bas à droite). Tu dois voir "Success".
3. Recommence **exactement pareil**, un par un, dans cet ordre :
   - `supabase/02_referentiel.sql` → RUN
   - `supabase/03_stock.sql` → RUN
   - `supabase/04_interventions.sql` → RUN
   - `supabase/05_etablissement.sql` → RUN
   - `supabase/06_utilisateurs.sql` → RUN
   - `supabase/07_collectivite.sql` → RUN

> 💡 Si un script affiche une erreur, **arrête-toi** : c'est presque toujours qu'un script précédent n'a pas été lancé. Reprends dans l'ordre.

---

## ÉTAPE 3 — Récupérer tes clés Supabase

1. Menu de gauche → **Project Settings** (la roue dentée) → **API**.
2. Note ces deux valeurs (tu en auras besoin à l'étape 5) :
   - **Project URL** → ressemble à `https://abcd1234.supabase.co`
   - **anon public** (dans "Project API keys") → une longue chaîne `eyJ...`

---

## ÉTAPE 4 — Créer ton compte de connexion

1. Menu de gauche → **Authentication** → **Users** → **Add user** → **Create new user**.
   - Email : ton email (ex : `cedric@test.fr`)
   - Password : choisis un mot de passe → **Create user**.
2. **Désactive la confirmation par email** (sinon tu ne pourras pas te connecter en test) :
   - **Authentication** → **Providers** → **Email** → décoche **Confirm email** → **Save**.
3. **Rattache ton compte à la collectivité** (étape clé, sinon l'appli sera vide) :
   - Récupère ton **user_id** : Authentication → Users → clique sur ton utilisateur → copie l'**UID**.
   - Va dans **SQL Editor** → New query → colle ceci en remplaçant `TON-USER-ID` par l'UID copié :
     ```sql
     insert into membres_structure (user_id, structure_id, role)
     values ('TON-USER-ID', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin');
     ```
   - **RUN**. (C'est ce qui te relie à la collectivité de démo "Groupe Hospitalier Cédric" et ses 2 établissements.)

---

## ÉTAPE 5 — Lancer l'appli sur ton PC

1. Ouvre un terminal **dans le dossier** de l'appli :
   - Windows : ouvre le dossier `aveho-ec-app`, clique dans la barre d'adresse, tape `cmd`, Entrée.
   - Mac : clic droit sur le dossier → "Nouveau terminal au dossier".
2. Crée le fichier de configuration : dans le dossier, **copie** `.env.local.example` et **renomme** la copie en `.env.local`.
3. Ouvre `.env.local` avec le Bloc-notes et mets **tes** valeurs de l'étape 3 :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...(ta clé anon)
   ```
   Enregistre.
4. Dans le terminal, tape ces deux commandes (l'une après l'autre) :
   ```
   npm install
   npm run dev
   ```
   La 1re télécharge les composants (~1 min), la 2e démarre l'appli.
5. Ouvre ton navigateur sur **http://localhost:3000**
6. Connecte-toi avec l'email + mot de passe de l'étape 4.

✅ Tu devrais arriver sur la **Vue globale** avec tes 2 établissements (Hôpital Cédric + EHPAD Les Tilleuls), pouvoir basculer entre eux, voir patients/matériel/stock/DI, le plan de l'établissement, etc.

---

## Ce qui marche dès maintenant (en local)
- Connexion email/mot de passe, navigation complète, tous les écrans.
- Collectivité + établissements, sélecteur d'établissement, vue globale.
- Patients, articles, matériel (série/parc/lot), dépôts, zones, stock, transferts, DI.
- Page "Mon établissement" : plan/arbre, KPIs, filtres croisés.
- Création / modification / suppression partout, filtré par établissement.

## Ce qui ne marche PAS encore en local (normal)
- **L'installation PWA** (bouton "Installer l'app") : nécessite HTTPS. → voir étape 6.
- **Les emails de bienvenue** : nécessitent Resend + Edge Function. → voir INSTALLATION.md étape 5.
- **Le lien magique** (magic link) : nécessite la config email de Supabase.

---

## ÉTAPE 6 (plus tard) — Mettre en ligne pour tester la PWA
Quand le test local te convient, déploie sur Vercel (voir `INSTALLATION.md`, étape 4) :
tu auras une URL `https://...vercel.app`, et là le bouton d'installation de l'appli apparaîtra
sur mobile et PC.

---

## En cas de souci
- **Page blanche / "vous n'êtes rattaché à aucune structure"** → l'étape 4.3 (insert membres_structure) n'a pas été faite ou l'UID est faux.
- **Erreur de connexion** → la confirmation email n'a pas été désactivée (étape 4.2), ou mauvais mot de passe.
- **`npm` non reconnu** → Node.js mal installé (étape 0), ferme/rouvre le terminal.
- **Un écran est vide** → vérifie que tu es sur le bon établissement (sélecteur en haut) ; les données de démo sont sur "Hôpital Cédric".
- **Erreur SQL** → un script a été sauté ou lancé dans le désordre ; relance depuis `schema.sql`.
