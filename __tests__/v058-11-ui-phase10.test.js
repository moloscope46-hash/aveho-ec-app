// =============================================================
//  Tests unitaires — 0.58.11 UI PHASE 10
//
//  HOTFIX : Sanitize PostgREST chars dans GlobalSearch
//  + Migration <select> natifs → Select premium (parametres + interventions)
//  + Refonte Modal API (subtitle, iconBg/iconColor, headerActions, variant minimal/danger)
//  + TabPanel + animation av-tab-slide-in
//  + 3 nouveaux Skeleton variants (Card, Avatar, Kpi)
//  + DatePicker custom
//  + Combobox multi-select avec tags + av-tag-pop
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.11 - Version", () => {
  it("Version 0.58.11+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(11);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.11 - HOTFIX GlobalSearch : sanitize PostgREST chars", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/GlobalSearch.js"), "utf-8");

  it("Variable safeSearch déclarée avec replace des caractères dangereux", () => {
    expect(src).toMatch(/safeSearch\s*=\s*searchTerm\.replace\(/);
  });

  it("Strip au moins =, ',', '(', ')', '*' pour éviter 400 PostgREST", () => {
    expect(src).toMatch(/\[=,\(\)\*\]/);
  });

  it("Early return si query vide après sanitize", () => {
    expect(src).toMatch(/if\s*\(!safeSearch\)/);
  });

  it("term utilise safeSearch et plus searchTerm direct", () => {
    expect(src).toMatch(/const term = `%\$\{safeSearch\}%`/);
  });
});

describe("0.58.11 - Migration <select> → Select premium", () => {
  it("parametres/page.js : Select importé + utilisé pour devise et format_date", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/parametres/page.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*Select[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    // 2 Select premium au moins
    const selectCount = (src.match(/<Select\b/g) || []).length;
    expect(selectCount).toBeGreaterThanOrEqual(2);
    // Pour devise + format_date
    expect(src).toMatch(/value=\{params\.devise/);
    expect(src).toMatch(/value=\{params\.format_date/);
  });

  it("interventions/page.js : Select sur filtres statut + type", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*Select[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/<Select[\s\S]*?value=\{fStatut\}/);
    expect(src).toMatch(/<Select[\s\S]*?value=\{fType\}/);
  });
});

describe("0.58.11 - Refonte Modal API", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/ui.js"), "utf-8");

  it("Modal accepte subtitle (sous-titre)", () => {
    expect(src).toMatch(/function Modal\([\s\S]*?subtitle/);
  });

  it("Modal accepte iconBg et iconColor pour personnaliser le badge", () => {
    expect(src).toMatch(/function Modal\([\s\S]*?iconBg/);
    expect(src).toMatch(/function Modal\([\s\S]*?iconColor/);
  });

  it("Modal accepte headerActions (slot React)", () => {
    expect(src).toMatch(/function Modal\([\s\S]*?headerActions/);
    expect(src).toMatch(/headerActions\s*&&\s*\(/);
  });

  it("Modal accepte variant (default | minimal | danger)", () => {
    expect(src).toMatch(/variant\s*=\s*["']default["']/);
    expect(src).toMatch(/variant === ["']danger["']/);
    expect(src).toMatch(/variant !== ["']minimal["']/);
  });

  it("Modal variant=minimal cache le header coloré + ajoute close floating", () => {
    expect(src).toMatch(/modal-x-floating/);
    expect(src).toMatch(/showHeader\s*=\s*variant !== ["']minimal["']/);
  });

  it("Modal taille xl (920px) ajoutée", () => {
    expect(src).toMatch(/xl:\s*920/);
  });

  it("CSS : modal-x-floating + modal-subtitle dans globals", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/\.modal-x-floating:hover/);
    expect(css).toMatch(/\.modal-head-v2 \.modal-subtitle/);
  });
});

describe("0.58.11 - TabPanel + animations slide horizontal entre tabs", () => {
  it("TabPanel exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/TabPanel/);
  });

  it("TabPanel utilise key={active} + animation av-tab-slide-in", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Tabs.js"), "utf-8");
    expect(src).toMatch(/export function TabPanel/);
    expect(src).toMatch(/key=\{active\}/);
    expect(src).toMatch(/animation:\s*["']av-tab-slide-in/);
  });

  it("Keyframe av-tab-slide-in déclaré", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-tab-slide-in/);
    expect(css).toMatch(/translateX\(20px\)/);
  });

  it("Class utility .av-tab-content déclarée pour usage rétrocompatible", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/\.av-tab-content\s*\{[\s\S]*?animation:\s*av-tab-slide-in/);
  });

  it("Parametres /tabs wrap les 3 tabs avec av-tab-content + key", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/parametres/page.js"), "utf-8");
    expect(src).toMatch(/key="general"\s+className="av-tab-content"/);
    expect(src).toMatch(/key="notifs"\s+className="av-tab-content"/);
    expect(src).toMatch(/key="rgpd"\s+className="av-tab-content"/);
  });

  it("Profil /tabs wrap les 4 tabs avec av-tab-content + key", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");
    expect(src).toMatch(/key="activite"\s+className="av-tab-content"/);
    expect(src).toMatch(/key="profil"\s+className="av-tab-content"/);
    expect(src).toMatch(/key="notifs"\s+className="av-tab-content"/);
    expect(src).toMatch(/key="secu"\s+className="av-tab-content"/);
  });
});

describe("0.58.11 - Skeleton variants : SkeletonCard, SkeletonAvatar, SkeletonKpi", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Skeleton.js"), "utf-8");
  const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");

  it("SkeletonCard exporté avec props height + showSparkline", () => {
    expect(src).toMatch(/export function SkeletonCard/);
    expect(src).toMatch(/SkeletonCard\s*\(\s*\{\s*height/);
    expect(src).toMatch(/showSparkline/);
  });

  it("SkeletonAvatar exporté avec props size + showName + showSub", () => {
    expect(src).toMatch(/export function SkeletonAvatar/);
    expect(src).toMatch(/showName/);
    expect(src).toMatch(/showSub/);
  });

  it("SkeletonKpi exporté (rangée de N cards alignées)", () => {
    expect(src).toMatch(/export function SkeletonKpi/);
    expect(src).toMatch(/gridTemplateColumns:\s*`repeat\(\$\{count\},\s*1fr\)`/);
  });

  it("3 nouveaux variants ré-exportés depuis index", () => {
    expect(idx).toMatch(/SkeletonCard/);
    expect(idx).toMatch(/SkeletonAvatar/);
    expect(idx).toMatch(/SkeletonKpi/);
  });
});

describe("0.58.11 - DatePicker custom", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/DatePicker.js"), "utf-8");

  it("'use client' directive", () => {
    expect(src).toMatch(/^["']use client["']/);
  });

  it("Export default function DatePicker", () => {
    expect(src).toMatch(/export default function DatePicker/);
  });

  it("Props value, onChange, label, min, max, disabled, size, fullWidth", () => {
    expect(src).toMatch(/value\s*=\s*["']{2}/);
    expect(src).toMatch(/onChange,/);
    expect(src).toMatch(/label,/);
    expect(src).toMatch(/min,/);
    expect(src).toMatch(/max,/);
    expect(src).toMatch(/disabled\s*=\s*false/);
    expect(src).toMatch(/size\s*=\s*["']md["']/);
    expect(src).toMatch(/fullWidth\s*=\s*false/);
  });

  it("3 tailles (sm, md, lg)", () => {
    expect(src).toMatch(/sm:\s*\{[^}]*padH/);
    expect(src).toMatch(/md:\s*\{[^}]*padH/);
    expect(src).toMatch(/lg:\s*\{[^}]*padH/);
  });

  it("Helper formatDateFR utilisé pour affichage", () => {
    expect(src).toMatch(/function formatDateFR/);
    expect(src).toMatch(/toLocaleDateString\(["']fr-FR["']/);
  });

  it("Input natif date caché en absolute opacity 0", () => {
    expect(src).toMatch(/type="date"/);
    expect(src).toMatch(/opacity:\s*0/);
  });

  it("Clear button visible si value présente", () => {
    expect(src).toMatch(/function clearDate/);
    expect(src).toMatch(/hasValue\s*&&\s*!disabled/);
  });

  it("Tente showPicker() avant fallback click", () => {
    expect(src).toMatch(/showPicker/);
  });

  it("DatePicker exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/DatePicker/);
  });
});

describe("0.58.11 - Combobox multi-select avec tags", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Combobox.js"), "utf-8");

  it("'use client' + export default function Combobox", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function Combobox/);
  });

  it("Props values (array), onChange, options, searchable, maxTags", () => {
    expect(src).toMatch(/values\s*=\s*\[\]/);
    expect(src).toMatch(/onChange,/);
    expect(src).toMatch(/options\s*=\s*\[\]/);
    expect(src).toMatch(/searchable\s*=\s*true/);
    expect(src).toMatch(/maxTags\s*=\s*null/);
  });

  it("Tags avec animation av-tag-pop", () => {
    expect(src).toMatch(/animation:\s*["']av-tag-pop/);
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-tag-pop/);
  });

  it("Fonctions addValue / removeValue", () => {
    expect(src).toMatch(/function addValue/);
    expect(src).toMatch(/function removeValue/);
  });

  it("Filtre les options déjà sélectionnées", () => {
    expect(src).toMatch(/available\s*=\s*options\.filter\(\(o\)\s*=>\s*!values\.includes/);
  });

  it("MaxTags ferme automatiquement le picker quand atteint", () => {
    expect(src).toMatch(/values\.length\s*\+\s*1\s*>=\s*maxTags[\s\S]*?setOpen\(false\)/);
  });

  it("Search live + click outside + chevron rotate (réutilise patterns Select)", () => {
    expect(src).toMatch(/searchQ/);
    expect(src).toMatch(/document\.addEventListener\(["']mousedown["']/);
    expect(src).toMatch(/transform:\s*open\s*\?\s*["']rotate\(180deg\)["']/);
  });

  it("A11y : role combobox + listbox + option + aria-expanded/haspopup/selected", () => {
    expect(src).toMatch(/role="combobox"/);
    expect(src).toMatch(/role="listbox"/);
    expect(src).toMatch(/role="option"/);
    expect(src).toMatch(/aria-haspopup="listbox"/);
    expect(src).toMatch(/aria-expanded=\{open\}/);
  });

  it("Combobox exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/Combobox/);
  });
});

describe("0.58.11 - Dark mode pour Select / DatePicker / Combobox", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Dark : listbox avec background panel + shadow noire", () => {
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\[role="listbox"\]\s*\{[\s\S]*?aveho-panel/);
  });

  it("Dark : combobox trigger adapté", () => {
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\[role="combobox"\]\s*\{[\s\S]*?aveho-panel/);
  });
});

describe("0.58.11 - Récap composants premium", () => {
  it("12 composants premium exportés depuis ui-premium/index.js", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    // Liste : KpiCard, Sparkline, MetricCard, Skeleton (+3 variants),
    //        EmptyState, Toast (5 helpers), PageHero, Tabs (+TabPanel),
    //        Avatar (+AvatarGroup), Select, DatePicker, Combobox
    const components = [
      "KpiCard",
      "Sparkline",
      "MetricCard",
      "Skeleton",
      "SkeletonText",
      "SkeletonRow",
      "SkeletonGrid",
      "SkeletonCard",
      "SkeletonAvatar",
      "SkeletonKpi",
      "EmptyState",
      "Toast",
      "showToast",
      "toast",
      "PageHero",
      "Tabs",
      "TabPanel",
      "Avatar",
      "AvatarGroup",
      "Select",
      "DatePicker",
      "Combobox",
    ];
    for (const c of components) {
      expect(idx).toMatch(new RegExp(`\\b${c}\\b`));
    }
  });
});
