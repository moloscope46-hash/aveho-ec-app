// =============================================================
//  Tests unitaires — 0.57.25
//  Validation Zod-like des body API + fix SSRF Host header injection
//  + IDOR check structure membership + audit anti-régression
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.25 - Version", () => {
  it("Version 0.57.25+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(25);
  });
});

describe("0.57.25 - lib/validateInput.js (mini-validator zod-like)", () => {
  const libPath = "lib/validateInput.js";

  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), libPath))).toBe(true);
  });

  it("Exporte la fonction validate()", async () => {
    const mod = await import(path.resolve(process.cwd(), libPath));
    expect(typeof mod.validate).toBe("function");
  });

  it("Exporte validateOr400 helper", async () => {
    const mod = await import(path.resolve(process.cwd(), libPath));
    expect(typeof mod.validateOr400).toBe("function");
  });

  it("Exporte les REGEX patterns courants", async () => {
    const mod = await import(path.resolve(process.cwd(), libPath));
    expect(mod.REGEX).toHaveProperty("UUID");
    expect(mod.REGEX).toHaveProperty("EMAIL");
    expect(mod.REGEX).toHaveProperty("FINESS");
    expect(mod.REGEX).toHaveProperty("RPPS");
    expect(mod.REGEX).toHaveProperty("SIRET");
  });

  it("validate() rejette body non-objet", async () => {
    const { validate } = await import(path.resolve(process.cwd(), libPath));
    expect(validate(null, {})).toHaveLength(1);
    expect(validate("string", {})).toHaveLength(1);
    expect(validate([], {})).toHaveLength(1);
  });

  it("validate() détecte les champs requis manquants", async () => {
    const { validate } = await import(path.resolve(process.cwd(), libPath));
    const errors = validate({}, { foo: { type: "string", required: true } });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/foo.*requis/i);
  });

  it("validate() valide les UUID", async () => {
    const { validate } = await import(path.resolve(process.cwd(), libPath));
    expect(validate({ id: "not-uuid" }, { id: { type: "uuid" } })).toHaveLength(1);
    expect(validate({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }, { id: { type: "uuid" } })).toHaveLength(0);
  });

  it("validate() valide les emails", async () => {
    const { validate } = await import(path.resolve(process.cwd(), libPath));
    expect(validate({ email: "not-email" }, { email: { type: "email" } })).toHaveLength(1);
    expect(validate({ email: "user@example.com" }, { email: { type: "email" } })).toHaveLength(0);
  });

  it("validate() valide les FINESS (9 chiffres)", async () => {
    const { validate } = await import(path.resolve(process.cwd(), libPath));
    expect(validate({ f: "12345" }, { f: { type: "finess" } })).toHaveLength(1);
    expect(validate({ f: "123456789" }, { f: { type: "finess" } })).toHaveLength(0);
  });

  it("validate() refuse string trop longue (anti-DoS)", async () => {
    const { validate } = await import(path.resolve(process.cwd(), libPath));
    const longString = "x".repeat(20_000);
    expect(validate({ s: longString }, { s: { type: "string", maxLen: 100 } })).toHaveLength(1);
  });

  it("validate() refuse number hors range", async () => {
    const { validate } = await import(path.resolve(process.cwd(), libPath));
    expect(validate({ n: 200 }, { n: { type: "number", max: 100 } })).toHaveLength(1);
    expect(validate({ n: -5 }, { n: { type: "number", min: 0 } })).toHaveLength(1);
  });

  it("validate() refuse enum hors valeurs autorisées", async () => {
    const { validate } = await import(path.resolve(process.cwd(), libPath));
    expect(validate({ role: "hacker" }, { role: { type: "enum", values: ["admin", "user"] } })).toHaveLength(1);
    expect(validate({ role: "admin" }, { role: { type: "enum", values: ["admin", "user"] } })).toHaveLength(0);
  });

  it("validate() refuse array trop long (anti-DoS)", async () => {
    const { validate } = await import(path.resolve(process.cwd(), libPath));
    const longArr = new Array(2_000).fill(0);
    expect(validate({ a: longArr }, { a: { type: "array", maxLen: 100 } })).toHaveLength(1);
  });

  it("validate() refuse type confusion (string au lieu de number)", async () => {
    const { validate } = await import(path.resolve(process.cwd(), libPath));
    expect(validate({ n: "123" }, { n: { type: "number" } })).toHaveLength(1);
    expect(validate({ s: 123 }, { s: { type: "string" } })).toHaveLength(1);
  });
});

describe("0.57.25 - Validation appliquée sur app/api/patients/from-ocr", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/api/patients/from-ocr/route.js"),
    "utf-8"
  );

  it("Import lib/validateInput", () => {
    expect(src).toMatch(/import\s*\{\s*validate\s*\}\s*from\s*["']\.\.\/\.\.\/\.\.\/\.\.\/lib\/validateInput["']/);
  });

  it("Validate body : etablissement_id (uuid optionnel)", () => {
    expect(src).toMatch(/etablissement_id:\s*\{\s*type:\s*["']uuid["']/);
  });

  it("Validate body : ocr_text_brut (string maxLen 50000)", () => {
    expect(src).toMatch(/ocr_text_brut:\s*\{[^}]*maxLen:\s*50_?000/);
  });

  it("Validate body : data required (object)", () => {
    expect(src).toMatch(/data:\s*\{[^}]*type:\s*["']object["'][^}]*required:\s*true/);
  });

  it("Validate OCR object : nom required (1-100 chars)", () => {
    expect(src).toMatch(/nom:\s*\{[^}]*required:\s*true[^}]*maxLen:\s*100/);
  });

  it("Retourne 400 si validationErrors", () => {
    expect(src).toMatch(/validationErrors\.length\s*>\s*0/);
    expect(src).toMatch(/status:\s*400/);
  });
});

describe("0.57.25 - Validation appliquée sur app/api/prescriptions/from-ocr", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/api/prescriptions/from-ocr/route.js"),
    "utf-8"
  );

  it("Import lib/validateInput", () => {
    expect(src).toMatch(/import\s*\{\s*validate\s*\}/);
  });

  it("Validate body : patient_id required uuid", () => {
    expect(src).toMatch(/patient_id:\s*\{[^}]*type:\s*["']uuid["'][^}]*required:\s*true/);
  });

  it("Validate body : structure_id required uuid", () => {
    expect(src).toMatch(/structure_id:\s*\{[^}]*type:\s*["']uuid["'][^}]*required:\s*true/);
  });

  it("Validate prescripteur (nom/prenom/rpps maxLen)", () => {
    expect(src).toMatch(/data\.prescripteur/);
    expect(src).toMatch(/presErrors/);
  });

  it("Limite max 100 médicaments par prescription (anti-DoS)", () => {
    expect(src).toMatch(/medicaments\.length\s*>\s*100/);
  });

  it("IDOR check : vérifie membership structure_id avant insert", () => {
    expect(src).toMatch(/membres_structure[\s\S]{0,200}structure_id/);
    expect(src).toMatch(/Accès refusé/);
    expect(src).toMatch(/status:\s*403/);
  });
});

describe("0.57.25 - Fix SSRF / Host header injection", () => {
  const libPath = "lib/internalFetch.js";

  it("lib/internalFetch.js existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), libPath))).toBe(true);
  });

  const src = fs.readFileSync(path.resolve(process.cwd(), libPath), "utf-8");

  it("Whitelist hosts par regex (anti-Host-injection)", () => {
    expect(src).toMatch(/ALLOWED_HOSTS_PATTERNS/);
    expect(src).toMatch(/aveho-ec-app\\\.vercel\\\.app/);
    expect(src).toMatch(/localhost/);
  });

  it("Exporte isAllowedInternalHost", async () => {
    const mod = await import(path.resolve(process.cwd(), libPath));
    expect(typeof mod.isAllowedInternalHost).toBe("function");
  });

  it("Exporte buildInternalUrl", async () => {
    const mod = await import(path.resolve(process.cwd(), libPath));
    expect(typeof mod.buildInternalUrl).toBe("function");
  });

  it("Exporte internalFetch (helper haut niveau)", async () => {
    const mod = await import(path.resolve(process.cwd(), libPath));
    expect(typeof mod.internalFetch).toBe("function");
  });

  it("isAllowedInternalHost accepte les hosts légitimes", async () => {
    const { isAllowedInternalHost } = await import(path.resolve(process.cwd(), libPath));
    expect(isAllowedInternalHost("localhost:3000")).toBe(true);
    expect(isAllowedInternalHost("aveho-ec-app.vercel.app")).toBe(true);
    expect(isAllowedInternalHost("aveho-ec-app-abc123.vercel.app")).toBe(true);
    expect(isAllowedInternalHost("aveho-ec-app-pnzuew0c1-fleos-projects.vercel.app")).toBe(true);
  });

  it("isAllowedInternalHost rejette les hosts malveillants", async () => {
    const { isAllowedInternalHost } = await import(path.resolve(process.cwd(), libPath));
    expect(isAllowedInternalHost("evil.com")).toBe(false);
    expect(isAllowedInternalHost("aveho-ec-app.vercel.app.evil.com")).toBe(false);
    expect(isAllowedInternalHost("attacker.aveho-ec-app.vercel.app")).toBe(false);
    expect(isAllowedInternalHost("")).toBe(false);
    expect(isAllowedInternalHost(null)).toBe(false);
  });

  it("buildInternalUrl throw si host non whitelisté", async () => {
    const { buildInternalUrl } = await import(path.resolve(process.cwd(), libPath));
    const fakeReq = {
      headers: {
        get: (h) => (h === "host" ? "evil.com" : null),
      },
    };
    expect(() => buildInternalUrl(fakeReq, "/api/rpps")).toThrow(/SSRF prevention/);
  });

  it("buildInternalUrl construit l'URL si host OK", async () => {
    const { buildInternalUrl } = await import(path.resolve(process.cwd(), libPath));
    const fakeReq = {
      headers: {
        get: (h) => {
          if (h === "host") return "localhost:3000";
          if (h === "x-forwarded-proto") return "http";
          return null;
        },
      },
    };
    expect(buildInternalUrl(fakeReq, "/api/rpps?x=1")).toBe("http://localhost:3000/api/rpps?x=1");
  });
});

describe("0.57.25 - Code routes vulnérables mis à jour", () => {
  it("prescriptions/from-ocr utilise internalFetch (plus de fetch(host) direct)", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/prescriptions/from-ocr/route.js"),
      "utf-8"
    );
    expect(src).toMatch(/internalFetch/);
    // Le pattern dangereux `fetch(${proto}://${host}` ne doit plus exister
    expect(src).not.toMatch(/fetch\(\s*`\$\{proto\}:\/\/\$\{host\}/);
  });

  it("prescriptions/verify-rpps utilise internalFetch", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/prescriptions/verify-rpps/route.js"),
      "utf-8"
    );
    expect(src).toMatch(/internalFetch/);
    expect(src).not.toMatch(/fetch\(\s*`\$\{baseUrl\}/);
  });
});

describe("0.57.25 - Audit anti-régression SSRF : aucun fetch(\\${host}) restant", () => {
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

  it("Aucune route API ne fait fetch(`${proto}://${host}` direct", () => {
    const apiDir = path.join(process.cwd(), "app/api");
    const violations = [];
    for (const f of findFiles(apiDir)) {
      const src = fs.readFileSync(f, "utf-8");
      if (/fetch\(\s*`\$\{proto\}:\/\/\$\{host\}/.test(src)) {
        violations.push(f.replace(process.cwd(), ""));
      }
    }
    expect(violations, `Routes avec SSRF risk : ${violations.join(", ")}`).toEqual([]);
  });

  it("Aucune route API ne forward Authorization avec un host dérivé du Host header", () => {
    const apiDir = path.join(process.cwd(), "app/api");
    const violations = [];
    for (const f of findFiles(apiDir)) {
      const src = fs.readFileSync(f, "utf-8");
      // Pattern dangereux : Authorization forward + host header sans whitelist
      if (
        /Authorization.*req\.headers\.get/.test(src) &&
        /req\.headers\.get\(["']host["']\)/.test(src) &&
        !/internalFetch|isAllowedInternalHost/.test(src)
      ) {
        violations.push(f.replace(process.cwd(), ""));
      }
    }
    expect(violations, `Routes avec Host header injection risk : ${violations.join(", ")}`).toEqual([]);
  });
});
