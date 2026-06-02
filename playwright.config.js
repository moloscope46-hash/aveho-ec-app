// playwright.config.js
// Alpha 0.57.14 — Tests E2E cross-browser + visual regression
import { defineConfig, devices } from "@playwright/test";

const E2E_USE_PROD_BUILD = process.env.E2E_USE_PROD_BUILD !== "false";

// Filtrer les browsers via env BROWSERS=chromium,firefox,webkit (par défaut tous)
const BROWSERS = (process.env.BROWSERS || "chromium,firefox,webkit").split(",").map(s => s.trim());

const allProjects = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  },
  {
    name: "firefox",
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "webkit",
    use: { ...devices["Desktop Safari"] },
  },
  // 0.57.13 : Tests mobile (viewports iPhone et Android)
  {
    name: "Mobile Chrome",
    use: { ...devices["Pixel 5"] },
  },
  {
    name: "Mobile Safari",
    use: { ...devices["iPhone 13"] },
  },
];

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
    // 0.57.14 : Configuration des screenshots de régression visuelle
    toHaveScreenshot: {
      // Tolérance pixel-perfect : 0.2 % de diff acceptée par défaut
      maxDiffPixelRatio: 0.002,
      // Animations désactivées par défaut (réduit flakiness)
      animations: "disabled",
      // Mode d'attente : aucune (on stabilise manuellement dans le spec)
      caret: "hide",
    },
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    actionTimeout: 0,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 15000,
  },
  // 0.57.12 : Par défaut on lance le serveur de prod (npm start) pour matcher
  // la réalité du déploiement Vercel. Pour le dev, mettre E2E_USE_PROD_BUILD=false.
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: E2E_USE_PROD_BUILD ? "npm start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: allProjects.filter(p => {
    return BROWSERS.includes(p.name) ||
           BROWSERS.some(b => p.name.toLowerCase().includes(b.toLowerCase()));
  }),
  // 0.57.14 : Baselines stockées à côté du spec dans tests/e2e/__screenshots__/
  // Pattern : {spec}-snapshots/{name}-{platform}.png
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFileName}/{arg}{ext}",
});
