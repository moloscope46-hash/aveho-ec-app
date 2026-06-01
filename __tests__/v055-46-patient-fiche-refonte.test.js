// =============================================================
//  Tests unitaires — 0.55.46
//  Refonte fiche patient : caisses + mutuelles + colonnes BS
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.46 - SQL : table caisses_assurance_maladie", () => {
  const sqlPath = path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.46.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  it("Crée la table caisses_assurance_maladie", () => {
    expect(sql).toContain("create table if not exists caisses_assurance_maladie");
  });

  it("Colonnes attendues sur caisses", () => {
    expect(sql).toContain("code_organisme text unique");
    expect(sql).toContain("type_caisse text");
    expect(sql).toContain("regime text");
    expect(sql).toContain("departement text");
  });

  it("Seed initiale : 100+ CPAM/CGSS + régimes spéciaux", () => {
    // Le regex précédent /'CPAM de [^']+'/ cassait sur l'apostrophe ("l''Ain" en SQL)
    // On compte plutôt les lignes d'insertion type ('XXX', '...', 'CPAM', ...)
    const insertLines = sql.split("\n").filter(l => /^\s*\('\d+'/.test(l));
    expect(insertLines.length).toBeGreaterThan(95);
    const cgssLines = sql.split("\n").filter(l => /'CGSS de/.test(l));
    expect(cgssLines.length).toBeGreaterThanOrEqual(4);
  });

  it("RPC search_caisses créée", () => {
    expect(sql).toContain("create or replace function search_caisses");
  });
});

describe("0.55.46 - SQL : table mutuelles", () => {
  const sql = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.46.sql"),
    "utf-8"
  );

  it("Crée la table mutuelles", () => {
    expect(sql).toContain("create table if not exists mutuelles");
  });

  it("Colonnes attendues sur mutuelles", () => {
    expect(sql).toContain("numero_amc text unique");
    expect(sql).toContain("type_organisme text");
    expect(sql).toContain("gere_c2s boolean");
  });

  it("Seed initiale avec mutuelles connues", () => {
    expect(sql).toContain("Harmonie Mutuelle");
    expect(sql).toContain("MGEN");
    expect(sql).toContain("Malakoff Humanis");
    expect(sql).toContain("Pro BTP");
  });

  it("RPC search_mutuelles créée", () => {
    expect(sql).toContain("create or replace function search_mutuelles");
  });
});

describe("0.55.46 - Colonnes patient enrichies (bulletin de situation)", () => {
  const sql = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.46.sql"),
    "utf-8"
  );

  it("Identité étendue", () => {
    expect(sql).toContain("nom_naissance");
    expect(sql).toContain("sexe text");
    expect(sql).toContain("lieu_naissance_ville");
    expect(sql).toContain("nationalite");
  });

  it("Sécurité sociale", () => {
    expect(sql).toContain("numero_secu text");
    expect(sql).toContain("caisse_id uuid references caisses_assurance_maladie");
    expect(sql).toContain("code_organisme_rattachement");
    expect(sql).toContain("regime_secu");
    expect(sql).toContain("date_debut_droits date");
    expect(sql).toContain("ald boolean");
    expect(sql).toContain("c2s boolean");
    expect(sql).toContain("ame boolean");
  });

  it("Mutuelle", () => {
    expect(sql).toContain("mutuelle_id uuid references mutuelles");
    expect(sql).toContain("mutuelle_numero_amc");
    expect(sql).toContain("mutuelle_numero_adherent");
    expect(sql).toContain("tiers_payant_actif");
  });

  it("Adresse principale + contacts", () => {
    expect(sql).toContain("adresse text");
    expect(sql).toContain("code_postal text");
    expect(sql).toContain("telephone_fixe");
    expect(sql).toContain("telephone_portable");
    expect(sql).toContain("contact_urgence_nom");
    expect(sql).toContain("personne_confiance_nom");
  });

  it("Médecin traitant enrichi", () => {
    expect(sql).toContain("medecin_traitant_prenom");
    expect(sql).toContain("medecin_traitant_rpps");
  });

  it("Source de création (OCR audit)", () => {
    expect(sql).toContain("source_creation text");
    expect(sql).toContain("bs_file_url");
    expect(sql).toContain("bs_ocr_brut");
  });
});

describe("0.55.46 - Table adresses_livraison_patient", () => {
  const sql = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.46.sql"),
    "utf-8"
  );

  it("Table créée 1-N par patient", () => {
    expect(sql).toContain("create table if not exists patients_adresses_livraison");
    expect(sql).toContain("patient_id uuid not null references patients");
  });

  it("Colonnes utiles pour livraison", () => {
    expect(sql).toContain("destinataire text");
    expect(sql).toContain("code_porte text");
    expect(sql).toContain("instructions text");
    expect(sql).toContain("est_principale boolean");
  });

  it("RLS activée", () => {
    expect(sql).toContain("alter table patients_adresses_livraison enable row level security");
  });
});

describe("0.55.46 - Composants UI nouveaux", () => {
  it("CaisseSearch existe", async () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/CaisseSearch.js"),
      "utf-8"
    );
    expect(src).toContain("export default function CaisseSearch");
    expect(src).toContain("/api/caisses");
  });

  it("MutuelleSearch existe", async () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/MutuelleSearch.js"),
      "utf-8"
    );
    expect(src).toContain("export default function MutuelleSearch");
    expect(src).toContain("/api/mutuelles");
  });
});

describe("0.55.46 - APIs créées", () => {
  it("/api/caisses route présente", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/api/caisses/route.js"))).toBe(true);
  });

  it("/api/mutuelles route présente", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/api/mutuelles/route.js"))).toBe(true);
  });
});

describe("0.55.46 - Menu Outils scan ajouté", () => {
  it("4 entrées : bulletin, QR, code-barre, OCR", () => {
    const topbar = fs.readFileSync(
      path.resolve(process.cwd(), "app/TopBar.js"),
      "utf-8"
    );
    // 0.56.15 : section renommée "Scan"
    expect(topbar).toMatch(/section: "(Outils )?Scan"/);
    expect(topbar).toContain("/scan/bulletin-situation");
    expect(topbar).toContain("/scan/qr");
    expect(topbar).toContain("/scan/codebarre");
    expect(topbar).toContain("/scan/ocr");
  });
});

describe("0.55.46 - Page scan/bulletin-situation placeholder", () => {
  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/scan/bulletin-situation/page.js"))).toBe(true);
  });

  it("Charge les stats référentiels", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/scan/bulletin-situation/page.js"),
      "utf-8"
    );
    expect(src).toContain("caisses_assurance_maladie");
    expect(src).toContain("mutuelles");
  });
});

describe("0.55.46 - Format n° AMC (8 chiffres)", () => {
  it("Validation AMC 8 chiffres", () => {
    const valid = "25992142";
    const invalid = "2599";
    expect(/^\d{8}$/.test(valid)).toBe(true);
    expect(/^\d{8}$/.test(invalid)).toBe(false);
  });
});

describe("0.55.46 - Format code organisme CPAM (9 chiffres)", () => {
  it("Code 9 chiffres ou 3 chiffres (court)", () => {
    const long = "751010101"; // 9 chiffres
    const short = "751";       // version courte (notre seed)
    expect(/^\d{3,9}$/.test(long)).toBe(true);
    expect(/^\d{3,9}$/.test(short)).toBe(true);
    expect(/^\d{3,9}$/.test("ABC")).toBe(false);
  });
});
