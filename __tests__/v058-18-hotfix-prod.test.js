// =============================================================
//  Tests unitaires — 0.58.18 HOTFIX PROD
//
//  Bug 1 : RPC patient_dashboard_* résilientes (safeRpc helper)
//  Bug 2 : SW Response.error() → 504 propre
//  Bug 3 : lib/supabase.js guard env vars
//  Bug 4 : TabAudit.js import createClient ajouté
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.18 - Version", () => {
  it("Version 0.58.18+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(18);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.18 - Fix 1 : patient_dashboard safeRpc helper", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/dashboard/page.js"), "utf-8");

  it("Helper safeRpc(name, args) défini dans loadAll()", () => {
    expect(src).toMatch(/async function safeRpc\(name,\s*args\)/);
  });

  it("safeRpc wrap chaque appel en try/catch avec log warning console", () => {
    expect(src).toMatch(/try\s*\{[\s\S]*?supabase\.rpc\(name,\s*args\)/);
    expect(src).toMatch(/console\.warn\(`\[patient_dashboard\] RPC \$\{name\} indisponible/);
    expect(src).toMatch(/console\.warn\(`\[patient_dashboard\] RPC \$\{name\} a planté/);
  });

  it("safeRpc retourne null en cas d'erreur (au lieu de throw)", () => {
    // Le helper doit return null si error ou catch
    expect(src).toMatch(/return null/);
  });

  it("Les 4 RPC patient_dashboard utilisent safeRpc (plus de supabase.rpc direct)", () => {
    expect(src).toMatch(/safeRpc\(["']patient_dashboard_summary["']/);
    expect(src).toMatch(/safeRpc\(["']patient_dashboard_medicaments_actifs["']/);
    expect(src).toMatch(/safeRpc\(["']patient_dashboard_medecins["']/);
    expect(src).toMatch(/safeRpc\(["']patient_dashboard_alertes["']/);
  });

  it("Plus de Promise.all avec destructuring {data: x} (qui crashait sur la première erreur)", () => {
    // L'ancienne forme `[{ data: s }, { data: m }, ...] = await Promise.all([supabase.rpc(...)])`
    // ne doit plus exister, remplacée par `[s, m, ...] = await Promise.all([safeRpc(...)])`
    expect(src).not.toMatch(/\[\{\s*data:\s*s\s*\},\s*\{\s*data:\s*m\s*\}/);
  });

  it("Fallbacks gracieux : setMedicaments(m || []), etc.", () => {
    expect(src).toMatch(/setMedicaments\(m \|\| \[\]\)/);
    expect(src).toMatch(/setMedecins\(med \|\| \[\]\)/);
    expect(src).toMatch(/setAlertes\(a \|\| \[\]\)/);
  });
});

describe("0.58.18 - Fix 2 : SW Response.error → 504", () => {
  const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");

  it("Plus de Response.error() utilisé dans le SW", () => {
    // Tous les Response.error() doivent avoir été remplacés
    expect(sw).not.toMatch(/return Response\.error\(\);/);
  });

  it("504 Gateway Timeout retourné en cas d'échec réseau (cacheFirst)", () => {
    // On doit voir au moins 2 occurrences (cacheFirst + networkFirst)
    const matches = sw.match(/status:\s*504,\s*statusText:\s*["']Gateway Timeout["']/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("Body vide + Content-Type text/plain pour les 504", () => {
    expect(sw).toMatch(/new Response\(["']{2},\s*\{[\s\S]*?status:\s*504/);
    expect(sw).toMatch(/"Content-Type":\s*"text\/plain"/);
  });
});

describe("0.58.18 - Fix 3 : lib/supabase.js guard env vars", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/supabase.js"), "utf-8");

  it("Vérification explicite NEXT_PUBLIC_SUPABASE_URL et ANON_KEY", () => {
    expect(src).toMatch(/const url\s*=\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
    expect(src).toMatch(/const key\s*=\s*process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    expect(src).toMatch(/if\s*\(!url\s*\|\|\s*!key\)/);
  });

  it("Console.error explicit si env manquant (côté window uniquement)", () => {
    expect(src).toMatch(/typeof window !== ["']undefined["']/);
    expect(src).toMatch(/console\.error\(/);
    expect(src).toMatch(/NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant/);
  });

  it("createClient toujours appelé (même avec values undefined) — pas de crash", () => {
    expect(src).toMatch(/return createBrowserClient\(url,\s*key\)/);
  });
});

describe("0.58.18 - Fix 4 : TabAudit.js import createClient", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/edit/tabs/TabAudit.js"), "utf-8");

  it("Import createClient depuis ../../../../../lib/supabase (5 niveaux up)", () => {
    expect(src).toMatch(/import\s+\{\s*createClient\s*\}\s+from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib\/supabase["']/);
  });

  it("createClient est appelé dans le composant (ligne ~17)", () => {
    expect(src).toMatch(/const supabase\s*=\s*createClient\(\);/);
  });
});

describe("0.58.18 - Récap : aucun fichier client utilise createClient sans l'importer", () => {
  it("Tous les composants client qui appellent createClient l'importent depuis lib/supabase", () => {
    // Liste des fichiers à vérifier (lib/supabase exclu car c'est lui qui exporte)
    const allFiles = [];
    function walk(dir) {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          if (item.name === "node_modules" || item.name === ".next") continue;
          walk(full);
        } else if (item.name.endsWith(".js") && !item.name.endsWith(".test.js")) {
          allFiles.push(full);
        }
      }
    }
    walk(path.resolve(process.cwd(), "app"));

    const culprits = [];
    for (const f of allFiles) {
      const content = fs.readFileSync(f, "utf-8");
      // Vérifier que c'est un composant client (use client) et utilise createClient sans import
      const isUseClient = /^["']use client["']/.test(content);
      const callsCreateClient = /\bcreateClient\s*\(/.test(content);
      const hasImport =
        /import\s+\{[^}]*\bcreateClient\b[^}]*\}\s+from\s+["'][^"']*\/lib\/supabase["']/.test(content) ||
        /import\s+\{[^}]*\bcreateClient\b[^}]*\}\s+from\s+["']@supabase\/supabase-js["']/.test(content) ||
        /const\s+\{\s*createClient\s*\}\s*=\s*(?:await\s+)?(?:import|require)\(/.test(content) ||
        /export\s+function\s+createClient/.test(content); // lib/supabase.js exporte
      // Ignorer si c'est un commentaire (versions-data.js contient des snippets)
      const isDataFile = f.endsWith("versions-data.js");

      if (isUseClient && callsCreateClient && !hasImport && !isDataFile) {
        culprits.push(path.relative(process.cwd(), f));
      }
    }

    expect(culprits).toEqual([]);
  });
});
