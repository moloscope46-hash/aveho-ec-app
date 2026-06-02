// =============================================================
//  app/changelog/smoke-tests-index.js (Alpha 0.57.6)
//
//  Liste légère des versions qui ont des smoke-tests in-browser
//  associés. Utilisé pour afficher un badge "tests dispo" dans
//  la page /changelog SANS charger les 92 KB de smoke-tests.js.
//
//  Les vrais tests sont chargés en dynamic import seulement
//  quand l'utilisateur clique sur "Tester" pour une version.
//
//  ⚠️ Liste générée automatiquement depuis smoke-tests.js
//     (re-générer avec un script lors d'ajouts si besoin)
// =============================================================

export const VERSION_TESTS_KEYS = new Set([
  "0.55.12",
  "0.55.13",
  "0.55.14",
  "0.55.15",
  "0.55.16",
  "0.55.17",
  "0.55.18",
  "0.55.19",
  "0.55.20",
  "0.55.21",
  "0.55.22",
  "0.55.23",
  "0.55.24",
  "0.55.25",
  "0.55.26",
  "0.55.27",
  "0.55.28",
  "0.55.29",
  "0.55.30",
  "0.55.31",
  "0.55.32",
  "0.55.33",
  "0.55.34",
  "0.55.35",
  "0.55.36",
  "0.55.37",
  "0.55.38",
  "0.55.39",
  "0.55.40",
  "0.55.41",
  "0.55.42",
  "0.55.43",
  "0.55.44",
  "0.55.45",
  "0.55.46",
  "0.55.47",
  "0.55.48",
  "0.55.49",
  "0.55.50",
  "0.55.51",
  "0.55.52",
  "0.55.53",
  "0.55.54",
  "0.55.55",
  "0.55.56",
  "0.56.0",
  "0.56.1",
  "0.56.10",
  "0.56.2",
  "0.56.3",
  "0.56.4",
  "0.56.5",
  "0.56.6",
  "0.56.7",
  "0.56.8",
  "0.56.9",
]);

/**
 * Charge dynamiquement smoke-tests.js et exécute les tests d'une version.
 * Économise ~92 KB sur le first load de /changelog.
 */
export async function runTestsForVersionLazy(version) {
  const mod = await import("./smoke-tests");
  return mod.runTestsForVersion(version);
}

/**
 * Charge dynamiquement smoke-tests.js et exécute TOUS les tests.
 */
export async function runAllTestsLazy(onProgress) {
  const mod = await import("./smoke-tests");
  return mod.runAllTests(onProgress);
}
