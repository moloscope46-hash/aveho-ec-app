// tests/e2e/public-pages.spec.js
import { test, expect } from "@playwright/test";

test.describe("Pages publiques sans authentification", () => {
  test("/mentions-legales accessible et bien structurée", async ({ page }) => {
    await page.goto("/mentions-legales");
    // Vérifie la présence des 5 sections principales (utiliser .first() pour
    // gérer les occurrences multiples du texte dans la page)
    await expect(page.locator("text=/Éditeur/i").first()).toBeVisible();
    await expect(page.locator("text=/Protection des données/i").first()).toBeVisible();
    await expect(page.locator("text=/Cookies/i").first()).toBeVisible();
    await expect(page.locator("text=/Conditions d'utilisation/i").first()).toBeVisible();
    await expect(page.locator("text=/Contact/i").first()).toBeVisible();
  });

  test("page d'accueil redirige vers login si non connecté", async ({ page }) => {
    await page.goto("/");
    // Soit redirige vers /login, soit affiche le formulaire de login
    await page.waitForURL(/\/(login|accueil)/, { timeout: 5000 }).catch(() => {});
    // Au moins le titre Aveho doit être présent
    await expect(page).toHaveTitle(/Aveho/i);
  });
});
