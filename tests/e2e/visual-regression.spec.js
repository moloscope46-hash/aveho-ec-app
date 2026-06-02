// =============================================================
//  tests/e2e/visual-regression.spec.js (Alpha 0.57.14)
//
//  Tests de régression visuelle : compare les screenshots actuels
//  aux baselines stockées dans tests/e2e/__screenshots__/
//
//  WORKFLOW :
//  1. Générer les baselines (1ère fois ou après changement UI volontaire) :
//       npm run test:visual:update
//       → toHaveScreenshot crée/écrase les images de référence
//  2. À chaque commit suivant :
//       npm run test:visual
//       → compare contre les baselines, fail si pixel-diff > threshold
//
//  Limitations :
//   - Screenshots NON portables cross-browser → on test sur Chromium seulement
//   - Sensible aux fonts qui chargent → on attend networkidle + délai
//   - Sensible aux animations → on désactive via CSS injection
// =============================================================

import { test, expect } from "@playwright/test";

// Helper : configure les LocalStorage pour skip les popups
// À appeler AVANT toute navigation pour qu'aucun popup ne s'affiche.
async function setupPopupsSkip(context) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("aveho_geoloc_choice", "declined");
      localStorage.setItem("aveho_biometric_optin_shown", "1");
      localStorage.setItem("aveho_install_banner_dismissed", "1");
    } catch {}
  });
}

// Helper : prépare la page pour un screenshot stable (après nav + interactions)
async function prepareForScreenshot(page) {
  // Désactiver toutes les animations CSS et transitions
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
      *:focus { outline: none !important; }
      /* Masquer les badges de version qui changent à chaque bump */
      [class*="version" i], [data-version] { visibility: hidden !important; }
      /* Masquer un éventuel popup restant (fallback safety) */
      [role="dialog"] { display: none !important; }
    `,
  });
  // Attendre que les fonts soient bien chargées (Quicksand + Tabler)
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

test.describe("Visual regression — Pages publiques", () => {
  // Ce describe ne tourne que sur Chromium (cross-browser non portable)
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Visual regression sur Chromium uniquement (screenshots non portables)"
  );

  test.beforeEach(async ({ context }) => {
    await setupPopupsSkip(context);
  });

  test("/login matches baseline", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot("login-page.png", {
      fullPage: true,
      maxDiffPixels: 100,
      // Masquer les éléments potentiellement variables
      mask: [
        page.locator("[data-version]"), // numéros de version
        page.locator(".cookie-banner"), // bannière cookies
      ],
    });
  });

  test("/mentions-legales matches baseline", async ({ page }) => {
    await page.goto("/mentions-legales");
    await page.waitForLoadState("networkidle");
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot("mentions-legales.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

test.describe("Visual regression — Composants login", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Visual regression sur Chromium uniquement"
  );

  test.beforeEach(async ({ context }) => {
    await setupPopupsSkip(context);
  });

  test("Card login vide", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await prepareForScreenshot(page);
    // Aveho n'utilise pas <form>, c'est un div React → cibler la zone des inputs
    const card = page.locator("input[type='email']").locator("xpath=ancestor::div[2]");
    await expect(card).toHaveScreenshot("login-card-empty.png", {
      maxDiffPixels: 100,
    });
  });

  test("Card login avec valeurs", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    // Effacer le mail pré-rempli par localStorage Aveho (sauvegardé du dernier login)
    await page.locator("input[type='email']").clear();
    await page.fill("input[type='email']", "demo@aveho.fr");
    await page.fill("input[type='password']", "demo123!");
    await prepareForScreenshot(page);
    const card = page.locator("input[type='email']").locator("xpath=ancestor::div[2]");
    await expect(card).toHaveScreenshot("login-card-filled.png", {
      maxDiffPixels: 100,
    });
  });
});

test.describe("Visual regression — Mobile viewport", () => {
  test.use({ viewport: { width: 393, height: 851 } }); // Pixel 5

  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Visual regression sur Chromium uniquement"
  );

  test.beforeEach(async ({ context }) => {
    await setupPopupsSkip(context);
  });

  test("/login mobile (Pixel 5)", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot("login-mobile-pixel5.png", {
      fullPage: true,
      maxDiffPixels: 150, // mobile plus tolérant
    });
  });

  test("/mentions-legales mobile (Pixel 5)", async ({ page }) => {
    await page.goto("/mentions-legales");
    await page.waitForLoadState("networkidle");
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot("mentions-legales-mobile.png", {
      fullPage: true,
      maxDiffPixels: 150,
    });
  });
});

test.describe("Visual regression — Notes HTML statiques", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Visual regression sur Chromium uniquement"
  );

  test.beforeEach(async ({ context }) => {
    await setupPopupsSkip(context);
  });

  test("Note 0.55.0 header matches baseline", async ({ page }) => {
    await page.goto("/changelog-notes/NOTE-VERSION-Alpha-0.55.0.html");
    await page.waitForLoadState("networkidle");
    await prepareForScreenshot(page);
    // On clip juste le header (les 800 premiers px) car le contenu complet
    // d'une note longue (~5800 px) a tendance à varier de quelques pixels à
    // cause du font-rendering. Le header est stable et représentatif.
    await expect(page).toHaveScreenshot("note-version-0.55.0-header.png", {
      clip: { x: 0, y: 0, width: 1280, height: 800 },
      maxDiffPixels: 200,
    });
  });

  // 0.57.15 : couverture des notes majeures pour détecter les régressions
  // dans les templates de notes (couleurs, padding, structure)
  test("Note 0.56.20 header matches baseline", async ({ page }) => {
    await page.goto("/changelog-notes/NOTE-VERSION-Alpha-0.56.20.html");
    await page.waitForLoadState("networkidle");
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot("note-version-0.56.20-header.png", {
      clip: { x: 0, y: 0, width: 1280, height: 800 },
      maxDiffPixels: 200,
    });
  });

  test("Note 0.57.0 header matches baseline (Next 15 migration)", async ({ page }) => {
    await page.goto("/changelog-notes/NOTE-VERSION-Alpha-0.57.0.html");
    await page.waitForLoadState("networkidle");
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot("note-version-0.57.0-header.png", {
      clip: { x: 0, y: 0, width: 1280, height: 800 },
      maxDiffPixels: 200,
    });
  });

  test("Note 0.57.12 header matches baseline (E2E Playwright)", async ({ page }) => {
    await page.goto("/changelog-notes/NOTE-VERSION-Alpha-0.57.12.html");
    await page.waitForLoadState("networkidle");
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot("note-version-0.57.12-header.png", {
      clip: { x: 0, y: 0, width: 1280, height: 800 },
      maxDiffPixels: 200,
    });
  });
});

// 0.57.15 : nouveaux describe pour étendre la couverture
test.describe("Visual regression — Login states", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Visual regression sur Chromium uniquement"
  );

  test.beforeEach(async ({ context }) => {
    await setupPopupsSkip(context);
  });

  test("Login mode signup (toggle Créer un compte)", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    // Cliquer sur le lien "Créer un compte"
    const signupLink = page.getByText(/Créer un compte/i).first();
    await signupLink.click();
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot("login-signup-mode.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("Login avec lien magic link affiché", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator("input[type='email']").clear();
    await page.fill("input[type='email']", "magic@aveho.fr");
    await prepareForScreenshot(page);
    // Capturer juste la zone du bouton magic link
    const magicSection = page.getByText(/Recevoir un lien de connexion/i)
      .locator("xpath=ancestor::*[2]");
    await expect(magicSection).toHaveScreenshot("login-magic-link-section.png", {
      maxDiffPixels: 100,
    });
  });
});

test.describe("Visual regression — Viewports multiples", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Visual regression sur Chromium uniquement"
  );

  test.beforeEach(async ({ context }) => {
    await setupPopupsSkip(context);
  });

  // 0.57.15 : Tablette landscape (iPad)
  test.describe("Tablette iPad (1024×768)", () => {
    test.use({ viewport: { width: 1024, height: 768 } });

    test("/login tablette landscape", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await prepareForScreenshot(page);
      await expect(page).toHaveScreenshot("login-tablet-landscape.png", {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });

    test("/mentions-legales tablette landscape", async ({ page }) => {
      await page.goto("/mentions-legales");
      await page.waitForLoadState("networkidle");
      await prepareForScreenshot(page);
      await expect(page).toHaveScreenshot("mentions-legales-tablet.png", {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  });

  // 0.57.15 : Mobile très petit (iPhone SE 375×667)
  test.describe("Mobile petit (iPhone SE 375×667)", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("/login iPhone SE", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await prepareForScreenshot(page);
      await expect(page).toHaveScreenshot("login-iphone-se.png", {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  });

  // 0.57.15 : Desktop large (1920×1080)
  test.describe("Desktop large (1920×1080)", () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test("/login desktop large", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await prepareForScreenshot(page);
      await expect(page).toHaveScreenshot("login-desktop-large.png", {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  });
});

test.describe("Visual regression — Sections /mentions-legales", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Visual regression sur Chromium uniquement"
  );

  test.beforeEach(async ({ context }) => {
    await setupPopupsSkip(context);
  });

  test("Mentions légales — section Éditeur (top 1100 px)", async ({ page }) => {
    await page.goto("/mentions-legales");
    await page.waitForLoadState("networkidle");
    await prepareForScreenshot(page);
    // Clip sur la zone Éditeur (en-tête + 1ère section)
    await expect(page).toHaveScreenshot("mentions-section-editeur.png", {
      clip: { x: 0, y: 0, width: 1280, height: 1100 },
      maxDiffPixels: 200,
    });
  });

  test("Mentions légales — footer + contact (zone basse)", async ({ page }) => {
    await page.goto("/mentions-legales");
    await page.waitForLoadState("networkidle");
    await prepareForScreenshot(page);
    // Scroller jusqu'en bas
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    // Screenshot du viewport actuel (pas fullPage)
    await expect(page).toHaveScreenshot("mentions-section-footer.png", {
      maxDiffPixels: 200,
    });
  });
});
