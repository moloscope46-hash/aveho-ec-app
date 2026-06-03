// =============================================================
//  Tests unitaires — 0.56.3
//  OCR Prescriptions : tables + API + page + onglet patient
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

describe("0.56.3 - SQL : tables prescriptions + bucket + RLS", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.3.sql"), "utf-8");

  it("Table prescriptions avec FK patient + structure", () => {
    expect(sql).toContain("create table if not exists prescriptions");
    expect(sql).toContain("patient_id uuid not null references patients(id) on delete cascade");
    expect(sql).toContain("structure_id uuid not null");
  });

  it("Colonnes prescripteur (nom, RPPS, FINESS, spécialité)", () => {
    expect(sql).toContain("prescripteur_nom");
    expect(sql).toContain("prescripteur_rpps");
    expect(sql).toContain("prescripteur_finess");
    expect(sql).toContain("prescripteur_specialite");
  });

  it("Colonnes meta ordonnance (date, type, durée, renouvelable)", () => {
    expect(sql).toContain("date_prescription date");
    expect(sql).toContain("type_prescription text");
    expect(sql).toContain("est_renouvelable boolean");
    expect(sql).toContain("nb_renouvellements int");
  });

  it("Colonnes archivage Storage + OCR audit", () => {
    expect(sql).toContain("fichier_path text");
    expect(sql).toContain("fichier_mime text");
    expect(sql).toContain("ocr_tokens_in int");
    expect(sql).toContain("ocr_confiance text");
  });

  it("Table prescriptions_lignes avec FK + ordre", () => {
    expect(sql).toContain("create table if not exists prescriptions_lignes");
    expect(sql).toContain("prescription_id uuid not null references prescriptions(id) on delete cascade");
    expect(sql).toContain("ordre int default 0");
  });

  it("Colonnes médicament (nom, DCI, forme, dosage, voie)", () => {
    expect(sql).toContain("medicament_nom text not null");
    expect(sql).toContain("medicament_dci text");
    expect(sql).toContain("forme text");
    expect(sql).toContain("dosage text");
    expect(sql).toContain("voie_administration text");
  });

  it("Colonnes posologie structurée + libre", () => {
    expect(sql).toContain("posologie_libre text");
    expect(sql).toContain("qte_par_prise numeric");
    expect(sql).toContain("prises_par_jour int");
    expect(sql).toContain("duree_jours int");
  });

  it("Bucket prescriptions-scannees privé MIME image+PDF", () => {
    expect(sql).toContain("'prescriptions-scannees'");
    expect(sql).toContain("false,"); // public=false
    expect(sql).toContain("image/jpeg");
    expect(sql).toContain("application/pdf");
  });

  it("4 RLS prescriptions + 4 RLS lignes + 4 RLS storage", () => {
    expect(sql).toContain("prescriptions_select");
    expect(sql).toContain("prescriptions_insert");
    expect(sql).toContain("prescriptions_update");
    expect(sql).toContain("prescriptions_delete");
    expect(sql).toContain("prescriptions_lignes_select");
    expect(sql).toContain("prescriptions_scannees_select");
  });

  it("RLS isole par structure_id", () => {
    expect(sql).toContain("membres_structure where user_id = auth.uid()");
  });

  it("Index sur patient_id + date desc", () => {
    expect(sql).toContain("idx_prescriptions_patient");
    expect(sql).toContain("date_prescription desc");
  });

  it("RPC prescriptions_stats security definer", () => {
    expect(sql).toContain("function prescriptions_stats");
    expect(sql).toContain("security definer");
    expect(sql).toContain("total_prescriptions");
    expect(sql).toContain("prescripteurs_uniques");
  });
});

describe("0.56.3 - Helper lib/prescriptionsStorage.js", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/prescriptionsStorage.js"), "utf-8");

  it("Constante BUCKET = prescriptions-scannees", () => {
    expect(src).toContain('const BUCKET = "prescriptions-scannees"');
  });

  it("buildPath structure_id/patient_id/prescription_id/timestamp-filename", () => {
    expect(src).toContain("function buildPath");
    expect(src).toContain("${structureId}/${patientId}/${prescriptionId}/${ts}");
  });

  it("uploadPrescription retourne path + size_kb + mime", () => {
    expect(src).toContain("export async function uploadPrescription");
    expect(src).toContain("size_kb: Math.round");
  });

  it("getSignedUrl avec expiresIn 3600 par défaut", () => {
    expect(src).toContain("expiresIn = 3600");
    expect(src).toContain("createSignedUrl");
  });
});

describe("0.56.3 - Route /api/ocr/prescription", () => {
  const p = "app/api/ocr/prescription/route.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

  it("Route existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), p))).toBe(true);
  });

  it("maxDuration 60 + dynamic force", () => {
    expect(src).toContain("maxDuration = 60");
    expect(src).toContain('dynamic = "force-dynamic"');
  });

  it("Utilise Claude Sonnet 4 (claude-sonnet-4-...)", () => {
    expect(src).toContain('"claude-sonnet-4-20250514"');
  });

  it("Vérifie ANTHROPIC_API_KEY", () => {
    expect(src).toContain("ANTHROPIC_API_KEY");
  });

  it("Prompt spécifique ordonnances françaises", () => {
    expect(src).toContain("ordonnance");
    expect(src).toContain("bizone");
    expect(src).toContain("DCI");
    expect(src).toContain("posologie");
  });

  it("AbortController 55s pour éviter timeout Vercel", () => {
    expect(src).toContain("AbortController");
    expect(src).toContain("55000");
  });

  it("Support PDF en plus des images", () => {
    expect(src).toContain('"application/pdf"');
    expect(src).toContain('isDoc ? "document" : "image"');
  });

  it("Retour structuré : data, ocr_text, tokens, duration_ms", () => {
    expect(src).toContain("ok: true");
    expect(src).toContain("tokens");
    expect(src).toContain("input_tokens");
    expect(src).toContain("output_tokens");
  });
});

describe("0.56.3 - Route /api/prescriptions/from-ocr", () => {
  const p = "app/api/prescriptions/from-ocr/route.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

  it("Route existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), p))).toBe(true);
  });

  it("Vérifie patient_id + structure_id obligatoires (via validate() depuis 0.57.25)", () => {
    // Depuis 0.57.25, c'est validate() qui gère ces required (au lieu de if inline)
    expect(src).toMatch(/patient_id:\s*\{[^}]*required:\s*true/);
    expect(src).toMatch(/structure_id:\s*\{[^}]*required:\s*true/);
  });

  it("Insert prescription puis insert lignes en batch", () => {
    expect(src).toContain('.from("prescriptions")');
    expect(src).toContain('.from("prescriptions_lignes")');
  });

  it("Utilise Bearer token utilisateur pour respecter RLS (via requireAuth depuis 0.57.17)", () => {
    // Depuis 0.57.17, le Bearer est géré en interne par lib/apiAuth.js
    // (avant : code inline avec Authorization+Bearer dupliqué)
    expect(src).toMatch(/requireAuth/);
  });

  it("source_creation = 'ocr'", () => {
    expect(src).toContain('source_creation: "ocr"');
  });
});

describe("0.56.3 - Page /scan/prescription", () => {
  const p = "app/scan/prescription/page.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), p))).toBe(true);
  });

  it("Suspense boundary (useSearchParams)", () => {
    expect(src).toContain("Suspense");
    expect(src).toContain("useSearchParams");
  });

  it("Workflow 4 étapes : upload, ocr, review, done", () => {
    expect(src).toContain('step === "upload"');
    expect(src).toContain('step === "ocr"');
    expect(src).toContain('step === "review"');
    expect(src).toContain('step === "done"');
  });

  it("Appel /api/ocr/prescription puis /api/prescriptions/from-ocr", () => {
    expect(src).toContain("/api/ocr/prescription");
    expect(src).toContain("/api/prescriptions/from-ocr");
  });

  it("Édition prescripteur + ordonnance + médicaments", () => {
    expect(src).toContain("Prescripteur");
    expect(src).toContain("editedMeds");
    expect(src).toContain("updateMed");
    expect(src).toContain("removeMed");
    expect(src).toContain("addMed");
  });

  it("Sélecteur de patient avec recherche", () => {
    expect(src).toContain("patientSearch");
    expect(src).toContain("filteredPatients");
  });

  it("Pré-sélection patient via ?patient_id=... query", () => {
    expect(src).toContain('params.get("patient_id")');
    expect(src).toContain("presetPatientId");
  });

  it("Archivage Storage via uploadPrescription", () => {
    expect(src).toContain("uploadPrescription");
    expect(src).toContain("fichier_path: up.path");
  });

  it("Warning archivage non bloquant", () => {
    expect(src).toContain("archiveWarning");
  });

  it("Affichage durée_jours + prises/jour structurés par médicament", () => {
    expect(src).toContain("prises_par_jour");
    expect(src).toContain("duree_jours");
  });
});

describe("0.56.3 - Onglet Prescriptions sur /patient/[id]/edit", () => {
  const src = _readAllEditFiles();

  it("Tab 'prescriptions' ajouté dans TABS array", () => {
    expect(src).toContain('id: "prescriptions"');
    expect(src).toContain("ti-prescription");
  });

  it("Composant TabPrescriptions rendu si tab=prescriptions", () => {
    expect(src).toContain('tab === "prescriptions"');
    expect(src).toContain("<TabPrescriptions");
  });

  it("Liste prescriptions tri date desc + état actif/archivé", () => {
    expect(src).toContain('order("date_prescription", { ascending: false');
    expect(src).toContain("statut");
  });

  it("Chargement lazy des lignes au clic (toggleExpand)", () => {
    expect(src).toContain("loadLignes");
    expect(src).toContain("toggleExpand");
  });

  it("Bouton 'Scanner une ordonnance' redirige vers /scan/prescription", () => {
    expect(src).toContain("/scan/prescription?patient_id=");
  });

  it("Composant PrescriptionFileLink génère URL signée à la demande", () => {
    expect(src).toContain("function PrescriptionFileLink");
    expect(src).toContain("getSignedUrl");
  });

  it("Badge OCR si source_creation='ocr'", () => {
    expect(src).toContain('p.source_creation === "ocr"');
  });
});

describe("0.56.3 - Menu Outils scan inclut OCR Ordonnance", () => {
  it("Entrée /scan/prescription dans TopBar", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
    expect(src).toContain("/scan/prescription");
    expect(src).toContain("OCR Ordonnance");
  });
});

describe("0.56.3 - Version package", () => {
  it("Version sur lignée 0.56.x", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.(5[6-9]|[6-9]\d)\.\d+-alpha$/);
  });
});
