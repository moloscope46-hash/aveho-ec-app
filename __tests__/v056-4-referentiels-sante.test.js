// =============================================================
//  Tests unitaires — 0.56.4
//  Gestion référentiels caisses + mutuelles + ContactActions
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

describe("0.56.4 - SQL ajout colonnes lat/lng/email", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.4.sql"), "utf-8");

  it("Ajoute lat/lng sur caisses (idempotent)", () => {
    expect(sql).toContain("alter table caisses_assurance_maladie");
    expect(sql).toContain("add column if not exists latitude numeric");
    expect(sql).toContain("add column if not exists longitude numeric");
  });

  it("Ajoute email + lat/lng sur mutuelles", () => {
    expect(sql).toContain("alter table mutuelles");
    expect(sql).toContain("add column if not exists email text");
    expect(sql).toContain("add column if not exists latitude numeric");
  });

  it("Index partiels coords (where not null)", () => {
    expect(sql).toContain("idx_caisses_coords");
    expect(sql).toContain("idx_mutuelles_coords");
    expect(sql).toContain("where latitude is not null");
  });
});

describe("0.56.4 - API /api/caisses CRUD", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/caisses/route.js"), "utf-8");

  it("POST création avec validation nom + code_organisme (via validate() depuis 0.57.26)", () => {
    expect(src).toContain("export async function POST");
    // Depuis 0.57.26 : validation via validate() au lieu de if inline
    expect(src).toMatch(/nom:\s*\{[^}]*required:\s*true/);
    expect(src).toMatch(/code_organisme:\s*\{[^}]*required:\s*true/);
  });

  it("PUT mise à jour avec id requis", () => {
    expect(src).toContain("export async function PUT");
    expect(src).toContain('"id requis"');
  });

  it("DELETE par id en query string", () => {
    expect(src).toContain("export async function DELETE");
    expect(src).toContain('searchParams.get("id")');
  });

  it("POST détecte duplicate (code 23505)", () => {
    expect(src).toContain('error.code === "23505"');
    expect(src).toContain("duplicate:");
  });

  it("Toutes les méthodes utilisent requireAuth (auth + RLS)", () => {
    // 0.57.4 : on est passés du pattern authHeader vers requireAuth
    // requireAuth fait : (a) check Bearer présent, (b) check getUser valide,
    // (c) crée un supabase client qui propage le Bearer pour RLS.
    expect(src).toMatch(/import\s*\{\s*requireAuth/);
    // 4 handlers (GET + POST + PUT + DELETE) appellent requireAuth
    const matches = src.match(/await\s+requireAuth\(req\)/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });
});

describe("0.56.4 - API /api/mutuelles CRUD", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/mutuelles/route.js"), "utf-8");

  it("POST avec validation nom requis", () => {
    expect(src).toContain("export async function POST");
    expect(src).toMatch(/nom requis|raison_sociale requise/);
  });

  it("PUT existe", () => {
    expect(src).toContain("export async function PUT");
  });

  it("DELETE existe", () => {
    expect(src).toContain("export async function DELETE");
  });

  it("Payload mutuelle inclut email + lat/lng + site_web", () => {
    expect(src).toContain("email: body.email");
    expect(src).toContain("latitude: body.latitude");
    expect(src).toContain("site_web: body.site_web");
  });
});

describe("0.56.4 - Composant ContactActions", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/ContactActions.js"), "utf-8");

  it("Composant existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/ContactActions.js"))).toBe(true);
  });

  it("Action tel via tel: protocol", () => {
    expect(src).toContain("href: `tel:${tel}`");
  });

  it("Action mail via mailto:", () => {
    expect(src).toContain("href: `mailto:${email}`");
  });

  it("Action GPS via Google Maps", () => {
    expect(src).toContain("google.com/maps/dir/?api=1");
  });

  it("Fallback adresse texte si pas de coords GPS", () => {
    expect(src).toContain("encodeURIComponent(adresse)");
  });

  it("Action web ajoute https:// si manquant", () => {
    expect(src).toContain('/^https?:\\/\\//i.test(web)');
  });

  it("3 tailles supportées (sm/md/lg)", () => {
    expect(src).toContain('size === "sm"');
    expect(src).toContain('size === "lg"');
  });

  it("stopPropagation pour éviter de propager aux parents cliquables", () => {
    expect(src).toContain("e.stopPropagation()");
  });

  it("Affiche message 'Pas de coordonnées' si rien", () => {
    expect(src).toContain("Pas de coordonnées");
  });
});

describe("0.56.4 - Page /admin/referentiels-sante", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/admin/referentiels-sante/page.js"), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/admin/referentiels-sante/page.js"))).toBe(true);
  });

  it("2 onglets : caisses + mutuelles", () => {
    expect(src).toContain("Caisses");
    expect(src).toContain("Mutuelles");
    expect(src).toContain('tab === "caisses"');
    expect(src).toContain('tab === "mutuelles"');
  });

  it("Filtre live avec recherche multi-champs", () => {
    expect(src).toContain("filtered");
    expect(src).toContain("filter");
    expect(src).toContain("departement");
    expect(src).toContain("numero_amc");
  });

  it("Bouton 'Nouvelle' déclenche openCreate", () => {
    expect(src).toContain("openCreate");
    expect(src).toContain("Nouvelle");
  });

  it("Modale d'édition réutilisée pour création + modif", () => {
    expect(src).toContain("EditModal");
    expect(src).toContain("creating");
  });

  it("Save appelle POST si creating, PUT sinon", () => {
    expect(src).toContain('creating ? "POST" : "PUT"');
  });

  it("Suppression avec confirm()", () => {
    expect(src).toContain("confirm(");
    expect(src).toContain("irréversible");
  });

  it("ContactActions affiché dans la liste", () => {
    expect(src).toContain("<ContactActions");
    expect(src).toContain('size="sm"');
  });

  it("AdresseAutocomplete BAN dans la modale (auto lat/lng)", () => {
    expect(src).toContain("AdresseAutocomplete");
    expect(src).toContain("fillFromBAN");
    expect(src).toContain("latitude: a.latitude");
  });

  it("Affichage géocodage si lat/lng renseignées", () => {
    expect(src).toContain("Géocodage");
    expect(src).toContain("entity.latitude.toFixed");
  });

  it("Compteurs sur chaque onglet (TabBtn count)", () => {
    expect(src).toContain("count={caisses.length}");
    expect(src).toContain("count={mutuelles.length}");
  });

  it("Détection duplicate via flag dans la réponse API", () => {
    expect(src).toContain("data.duplicate");
    expect(src).toContain("doublon");
  });
});

describe("0.56.4 - Intégration ContactActions dans fiche patient", () => {
  const src = _readAllEditFiles();

  it("Import ContactActions", () => {
    // 0.57.1 : tolérant à la profondeur (page.js vs tabs/*.js)
    expect(src).toMatch(/import ContactActions from ["'](\.\.\/)+ContactActions["']/);
  });

  it("ContactActions sur bloc caisse (TabSecu)", () => {
    expect(src).toContain('<ContactActions entity={caisseInfo}');
  });

  it("ContactActions sur bloc mutuelle (TabSecu)", () => {
    expect(src).toContain('<ContactActions entity={mutuelleInfo}');
  });
});

describe("0.56.4 - Menu admin inclut Caisses & Mutuelles", () => {
  it("Entrée /admin/referentiels-sante dans TopBar", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
    expect(src).toContain("/admin/referentiels-sante");
    expect(src).toContain("Caisses & Mutuelles");
  });
});
