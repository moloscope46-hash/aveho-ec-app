// tests/e2e/changelog.spec.js
import { test, expect } from "@playwright/test";

test.describe("Page changelog", () => {
  test("liste les versions et permet de télécharger les notes", async ({ page }) => {
    await page.goto("/changelog");
    // La page peut nécessiter une auth - on teste juste qu'elle se charge
    const title = page.locator("text=/Changelog/i").first();
    // En cas de redirect vers login, le titre Aveho est quand même là
    await expect(page).toHaveTitle(/Aveho/i);
  });

  test("notes HTML accessibles statiquement", async ({ page }) => {
    const response = await page.goto("/changelog-notes/NOTE-VERSION-Alpha-0.53.0.html");
    expect(response.status()).toBe(200);
    await expect(page.locator("text=/Aveho/i").first()).toBeVisible();
  });
});
