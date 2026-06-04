// =============================================================
//  Tests unitaires — 0.57.31
//  Audit + durcissement Edge Functions Supabase
//  + MIME whitelist OCR generic
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.31 - Version", () => {
  it("Version 0.57.31+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(31);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.57.31 - Helper _shared/auth.ts pour Edge Functions", () => {
  const helperPath = path.resolve(process.cwd(), "supabase/functions/_shared/auth.ts");

  it("Fichier existe", () => {
    expect(fs.existsSync(helperPath)).toBe(true);
  });

  const src = fs.readFileSync(helperPath, "utf-8");

  it("Exporte isAllowedOrigin + buildCorsHeaders + requireAuth + authAndCheckStructure", () => {
    expect(src).toMatch(/export function isAllowedOrigin/);
    expect(src).toMatch(/export function buildCorsHeaders/);
    expect(src).toMatch(/export async function requireAuth/);
    expect(src).toMatch(/export async function authAndCheckStructure/);
  });

  it("CORS whitelist contient les origins Aveho", () => {
    expect(src).toMatch(/aveho-ec-app\.vercel\.app/);
    expect(src).toMatch(/aveho\.fr/);
    expect(src).toMatch(/localhost:3000/);
  });

  it("Pattern regex pour les previews Vercel", () => {
    // 0.57.38 : pattern élargi pour matcher tous sous-domaines aveho-ec-app*.vercel.app
    // (avant : aveho-ec-app-[a-z0-9-]+-fleos-projects, maintenant : aveho-ec-app[a-z0-9-]*)
    expect(src).toMatch(/aveho-ec-app\[a-z0-9-\][*+]\\\.vercel\\\.app|aveho-ec-app-\[a-z0-9-\]\+-fleos-projects/);
  });

  it("Header Vary: Origin (correctness cache CDN)", () => {
    expect(src).toMatch(/Vary["']?\s*:\s*["']Origin/);
  });

  it("requireAuth vérifie le Bearer token", () => {
    expect(src).toMatch(/authHeader.*startsWith\(.Bearer/);
    expect(src).toMatch(/auth\.getUser\(token\)/);
  });

  it("requireStructureMembership valide le format UUID strict", () => {
    expect(src).toMatch(/UUID_RE\s*=\s*\/\^\[0-9a-f\]\{8\}/);
  });

  it("requireStructureMembership query membres_structure", () => {
    expect(src).toMatch(/from\(.membres_structure./);
    expect(src).toMatch(/\.eq\(.user_id.,\s*userId\)/);
    expect(src).toMatch(/\.eq\(.structure_id.,\s*structureId\)/);
  });

  it("Réponse 403 si non membre", () => {
    expect(src).toMatch(/status:\s*403/);
    expect(src).toMatch(/non membre/i);
  });
});

describe("0.57.31 - send-email : auth + check structure membership", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/functions/send-email/index.ts"),
    "utf-8"
  );

  it("Import _shared/auth.ts (buildCorsHeaders + authAndCheckStructure)", () => {
    expect(src).toMatch(/from\s+["']\.\.\/_shared\/auth\.ts["']/);
    expect(src).toMatch(/authAndCheckStructure/);
  });

  it("CORS PLUS de Access-Control-Allow-Origin: \"*\"", () => {
    // Le pattern dangereux `"*"` dans les CORS headers ne doit plus exister
    // (skip les commentaires qui peuvent référencer l'ancien pattern pour expliquer le fix)
    const codeOnly = src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
    expect(codeOnly).not.toMatch(/Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
  });

  it("Appelle authAndCheckStructure avec structure_id du body", () => {
    expect(src).toMatch(/authAndCheckStructure\(req,\s*structure_id\)/);
  });

  it("Retourne errorResponse si auth échoue", () => {
    expect(src).toMatch(/authResult\.errorResponse/);
    expect(src).toMatch(/return authResult\.errorResponse/);
  });
});

describe("0.57.31 - send-webhook : auth + check structure", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/functions/send-webhook/index.ts"),
    "utf-8"
  );

  it("Import _shared/auth.ts", () => {
    expect(src).toMatch(/from\s+["']\.\.\/_shared\/auth\.ts["']/);
  });

  it("CORS plus de \"*\"", () => {
    const codeOnly = src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n"); expect(codeOnly).not.toMatch(/Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
  });

  it("authAndCheckStructure appelé avant l'accès aux webhooks", () => {
    expect(src).toMatch(/authAndCheckStructure\(req,\s*structure_id\)/);
    const handlerBlock = src.substring(src.indexOf("Deno.serve"));
    const authPos = handlerBlock.indexOf("authAndCheckStructure");
    const webhookPos = handlerBlock.indexOf("from(\"structures\")");
    expect(authPos).toBeGreaterThan(-1);
    expect(webhookPos).toBeGreaterThan(-1);
    expect(authPos).toBeLessThan(webhookPos);
  });
});

describe("0.57.31 - send-push : auth + check structure", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/functions/send-push/index.ts"),
    "utf-8"
  );

  it("Import _shared/auth.ts", () => {
    expect(src).toMatch(/from\s+["']\.\.\/_shared\/auth\.ts["']/);
  });

  it("CORS plus de \"*\"", () => {
    const codeOnly = src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n"); expect(codeOnly).not.toMatch(/Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
  });

  it("authAndCheckStructure avant le query push_targets", () => {
    expect(src).toMatch(/authAndCheckStructure\(req,\s*structure_id\)/);
  });
});

describe("0.57.31 - invite-user : auth obligatoire (anti-phishing)", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/functions/invite-user/index.ts"),
    "utf-8"
  );

  it("Import _shared/auth.ts (requireAuth)", () => {
    expect(src).toMatch(/from\s+["']\.\.\/_shared\/auth\.ts["']/);
    expect(src).toMatch(/requireAuth/);
  });

  it("CORS dynamique (plus de constante \"*\")", () => {
    expect(src).toMatch(/buildCorsHeaders\(req\)/);
    const codeOnly = src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n"); expect(codeOnly).not.toMatch(/Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
  });

  it("requireAuth appelé avant le traitement du body", () => {
    const handlerBlock = src.substring(src.indexOf("Deno.serve"));
    const authPos = handlerBlock.indexOf("requireAuth");
    const resendPos = handlerBlock.indexOf("RESEND_API_KEY");
    expect(authPos).toBeGreaterThan(-1);
    expect(resendPos).toBeGreaterThan(-1);
    expect(authPos).toBeLessThan(resendPos);
  });
});

describe("0.57.31 - OCR generic : whitelist MIME (anti-type-confusion)", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/api/ocr/generic/route.js"),
    "utf-8"
  );

  it("ALLOWED_MIMES défini", () => {
    expect(src).toMatch(/ALLOWED_MIMES\s*=\s*\[/);
  });

  it("Inclut image/jpeg, png, webp, gif, application/pdf", () => {
    const mimeMatch = src.match(/ALLOWED_MIMES\s*=\s*\[([\s\S]*?)\]/);
    expect(mimeMatch).toBeTruthy();
    expect(mimeMatch[1]).toMatch(/image\/jpeg/);
    expect(mimeMatch[1]).toMatch(/image\/png/);
    expect(mimeMatch[1]).toMatch(/image\/webp/);
    expect(mimeMatch[1]).toMatch(/image\/gif/);
    expect(mimeMatch[1]).toMatch(/application\/pdf/);
  });

  it("Rejette les MIME non whitelistés avec 400", () => {
    expect(src).toMatch(/!ALLOWED_MIMES\.includes\(media_type\)/);
    expect(src).toMatch(/status:\s*400/);
  });
});

describe("0.57.31 - LINT anti-régression : aucune Edge Function critique sans auth", () => {
  function findEdgeFunctions() {
    const dir = path.join(process.cwd(), "supabase/functions");
    if (!fs.existsSync(dir)) return [];
    const fns = [];
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      if (item.name.startsWith("_")) continue;  // skip _shared/
      const indexPath = path.join(dir, item.name, "index.ts");
      if (fs.existsSync(indexPath)) fns.push({ name: item.name, path: indexPath });
    }
    return fns;
  }

  // Whitelist : fonctions cron / scheduled (appelées par Supabase, pas par le client)
  const CRON_FUNCTIONS = [
    "auto-archive-consents",
    "maintenance-daily-cron",
    "weekly-stats-digest",
    "send-renouvellement-rappels",
    "send-digest",
    "sync-google-reviews",
    "welcome-user",  // déclenché par trigger Supabase auth.users
  ];

  it("Fonctions appelables par le client ont CORS restrictif (pas de \"*\")", () => {
    const violations = [];
    for (const fn of findEdgeFunctions()) {
      if (CRON_FUNCTIONS.includes(fn.name)) continue;
      const src = fs.readFileSync(fn.path, "utf-8");
      // Skip les commentaires (ils peuvent référencer l'ancien pattern pour expliquer le fix)
      const codeOnly = src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
      if (/Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/.test(codeOnly)) {
        violations.push(fn.name);
      }
    }
    expect(
      violations,
      `Edge Functions avec CORS "*" non whitelistées : ${violations.join(", ")}`
    ).toEqual([]);
  });

  it("Fonctions appelables par le client utilisent _shared/auth.ts", () => {
    const violations = [];
    for (const fn of findEdgeFunctions()) {
      if (CRON_FUNCTIONS.includes(fn.name)) continue;
      const src = fs.readFileSync(fn.path, "utf-8");
      if (!/_shared\/auth\.ts/.test(src)) {
        violations.push(fn.name);
      }
    }
    expect(
      violations,
      `Edge Functions appelables par client sans auth : ${violations.join(", ")}`
    ).toEqual([]);
  });
});
