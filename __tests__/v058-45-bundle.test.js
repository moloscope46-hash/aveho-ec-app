// =============================================================
//  Tests unitaires — 0.58.45
//  Vigilance météo + Notes Ctrl+V image + usePageAction étendu
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.45 - Version", () => {
  it("Version 0.58.45+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(45);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.45 - WeatherWidget : vigilance maison", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Calcul des alerts basé sur les seuils (vent/précip/UV/temp/codes dangereux)", () => {
    expect(src).toMatch(/const alerts = \[\]/);
    expect(src).toMatch(/dangerousCodes\s*=\s*\[95,\s*96,\s*99/);
  });

  it("3 niveaux de vigilance (1=jaune, 2=orange, 3=rouge)", () => {
    expect(src).toMatch(/vigilanceColors\s*=\s*\{[\s\S]*?1:[\s\S]*?2:[\s\S]*?3:/);
    expect(src).toMatch(/label:\s*["']JAUNE["']/);
    expect(src).toMatch(/label:\s*["']ORANGE["']/);
    expect(src).toMatch(/label:\s*["']ROUGE["']/);
  });

  it("Seuils vent : 50/70/90 km/h", () => {
    expect(src).toMatch(/windToCheck >= 90/);
    expect(src).toMatch(/windToCheck >= 70/);
    expect(src).toMatch(/windToCheck >= 50/);
  });

  it("Seuils précipitations : 15/30/50 mm", () => {
    expect(src).toMatch(/precipSum >= 50/);
    expect(src).toMatch(/precipSum >= 30/);
    expect(src).toMatch(/precipSum >= 15/);
  });

  it("Seuils canicule : 28/33/38°C", () => {
    expect(src).toMatch(/tempMax >= 38/);
    expect(src).toMatch(/tempMax >= 33/);
    expect(src).toMatch(/tempMax >= 28/);
  });

  it("Bannière vigilance affichée si maxLevel >= 1", () => {
    expect(src).toMatch(/maxLevel >= 1 && vigColors/);
    expect(src).toMatch(/ti-alert-triangle/);
    // 0.58.51 : le code utilise JSX `Vigilance {vigColors.label}` (pas une template literal $)
    expect(src).toMatch(/Vigilance\s*\{vigColors\.label\}/);
  });
});

describe("0.58.45 - NotesWidget : Ctrl+V image", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("NOTES_MAX_LEN augmenté à 50000", () => {
    expect(src).toMatch(/NOTES_MAX_LEN\s*=\s*50000/);
  });

  it("Constantes de compression : NOTES_IMG_MAX_WIDTH / QUALITY / MAX_KB", () => {
    expect(src).toMatch(/NOTES_IMG_MAX_WIDTH\s*=\s*800/);
    expect(src).toMatch(/NOTES_IMG_QUALITY\s*=\s*0\.78/);
    expect(src).toMatch(/NOTES_IMG_MAX_KB\s*=\s*250/);
  });

  it("Fonction compressImageToDataUrl(blob) async", () => {
    expect(src).toMatch(/async function compressImageToDataUrl/);
    expect(src).toMatch(/canvas\.toDataURL\(["']image\/jpeg["']/);
  });

  it("Re-tente avec qualité réduite si dépasse la taille max", () => {
    expect(src).toMatch(/canvas\.toDataURL\(["']image\/jpeg["'],\s*0\.55\)/);
  });

  it("Textarea onPaste intercepte les items image/*", () => {
    expect(src).toMatch(/onPaste=/);
    expect(src).toMatch(/items\[i\]\.type\.startsWith\(["']image\/["']\)/);
  });

  it("Insertion markdown ![Image collée](dataUrl) à la position du curseur", () => {
    expect(src).toMatch(/!\[Image collée\]/);
    expect(src).toMatch(/selectionStart/);
  });

  it("Alert si image trop grosse ou note trop longue", () => {
    expect(src).toMatch(/Image trop volumineuse/);
    expect(src).toMatch(/Note trop longue/);
  });
});

describe("0.58.45 - inlineMd : support image markdown ![alt](url)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Parse !\\[alt\\](src) — détection du !", () => {
    expect(src).toMatch(/text\[i\] === ["']!["'] && text\[i \+ 1\] === ["']\[["']/);
  });

  it("Whitelist source : data:image/, http(s), URL relative", () => {
    expect(src).toMatch(/\/\^\(data:image\\\/\|https\?:\\\/\\\/\|\\\/\)\//);
  });

  it("Lightbox au clic (overlay full-screen pour les data: URLs)", () => {
    expect(src).toMatch(/createElement\(["']div["']\)/);
    expect(src).toMatch(/cursor:zoom-out/);
  });
});

describe("0.58.45 - usePageAction étendu à /commandes, /achats, /transferts", () => {
  ["commandes", "achats", "transferts"].forEach((page) => {
    it(`/${page} importe usePageAction`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), `app/${page}/page.js`), "utf-8");
      expect(src).toMatch(/import\s*\{\s*usePageAction\s*\}/);
    });

    it(`/${page} a usePageAction("export-csv")`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), `app/${page}/page.js`), "utf-8");
      expect(src).toMatch(/usePageAction\(["']export-csv["']/);
    });
  });

  it("/transferts + /achats ont aussi usePageAction(open-new)", () => {
    const t = fs.readFileSync(path.resolve(process.cwd(), "app/transferts/page.js"), "utf-8");
    const a = fs.readFileSync(path.resolve(process.cwd(), "app/achats/page.js"), "utf-8");
    expect(t).toMatch(/usePageAction\(["']open-new["']/);
    expect(a).toMatch(/usePageAction\(["']open-new["']/);
  });
});

describe("0.58.45 - Cmd+K : 3 nouvelles actions export", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/GlobalSearch.js"), "utf-8");

  it("export-commandes-csv avec pageContext /commandes", () => {
    expect(src).toMatch(/export-commandes-csv/);
    expect(src).toMatch(/pageContext:\s*\/\^\\\/commandes\//);
  });

  it("export-achats-csv avec pageContext /achats", () => {
    expect(src).toMatch(/export-achats-csv/);
  });

  it("export-transferts-csv avec pageContext /transferts", () => {
    expect(src).toMatch(/export-transferts-csv/);
  });
});
