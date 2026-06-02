// tests/e2e/login.spec.js
// 0.57.12 : Tests E2E du formulaire login mis à jour pour la nouvelle UI biométrie (0.55.13+)
import { test, expect } from "@playwright/test";

test.describe("Page de connexion", () => {
  test("affiche le formulaire de login", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Aveho/i);
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    // Le bouton final "Se connecter" (pas biométrie)
    await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeVisible();
  });

  test("affiche le lien mentions légales (BL)", async ({ page }) => {
    await page.goto("/login");
    const link = page.locator("a[href='/mentions-legales']");
    await expect(link).toBeVisible();
  });

  test("le bouton login est désactivé si email/password vides", async ({ page }) => {
    await page.goto("/login");
    const btn = page.getByRole("button", { name: "Se connecter", exact: true });
    await expect(btn).toBeDisabled();
  });

  test("active le bouton quand on remplit les champs", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", "test@example.com");
    await page.fill("input[type='password']", "password123");
    const btn = page.getByRole("button", { name: "Se connecter", exact: true });
    await expect(btn).toBeEnabled();
  });

  test("affiche les boutons biométrie (Empreinte + Visage) — 0.55.13", async ({ page, browserName }) => {
    await page.goto("/login");
    // WebKit headless ne supporte pas WebAuthn → boutons biométrie peuvent ne pas
    // s'afficher. On accepte 0 ou 2 selon le browser (1 serait suspect).
    const bioButtons = page.locator("button.btn-primary").filter({ hasText: /Se connecter avec/ });
    const count = await bioButtons.count();
    if (browserName === "webkit") {
      // WebKit : 0 ou 2 acceptés (WebAuthn pas dispo en headless)
      expect([0, 2]).toContain(count);
    } else {
      // Chromium, Firefox : doit afficher 2 boutons
      expect(count).toBe(2);
    }
  });
});
