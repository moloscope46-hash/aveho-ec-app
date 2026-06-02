// =============================================================
//  Tests unitaires — 0.56.1
//  Storage Supabase pour archivage bulletins scannés
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// 0.57.1 : helper qui concatène tous les fichiers du dossier edit/
function _readAllEditFiles() {
  const baseDir = path.resolve(process.cwd(), "app/patient/[id]/edit");
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js") || entry.name.endsWith(".jsx")) {
        out.push(fs.readFileSync(full, "utf-8"));
      }
    }
  }
  walk(baseDir);
  return out.join("\n");
}

describe("0.56.1 - SQL bucket + RLS + colonnes", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.1.sql"), "utf-8");

  it("Bucket bulletins-scannes créé (idempotent)", () => {
    expect(sql).toContain("storage.buckets");
    expect(sql).toContain("'bulletins-scannes'");
    expect(sql).toContain("on conflict (id) do update");
  });

  it("Bucket privé (public: false)", () => {
    expect(sql).toContain("false,");
    expect(sql).toContain("file_size_limit");
  });

  it("MIME autorisés : image + PDF", () => {
    expect(sql).toContain("image/jpeg");
    expect(sql).toContain("image/png");
    expect(sql).toContain("application/pdf");
  });

  it("Limite 10 Mo par fichier", () => {
    expect(sql).toContain("10485760");
  });

  it("4 policies RLS (select/insert/update/delete)", () => {
    expect(sql).toContain("bulletins_scannes_select");
    expect(sql).toContain("bulletins_scannes_insert");
    expect(sql).toContain("bulletins_scannes_update");
    expect(sql).toContain("bulletins_scannes_delete");
  });

  it("Filtrage par structure_id (premier segment du path)", () => {
    expect(sql).toContain("storage.foldername(name)");
    expect(sql).toContain("membres_structure");
  });

  it("Colonnes patients : bs_file_path + bs_file_mime + bs_file_size_kb", () => {
    expect(sql).toContain("add column if not exists bs_file_path");
    expect(sql).toContain("add column if not exists bs_file_mime");
    expect(sql).toContain("add column if not exists bs_file_size_kb");
  });

  it("Colonnes audit IA : tokens_in + tokens_out + confiance", () => {
    expect(sql).toContain("bs_ocr_tokens_in");
    expect(sql).toContain("bs_ocr_tokens_out");
    expect(sql).toContain("bs_ocr_confiance");
  });

  it("Index sur archives (structure_id + date desc)", () => {
    expect(sql).toContain("idx_patients_bs_archive");
  });

  it("RPC bulletins_archive_stats (security definer)", () => {
    expect(sql).toContain("function bulletins_archive_stats");
    expect(sql).toContain("security definer");
    expect(sql).toContain("total_patients_avec_bs");
    expect(sql).toContain("tokens_total_in");
  });
});

describe("0.56.1 - Helper lib/bulletinsStorage.js", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/bulletinsStorage.js"), "utf-8");

  it("Constante BUCKET = bulletins-scannes", () => {
    expect(src).toContain('const BUCKET = "bulletins-scannes"');
  });

  it("buildPath structure_id/patient_id/timestamp-filename", () => {
    expect(src).toContain("function buildPath");
    expect(src).toContain("${structureId}/${patientId}/${ts}");
  });

  it("Sanitize filename (lowercase + special chars)", () => {
    expect(src).toContain("sanitizeFilename");
    expect(src).toContain("[^a-z0-9.\\-_]");
  });

  it("uploadBulletin retourne {path, size_kb, mime, error?}", () => {
    expect(src).toContain("export async function uploadBulletin");
    expect(src).toContain("size_kb: Math.round");
  });

  it("getSignedUrl avec expiration", () => {
    expect(src).toContain("export async function getSignedUrl");
    expect(src).toContain("createSignedUrl");
    expect(src).toContain("expiresIn = 3600");
  });

  it("deleteBulletin pour suppression admin", () => {
    expect(src).toContain("export async function deleteBulletin");
    expect(src).toContain("storage.from(BUCKET).remove");
  });
});

describe("0.56.1 - Intégration workflow scan/bulletin-situation", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/bulletin-situation/page.js"), "utf-8");

  it("Transmet confiance + tokens à /api/patients/from-ocr", () => {
    expect(src).toContain("ocr_confiance:");
    expect(src).toContain("ocr_tokens_in:");
    expect(src).toContain("ocr_tokens_out:");
  });

  it("Upload après création patient (uploadBulletin)", () => {
    expect(src).toContain("uploadBulletin");
    expect(src).toContain("structureId: auth.structureId");
    expect(src).toContain("patientId,");
  });

  it("Update patient avec bs_file_path après upload", () => {
    expect(src).toContain("bs_file_path: up.path");
    expect(src).toContain("bs_file_mime: up.mime");
    expect(src).toContain("bs_file_size_kb: up.size_kb");
  });

  it("Warning si archivage échoue (non bloquant)", () => {
    expect(src).toContain("archiveWarning");
    expect(src).toContain("non bloquant");
  });

  it("Badge 'Bulletin archivé dans Storage' sur étape done", () => {
    expect(src).toContain("Bulletin archivé dans Storage");
  });
});

describe("0.56.1 - API /api/patients/from-ocr accepte les méta OCR", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/patients/from-ocr/route.js"), "utf-8");

  it("Body inclut ocr_confiance, ocr_tokens_in, ocr_tokens_out", () => {
    expect(src).toContain("ocr_confiance");
    expect(src).toContain("ocr_tokens_in");
    expect(src).toContain("ocr_tokens_out");
  });

  it("Payload patient inclut bs_ocr_confiance + tokens", () => {
    expect(src).toContain("bs_ocr_confiance:");
    expect(src).toContain("bs_ocr_tokens_in:");
    expect(src).toContain("bs_ocr_tokens_out:");
  });
});

describe("0.56.1 - TabAudit avec preview signée", () => {
  const src = _readAllEditFiles();

  it("useEffect : génération URL signée si bs_file_path", () => {
    expect(src).toContain("pat.bs_file_path");
    expect(src).toContain("getSignedUrl(supabase, pat.bs_file_path");
  });

  it("Detect MIME (image vs PDF vs autre)", () => {
    expect(src).toContain("pat.bs_file_mime");
    expect(src).toContain('"application/pdf"');
  });

  it("Affichage tokens IN/OUT + confiance dans Audit", () => {
    expect(src).toContain("bs_ocr_confiance");
    expect(src).toContain("bs_ocr_tokens_in");
  });

  it("Preview image si MIME image/*", () => {
    expect(src).toContain('startsWith("image/")');
    expect(src).toContain("<img");
  });

  it("Bouton ouvrir PDF si MIME pdf", () => {
    expect(src).toContain("Ouvrir le PDF");
  });

  it("Mention 'Lien valide 1h' (sécurité)", () => {
    expect(src).toContain("Lien valide 1h");
  });

  it("Compat ancien format bs_file_url", () => {
    expect(src).toContain("pat.bs_file_url");
    expect(src).toContain("ancien format");
  });
});

describe("0.56.1 - Page admin /admin/bulletins-archive", () => {
  const p = "app/admin/bulletins-archive/page.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), p))).toBe(true);
  });

  it("Appelle RPC bulletins_archive_stats", () => {
    expect(src).toContain('"bulletins_archive_stats"');
  });

  it("Liste patients avec bs_file_path NOT NULL", () => {
    expect(src).toContain('.not("bs_file_path", "is", null)');
  });

  it("Filtre par nom/prénom/dossier", () => {
    expect(src).toContain("filter");
  });

  it("Stats : KPI bulletins archivés + espace + tokens", () => {
    expect(src).toContain("Bulletins archivés");
    expect(src).toContain("Espace utilisé");
    expect(src).toContain("Tokens IN total");
  });

  it("Estimation coût Claude Sonnet 4", () => {
    expect(src).toContain("estimateCost");
    expect(src).toContain("Claude Sonnet 4");
    expect(src).toContain("3$/M");
  });

  it("Badge confiance coloré (haute/moyenne/faible)", () => {
    expect(src).toContain('=== "haute"');
    expect(src).toContain('=== "moyenne"');
  });

  it("Bouton 'Voir' redirige vers /patient/[id]/edit?tab=audit", () => {
    expect(src).toContain("/edit?tab=audit");
  });

  it("Panneau pédagogie RLS + URL signées", () => {
    expect(src).toContain("Bucket privé");
    expect(src).toContain("URL signées");
  });
});

describe("0.56.1 - Menu admin inclut Bulletins archivés", () => {
  it("Entrée /admin/bulletins-archive dans TopBar", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
    expect(src).toContain("/admin/bulletins-archive");
    expect(src).toContain("Bulletins archivés");
  });
});
