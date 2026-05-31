// tests/e2e/login.spec.js
import { test, expect } from "@playwright/test";

test.describe("Page de connexion", () => {
  test("affiche le formulaire de login", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Aveho/i);
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.locator("text=Se connecter")).toBeVisible();
  });

  test("affiche le lien mentions légales (BL)", async ({ page }) => {
    await page.goto("/login");
    const link = page.locator("a[href='/mentions-legales']");
    await expect(link).toBeVisible();
  });

  test("le bouton login est désactivé si email/password vides", async ({ page }) => {
    await page.goto("/login");
    const btn = page.locator("button.btn-primary");
    await expect(btn).toBeDisabled();
  });

  test("active le bouton quand on remplit les champs", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", "test@example.com");
    await page.fill("input[type='password']", "password123");
    await expect(page.locator("button.btn-primary")).toBeEnabled();
  });
});
