// =============================================================
//  Tests 0.58.85 — Véhicules + Cuves + Stock refonte + Mobile cuve
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.85 - Version + SW", () => {
  it("Version 0.58.85+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.58\.(8[5-9]|9\d)|^0\.59|^0\.[6-9]|^[1-9]/);
  });
  it("SW VERSION sync à 0.58.85", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.58.85"');
  });
});

describe("0.58.85 - SQL véhicules + cuves", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "public/sql/migration-0.58.85-vehicules-cuves-stock.sql"), "utf-8");
  it("Crée la table vehicules", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS vehicules/);
    expect(sql).toMatch(/immatriculation/);
    expect(sql).toMatch(/capacite_brancards/);
    expect(sql).toMatch(/numero_agrement/);
  });
  it("Crée la table cuves_oxygene", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS cuves_oxygene/);
    expect(sql).toMatch(/type_gaz/);
    expect(sql).toMatch(/niveau_actuel_pct/);
    expect(sql).toMatch(/pression_actuelle_bar/);
    expect(sql).toMatch(/date_dernier_remplissage/);
    expect(sql).toMatch(/numero_lot_remplissage/);
  });
  it("Crée la table cuves_remplissages avec traçabilité", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS cuves_remplissages/);
    expect(sql).toMatch(/niveau_avant_pct/);
    expect(sql).toMatch(/niveau_apres_pct/);
    expect(sql).toMatch(/numero_lot/);
    expect(sql).toMatch(/fournisseur/);
    expect(sql).toMatch(/technicien_id/);
  });
  it("ALTER depots vehicule_id", () => {
    expect(sql).toMatch(/ALTER TABLE depots[\s\S]*ADD COLUMN IF NOT EXISTS vehicule_id/);
  });
  it("ALTER articles enrichis", () => {
    expect(sql).toMatch(/ALTER TABLE articles[\s\S]*type_article TEXT/);
    expect(sql).toMatch(/stock_min INTEGER/);
    expect(sql).toMatch(/prix_achat_ht/);
    expect(sql).toMatch(/prix_vente_ht/);
    expect(sql).toMatch(/tva_pct/);
  });
  it("ALTER patients dossier médical", () => {
    expect(sql).toMatch(/ALTER TABLE patients[\s\S]*antecedents_chirurgicaux/);
    expect(sql).toMatch(/taille_cm INTEGER/);
    expect(sql).toMatch(/poids_kg/);
    expect(sql).toMatch(/groupe_sanguin/);
    expect(sql).toMatch(/infirmiere_referente/);
    expect(sql).toMatch(/pharmacie_referente/);
    expect(sql).toMatch(/kine_referent/);
  });
  it("Vue v_stock_stats", () => {
    expect(sql).toMatch(/CREATE VIEW v_stock_stats/);
  });
  it("RLS activées sur nouvelles tables", () => {
    expect(sql).toMatch(/ALTER TABLE vehicules ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE cuves_oxygene ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE cuves_remplissages ENABLE ROW LEVEL SECURITY/);
  });
});

describe("0.58.85 - Refonte /stock avec onglets", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/stock/page.js"), "utf-8");
  it("7 onglets définis", () => {
    expect(src).toMatch(/key:\s*"global"/);
    expect(src).toMatch(/key:\s*"articles"/);
    expect(src).toMatch(/key:\s*"materiels"/);
    expect(src).toMatch(/key:\s*"mouvements"/);
    expect(src).toMatch(/key:\s*"cuves"/);
    expect(src).toMatch(/key:\s*"vehicules"/);
    expect(src).toMatch(/key:\s*"chiffrage"/);
  });
  it("Composant KpiTile pour tuiles cliquables", () => {
    expect(src).toMatch(/function KpiTile/);
  });
  it("Vue Cuves O2 avec jauge", () => {
    expect(src).toMatch(/function ViewCuves/);
    expect(src).toMatch(/niveau_actuel_pct/);
  });
  it("Vue Véhicules avec 6 types", () => {
    expect(src).toMatch(/function ViewVehicules/);
    expect(src).toMatch(/sanitaire/);
    expect(src).toMatch(/ambulance/);
    expect(src).toMatch(/vsl/i);
    expect(src).toMatch(/taxi/);
  });
  it("Vue Chiffrage avec marge", () => {
    expect(src).toMatch(/function ViewChiffrage/);
    expect(src).toMatch(/marge/i);
    expect(src).toMatch(/prix_achat_ht/);
  });
  it("Vue Mouvements avec couleurs entrée/sortie", () => {
    expect(src).toMatch(/function ViewMouvements/);
    expect(src).toMatch(/stock_mouvements/);
  });
});

describe("0.58.85 - Mobile remplissage cuve", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/mobile/cuve/remplissage/page.js"), "utf-8");
  it("4 étapes définies", () => {
    expect(src).toMatch(/Étape\s*\{step\}\s*\/\s*4/);
    expect(src).toMatch(/step === 1/);
    expect(src).toMatch(/step === 2/);
    expect(src).toMatch(/step === 3/);
    expect(src).toMatch(/step === 4/);
  });
  it("Procédure sécurité affichée étape 2", () => {
    expect(src).toMatch(/Procédure de sécurité/i);
    expect(src).toMatch(/EPI/);
  });
  it("N° de lot obligatoire étape 3", () => {
    expect(src).toMatch(/numero_lot/);
    expect(src).toMatch(/disabled=\{busy \|\| !form\.numero_lot\}/);
  });
  it("Statut auto-calculé selon niveau", () => {
    expect(src).toMatch(/niveauApres >= 95.*newStatut = "pleine"/s);
    expect(src).toMatch(/niveauApres <= 5.*newStatut = "vide"/s);
  });
  it("INSERT historique + UPDATE cuve", () => {
    expect(src).toMatch(/from\("cuves_remplissages"\)\.insert/);
    expect(src).toMatch(/from\("cuves_oxygene"\)\.update/);
  });
  it("Fournisseurs O2 référencés", () => {
    expect(src).toMatch(/Air Liquide/);
    expect(src).toMatch(/Linde/);
  });
});

describe("0.58.85 - Hub mobile inclut cuve", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/mobile/page.js"), "utf-8");
  it("Tuile remplissage cuve présente", () => {
    expect(src).toMatch(/key:\s*"cuve"/);
    expect(src).toMatch(/\/mobile\/cuve\/remplissage/);
  });
});

describe("0.58.85 - Création patient mobile : sélecteur affectation", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/mobile/patient/new/page.js"), "utf-8");
  it("Sélecteur établissement", () => {
    expect(src).toMatch(/etablissements/);
    expect(src).toMatch(/etablissement_id/);
  });
  it("Sélecteurs cascade bâtiment/service/chambre", () => {
    expect(src).toMatch(/filteredBatiments/);
    expect(src).toMatch(/filteredServices/);
    expect(src).toMatch(/filteredChambres/);
  });
  it("Auto-remplissage si 1 seul établissement", () => {
    expect(src).toMatch(/etabs\.length === 1/);
  });
});

describe("0.58.85 - Helper services bulletproof", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/services.js"), "utf-8");
  it("Cache mémoire + localStorage", () => {
    expect(src).toMatch(/CACHE_KEY/);
    expect(src).toMatch(/av-services-has-batiment-col/);
  });
  it("Fallback si erreur batiment_id", () => {
    expect(src).toMatch(/42703/);
    expect(src).toMatch(/structure_id/);
  });
  it("Pas de eq batiment_id aveugle si cache=false", () => {
    expect(src).toMatch(/cached === false/);
  });
});

describe("0.58.85 - Cleanup etages refs", () => {
  it("Plus aucune ref from(\"etages\") dans app/", () => {
    const findRefs = (dir) => {
      const refs = [];
      function walk(d) {
        for (const f of fs.readdirSync(d)) {
          const fp = path.join(d, f);
          const stat = fs.statSync(fp);
          if (stat.isDirectory() && !f.startsWith(".") && f !== "node_modules") walk(fp);
          else if (f.endsWith(".js") && !f.endsWith(".bak")) {
            const content = fs.readFileSync(fp, "utf-8");
            if (/from\(["']etages["']\)/.test(content)) refs.push(fp);
          }
        }
      }
      walk(dir);
      return refs;
    };
    const refs = findRefs(path.resolve(process.cwd(), "app"));
    expect(refs).toEqual([]);
  });
});

describe("0.58.85 - Profil : section Mode de démarrage", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");
  it("3 boutons mode démarrage", () => {
    expect(src).toMatch(/Démarrer en.*Logiciel/);
    expect(src).toMatch(/Démarrer en.*Action Mobile/);
    expect(src).toMatch(/Rouvrir le popup de choix/);
  });
  it("Gère localStorage av-launch-mode", () => {
    expect(src).toMatch(/av-launch-mode/);
  });
});

describe("0.58.85 - Cohérence changelog", () => {
  it("0.58.85 présent dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.58\.85"/);
  });
  it("0.58.85 dans versions-index.json", () => {
    const json = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/changelog-data/versions-index.json"), "utf-8"));
    expect(json.map(v => v.v)).toContain("0.58.85");
  });
  it("Note HTML 0.58.85 existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/changelog-notes/NOTE-VERSION-Alpha-0.58.85.html"))).toBe(true);
  });
});
