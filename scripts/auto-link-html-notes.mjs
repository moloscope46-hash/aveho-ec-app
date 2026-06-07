#!/usr/bin/env node
// =============================================================
// scripts/auto-link-html-notes.mjs (0.62.11)
// Auto-rattache les fichiers HTML existants dans /public/changelog-notes/
// aux versions correspondantes via le pattern NOTE-...-X.Y.Z.html
// =============================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const NOTES_DIR = path.join(ROOT, "public/changelog-notes");
const VERSIONS_FILE = path.join(ROOT, "app/changelog/versions-data.js");

// Liste tous les HTML
const htmlFiles = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith(".html"));
console.log(`📁 ${htmlFiles.length} fichiers HTML trouvés`);

// Map version → filename
const versionToFile = new Map();
for (const f of htmlFiles) {
  // Pattern NOTE-XXX-Alpha-0.55.18.html ou NOTE-XXX-0.62.7.html
  const m = f.match(/(\d+\.\d+\.\d+)/);
  if (m) {
    const v = m[1];
    // Si plusieurs HTML pour même version, on garde le plus récent par ordre alphabétique de filename (priorité HOTFIX/PATCH)
    if (!versionToFile.has(v) || f.length < versionToFile.get(v).length) {
      versionToFile.set(v, f);
    }
  }
}
console.log(`🔗 ${versionToFile.size} versions mappées`);

// Modifier versions-data.js
let content = fs.readFileSync(VERSIONS_FILE, "utf-8");
let modifs = 0;

for (const [version, file] of versionToFile) {
  // Cherche le bloc de cette version et remplace son noteFile vide
  // Pattern : "v": "0.55.18", ... "noteFile": ""
  const regex = new RegExp(`("v":\\s*"${version.replace(/\./g, "\\.")}"[\\s\\S]{0,4000}?"noteFile":\\s*")(")`, "m");
  const match = content.match(regex);
  if (match && match[2] === '"') {
    content = content.replace(regex, `$1${file}"`);
    modifs++;
  }
}

fs.writeFileSync(VERSIONS_FILE, content);
console.log(`✅ ${modifs} versions liées à leurs HTML`);
