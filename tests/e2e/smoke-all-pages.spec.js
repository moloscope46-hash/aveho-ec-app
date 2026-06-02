// =============================================================
//  tests/e2e/smoke-all-pages.spec.js (Alpha 0.57.12)
//
//  Smoke tests E2E pour TOUTES les pages d'Aveho EC.
//  Vérifie que chaque page :
//   1. Répond avec un code HTTP 200 (pas 500, pas crash serveur)
//   2. Charge sans erreur JavaScript runtime (console.error)
//   3. Affiche au minimum le titre "Aveho"
//
//  En mode SMOKE (par défaut), on accepte que les pages auth-required
//  redirigent vers /login. Le but est juste de vérifier qu'il n'y a
//  pas de crash serveur ou de page blanche.
// =============================================================

import { test, expect } from "./fixtures";

// Liste exhaustive des pages d'Aveho EC à smoke-tester.
// Group A = pages publiques (sans auth)
// Group B = pages avec auth (redirect vers /login si pas connecté = OK)
const PUBLIC_PAGES = [
  "/login",
  "/mentions-legales",
];

// Routes réelles dans app/ (vérifiées)
const AUTH_PAGES = [
  // Dashboards
  "/accueil",
  "/vue-globale",
  "/direction",
  "/digest-dashboard",
  // Patients & soin
  "/patients",
  "/equipes",
  "/interventions",
  // Catalogue & commandes
  "/articles",
  "/commandes",
  "/achats",
  "/panier",
  "/promotions",
  // Stock & magasin
  "/depots",
  "/magasins",
  "/stock",
  "/transferts",
  // Matériel
  "/materiels",
  "/tags-materiel",
  "/etiquettes",
  "/maintenance",
  // Annuaire & ref
  "/annuaire-rpps",
  "/partenaires-rpps",
  "/etablissement",
  "/etablissements",
  "/etablissements-partenaires",
  "/collectivite",
  // Documents
  "/consentements",
  "/consent-verifications",
  // RGPD & sécurité
  "/parametres-rgpd",
  "/audit",
  "/app-logs",
  "/historique",
  "/journal",
  // Stats
  "/statistiques",
  "/statistiques-activite",
  "/statistiques-interventions",
  "/statistiques-rgpd",
  // Carte
  "/carte",
  // Admin
  "/utilisateurs",
  "/admin-perf",
  "/webhooks",
  // Communication
  "/annonces",
  "/signalements",
  "/templates-signalements",
  // Misc
  "/calendrier",
  "/changelog",
  "/profil",
  "/parametres",
  "/statut",
];

test.describe("Smoke pages publiques", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} se charge sans erreur`, async ({ page, browserName }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      let response;
      try {
        response = await page.goto(path);
      } catch (e) {
        // 0.57.13 : Firefox peut throw NS_BINDING_ABORTED si une nav précédente
        // est rapidement interrompue. On retente une fois.
        if (browserName === "firefox" && e.message.includes("NS_BINDING_ABORTED")) {
          await page.waitForTimeout(500);
          response = await page.goto(path);
        } else {
          throw e;
        }
      }
      expect(response.status(), `${path} doit répondre 200`).toBe(200);
      await expect(page, `${path} doit avoir un titre Aveho`).toHaveTitle(/Aveho/i);
      // Filtrer les erreurs non critiques (hydration en build prod, ResizeObserver, etc.)
      const critical = errors.filter(e =>
        !e.includes("Minified React error") &&
        !e.includes("Hydration") &&
        !e.includes("418") &&
        !e.includes("ResizeObserver")
      );
      expect(critical, `Erreurs JS critiques sur ${path}: ${critical.join("; ")}`).toEqual([]);
    });
  }
});

test.describe("Smoke pages avec auth (redirect /login accepté)", () => {
  for (const path of AUTH_PAGES) {
    test(`${path} se charge (ou redirige vers /login)`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const response = await page.goto(path);
      // Accept 200 (page chargée OU page de login affichée après redirect)
      expect([200, 307, 308].includes(response.status()), `${path} doit répondre 200/307/308 (réel: ${response.status()})`).toBe(true);
      await expect(page, `${path} doit avoir un titre Aveho`).toHaveTitle(/Aveho/i);
      // Pas d'erreur JS critique
      const criticalErrors = errors.filter(e =>
        !e.includes("Hydration") &&    // ignorer les warnings hydratation
        !e.includes("ResizeObserver") && // ignorer les warnings ResizeObserver
        !e.includes("404")              // ignorer les fetch failures pour les pages auth-required
      );
      expect(criticalErrors, `Erreurs JS critiques sur ${path}: ${criticalErrors.join("; ")}`).toEqual([]);
    });
  }
});
