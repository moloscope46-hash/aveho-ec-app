// =============================================================
//  Tests unitaires — 0.55.47
//  Type étab verrouillé + carte icône voyante + boutons + recherche libre
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.47 - Type étab verrouillé en édition", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/etablissement/fiche/page.js"),
    "utf-8"
  );

  it("Boutons remplacés par divs non-clickables", () => {
    // L'ancienne version avait setForm({...form, est_partenaire: false}) sur onClick
    // Maintenant il n'y a plus aucun onClick pour switch
    const matches = src.match(/setForm\(\{\s*\.\.\.form,\s*est_partenaire/g);
    expect(matches).toBeNull();
  });

  it("Badge 'Verrouillé' affiché", () => {
    expect(src).toContain("Verrouillé après création");
  });

  it("Bandeau d'info avec instruction recréation", () => {
    expect(src).toContain("supprimer puis recréer");
  });

  it("est_partenaire RETIRÉ du payload update", () => {
    // Cherche le bloc payload de save
    const idx = src.indexOf("longitude: form.longitude || null");
    const after = src.slice(idx, idx + 200);
    expect(after).not.toContain("est_partenaire: form.est_partenaire === true");
    expect(after).toContain("RETIRÉ du payload");
  });
});

describe("0.55.47 - Carte : icône voyante pour mes étab", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/carte/page.js"),
    "utf-8"
  );

  it("Taille marker mine = 48px (au lieu de 38)", () => {
    expect(src).toContain("const size = isPartner ? 38 : 48");
  });

  it("Halo pulsant CSS pulse-mine animation", () => {
    expect(src).toContain("pulse-mine");
    expect(src).toContain("animation: pulse-mine 2s ease-out infinite");
  });

  it("Mine gradient bleu→vert plus voyant", () => {
    expect(src).toContain('"linear-gradient(135deg, #185FA5, #5aa05a)"');
  });

  it("Badge mine 'Mon étab' (au lieu de Géré)", () => {
    expect(src).toContain("★ Mon étab");
  });
});

describe("0.55.47 - Carte : boutons actions popup", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/carte/page.js"),
    "utf-8"
  );

  it("Bouton Appeler (tel:)", () => {
    expect(src).toContain("📞 Appeler");
    expect(src).toContain('href="tel:');
  });

  it("Bouton Itinéraire (google maps)", () => {
    expect(src).toContain("📍 Itinéraire");
    expect(src).toContain("google.com/maps/dir/?api=1");
  });

  it("Bouton Email (mailto:)", () => {
    expect(src).toContain("✉️ Email");
    expect(src).toContain("href=\"mailto:");
  });

  it("Bouton Fiche → /etablissement/fiche ou /etablissements-partenaires", () => {
    expect(src).toContain("📄 Fiche");
    expect(src).toContain("/etablissement/fiche?id=");
    expect(src).toContain("/etablissements-partenaires?id=");
  });
});

describe("0.55.47 - Carte : recherche libre", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/carte/page.js"),
    "utf-8"
  );

  it("State freeSearch ajouté", () => {
    expect(src).toContain("const [freeSearch, setFreeSearch]");
    expect(src).toContain("const [freeSearchResults, setFreeSearchResults]");
    expect(src).toContain("freeSearchLayerRef");
  });

  it("Layer initialisé dans useEffect Leaflet", () => {
    expect(src).toContain("freeSearchLayerRef.current = L.layerGroup().addTo(map)");
  });

  it("fetchFreeSearch existe", () => {
    expect(src).toContain("async function fetchFreeSearch");
  });

  it("drawFreeSearch existe", () => {
    expect(src).toContain("function drawFreeSearch");
  });

  it("Promise.allSettled sur 3 APIs en parallèle", () => {
    expect(src).toContain("Promise.allSettled");
    expect(src).toContain("/api/rpps");
    expect(src).toContain("/api/sirene");
    expect(src).toContain("/api/finess");
  });

  it("Debounce 600ms via useEffect", () => {
    expect(src).toContain("setTimeout(() => {\n      fetchFreeSearch");
  });

  it("Min 3 caractères avant de chercher", () => {
    expect(src).toContain("query.length < 3");
  });

  it("Affiche tous les résultats avec coords (filtre bbox retiré en 0.55.49)", () => {
    // 0.55.49 : on a retiré le filtre bbox pour ne plus avoir "visibles 0"
    expect(src).toContain("all.filter(x => x.latitude && x.longitude)");
  });

  it("Markers colorés par source (RPPS violet, SIRENE vert, FINESS bleu)", () => {
    expect(src).toMatch(/rpps.*7a6fb0/);
    expect(src).toMatch(/sirene.*5aa05a/);
    expect(src).toMatch(/finess.*185FA5/);
  });

  it("Input recherche libre dans le panneau filtres", () => {
    expect(src).toContain('placeholder=\'Tape "orthopédiste"');
    expect(src).toContain("Recherche libre sur la carte");
  });

  it("Bouton clear (×) si query non vide", () => {
    expect(src).toContain("Effacer");
    expect(src).toContain('onClick={() => setFreeSearch("")}');
  });
});

describe("0.55.47 - Console logs debug recherche", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/carte/page.js"),
    "utf-8"
  );

  it("Logs détaillés pour debug", () => {
    expect(src).toContain('"[Recherche libre]"');
  });
});
