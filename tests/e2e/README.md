# Tests E2E Playwright — Aveho EC

Tests bout-en-bout (end-to-end) pour Aveho EC, basés sur **Playwright 1.60.0** + Chromium, Firefox, WebKit (Safari) headless.

Complémentent les **2638 tests unitaires Vitest** par des scénarios vérifiant les pages depuis de vrais browsers.

## 📸 Visual regression testing (depuis 0.57.14, étendu en 0.57.15)

Détection automatique des changements UI subtils via comparaison pixel-par-pixel des screenshots.

```bash
# 1. Génère les baselines (1ère fois ou après changement UI volontaire)
npm run test:visual:update

# 2. À chaque commit : vérifie que rien n'a bougé visuellement
npm run test:visual
```

Les baselines sont stockées dans `tests/e2e/__screenshots__/visual-regression.spec.js/` (~4 MB pour 18 PNG). Versionner ce dossier avec git pour partager la référence avec l'équipe.

**18 baselines couvrent** :
- **Pages** : `/login` + `/mentions-legales` desktop
- **Composants** : Card login vide/rempli, signup mode, magic link section
- **Notes HTML** : headers des versions 0.55.0, 0.56.20, 0.57.0, 0.57.12 (clip 1280×800)
- **Mobile** : Pixel 5 (393×851) + iPhone SE (375×667)
- **Tablette** : iPad landscape (1024×768)
- **Desktop large** : 1920×1080
- **Sections** : Mentions légales Éditeur + footer (scroll bottom)

**Particularités** :
- Visual regression sur **Chromium uniquement** (les screenshots ne sont pas portables Firefox/WebKit)
- Le helper `setupPopupsSkip(context)` injecte le localStorage AVANT le 1er render pour skip les popups (géoloc, install PWA, biométrie opt-in)
- Le helper `prepareForScreenshot(page)` désactive toutes les animations CSS + attend `document.fonts.ready`
- Tolérance configurée par test via `maxDiffPixels` (100 desktop, 150 mobile)

## 🌐 Cross-browser (depuis 0.57.13)

Tests exécutés sur 5 environnements :
- **Chromium** (Desktop Chrome)
- **Firefox** (Desktop Firefox)
- **WebKit** (Desktop Safari) — révèle les bugs Safari/iOS souvent invisibles ailleurs
- **Mobile Chrome** (Pixel 5 viewport 393×851)
- **Mobile Safari** (iPhone 13 viewport 390×844)

Filtrer via `BROWSERS=...` :

```bash
# Tester uniquement Chromium (rapide)
BROWSERS=chromium npm run test:e2e

# Desktop seulement (3 browsers, pas mobile)
BROWSERS=chromium,firefox,webkit npm run test:e2e

# Mobile seulement
BROWSERS=Mobile npm run test:e2e

# Tous les 5 (par défaut)
npm run test:e2e
```

## 📋 Structure

```
tests/e2e/
├── fixtures.js                       Helpers partagés (loginHelper, DEMO_USER, mode SMOKE/FULL)
├── login.spec.js                     5 tests sur la page /login (form, biométrie, validation)
├── public-pages.spec.js              2 tests sur les pages publiques (mentions légales, accueil)
├── changelog.spec.js                 2 tests sur /changelog + accessibilité notes HTML
├── smoke-all-pages.spec.js           ~50 smoke tests : chaque page d'Aveho charge sans erreur JS
├── versions-features.spec.js         14 tests ciblés par version (0.56.20 → 0.57.11)
└── workflow-livraison-patient.spec.js Scénario login → patient → commande → BL (mode FULL)
```

## 🚀 Lancer les tests

### Premier lancement

```bash
# Installer les browsers Playwright (~300 MB total)
npx playwright install chromium firefox webkit
```

### Mode SMOKE (par défaut, sans Supabase configuré)

```bash
# Tous les tests, mode smoke
npm run test:e2e

# Ou directement
npx playwright test

# Un seul fichier
npx playwright test tests/e2e/login.spec.js

# Pattern
npx playwright test -g "Tabler Icons"
```

En mode SMOKE :
- Les tests qui n'ont pas besoin d'auth Supabase passent normalement
- Le workflow `login → patient → commande → BL` est **skipped** (nécessite vraies credentials)
- Les smoke tests acceptent que les pages auth-required redirigent vers /login

### Mode FULL (avec Supabase + credentials)

```bash
export E2E_MODE=FULL
export E2E_USER_EMAIL=ton_compte_test@example.com
export E2E_USER_PASSWORD=TonMotDePasse123!
export NEXT_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

npm run test:e2e
```

En mode FULL, le workflow E2E métier complet (`workflow-livraison-patient.spec.js`) sera exécuté :
1. Login avec credentials
2. Navigation vers /patients
3. Sélection d'un patient (skip si aucun patient dans la base)
4. Vérification /commandes, /livraisons accessibles
5. Vérification /consentements
6. Vérification /audit (trace de connexion)

## 🎯 Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `E2E_MODE` | `SMOKE` | `SMOKE` (rapide, sans auth) ou `FULL` (avec Supabase) |
| `E2E_USER_EMAIL` | `test@aveho-e2e.example.com` | Email du compte test |
| `E2E_USER_PASSWORD` | `TestE2E_2026!` | Mot de passe |
| `E2E_BASE_URL` | (auto) | URL à tester (override le webServer auto) |
| `E2E_USE_PROD_BUILD` | `true` | Lance `npm start` (prod) au lieu de `npm run dev` |
| `CI` | (vide) | En CI : retries=2, forbidOnly=true |

### Tester contre Vercel directement

```bash
E2E_BASE_URL=https://aveho-ec-app.vercel.app E2E_MODE=FULL \
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... \
npx playwright test
```

## 📊 Couverture actuelle

### Pages testées en smoke
- 2 pages publiques (/login, /mentions-legales)
- ~50 pages auth (toutes les routes principales d'Aveho)

### Features testées par version
| Version | Test |
|---------|------|
| 0.57.11 | Lazy JSON versions-index, fetch parallèle |
| 0.57.10 | NoteModal extrait lazy |
| 0.57.9 | Subset Tabler Icons CSS + fonts |
| 0.57.8 | next/font Quicksand + preconnect Supabase |
| 0.57.7 | chantiers-extra.json lazy |
| 0.57.6 | Lazy CodeViewer + SqlModal |
| 0.57.4 | Routes API protégées + headers OWASP |
| 0.57.0 | Migration Next 15 + React 19 |
| 0.56.20 | Hardening sécurité |

## 🔍 Debugging

```bash
# Lance avec UI interactive (debug visuel)
npx playwright test --ui

# Avec headed mode (voir le browser)
npx playwright test --headed

# Trace + screenshot pour 1 test
npx playwright test login --trace on --screenshot on

# Voir le rapport HTML après échec
npx playwright show-report
```

## 📦 CI/CD

Pour intégrer en CI (GitHub Actions, Vercel) :

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_TEST }}
    E2E_MODE: SMOKE
```

En CI, le mode SMOKE est suffisant pour valider qu'aucune régression majeure ne casse les pages.
Le mode FULL nécessite une base Supabase de test (à provisionner).

## 🦊 Particularités cross-browser

### WebKit (Safari)
- **WebAuthn / biométrie non dispo en headless** → le test biométrie accepte 0 ou 2 boutons en WebKit (vs strict 2 sur Chromium/Firefox)
- Pas de Service Worker pour des origins http en headless (mais OK en headed)
- CSS `:has()` supporté nativement

### Firefox
- Peut throw `NS_BINDING_ABORTED` lors de navigations rapides successives → retry automatique dans `smoke-all-pages.spec.js`
- `font-display: swap` peut se comporter différemment de Chrome
- Pas de support `WebGL2` headless dans certains environnements

### Chromium (Desktop Chrome / Pixel 5 mobile)
- Référence pour tous les comportements
- WebAuthn fonctionne en mode headless si on l'enable (mais désactivé par défaut)

## ⚠️ Limitations actuelles

1. **Mode SMOKE n'a pas d'auth réelle** : ne peut pas tester les UI au-delà du login (pages auth-required redirigent)
2. **Mode FULL nécessite une base Supabase de test** avec :
   - Au moins 1 user actif
   - Au moins 1 patient
   - Au moins 1 article au catalogue
3. **Tests parallèles désactivés** (`workers: 1`) : un seul navigateur à la fois pour pas surcharger le serveur Next local
4. **WebKit + WebAuthn** : ne fonctionne pas en headless → les tests biométrie sont skipped/tolérés en WebKit

## 🎬 Prochaines étapes possibles

- Tests Firefox + WebKit (cross-browser)
- Tests mobile (viewport 375x667)
- Tests avec données seedées (script pour créer un état Supabase reproductible)
- Tests visuels (screenshot comparison via `toHaveScreenshot`)
- Tests d'accessibilité automatisés (axe-core via `@axe-core/playwright`)
- Tests de perf (Lighthouse intégré via `playwright-lighthouse`)
