// =============================================================
//  Tests unitaires — 0.57.36
//  Rate-limit login bruteforce + SW handler origin check
// =============================================================
import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.36 - Version", () => {
  it("Version 0.57.36+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(36);
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.57.36 - lib/loginRateLimit.js : structure", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "lib/loginRateLimit.js"),
    "utf-8"
  );

  it("Exporte checkLoginBlock + recordFailedLogin + resetLoginAttempts + formatBlockTime", () => {
    expect(src).toMatch(/export function checkLoginBlock/);
    expect(src).toMatch(/export function recordFailedLogin/);
    expect(src).toMatch(/export function resetLoginAttempts/);
    expect(src).toMatch(/export function formatBlockTime/);
  });

  it("Config : 5 tentatives en 5 min, blocage 1 min", () => {
    expect(src).toMatch(/MAX_ATTEMPTS\s*=\s*5/);
    expect(src).toMatch(/ATTEMPT_WINDOW_MS\s*=\s*5\s*\*\s*60_000/);
    expect(src).toMatch(/BLOCK_DURATION_MS\s*=\s*60_000/);
  });

  it("Storage key respecte le pattern 'aveho:*' (purgeable au logout)", () => {
    expect(src).toMatch(/STORAGE_KEY\s*=\s*["']aveho:login-attempts["']/);
  });

  it("Email lowercased pour la clé (anti case-bypass)", () => {
    expect(src).toMatch(/email\.toLowerCase\(\)/);
  });
});

describe("0.57.36 - loginRateLimit : tests fonctionnels", () => {
  // Mock localStorage en mémoire
  let store = {};
  global.window = {
    localStorage: {
      get length() { return Object.keys(store).length; },
      key: (i) => Object.keys(store)[i] || null,
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
      clear: () => { store = {}; },
    },
  };
  global.localStorage = global.window.localStorage;

  beforeEach(() => {
    store = {};
  });

  it("checkLoginBlock retourne blocked: false sur email jamais vu", async () => {
    const { checkLoginBlock } = await import("../lib/loginRateLimit.js");
    expect(checkLoginBlock("test@example.com").blocked).toBe(false);
  });

  it("recordFailedLogin compte les tentatives échouées", async () => {
    const { recordFailedLogin } = await import("../lib/loginRateLimit.js");
    const r1 = recordFailedLogin("user@example.com");
    expect(r1.blocked).toBe(false);
    expect(r1.attemptsLeft).toBe(4);

    const r2 = recordFailedLogin("user@example.com");
    expect(r2.attemptsLeft).toBe(3);
  });

  it("Bloque après 5 tentatives échouées", async () => {
    const { recordFailedLogin } = await import("../lib/loginRateLimit.js");
    let r;
    for (let i = 0; i < 5; i++) {
      r = recordFailedLogin("bruteforce@example.com");
    }
    expect(r.blocked).toBe(true);
    expect(r.remainingMs).toBeGreaterThan(0);
    expect(r.remainingMs).toBeLessThanOrEqual(60_000);
  });

  it("checkLoginBlock confirme le blocage", async () => {
    const { recordFailedLogin, checkLoginBlock } = await import("../lib/loginRateLimit.js");
    for (let i = 0; i < 5; i++) recordFailedLogin("blocked@example.com");
    const r = checkLoginBlock("blocked@example.com");
    expect(r.blocked).toBe(true);
    expect(r.remainingMs).toBeGreaterThan(0);
  });

  it("resetLoginAttempts efface le compteur (login réussi)", async () => {
    const { recordFailedLogin, resetLoginAttempts, checkLoginBlock } =
      await import("../lib/loginRateLimit.js");
    for (let i = 0; i < 5; i++) recordFailedLogin("ok@example.com");
    expect(checkLoginBlock("ok@example.com").blocked).toBe(true);

    resetLoginAttempts("ok@example.com");
    expect(checkLoginBlock("ok@example.com").blocked).toBe(false);
  });

  it("Cas-insensitive (TEST@example.com === test@example.com)", async () => {
    const { recordFailedLogin, checkLoginBlock } = await import("../lib/loginRateLimit.js");
    for (let i = 0; i < 5; i++) recordFailedLogin("Mixed@Case.COM");
    const r = checkLoginBlock("mixed@case.com");
    expect(r.blocked).toBe(true);
  });

  it("Email invalide : pas de crash", async () => {
    const { checkLoginBlock, recordFailedLogin } = await import("../lib/loginRateLimit.js");
    expect(() => checkLoginBlock("")).not.toThrow();
    expect(() => checkLoginBlock(null)).not.toThrow();
    expect(() => recordFailedLogin(undefined)).not.toThrow();
  });

  it("formatBlockTime affiche en secondes ou minutes", async () => {
    const { formatBlockTime } = await import("../lib/loginRateLimit.js");
    expect(formatBlockTime(30_000)).toMatch(/30 secondes?/);
    expect(formatBlockTime(120_000)).toMatch(/minute/);
  });
});

describe("0.57.36 - app/login/page.js : intégration rate-limit", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/login/page.js"),
    "utf-8"
  );

  it("Import loginRateLimit", () => {
    expect(src).toMatch(/loginRateLimit/);
  });

  it("checkLoginBlock appelé AVANT signInWithPassword", () => {
    const submitFn = src.substring(src.indexOf("async function submit"));
    const checkPos = submitFn.indexOf("checkLoginBlock");
    const signInPos = submitFn.indexOf("signInWithPassword");
    expect(checkPos).toBeGreaterThan(-1);
    expect(checkPos).toBeLessThan(signInPos);
  });

  it("recordFailedLogin appelé sur erreur signIn", () => {
    expect(src).toMatch(/recordFailedLogin\(email\)/);
  });

  it("resetLoginAttempts appelé après login réussi", () => {
    expect(src).toMatch(/resetLoginAttempts\(email\)/);
  });
});

describe("0.57.36 - public/sw.js : check origin defense-in-depth", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "public/sw.js"),
    "utf-8"
  );

  it("Handler CLEAR_USER_CACHE vérifie event.source.url", () => {
    const handlerBlock = src.substring(src.indexOf("CLEAR_USER_CACHE"));
    expect(handlerBlock).toMatch(/event\.source/);
    expect(handlerBlock).toMatch(/sourceUrl\.origin/);
    expect(handlerBlock).toMatch(/myUrl\.origin/);
  });

  it("Refuse si origin différente", () => {
    const handlerBlock = src.substring(src.indexOf("CLEAR_USER_CACHE"));
    expect(handlerBlock).toMatch(/sourceUrl\.origin\s*!==\s*myUrl\.origin/);
    expect(handlerBlock).toMatch(/return;/);
  });
});

describe("0.57.36 - LINT anti-régression : login utilise toujours rate-limit", () => {
  it("Tout appel à signInWithPassword est précédé d'un check rate-limit", () => {
    // Pour chaque fichier qui appelle signInWithPassword, vérifier qu'il
    // y a aussi un check checkLoginBlock dans le même fichier
    // Exception : inscription/[token]/page.js (signature d'invitation, pas un login normal)
    const violations = [];
    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.name.startsWith(".") || item.name === "node_modules") continue;
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          scan(full);
        } else if (item.name === "page.js") {
          const src = fs.readFileSync(full, "utf-8");
          // Whitelist : inscription/[token]/page.js — login automatique après accept invitation
          // 0.57.21 fix : normaliser les paths Windows (\) en / avant includes
          const fullNorm = full.replace(/\\/g, "/");
          if (fullNorm.includes("/inscription/")) continue;
          if (/signInWithPassword/.test(src)) {
            if (!/checkLoginBlock|recordFailedLogin/.test(src)) {
              violations.push(full);
            }
          }
        }
      }
    }
    scan(path.resolve(process.cwd(), "app"));
    expect(
      violations,
      `Pages avec signInWithPassword sans rate-limit : ${violations.join(", ")}`
    ).toEqual([]);
  });
});
