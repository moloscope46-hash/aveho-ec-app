// =============================================================
//  Tests 0.58.87 — CartDropdown + DepotArticlesModal + recherche vocale
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.87 - Version + SW", () => {
  it("Version 0.58.87+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.58\.(8[7-9]|9\d)|^0\.59|^0\.[6-9]|^[1-9]/);
  });
  it("SW VERSION sync à 0.58.87", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.58.87"');
  });
});

describe("0.58.87 - CartDropdown style Amazon", () => {
  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/components/CartDropdown.js"))).toBe(true);
  });
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/CartDropdown.js"), "utf-8");
  it("Clé localStorage aveho_ec_cart (alignée avec useCart)", () => {
    expect(src).toMatch(/CART_KEY = "aveho_ec_cart"/);
  });
  it("Anchor ref + click outside detection", () => {
    expect(src).toMatch(/anchorRef/);
    expect(src).toMatch(/handleClick.*onClose/s);
  });
  it("Escape ferme le dropdown", () => {
    expect(src).toMatch(/Escape.*onClose/s);
  });
  it("Animation slide-fade-in", () => {
    expect(src).toMatch(/av-cart-dropdown-in/);
    expect(src).toMatch(/@keyframes/);
  });
  it("Dispatch event av-cart-change sur modifs", () => {
    expect(src).toMatch(/dispatchEvent.*av-cart-change/);
  });
  it("Compatible 2 formats (libelle/titre, prix_vente_ht/prix)", () => {
    expect(src).toMatch(/it\.libelle \|\| it\.titre/);
    expect(src).toMatch(/it\.prix_vente_ht \|\| it\.prix/);
  });
  it("CTA Voir mon panier", () => {
    expect(src).toMatch(/Voir mon panier/);
  });
  it("Boutons +/- pour la quantité", () => {
    expect(src).toMatch(/updateQty.*-1/);
    expect(src).toMatch(/updateQty.*\b1\b/);
  });
  it("Bouton vider avec confirmation", () => {
    expect(src).toMatch(/function clear/);
    expect(src).toMatch(/confirm.*Vider/);
  });
});

describe("0.58.87 - DepotArticlesModal avec recherche vocale", () => {
  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/components/DepotArticlesModal.js"))).toBe(true);
  });
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DepotArticlesModal.js"), "utf-8");
  it("Web Speech API utilisée", () => {
    expect(src).toMatch(/window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/);
  });
  it("Langue fr-FR", () => {
    expect(src).toMatch(/recognition\.lang = "fr-FR"/);
  });
  it("Gestion fallback si non supporté", () => {
    expect(src).toMatch(/setVoiceSupported\(false\)/);
    expect(src).toMatch(/voiceSupported/);
  });
  it("Animation pulse pendant l'écoute", () => {
    expect(src).toMatch(/av-mic-pulse/);
    expect(src).toMatch(/voiceListening/);
  });
  it("Recherche cross-matériels (numero série/parc/lot)", () => {
    expect(src).toMatch(/num_serie.*toLowerCase.*includes/s);
    expect(src).toMatch(/num_parc.*toLowerCase.*includes/s);
    expect(src).toMatch(/num_lot.*toLowerCase.*includes/s);
  });
  it("Bouton ajouter au panier avec icône ti-shopping-cart-plus", () => {
    expect(src).toMatch(/ti-shopping-cart-plus/);
    expect(src).toMatch(/function addToCart/);
  });
  it("Désactive le bouton si 0 dispo", () => {
    expect(src).toMatch(/disabled=\{nbDispo === 0\}/);
  });
  it("Affichage matériels associés en <details>", () => {
    expect(src).toMatch(/<details/);
    expect(src).toMatch(/Voir les .* matériel/);
  });
  it("Couleurs par état matériel", () => {
    expect(src).toMatch(/ETAT_COLORS/);
    expect(src).toMatch(/"Disponible".*#5aa05a/);
    expect(src).toMatch(/"Maintenance".*#EF9F27/);
  });
  it("Tri : disponibles d'abord", () => {
    expect(src).toMatch(/disponibles d'abord|Trier.*disponibles/i);
  });
  it("Dispatch av-cart-change après ajout", () => {
    expect(src).toMatch(/dispatchEvent.*av-cart-change/);
  });
});

describe("0.58.87 - useCart sync via events", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/useCart.js"), "utf-8");
  it("Écoute av-cart-change", () => {
    expect(src).toMatch(/addEventListener\("av-cart-change"/);
  });
  it("Écoute storage event (cross-tab)", () => {
    expect(src).toMatch(/addEventListener\("storage"/);
  });
  it("Dispatch av-cart-change dans persist et add", () => {
    expect(src).toMatch(/dispatchEvent.*av-cart-change/);
  });
  it("Cleanup listeners", () => {
    expect(src).toMatch(/removeEventListener\("av-cart-change"/);
  });
});

describe("0.58.87 - TopBar intègre CartDropdown", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
  it("Import CartDropdown", () => {
    expect(src).toMatch(/import CartDropdown from/);
  });
  it("State cartOpen + ref cartBtnRef", () => {
    expect(src).toMatch(/cartOpen/);
    expect(src).toMatch(/cartBtnRef/);
  });
  it("Bouton panier toggle dropdown (plus de router.push direct)", () => {
    expect(src).toMatch(/setCartOpen\(o => !o\)/);
  });
  it("CartDropdown monté avec props open/onClose/anchorRef", () => {
    expect(src).toMatch(/<CartDropdown.*open=\{cartOpen\}.*onClose.*anchorRef=\{cartBtnRef\}/s);
  });
});

describe("0.58.87 - /etablissement utilise DepotArticlesModal", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/etablissement/page.js"), "utf-8");
  it("Import DepotArticlesModal", () => {
    expect(src).toMatch(/import DepotArticlesModal from/);
  });
  it("State depotModal", () => {
    expect(src).toMatch(/depotModal, setDepotModal/);
  });
  it("DepotCard reçoit onOpenArticles", () => {
    expect(src).toMatch(/onOpenArticles=\{\(\) => setDepotModal\(d\)\}/);
  });
  it("Bouton 'Voir les articles' dans DepotCard", () => {
    expect(src).toMatch(/Voir les articles/);
  });
  it("Modal monté en bas du JSX", () => {
    expect(src).toMatch(/depotModal && <DepotArticlesModal/);
  });
});

describe("0.58.87 - Cohérence changelog", () => {
  it("0.58.87 présent dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.58\.87"/);
  });
  it("0.58.87 dans versions-index.json", () => {
    const json = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/changelog-data/versions-index.json"), "utf-8"));
    expect(json.map(v => v.v)).toContain("0.58.87");
  });
  it("Note HTML 0.58.87 existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/changelog-notes/NOTE-VERSION-Alpha-0.58.87.html"))).toBe(true);
  });
});
