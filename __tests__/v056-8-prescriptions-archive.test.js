// =============================================================
//  Tests unitaires — 0.56.8
//  Prescriptions archive : recherche multi-critères + stats +
//  top N + export CSV.
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.8 - SQL index recherche multi-critères", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.8.sql"), "utf-8");

  it("Index struct + date desc (where active)", () => {
    expect(sql).toContain("idx_prescriptions_struct_date");
    expect(sql).toContain("date_prescription desc");
    expect(sql).toContain("where statut = 'active'");
  });

  it("Index type + source", () => {
    expect(sql).toContain("idx_prescriptions_type");
    expect(sql).toContain("idx_prescriptions_source");
  });

  it("Index GIN trigramme prescripteur_nom + medicament + DCI", () => {
    expect(sql).toContain("idx_prescriptions_prescripteur_trgm");
    expect(sql).toContain("idx_prescriptions_lignes_medicament_trgm");
    expect(sql).toContain("idx_prescriptions_lignes_dci_trgm");
    expect(sql).toContain("gin_trgm_ops");
  });
});

describe("0.56.8 - RPC prescriptions_archive_stats", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.8.sql"), "utf-8");

  it("Fonction security definer avec dates optionnelles", () => {
    expect(sql).toContain("function prescriptions_archive_stats");
    expect(sql).toContain("p_date_debut date default null");
    expect(sql).toContain("p_date_fin date default null");
    expect(sql).toContain("security definer");
  });

  it("Retour : 16+ champs agrégats", () => {
    expect(sql).toContain("total_prescriptions bigint");
    expect(sql).toContain("total_actives bigint");
    expect(sql).toContain("total_lignes bigint");
    expect(sql).toContain("total_medicaments_uniques bigint");
    expect(sql).toContain("total_prescripteurs_uniques bigint");
    expect(sql).toContain("prescriptions_ocr bigint");
    expect(sql).toContain("rpps_verifies bigint");
    expect(sql).toContain("tokens_total_in bigint");
  });

  it("DCI uniques fallback sur nom commercial si DCI null", () => {
    expect(sql).toContain("count(distinct lower(coalesce(medicament_dci, medicament_nom)))");
  });

  it("Prescripteurs uniques : préfère RPPS, fallback nom", () => {
    expect(sql).toContain("count(distinct coalesce(prescripteur_rpps, lower(prescripteur_nom)))");
  });
});

describe("0.56.8 - RPC prescriptions_top_medicaments", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.8.sql"), "utf-8");

  it("Fonction avec limit + dates paramétrables", () => {
    expect(sql).toContain("function prescriptions_top_medicaments");
    expect(sql).toContain("p_limit int default 20");
    expect(sql).toContain("p_date_debut date default null");
  });

  it("Préfère DCI, fallback nom commercial", () => {
    expect(sql).toContain("coalesce(upper(medicament_dci), upper(medicament_nom))");
  });

  it("Flag est_dci (true si DCI fourni)", () => {
    expect(sql).toContain("(medicament_dci is not null) as est_dci");
  });

  it("Compte distinct patient + prescripteur", () => {
    expect(sql).toContain("nb_patients_uniques");
    expect(sql).toContain("nb_prescripteurs_uniques");
  });

  it("Tri par nb_prescriptions desc", () => {
    expect(sql).toContain("order by nb_prescriptions desc");
  });
});

describe("0.56.8 - RPC prescriptions_top_prescripteurs", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.8.sql"), "utf-8");

  it("Fonction existe", () => {
    expect(sql).toContain("function prescriptions_top_prescripteurs");
  });

  it("Groupe par nom (case-insensitive)", () => {
    expect(sql).toContain("group by lower(prescripteur_nom), prescripteur_nom");
  });

  it("Retourne medecin_id + rpps_verifie agrégé via bool_or", () => {
    expect(sql).toContain("medecin_id");
    expect(sql).toContain("bool_or(rpps_verifie)");
  });

  it("Dates première + dernière prescription", () => {
    expect(sql).toContain("min(date_prescription) as premiere_date");
    expect(sql).toContain("max(date_prescription) as derniere_date");
  });
});

describe("0.56.8 - RPC prescriptions_par_mois", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.8.sql"), "utf-8");

  it("Fonction avec mois_count paramétrable (default 12)", () => {
    expect(sql).toContain("function prescriptions_par_mois");
    expect(sql).toContain("p_mois_count int default 12");
  });

  it("Génère série de mois via generate_series", () => {
    expect(sql).toContain("generate_series");
    expect(sql).toContain("interval '1 month'");
  });

  it("LEFT JOIN pour inclure les mois sans prescription (compte 0)", () => {
    expect(sql).toContain("left join mes_prescriptions");
  });

  it("Filter OCR séparé via count filter (where source_creation = 'ocr')", () => {
    expect(sql).toContain("count(p.*) filter (where p.source_creation = 'ocr')");
  });
});

describe("0.56.8 - API /api/prescriptions/search", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/prescriptions/search/route.js"), "utf-8");

  it("Route existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/api/prescriptions/search/route.js"))).toBe(true);
  });

  it("Méthode POST avec body filtres", () => {
    expect(src).toContain("export async function POST");
    expect(src).toContain("body.medicament_query");
    expect(src).toContain("body.prescripteur_nom");
  });

  it("Recherche par médicament passe par prescriptions_lignes d'abord", () => {
    expect(src).toContain("hasMedSearch");
    expect(src).toContain('from("prescriptions_lignes")');
    expect(src).toContain(".in(\"id\", prescriptionIds)");
  });

  it("ILIKE pour recherche fuzzy (case-insensitive)", () => {
    expect(src).toContain(".ilike(");
  });

  it("Filtres date_debut + date_fin via gte/lte", () => {
    expect(src).toContain(".gte(\"date_prescription\"");
    expect(src).toContain(".lte(\"date_prescription\"");
  });

  it("Pagination via range(offset, offset+limit-1)", () => {
    expect(src).toContain(".range(offset, offset + limit - 1)");
  });

  it("Join patients + etablissements dans la réponse", () => {
    expect(src).toContain("patients(nom, prenom, numero_dossier)");
    expect(src).toContain("etablissements(nom)");
  });

  it("Cap limit à 500 (sécurité)", () => {
    expect(src).toContain("Math.min(parseInt(body.limit) || 50, 500)");
  });
});

describe("0.56.8 - API /api/prescriptions/export-csv", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/prescriptions/export-csv/route.js"), "utf-8");

  it("Route existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/api/prescriptions/export-csv/route.js"))).toBe(true);
  });

  it("maxDuration 60 + dynamic", () => {
    expect(src).toContain("maxDuration = 60");
    expect(src).toContain('dynamic = "force-dynamic"');
  });

  it("Fonction csvEscape qui gère quotes + retour ligne + ;", () => {
    expect(src).toContain("function csvEscape");
    expect(src).toContain('replace(/"/g');
  });

  it("BOM UTF-8 pour Excel + séparateur ;", () => {
    expect(src).toContain("\\uFEFF");
    expect(src).toContain('.join(";")');
  });

  it("CRLF entre lignes (pour Excel Windows)", () => {
    expect(src).toContain('.join("\\r\\n")');
  });

  it("Content-Type text/csv + attachment", () => {
    expect(src).toContain('"Content-Type": "text/csv');
    expect(src).toContain("Content-Disposition");
    expect(src).toContain("attachment");
  });

  it("Option include_lignes ajoute colonne médicaments concaténés", () => {
    expect(src).toContain("include_lignes");
    expect(src).toContain("Médicaments (liste)");
  });

  it("Limite 5000 lignes (sécurité mémoire)", () => {
    expect(src).toContain(".limit(5000)");
  });

  it("Header complet (date, patient, prescripteur, RPPS, type, statut)", () => {
    expect(src).toContain('"Date prescription"');
    expect(src).toContain('"Patient nom"');
    expect(src).toContain('"RPPS"');
    expect(src).toContain('"Type prescription"');
    expect(src).toContain('"Statut"');
  });
});

describe("0.56.8 - Page /admin/prescriptions-archive", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/admin/prescriptions-archive/page.js"), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/admin/prescriptions-archive/page.js"))).toBe(true);
  });

  it("4 onglets : recherche, top_meds, top_presc, tendances", () => {
    expect(src).toContain('"recherche"');
    expect(src).toContain('"top_meds"');
    expect(src).toContain('"top_presc"');
    expect(src).toContain('"tendances"');
  });

  it("Charge les 4 RPC stats au démarrage", () => {
    expect(src).toContain('rpc("prescriptions_archive_stats")');
    expect(src).toContain('rpc("prescriptions_top_medicaments"');
    expect(src).toContain('rpc("prescriptions_top_prescripteurs"');
    expect(src).toContain('rpc("prescriptions_par_mois"');
  });

  it("8 KPI globaux (total, lignes, DCI uniques, prescripteurs, patients, OCR, RPPS, tokens)", () => {
    const matches = src.match(/<Kpi /g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(8);
  });

  it("Formulaire recherche : prescripteur, RPPS, médicament, DCI, type, source, statut, dates", () => {
    expect(src).toContain('"prescripteur_nom"');
    expect(src).toContain('"prescripteur_rpps"');
    expect(src).toContain('"medicament_query"');
    expect(src).toContain('"dci_query"');
    expect(src).toContain('"type_prescription"');
    expect(src).toContain('"source_creation"');
    expect(src).toContain('"date_debut"');
  });

  it("Appel /api/prescriptions/search avec Bearer token", () => {
    expect(src).toContain("/api/prescriptions/search");
    expect(src).toContain("Bearer");
  });

  it("Export CSV avec 2 boutons (avec/sans lignes médicaments)", () => {
    expect(src).toContain("/api/prescriptions/export-csv");
    expect(src).toContain("exportCsv(false)");
    expect(src).toContain("exportCsv(true)");
    expect(src).toContain("Export CSV");
    expect(src).toContain("Export + médicaments");
  });

  it("Téléchargement via Blob + URL.createObjectURL + lien temporaire", () => {
    expect(src).toContain("URL.createObjectURL");
    expect(src).toContain('document.createElement("a")');
    expect(src).toContain("URL.revokeObjectURL");
  });

  it("Reset filtres bouton", () => {
    expect(src).toContain("resetFilters");
  });

  it("Top médicaments avec barres progress proportionnelles + badge DCI", () => {
    expect(src).toContain("m.est_dci");
    expect(src).toContain("topMeds[0].nb_prescriptions");
  });

  it("Top prescripteurs avec badge RPPS vérifié vert", () => {
    expect(src).toContain("p.rpps_verifie");
    expect(src).toContain("Vérifié");
  });

  it("Composant MonthBarChart graphique 12 mois", () => {
    expect(src).toContain("function MonthBarChart");
    expect(src).toContain("linear-gradient(180deg");
  });

  it("Tableau détaillé par mois sous le graphique", () => {
    expect(src).toContain("Mois");
    expect(src).toContain("Lignes (méds)");
    expect(src).toContain("Patients uniques");
  });

  it("Clic résultat → ouvre fiche patient onglet prescriptions", () => {
    expect(src).toContain("/patient/${p.patient_id}/edit?tab=prescriptions");
  });
});

describe("0.56.8 - Menu admin Prescriptions archive", () => {
  it("Entrée /admin/prescriptions-archive dans TopBar", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
    expect(src).toContain("/admin/prescriptions-archive");
    expect(src).toContain("Prescriptions archive");
  });
});
