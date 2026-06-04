// =============================================================
//  Tests unitaires — 0.57.35
//  Cleanup données utilisateur au logout (device partagé)
// =============================================================
import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.35 - Version", () => {
  it("Version 0.57.35+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(35);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.57.35 - lib/clearUserData.js : structure", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "lib/clearUserData.js"),
    "utf-8"
  );

  it("Exporte purgeLocalStorage + clearSwCache + clearUserData", () => {
    expect(src).toMatch(/export function purgeLocalStorage/);
    expect(src).toMatch(/export async function clearSwCache/);
    expect(src).toMatch(/export async function clearUserData/);
  });

  it("SENSITIVE_LS_PREFIXES contient aveho: + aveho_ + caches", () => {
    const match = src.match(/SENSITIVE_LS_PREFIXES\s*=\s*\[([\s\S]*?)\]/);
    expect(match).toBeTruthy();
    expect(match[1]).toMatch(/aveho:/);
    expect(match[1]).toMatch(/aveho_/);
    expect(match[1]).toMatch(/ville:/);
    expect(match[1]).toMatch(/etab-photo-/);
  });

  it("KEEP_KEYS whitelist (au moins aveho:debug-logs)", () => {
    expect(src).toMatch(/KEEP_KEYS\s*=\s*\[/);
    expect(src).toMatch(/aveho:debug-logs/);
  });

  it("clearSwCache utilise MessageChannel pour réponse SW", () => {
    expect(src).toMatch(/MessageChannel/);
    expect(src).toMatch(/postMessage\(\s*\{\s*type:\s*["']CLEAR_USER_CACHE/);
  });

  it("clearSwCache a un timeout de sécurité (2s)", () => {
    expect(src).toMatch(/setTimeout.*2000/);
  });

  it("clearUserData appelle les 2 fonctions et retourne stats", () => {
    expect(src).toMatch(/ls_purged\s*=\s*purgeLocalStorage\(\)/);
    expect(src).toMatch(/sw_cleared\s*=\s*await\s+clearSwCache\(\)/);
  });
});

describe("0.57.35 - lib/clearUserData.js : tests fonctionnels (localStorage)", () => {
  beforeEach(() => {
    // Reset localStorage mock entre tests
    if (typeof global.localStorage !== "undefined") {
      try { global.localStorage.clear(); } catch {}
    }
  });

  it("purgeLocalStorage enlève les clés aveho:* mais garde aveho:debug-logs", async () => {
    // Mock localStorage
    const store = {
      "aveho:search-history": JSON.stringify([{ type: "patient", nom: "DUPONT" }]),
      "aveho_dashboard": '{"active":["di"]}',
      "aveho:debug-logs": "1",
      "another-app:data": "ignore-moi",
    };
    global.localStorage = {
      length: Object.keys(store).length,
      key: (i) => Object.keys(store)[i],
      getItem: (k) => store[k] || null,
      removeItem: (k) => { delete store[k]; global.localStorage.length = Object.keys(store).length; },
      setItem: (k, v) => { store[k] = v; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; global.localStorage.length = 0; },
    };
    global.window = { localStorage: global.localStorage };

    const { purgeLocalStorage } = await import("../lib/clearUserData.js");
    const purged = purgeLocalStorage();

    expect(purged).toBe(2);  // aveho:search-history + aveho_dashboard
    expect(store["aveho:search-history"]).toBeUndefined();
    expect(store["aveho_dashboard"]).toBeUndefined();
    expect(store["aveho:debug-logs"]).toBe("1");  // conservé
    expect(store["another-app:data"]).toBe("ignore-moi");  // pas touché
  });

  it("purgeLocalStorage retourne 0 si localStorage indisponible", async () => {
    const oldWindow = global.window;
    global.window = undefined;

    // Re-import frais
    delete require.cache?.[require.resolve?.("../lib/clearUserData.js")];
    const { purgeLocalStorage } = await import("../lib/clearUserData.js");
    expect(purgeLocalStorage()).toBe(0);

    global.window = oldWindow;
  });
});

describe("0.57.35 - public/sw.js : handler CLEAR_USER_CACHE", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "public/sw.js"),
    "utf-8"
  );

  it("Listener message pour CLEAR_USER_CACHE", () => {
    expect(src).toMatch(/addEventListener\(["']message["']/);
    expect(src).toMatch(/CLEAR_USER_CACHE/);
  });

  it("Vide DATA_CACHE", () => {
    const handlerBlock = src.substring(src.indexOf("CLEAR_USER_CACHE"));
    expect(handlerBlock).toMatch(/caches\.open\(DATA_CACHE\)/);
  });

  it("Vide PAGE_CACHE", () => {
    const handlerBlock = src.substring(src.indexOf("CLEAR_USER_CACHE"));
    expect(handlerBlock).toMatch(/caches\.open\(PAGE_CACHE\)/);
  });

  it("NE vide PAS STATIC_CACHE (assets immutables)", () => {
    const handlerBlock = src.substring(src.indexOf("CLEAR_USER_CACHE"));
    expect(handlerBlock).not.toMatch(/caches\.open\(STATIC_CACHE\)/);
  });

  it("Reply via MessageChannel si fourni", () => {
    const handlerBlock = src.substring(src.indexOf("CLEAR_USER_CACHE"));
    expect(handlerBlock).toMatch(/event\.ports\s*\[\s*0\s*\]/);
    expect(handlerBlock).toMatch(/postMessage/);
  });
});

describe("0.57.35 - UserMenu.js : appelle clearUserData au logout", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/UserMenu.js"),
    "utf-8"
  );

  it("Import dynamique de clearUserData", () => {
    expect(src).toMatch(/clearUserData/);
    expect(src).toMatch(/import\(\s*["'][^"']*clearUserData/);
  });

  it("Appel AVANT supabase.auth.signOut()", () => {
    const logoutFn = src.substring(
      src.indexOf("async function logout"),
      src.indexOf("router.push(\"/login\")", src.indexOf("async function logout")) + 30
    );
    const clearPos = logoutFn.indexOf("clearUserData");
    const signOutPos = logoutFn.indexOf("signOut()");
    expect(clearPos).toBeGreaterThan(-1);
    expect(signOutPos).toBeGreaterThan(-1);
    expect(clearPos).toBeLessThan(signOutPos);
  });

  it("try/catch autour (graceful fallback)", () => {
    const logoutFn = src.substring(
      src.indexOf("async function logout"),
      src.indexOf("router.push(\"/login\")", src.indexOf("async function logout")) + 30
    );
    expect(logoutFn).toMatch(/try\s*\{/);
    expect(logoutFn).toMatch(/catch/);
  });
});

describe("0.57.35 - LINT anti-régression : pas de PII patient en localStorage", () => {
  // Pattern problématique : localStorage.setItem("...", JSON.stringify({...patient.nom...}))
  // sans préfixe "aveho" → ne serait pas purgé au logout

  it("Toutes les clés localStorage commencent par un préfixe purgeable", () => {
    const violations = [];
    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.name.startsWith(".") || item.name === "node_modules") continue;
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          scan(full);
        } else if (item.name.endsWith(".js") || item.name.endsWith(".jsx")) {
          const src = fs.readFileSync(full, "utf-8");
          // Trouve les localStorage.setItem("xxx",...)
          const matches = src.matchAll(/localStorage\.setItem\(\s*["']([^"']+)["']/g);
          for (const m of matches) {
            const key = m[1];
            // Variables dynamiques (cacheKey, KEY) → on skip (le préfixe est dans la variable)
            if (key.includes("$")) continue;
            // Whitelist : préfixes connus + clés sans PII
            const isPurgeable =
              key.startsWith("aveho:") ||
              key.startsWith("aveho_") ||
              key.startsWith("ville:") ||
              key.startsWith("etab-photo-");
            if (!isPurgeable) violations.push(`${full}: "${key}"`);
          }
        }
      }
    }
    scan(path.resolve(process.cwd(), "app"));
    scan(path.resolve(process.cwd(), "lib"));

    expect(
      violations,
      `Clés localStorage qui ne seront pas purgées au logout : ${violations.join(", ")}`
    ).toEqual([]);
  });
});
