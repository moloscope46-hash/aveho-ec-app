// =============================================================
//  scripts/regen-versions-index.mjs (Alpha 0.57.7)
//
//  Script qui régénère :
//   - app/changelog/versions-index.js  (index léger)
//   - public/changelog-data/chantiers-extra.json  (chantiers > 5 lazy)
//
//  Depuis app/changelog/versions-data.js.
//
//  Utilisation :
//    node scripts/regen-versions-index.mjs
// =============================================================

import fs from "fs/promises";

// On lit versions-data.js, on enlève l'import logger inutile,
// on l'écrit dans un tmp, puis on l'importe.
const raw = await fs.readFile("app/changelog/versions-data.js", "utf-8");
const cleaned = raw.replace(/^import .+? from .+?logger.+?;?\n/, "");
await fs.writeFile("/tmp/vd-regen.mjs", cleaned);
const vd = await import("/tmp/vd-regen.mjs");

const versions = vd.ALL_VERSIONS;

// Index : tronquer à 5 chantiers + ajouter chantiers_total
const index = versions.map((v) => ({
  ...v,
  chantiers: (v.chantiers || []).slice(0, 5),
  chantiers_total: (v.chantiers || []).length,
}));

// Extra : chantiers > 5 par version
const extra = {};
for (const v of versions) {
  const all = v.chantiers || [];
  if (all.length > 5) {
    extra[v.v] = all.slice(5);
  }
}

// Stats
const indexSize = JSON.stringify(index).length;
const extraSize = JSON.stringify(extra).length;
console.log(`Total versions : ${index.length}`);
console.log(`Index size : ${(indexSize / 1024).toFixed(1)} KB (vs 309 KB versions-data.js)`);
console.log(`Extra size : ${(extraSize / 1024).toFixed(1)} KB lazy-chargé`);
console.log(`Versions avec chantiers cachés : ${Object.keys(extra).length}`);

// Écrire chantiers-extra.json
await fs.mkdir("public/changelog-data", { recursive: true });
await fs.writeFile(
  "public/changelog-data/chantiers-extra.json",
  JSON.stringify(extra)
);
console.log(`✓ public/changelog-data/chantiers-extra.json`);

// 0.57.11 : Écrire VERSIONS_INDEX dans un JSON public (lazy fetch)
await fs.writeFile(
  "public/changelog-data/versions-index.json",
  JSON.stringify(index)
);
console.log(`✓ public/changelog-data/versions-index.json`);

// Écrire versions-index.js avec UNIQUEMENT THEME_LABELS (2 KB)
const themeLabels = vd.THEME_LABELS;
const indexJs = `// =============================================================
//  app/changelog/versions-index.js (Alpha 0.57.11)
//
//  ⚠️ Fichier généré automatiquement.
//     Régénérer avec : node scripts/regen-versions-index.mjs
//
//  Depuis 0.57.11 ce fichier ne contient PLUS VERSIONS_INDEX
//  (déplacé dans public/changelog-data/versions-index.json pour
//  fetch lazy au mount → bundle initial -269 KB).
//  Seul THEME_LABELS (2 KB) reste en import statique.
//
//  STATS au moment de la génération :
//   - VERSIONS_INDEX (JSON public) : ${(indexSize / 1024).toFixed(1)} KB lazy
//   - Extra (chantiers > 5)        : ${(extraSize / 1024).toFixed(1)} KB lazy
//   - Versions : ${index.length}
// =============================================================

export const THEME_LABELS = ${JSON.stringify(themeLabels, null, 2)};

// VERSIONS_INDEX retiré : à fetcher depuis /changelog-data/versions-index.json
`;

await fs.writeFile("app/changelog/versions-index.js", indexJs);
console.log(`✓ app/changelog/versions-index.js (${(indexJs.length / 1024).toFixed(1)} KB)`);

