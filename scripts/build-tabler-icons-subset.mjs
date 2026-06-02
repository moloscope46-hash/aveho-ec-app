// =============================================================
//  scripts/build-tabler-icons-subset.mjs (Alpha 0.57.9)
//
//  Génère un CSS custom Tabler Icons qui ne contient que les
//  icônes effectivement utilisées dans l'app. Gain : ~244 KB → ~15-20 KB
//
//  Lit toutes les icônes "ti ti-NAME" dans app/ et lib/, extrait
//  leurs codepoints depuis le CSS source, et génère :
//    app/tabler-icons-subset.css
//
//  Le fichier généré référence toujours le webfont .woff2 via une
//  URL absolue vers /tabler-icons/tabler-icons.woff2 qu'on copie
//  dans public/ pour servir depuis le même domaine.
//
//  Utilisation :
//    node scripts/build-tabler-icons-subset.mjs
//
//  À relancer dès qu'on ajoute une nouvelle icône dans le code.
// =============================================================

import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const TABLER_CSS = path.join(ROOT, "node_modules/@tabler/icons-webfont/tabler-icons.css");
const TABLER_FONTS_DIR = path.join(ROOT, "node_modules/@tabler/icons-webfont/fonts");
const PUBLIC_FONTS_DIR = path.join(ROOT, "public/tabler-icons");
const OUTPUT_CSS = path.join(ROOT, "app/tabler-icons-subset.css");

// 1. Scanner toutes les utilisations "ti ti-NAME" dans app/ et lib/
async function scanIcons(dir, found = new Set()) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await scanIcons(full, found);
    } else if (e.name.endsWith(".js") || e.name.endsWith(".jsx") || e.name.endsWith(".ts") || e.name.endsWith(".tsx") || e.name.endsWith(".html") || e.name.endsWith(".css")) {
      try {
        const src = await fs.readFile(full, "utf-8");
        // Pattern : "ti ti-XXX" ou "ti-XXX" en className/class
        const matches = src.match(/ti-[a-z0-9-]+/g) || [];
        for (const m of matches) {
          // Filtre les faux positifs très courts (ex: anti-, parti- ne donnent
          // pas "ti-X" mais peuvent capter quelques noms d'icônes valides comme
          // "ti-x"). On accepte >= 4 chars (ti-X) qui couvre les icônes courtes
          // légitimes comme ti-x, ti-id, ti-mug.
          if (m.length >= 4) {
            found.add(m);
          }
        }
      } catch {}
    }
  }
  return found;
}

const usedIcons = new Set();
await scanIcons(path.join(ROOT, "app"), usedIcons);
await scanIcons(path.join(ROOT, "lib"), usedIcons);
await scanIcons(path.join(ROOT, "public/changelog-notes"), usedIcons);
console.log(`Icônes détectées dans le code : ${usedIcons.size}`);

// 2. Lire le CSS source Tabler
const tablerCss = await fs.readFile(TABLER_CSS, "utf-8");

// 3. Extraire le header (font-face + .ti commun)
const headerEnd = tablerCss.indexOf(".ti-12-hours");
const header = tablerCss.slice(0, headerEnd);

// 4. Filtrer les blocs d'icônes : on garde uniquement celles utilisées
// Format : .ti-NAME:before { content: "\eaXX"; }
const blockRe = /\.([a-z0-9-]+):before\s*\{\s*content:\s*"\\([a-f0-9]+)";\s*\}/g;
const lines = [header];
const kept = new Set();
const missed = new Set(usedIcons);

let match;
while ((match = blockRe.exec(tablerCss)) !== null) {
  const cls = match[1];
  if (usedIcons.has(cls)) {
    lines.push(`.${cls}:before { content: "\\${match[2]}"; }`);
    kept.add(cls);
    missed.delete(cls);
  }
}

console.log(`Icônes incluses dans le subset : ${kept.size}`);
console.log(`Icônes non trouvées dans Tabler (faux positifs filtrés) : ${missed.size}`);
if (missed.size > 0 && missed.size < 20) {
  console.log(`  Échantillon : ${[...missed].slice(0, 10).join(", ")}`);
}

// 5. Adapter les chemins de fonts pour pointer vers /tabler-icons/ (servis depuis public/)
let outputCss = lines.join("\n");
outputCss = outputCss.replace(/url\("\.\/fonts\//g, 'url("/tabler-icons/');

// 6. Ajouter un header explicatif
const finalCss = `/*!
 * Tabler Icons SUBSET pour Aveho EC (Alpha 0.57.9)
 *
 * Généré automatiquement par scripts/build-tabler-icons-subset.mjs
 * Source : @tabler/icons-webfont 2.47.0
 *
 * Icônes incluses : ${kept.size} / 4962 du fichier source
 * Gain : ${(244 - Math.round(outputCss.length / 1024))} KB sur le bundle CSS
 *
 * ⚠️ À régénérer dès qu'on ajoute une nouvelle icône :
 *    node scripts/build-tabler-icons-subset.mjs
 */
${outputCss}
`;

await fs.writeFile(OUTPUT_CSS, finalCss);
console.log(`✓ Écrit : app/tabler-icons-subset.css (${(finalCss.length / 1024).toFixed(1)} KB)`);

// 7. Copier le woff2 dans public/tabler-icons/
await fs.mkdir(PUBLIC_FONTS_DIR, { recursive: true });
const woff2Files = await fs.readdir(TABLER_FONTS_DIR);
for (const f of woff2Files) {
  if (f.endsWith(".woff2") || f.endsWith(".woff") || f.endsWith(".ttf")) {
    await fs.copyFile(
      path.join(TABLER_FONTS_DIR, f),
      path.join(PUBLIC_FONTS_DIR, f)
    );
  }
}
console.log(`✓ Fontes copiées dans public/tabler-icons/`);

console.log(`\nGain estimé : 244 KB → ${(finalCss.length / 1024).toFixed(1)} KB CSS (-${Math.round((1 - finalCss.length / (244 * 1024)) * 100)}%)`);
