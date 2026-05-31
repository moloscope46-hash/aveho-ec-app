// =============================================================
//  scripts/sync-sw-version.js
//  Alpha 0.52.1
//
//  Synchronise la constante VERSION dans public/sw.js avec
//  package.json. À exécuter avant chaque build/release.
//
//  Usage : node scripts/sync-sw-version.js
// =============================================================
const fs = require("fs");
const path = require("path");

const pkgPath = path.join(__dirname, "..", "package.json");
const swPath = path.join(__dirname, "..", "public", "sw.js");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const pkgVersion = pkg.version.replace(/-alpha$/, "");  // 0.52.0-alpha → 0.52.0
const target = `aveho-ec-${pkgVersion}`;

const sw = fs.readFileSync(swPath, "utf-8");
const match = sw.match(/const VERSION = "([^"]+)";/);
if (!match) {
  console.error("❌ Pas trouvé la constante VERSION dans sw.js");
  process.exit(1);
}

const current = match[1];
if (current === target) {
  console.log(`✓ SW déjà à jour (${current})`);
  process.exit(0);
}

const newSw = sw.replace(
  /const VERSION = "[^"]+";/,
  `const VERSION = "${target}";`
);
fs.writeFileSync(swPath, newSw, "utf-8");
console.log(`✓ SW bumpé : ${current} → ${target}`);
