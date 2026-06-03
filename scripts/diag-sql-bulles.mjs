// Diagnostic complet : versions avec/sans sqlFile + fichiers physiques
import fs from "fs/promises";

// Lire le fichier source
const raw = await fs.readFile("app/changelog/versions-data.js", "utf-8");
const cleaned = raw.replace(/^import .+? from .+?logger.+?;?\n/, "");
await fs.writeFile("/tmp/vd-diag.mjs", cleaned);
const vd = await import("/tmp/vd-diag.mjs");
const versions = vd.ALL_VERSIONS;

// Lister les fichiers physiques
const sqlFiles = await fs.readdir("public/changelog-sql/");
const physical = new Set(sqlFiles);

console.log("=== STATS GLOBALES ===");
console.log(`Total versions : ${versions.length}`);
console.log(`Fichiers SQL physiques : ${physical.size}`);

// Pour chaque version, on regarde si elle a sqlFile défini
const withSqlFile = versions.filter(v => v.sqlFile);
const withoutSqlFile = versions.filter(v => !v.sqlFile);

console.log(`Versions avec sqlFile défini : ${withSqlFile.length}`);
console.log(`Versions SANS sqlFile : ${withoutSqlFile.length}`);

// Vérifier que chaque sqlFile référencé existe physiquement
console.log("\n=== sqlFile RÉFÉRENCÉS MAIS ABSENTS du dossier physique ===");
let missing = 0;
for (const v of withSqlFile) {
  if (!physical.has(v.sqlFile)) {
    console.log(`  ${v.v} → ${v.sqlFile} ABSENT`);
    missing++;
  }
}
console.log(`Total : ${missing}`);

// Pour chaque fichier physique, vérifier qu'il existe une version qui le référence
console.log("\n=== Fichiers PHYSIQUES qui n'ont AUCUNE version référencée ===");
const referenced = new Set(withSqlFile.map(v => v.sqlFile));
let orphans = 0;
for (const f of sqlFiles) {
  if (!referenced.has(f)) {
    console.log(`  ${f} → aucune version ne le déclare`);
    orphans++;
  }
}
console.log(`Total : ${orphans} orphelins`);

// Versions qui pourraient avoir un sqlFile mais ne l'ont pas
console.log("\n=== Versions SANS sqlFile mais qui pourraient en avoir un ===");
// Match : version "X.Y.Z" + fichier "aveho-PATCH-vers-X.Y.Z.sql" existe
let couldHave = 0;
const couldHaveList = [];
for (const v of withoutSqlFile) {
  const expectedFile = `aveho-PATCH-vers-${v.v}.sql`;
  if (physical.has(expectedFile)) {
    couldHaveList.push({ version: v.v, file: expectedFile });
    couldHave++;
  }
}
console.log(`Total : ${couldHave} versions à reconnecter`);
console.log("Liste :");
for (const c of couldHaveList) {
  console.log(`  ${c.version} → ${c.file}`);
}

// Output JSON pour fichier
await fs.writeFile("/tmp/diag-result.json", JSON.stringify({ couldHave: couldHaveList }, null, 2));
console.log("\n→ Résultat enregistré dans /tmp/diag-result.json");
