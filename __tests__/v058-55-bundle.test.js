// =============================================================
//  Tests unitaires — 0.58.55
//  UserMenu : filtre rapide + auto-flip + Création user type partenaire + SQL team_id
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.55 - Version", () => {
  it("Version 0.58.55+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(55);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.55 - UserMenu : fix bug menu vers le haut + auto-flip", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/UserMenu.js"), "utf-8");
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("State flipUp pour détecter sens d'ouverture", () => {
    expect(src).toMatch(/const \[flipUp, setFlipUp\]/);
  });

  it("Calcule spaceBelow vs spaceAbove à l'ouverture", () => {
    expect(src).toMatch(/spaceBelow = window\.innerHeight - rect\.bottom/);
    expect(src).toMatch(/spaceAbove = rect\.top/);
  });

  it("CSS : variante .um-sheet-up + max-height pour scroll", () => {
    expect(css).toMatch(/\.um-sheet\.um-sheet-up/);
    expect(css).toMatch(/max-height:calc\(100vh - 110px\)/);
  });

  it("Classe um-sheet-up appliquée si flipUp", () => {
    expect(src).toMatch(/flipUp \? " um-sheet-up" : ""/);
  });
});

describe("0.58.55 - UserMenu : filtre rapide bât/svc", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/UserMenu.js"), "utf-8");
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("State quickFilterActive + userAttachments", () => {
    expect(src).toMatch(/const \[quickFilterActive, setQuickFilterActive\]/);
    expect(src).toMatch(/const \[userAttachments, setUserAttachments\]/);
  });

  it("Listen à l'event av-user-attachments-loaded", () => {
    expect(src).toMatch(/addEventListener\(["']av-user-attachments-loaded["']/);
  });

  it("Toggle filtre dispatche av-current-context-change", () => {
    expect(src).toMatch(/function toggleQuickFilter/);
    expect(src).toMatch(/dispatchEvent\(new CustomEvent\(["']av-current-context-change["']/);
  });

  it("Storage localStorage av-quickfilter-active + av-user-batiment-id", () => {
    expect(src).toMatch(/["']av-quickfilter-active["']/);
    expect(src).toMatch(/["']av-user-batiment-id["']/);
  });

  it("CSS : indicateur visuel um-filter-dot + um-btn.filter-active", () => {
    expect(css).toMatch(/\.um-filter-dot/);
    expect(css).toMatch(/\.um-btn\.filter-active/);
    expect(css).toMatch(/@keyframes um-pulse/);
  });
});

describe("0.58.55 - UserMenu : gestion clic / double-clic / long-press", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/UserMenu.js"), "utf-8");

  it("Refs clickTimerRef + longPressTimerRef", () => {
    expect(src).toMatch(/clickTimerRef/);
    expect(src).toMatch(/longPressTimerRef/);
  });

  it("handleButtonClick gère simple vs double clic (timer 250ms)", () => {
    expect(src).toMatch(/function handleButtonClick/);
    expect(src).toMatch(/setTimeout\([\s\S]*?250\)/);
  });

  it("handleTouchStart / handleTouchEnd avec long press 500ms", () => {
    expect(src).toMatch(/function handleTouchStart/);
    expect(src).toMatch(/function handleTouchEnd/);
    expect(src).toMatch(/setTimeout\([\s\S]*?500\)/);
  });

  it("Vibration tactile sur long press", () => {
    expect(src).toMatch(/navigator\.vibrate/);
  });

  it("Item 'Filtrer sur mon bâtiment/service' dans le menu", () => {
    expect(src).toMatch(/Filtrer sur mon bâtiment\/service/);
  });
});

describe("0.58.55 - UserAttachmentsInfo dispatche les bât/svc", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/UserAttachmentsInfo.js"), "utf-8");

  it("Dispatche av-user-attachments-loaded avec detail", () => {
    expect(src).toMatch(/dispatchEvent\(new CustomEvent\(["']av-user-attachments-loaded["']/);
    expect(src).toMatch(/batimentId:\s*firstBatId/);
  });
});

describe("0.58.55 - Création user : type partenaire + est_collaborateur", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/utilisateurs/page.js"), "utf-8");

  it("Champs type_partenaire + est_collaborateur dans inviteForm", () => {
    expect(src).toMatch(/type_partenaire:\s*["']["']/);
    expect(src).toMatch(/est_collaborateur:\s*false/);
  });

  it("Sélecteur 4 options (Aucun / Prescripteur / Infirmier(ère) / Pharmacien)", () => {
    expect(src).toMatch(/k:\s*["']prescripteur["']/);
    expect(src).toMatch(/k:\s*["']infirmiere["']/);
    expect(src).toMatch(/k:\s*["']pharmacien["']/);
  });

  it("Insert dans partenaires_rpps avec est_collaborateur=true si type_partenaire", () => {
    expect(src).toMatch(/inviteForm\.type_partenaire/);
    expect(src).toMatch(/est_collaborateur:\s*true/);
  });

  it("Mapping profession selon type_partenaire", () => {
    expect(src).toMatch(/prescripteur:\s*["']Médecin["']/);
    expect(src).toMatch(/infirmiere:[\s\S]*?Infirmier/);
    expect(src).toMatch(/pharmacien:\s*["']Pharmacien["']/);
  });

  it("Fallback si colonne est_collaborateur n'existe pas (SQL pas appliqué)", () => {
    expect(src).toMatch(/includes\(["']est_collaborateur["']\)/);
  });
});

describe("0.58.55 - Badge COLLABORATEUR + PHARMACIEN dans /partenaires-rpps", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/partenaires-rpps/page.js"), "utf-8");

  it("Badge PHARMACIEN si est_pharmacien", () => {
    expect(src).toMatch(/p\.est_pharmacien && \(/);
    expect(src).toMatch(/PHARMACIEN/);
  });

  it("Badge COLLABORATEUR avec gradient + ti-user-check", () => {
    expect(src).toMatch(/p\.est_collaborateur && \(/);
    expect(src).toMatch(/COLLABORATEUR/);
    expect(src).toMatch(/ti-user-check/);
  });

  it("Distinction FINESS vs RPPS dans le badge identifiant (longueur 9 chars = FINESS)", () => {
    expect(src).toMatch(/length === 9 \? `FINESS/);
  });
});

describe("0.58.55 - SQL extension user_goals + partenaires_rpps", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.55-team-goals-collaborateur.sql");

  it("Fichier SQL existe", () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("user_goals : ajout team_id + shared", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES equipes/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS shared BOOLEAN/);
  });

  it("RLS policy : Read own or shared goals (avec EXISTS sur membres_equipe)", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/Read own or shared goals/);
    expect(sql).toMatch(/EXISTS \(\s*SELECT 1 FROM membres_equipe/);
  });

  it("partenaires_rpps : ajout est_collaborateur + user_id", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS est_collaborateur BOOLEAN/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth\.users/);
  });

  it("Index sur est_collaborateur (partial)", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/idx_partenaires_rpps_collaborateur/);
    expect(sql).toMatch(/WHERE est_collaborateur = TRUE/);
  });
});
