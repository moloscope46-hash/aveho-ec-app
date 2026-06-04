// =============================================================
//  Tests unitaires — 0.57.27
//  Fix bug "Session expirée" biométrie + escape SQL wildcards ILIKE
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.27 - Version", () => {
  it("Version 0.57.27+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(27);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });
});

describe("0.57.27 - Fix bug biométrie 'Session expirée'", () => {
  const webauthnSrc = fs.readFileSync(
    path.resolve(process.cwd(), "lib/webauthn.js"),
    "utf-8"
  );

  it("Nouvelle fonction syncBiometricRefreshTokens exportée", () => {
    expect(webauthnSrc).toMatch(/export async function syncBiometricRefreshTokens/);
  });

  it("syncBiometricRefreshTokens met à jour empreinte ET face", () => {
    expect(webauthnSrc).toMatch(/for \(const method of \["empreinte", "face"\]\)/);
  });

  it("syncBiometricRefreshTokens utilise getSession() pour récupérer le refresh_token frais", () => {
    expect(webauthnSrc).toMatch(/supabase\.auth\.getSession\(\)/);
    expect(webauthnSrc).toMatch(/session\?\.refresh_token/);
  });

  it("syncBiometricRefreshTokens enregistre last_synced_at", () => {
    expect(webauthnSrc).toMatch(/last_synced_at/);
  });

  it("syncBiometricRefreshTokens non-bloquant (try/catch silencieux)", () => {
    const block = webauthnSrc.substring(
      webauthnSrc.indexOf("syncBiometricRefreshTokens"),
      webauthnSrc.indexOf("syncBiometricRefreshTokens") + 2000
    );
    expect(block).toMatch(/try\s*\{/);
    expect(block).toMatch(/catch.*\{/);
  });

  it("Distinction erreur réseau vs token expiré dans authenticateBiometric", () => {
    expect(webauthnSrc).toMatch(/isExpiredToken/);
    expect(webauthnSrc).toMatch(/error\?\.status === 400/);
    expect(webauthnSrc).toMatch(/refresh.*token|invalid_grant|expir/);
  });

  it("Erreur réseau → ne supprime PAS le credential (garde pour retry)", () => {
    expect(webauthnSrc).toMatch(/Connexion à Supabase impossible/);
    // Le bloc "erreur réseau" doit utiliser throw WITHOUT removeLocalCredential
    const networkBlock = webauthnSrc.substring(
      webauthnSrc.indexOf("isExpiredToken"),
      webauthnSrc.indexOf("Token vraiment expiré")
    );
    expect(networkBlock).not.toMatch(/removeLocalCredential/);
  });

  it("Token vraiment expiré → supprime credential + message UX clair", () => {
    expect(webauthnSrc).toMatch(/inutilisée depuis longtemps/);
    expect(webauthnSrc).toMatch(/automatiquement réactivée/);
  });
});

describe("0.57.27 - login/page.js appelle syncBiometricRefreshTokens", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/login/page.js"),
    "utf-8"
  );

  it("Import syncBiometricRefreshTokens", () => {
    expect(src).toMatch(/syncBiometricRefreshTokens/);
  });

  it("Appel après signInWithPassword réussi", () => {
    // 0.57.38 : le flow login a grandi (audit + rate-limit + 2FA), élargir la window
    const block = src.substring(
      src.indexOf("signInWithPassword"),
      src.indexOf("signInWithPassword") + 3000
    );
    expect(block).toMatch(/await syncBiometricRefreshTokens/);
  });

  it("Appel non-bloquant (try/catch silencieux)", () => {
    const block = src.substring(
      src.indexOf("syncBiometricRefreshTokens({"),
      src.indexOf("syncBiometricRefreshTokens({") + 300
    );
    expect(block).toMatch(/non-bloquant/);
  });
});

describe("0.57.27 - escapeIlike (sanitize SQL wildcards)", () => {
  it("Fonction exportée depuis lib/validateInput", async () => {
    const mod = await import(path.resolve(process.cwd(), "lib/validateInput.js"));
    expect(typeof mod.escapeIlike).toBe("function");
  });

  it("Échappe les %", async () => {
    const { escapeIlike } = await import(path.resolve(process.cwd(), "lib/validateInput.js"));
    expect(escapeIlike("100% safe")).toBe("100\\% safe");
  });

  it("Échappe les _", async () => {
    const { escapeIlike } = await import(path.resolve(process.cwd(), "lib/validateInput.js"));
    expect(escapeIlike("file_name")).toBe("file\\_name");
  });

  it("Échappe les \\ AVANT % et _ (sinon double-escape cassé)", async () => {
    const { escapeIlike } = await import(path.resolve(process.cwd(), "lib/validateInput.js"));
    expect(escapeIlike("a\\b")).toBe("a\\\\b");
  });

  it("Passe les inputs non-string sans modif", async () => {
    const { escapeIlike } = await import(path.resolve(process.cwd(), "lib/validateInput.js"));
    expect(escapeIlike(null)).toBe(null);
    expect(escapeIlike(123)).toBe(123);
  });

  it("Cas pratique : 'Dr O'Connor' → garde l'apostrophe (échappée par Supabase)", async () => {
    const { escapeIlike } = await import(path.resolve(process.cwd(), "lib/validateInput.js"));
    expect(escapeIlike("Dr O'Connor")).toBe("Dr O'Connor");
  });

  it("Wildcard injection neutralisé : '%' tout seul ne matche plus tout", async () => {
    const { escapeIlike } = await import(path.resolve(process.cwd(), "lib/validateInput.js"));
    expect(escapeIlike("%")).toBe("\\%");
  });
});

describe("0.57.27 - escapeIlike appliqué aux routes ILIKE", () => {
  const ROUTES_WITH_ILIKE = [
    "app/api/prescriptions/search/route.js",
    "app/api/prescriptions/export-csv/route.js",
    "app/api/patients/from-ocr/route.js",
  ];

  ROUTES_WITH_ILIKE.forEach((route) => {
    it(`${route} importe escapeIlike`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      expect(src).toMatch(/escapeIlike/);
    });

    it(`${route} utilise escapeIlike dans les requêtes .ilike()`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      // Chaque .ilike() avec interpolation doit utiliser escapeIlike
      const ilikeMatches = src.match(/\.ilike\([^)]*\$\{[^}]+\}/g) || [];
      for (const m of ilikeMatches) {
        expect(m, `.ilike() sans escapeIlike : ${m}`).toMatch(/escapeIlike/);
      }
    });
  });
});

describe("0.57.27 - Audit anti-régression : aucun ILIKE sans escape", () => {
  function findFiles(dir) {
    const files = [];
    function walk(d) {
      for (const item of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, item.name);
        if (item.isDirectory()) walk(full);
        else if (item.name.endsWith(".js")) files.push(full);
      }
    }
    walk(dir);
    return files;
  }

  it("Aucune route API ne fait .ilike(`%${...}%`) sans escapeIlike", () => {
    const apiDir = path.join(process.cwd(), "app/api");
    const violations = [];

    for (const f of findFiles(apiDir)) {
      const src = fs.readFileSync(f, "utf-8");
      // Pattern dangereux : .ilike("col", `%${variable}%`) sans escapeIlike
      const ilikeMatches = src.match(/\.ilike\(\s*["'][^"']*["']\s*,\s*`[^`]*\$\{[^}]+\}[^`]*`/g) || [];

      for (const m of ilikeMatches) {
        if (!/escapeIlike/.test(m)) {
          violations.push({
            file: f.replace(/\\/g, "/").split("app/api/")[1] || f,
            match: m.slice(0, 100),
          });
        }
      }
    }

    expect(
      violations.map(v => `${v.file}: ${v.match}`),
      "Routes avec .ilike() non sanitizé"
    ).toEqual([]);
  });
});
