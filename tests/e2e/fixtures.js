// =============================================================
//  tests/e2e/fixtures.js (Alpha 0.57.12)
//
//  Fixtures partagées pour les tests E2E Aveho.
//
//  - aveho : étend test de base avec des helpers (login, navigation)
//  - DEMO_USER : credentials du compte de test (à configurer en local
//                via variables d'env E2E_USER_EMAIL / E2E_USER_PASSWORD)
//
//  Pour tester sans Supabase configuré, on utilise le mode "smoke"
//  qui vérifie juste que les pages se chargent (potentiellement
//  redirigent vers /login).
// =============================================================

import { test as base, expect } from "@playwright/test";

// Credentials de test — à override via E2E_USER_EMAIL / E2E_USER_PASSWORD
export const DEMO_USER = {
  email: process.env.E2E_USER_EMAIL || "test@aveho-e2e.example.com",
  password: process.env.E2E_USER_PASSWORD || "TestE2E_2026!",
};

// Mode de test :
// - SMOKE : tests qui passent SANS Supabase configuré (vérifient juste les pages se chargent)
// - FULL  : tests bout-en-bout avec vraie auth Supabase + données
export const E2E_MODE = process.env.E2E_MODE || "SMOKE";
export const isFullMode = () => E2E_MODE === "FULL";

/**
 * Test étendu avec helpers Aveho.
 */
export const test = base.extend({
  /**
   * Helper qui tente de se connecter avec DEMO_USER.
   * En mode SMOKE : retourne false si la connexion échoue (et le test peut continuer en non-auth).
   * En mode FULL : throw si la connexion échoue (vrai problème).
   */
  loginHelper: async ({ page }, use) => {
    const login = async () => {
      await page.goto("/login");
      await page.fill("input[type='email']", DEMO_USER.email);
      await page.fill("input[type='password']", DEMO_USER.password);
      const btn = page.locator("button.btn-primary").first();
      await btn.click();

      // Attendre soit la redirection vers /accueil ou autre, soit un message d'erreur
      try {
        await page.waitForURL(/\/(accueil|vue-globale|patients|changelog)/, { timeout: 8000 });
        return true;
      } catch {
        // Connexion échouée
        if (isFullMode()) {
          throw new Error(
            `Connexion impossible avec ${DEMO_USER.email}. ` +
            `Configure E2E_USER_EMAIL et E2E_USER_PASSWORD dans tes variables d'environnement.`
          );
        }
        return false;
      }
    };
    await use(login);
  },
});

export { expect };
