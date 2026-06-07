#!/usr/bin/env node
// =============================================================
// scripts/gen-html-notes-missing.mjs (0.62.11)
// Génère un HTML pour chaque version sans noteFile (les 0.62.x récentes)
// =============================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const NOTES_DIR = path.join(ROOT, "public/changelog-notes");
const VERSIONS_FILE = path.join(ROOT, "app/changelog/versions-data.js");

// Parser le fichier versions-data.js → trouver ALL_VERSIONS
// Format export const ALL_VERSIONS = [ {...}, {...} ];
const content = fs.readFileSync(VERSIONS_FILE, "utf-8");
// Extract le tableau via regex
const startIdx = content.indexOf("export const ALL_VERSIONS = [");
const arrayContent = content.substring(startIdx + "export const ALL_VERSIONS = ".length);
// Trouver le ] final
let depth = 0, endIdx = 0;
for (let i = 0; i < arrayContent.length; i++) {
  if (arrayContent[i] === "[") depth++;
  if (arrayContent[i] === "]") { depth--; if (depth === 0) { endIdx = i + 1; break; } }
}
const arrayStr = arrayContent.substring(0, endIdx);
// Évaluer en JSON sécurisé : convertir les clés non-quotées (heureusement déjà toutes quotées)
// On utilise eval contrôlé via Function
let ALL_VERSIONS;
try {
  ALL_VERSIONS = new Function("return " + arrayStr)();
} catch (e) {
  console.error("Parse error:", e.message);
  process.exit(1);
}
console.log(`📚 ${ALL_VERSIONS.length} versions chargées`);

const missing = ALL_VERSIONS.filter(v => !v.noteFile || v.noteFile === "");
console.log(`📝 ${missing.length} versions sans noteFile`);

const kindMeta = {
  "feat": { icon: "✨", color: "#185FA5", lbl: "FEATURE" },
  "fix": { icon: "🐛", color: "#EF9F27", lbl: "FIX" },
  "hotfix": { icon: "🚨", color: "#e35d5b", lbl: "HOTFIX" },
  "patch": { icon: "🩹", color: "#7a6fb0", lbl: "PATCH" },
  "version": { icon: "🎉", color: "#5aa05a", lbl: "VERSION" },
};

const codeMeta = {
  "SQL": { col: "#7CC8C8", ic: "🗄" }, "AI": { col: "#7a6fb0", ic: "🤖" },
  "INFO": { col: "#5a6878", ic: "ℹ" }, "FIX": { col: "#EF9F27", ic: "🐛" },
  "UX": { col: "#5aa05a", ic: "🎨" }, "ARCH": { col: "#5e4a8c", ic: "🏗" },
};

for (const v of missing) {
  const meta = kindMeta[v.kind] || kindMeta.feat;
  const fileName = `NOTE-${v.kind.toUpperCase()}-${v.v}.html`;
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Aveho ${v.v} — ${v.kind.toUpperCase()}</title>
<style>
body { font-family: 'Quicksand', 'Segoe UI', system-ui, sans-serif; max-width: 880px; margin: 0 auto; padding: 24px; background: #f4f7fa; color: #2a3a48; line-height: 1.6; }
h1 { color: ${meta.color}; border-bottom: 3px solid ${meta.color}; padding-bottom: 10px; margin-top: 0; font-size: 28px; }
.header { background: linear-gradient(135deg, ${meta.color}11, ${meta.color}05); padding: 20px 24px; border-left: 6px solid ${meta.color}; border-radius: 10px; margin-bottom: 24px; }
.kind { display: inline-block; background: ${meta.color}; color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 1px; }
.date { color: #8a98a8; font-size: 13px; margin-top: 8px; }
.titre { font-size: 18px; color: #142131; font-weight: 700; margin-top: 14px; }
.themes { margin-top: 10px; }
.theme { display: inline-block; background: #fff; border: 1px solid #cfd8e0; padding: 3px 10px; border-radius: 12px; font-size: 11px; color: #5a6878; margin-right: 5px; margin-bottom: 4px; }
h2 { color: #185FA5; font-size: 16px; margin-top: 30px; }
.chantier { background: #fff; border-radius: 8px; padding: 14px 18px; margin-bottom: 10px; border-left: 4px solid #cfd8e0; }
.code-tag { display: inline-block; background: #142131; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .5px; margin-right: 8px; font-family: 'Consolas', monospace; }
code { background: #f0f3f6; padding: 2px 5px; border-radius: 3px; font-size: 90%; font-family: 'Consolas', monospace; color: #c0392b; }
strong, b { color: #142131; }
.footer { margin-top: 40px; padding: 16px; background: #142131; color: #fff; border-radius: 8px; text-align: center; font-size: 12px; }
@media (max-width: 600px) {
  body { padding: 12px; }
  h1 { font-size: 22px; }
  .header { padding: 14px; }
}
</style>
</head>
<body>
<div class="header">
  <span class="kind">${meta.icon} ${meta.lbl}</span>
  <h1>Aveho ${v.v}</h1>
  <div class="titre">${v.titre || "Note de version"}</div>
  <div class="date">📅 ${v.date || ""}</div>
  ${v.themes && v.themes.length ? `<div class="themes">${v.themes.map(t => `<span class="theme">#${t}</span>`).join(" ")}</div>` : ""}
</div>

<h2>📋 Chantiers (${(v.chantiers || []).length})</h2>
${(v.chantiers || []).map(c => {
  const cm = codeMeta[c.code] || { col: "#5a6878", ic: "•" };
  return `<div class="chantier" style="border-left-color: ${cm.col};">
    <span class="code-tag" style="background: ${cm.col};">${cm.ic} ${c.code}</span>
    ${c.txt}
  </div>`;
}).join("\n")}

<div class="footer">
  Aveho Espace Collectivité — Version ${v.v}<br>
  Généré automatiquement le ${new Date().toLocaleDateString("fr-FR")} · Anthropic Claude
</div>
</body>
</html>`;
  const filepath = path.join(NOTES_DIR, fileName);
  fs.writeFileSync(filepath, html, "utf-8");

  // Update versions-data.js : remplacer "noteFile": "" par "noteFile": "fileName"
  // Pattern : `"v": "X.Y.Z", ... "noteFile": ""`
  const versionEscaped = v.v.replace(/\./g, "\\.");
  const regex = new RegExp(`("v":\\s*"${versionEscaped}",[\\s\\S]+?"noteFile":\\s*")("\\s*})`, "g");
  const updatedContent = fs.readFileSync(VERSIONS_FILE, "utf-8");
  const newContent = updatedContent.replace(regex, `$1${fileName}$2`);
  fs.writeFileSync(VERSIONS_FILE, newContent);

  console.log(`✓ ${fileName} (${(v.chantiers || []).length} chantiers)`);
}

console.log(`✅ Total : ${missing.length} HTML générés et liés`);
