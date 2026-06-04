// =============================================================
//  Tests unitaires — 0.58.14 UI PHASE 13
//
//  ProgressBar + Tooltip premium
//  + Intégration BulkToolbar dans /interventions
//  + RangePicker dans /statistiques
//  + Page /onboarding avec Stepper wizard
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.14 - Version", () => {
  it("Version 0.58.14+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(14);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.14 - ProgressBar", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/ProgressBar.js"), "utf-8");

  it("'use client' + export default function ProgressBar", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function ProgressBar/);
  });

  it("Props : value, label, showPercent, size, variant, indeterminate", () => {
    expect(src).toMatch(/value\s*=\s*0/);
    expect(src).toMatch(/label,/);
    expect(src).toMatch(/showPercent\s*=\s*false/);
    expect(src).toMatch(/size\s*=\s*["']md["']/);
    expect(src).toMatch(/variant\s*=\s*["']default["']/);
    expect(src).toMatch(/indeterminate\s*=\s*false/);
  });

  it("Value clampé 0-100", () => {
    expect(src).toMatch(/Math\.max\(0,\s*Math\.min\(100,\s*value\)\)/);
  });

  it("3 tailles (sm 4 / md 8 / lg 12)", () => {
    expect(src).toMatch(/sm:\s*4,\s*md:\s*8,\s*lg:\s*12/);
  });

  it("4 variants (default teal / success green / danger terra / navy)", () => {
    expect(src).toMatch(/default:\s*\{[\s\S]*?#7CC8C8/);
    expect(src).toMatch(/success:\s*\{[\s\S]*?#5aa05a/);
    expect(src).toMatch(/danger:\s*\{[\s\S]*?#C9867F/);
    expect(src).toMatch(/navy:\s*\{[\s\S]*?#142131/);
  });

  it("Mode indeterminate avec animation av-progress-indeterminate", () => {
    expect(src).toMatch(/animation:\s*["']av-progress-indeterminate/);
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-progress-indeterminate/);
  });

  it("A11y : role progressbar + aria-valuenow/min/max/text", () => {
    expect(src).toMatch(/role="progressbar"/);
    expect(src).toMatch(/aria-valuenow/);
    expect(src).toMatch(/aria-valuemin=\{0\}/);
    expect(src).toMatch(/aria-valuemax=\{100\}/);
    expect(src).toMatch(/aria-valuetext/);
  });

  it("Brillance subtile au sommet si pct > 5", () => {
    expect(src).toMatch(/pct\s*>\s*5/);
  });

  it("Exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/ProgressBar/);
  });
});

describe("0.58.14 - Tooltip premium", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Tooltip.js"), "utf-8");

  it("'use client' + export default function Tooltip", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function Tooltip/);
  });

  it("Props : content, position, delay, maxWidth, arrow, disabled", () => {
    expect(src).toMatch(/content,/);
    expect(src).toMatch(/position\s*=\s*["']top["']/);
    expect(src).toMatch(/delay\s*=\s*400/);
    expect(src).toMatch(/maxWidth\s*=\s*240/);
    expect(src).toMatch(/arrow\s*=\s*true/);
    expect(src).toMatch(/disabled\s*=\s*false/);
  });

  it("4 positions supportées + auto-flip si débord viewport", () => {
    expect(src).toMatch(/case ["']top["']/);
    expect(src).toMatch(/case ["']bottom["']/);
    expect(src).toMatch(/case ["']left["']/);
    expect(src).toMatch(/case ["']right["']/);
    expect(src).toMatch(/overflowsTop|overflowsBottom|overflowsLeft|overflowsRight/);
  });

  it("Show/hide avec timeout pour gérer delay", () => {
    expect(src).toMatch(/function show/);
    expect(src).toMatch(/function hide/);
    expect(src).toMatch(/setTimeout\(\(\)\s*=>\s*setVisible\(true\),\s*delay\)/);
  });

  it("Cleanup timeout au unmount", () => {
    expect(src).toMatch(/clearTimeout\(timeoutRef\.current\)/);
  });

  it("Position calculée via getBoundingClientRect après render visible", () => {
    expect(src).toMatch(/getBoundingClientRect\(\)/);
    expect(src).toMatch(/setCoords/);
  });

  it("Arrow CSS pure (4 directions, border triangle)", () => {
    expect(src).toMatch(/function renderArrow/);
    expect(src).toMatch(/borderLeft:\s*`\$\{arrowSize\}px solid transparent`/);
  });

  it("Animation av-tooltip-in (fade + scale)", () => {
    expect(src).toMatch(/animation:\s*["']av-tooltip-in/);
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-tooltip-in/);
    expect(css).toMatch(/scale\(0\.85\)/);
  });

  it("A11y : aria-describedby + role=tooltip", () => {
    expect(src).toMatch(/role="tooltip"/);
    expect(src).toMatch(/aria-describedby=\{visible\s*\?\s*tooltipId/);
  });

  it("Show sur mouseenter ET focus (clavier)", () => {
    expect(src).toMatch(/onMouseEnter=\{show\}/);
    expect(src).toMatch(/onFocus=\{show\}/);
  });

  it("Exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/Tooltip/);
  });
});

describe("0.58.14 - Intégration BulkToolbar dans /interventions", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");

  it("Import BulkToolbar + Dialog depuis ui-premium", () => {
    expect(src).toMatch(/import\s+\{[^}]*BulkToolbar[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/import\s+\{\s*Dialog\s*\}\s+from\s+["'][^"']*ui-premium["']/);
  });

  it("State selected (Set) + toggleSelected + clearSelected", () => {
    expect(src).toMatch(/selected,\s*setSelected\]\s*=\s*useState\(new Set\(\)\)/);
    expect(src).toMatch(/function toggleSelected/);
    expect(src).toMatch(/function clearSelected/);
  });

  it("3 actions bulk : bulkClose, bulkExportCsv, bulkDelete", () => {
    expect(src).toMatch(/async function bulkClose/);
    expect(src).toMatch(/async function bulkExportCsv/);
    expect(src).toMatch(/async function bulkDelete/);
  });

  it("bulkClose utilise Dialog.confirm + supabase.update statut='Clôturée'", () => {
    expect(src).toMatch(/bulkClose[\s\S]*?Dialog\.confirm/);
    expect(src).toMatch(/bulkClose[\s\S]*?statut:\s*["']Clôturée["']/);
  });

  it("bulkDelete utilise Dialog.confirm avec danger=true", () => {
    expect(src).toMatch(/bulkDelete[\s\S]*?Dialog\.confirm\(\{[\s\S]*?danger:\s*true/);
  });

  it("Checkbox 'Tout sélectionner' dans thead", () => {
    expect(src).toMatch(/Tout sélectionner/);
    expect(src).toMatch(/visible\.every\(r\s*=>\s*selected\.has\(r\.id\)\)/);
  });

  it("Checkbox par ligne avec ligne mise en évidence si selected", () => {
    expect(src).toMatch(/checked=\{selected\.has\(r\.id\)\}/);
    expect(src).toMatch(/onChange=\{\(\)\s*=>\s*toggleSelected\(r\.id\)\}/);
    expect(src).toMatch(/selected\.has\(r\.id\)\s*\?\s*\{\s*background:/);
  });

  it("<BulkToolbar> avec 3 actions + variant danger sur delete", () => {
    expect(src).toMatch(/<BulkToolbar/);
    expect(src).toMatch(/onClear=\{clearSelected\}/);
    expect(src).toMatch(/itemName="intervention"/);
    expect(src).toMatch(/variant:\s*["']danger["']/);
  });

  it("Export CSV bulk avec BOM UTF-8 + séparateur ;", () => {
    expect(src).toMatch(/bulkExportCsv[\s\S]*?["']\\ufeff["']\s*\+/);
    expect(src).toMatch(/bulkExportCsv[\s\S]*?\.join\(["'];["']\)/);
  });
});

describe("0.58.14 - RangePicker dans /statistiques", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/statistiques/page.js"), "utf-8");

  it("Import RangePicker depuis ui-premium", () => {
    expect(src).toMatch(/import\s+\{[^}]*RangePicker[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
  });

  it("State range = { from, to } avec setRange", () => {
    expect(src).toMatch(/range,\s*setRange\]\s*=\s*useState\(\{\s*from:\s*["']{2},\s*to:\s*["']{2}\s*\}\)/);
  });

  it("<RangePicker> avec value={range} et onChange={setRange}", () => {
    expect(src).toMatch(/<RangePicker\s+value=\{range\}\s+onChange=\{setRange\}/);
  });

  it("Barre filtre avec icon + label 'Période d'analyse'", () => {
    expect(src).toMatch(/Période d/);
    expect(src).toMatch(/ti-filter/);
  });
});

describe("0.58.14 - Page /onboarding avec Stepper wizard", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/onboarding/page.js"), "utf-8");

  it("'use client' + export default", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function OnboardingPage/);
  });

  it("4 étapes : Identité, Rôle, Permissions, Invitation", () => {
    expect(src).toMatch(/STEPS\s*=\s*\[/);
    expect(src).toMatch(/id:\s*["']identite["']/);
    expect(src).toMatch(/id:\s*["']role["']/);
    expect(src).toMatch(/id:\s*["']permissions["']/);
    expect(src).toMatch(/id:\s*["']invitation["']/);
  });

  it("4 rôles définis avec icon + desc + iconColor", () => {
    expect(src).toMatch(/value:\s*["']admin["'][\s\S]*?ti-shield-check/);
    expect(src).toMatch(/value:\s*["']manager["'][\s\S]*?ti-users-group/);
    expect(src).toMatch(/value:\s*["']utilisateur["']/);
    expect(src).toMatch(/value:\s*["']lecture["'][\s\S]*?ti-eye/);
  });

  it("9 permissions granulaires (patients_read/write/delete, materiel_*, interventions, transferts, stats, exports)", () => {
    expect(src).toMatch(/patients_read/);
    expect(src).toMatch(/patients_write/);
    expect(src).toMatch(/patients_delete/);
    expect(src).toMatch(/materiel_read/);
    expect(src).toMatch(/materiel_write/);
    expect(src).toMatch(/interventions/);
    expect(src).toMatch(/transferts/);
    expect(src).toMatch(/stats/);
    expect(src).toMatch(/exports/);
  });

  it("Validation step 0 : email regex + nom > 1 char", () => {
    expect(src).toMatch(/canGoNext/);
    expect(src).toMatch(/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$/);
  });

  it("Utilise Stepper, Stepper.Body, Stepper.Footer", () => {
    expect(src).toMatch(/<Stepper\b/);
    expect(src).toMatch(/<Stepper\.Body/);
    expect(src).toMatch(/<Stepper\.Footer/);
  });

  it("Utilise Select premium pour le rôle (size=lg)", () => {
    expect(src).toMatch(/<Select[\s\S]*?value=\{role\}[\s\S]*?size="lg"/);
  });

  it("Utilise Combobox premium pour les permissions", () => {
    expect(src).toMatch(/<Combobox[\s\S]*?values=\{permissions\}/);
  });

  it("Step 4 : récap avec Avatar + role badge + permissions tags", () => {
    expect(src).toMatch(/Récapitulatif/);
    expect(src).toMatch(/<Avatar\s+name=/);
  });

  it("handleSubmit appelle supabase.functions.invoke('invite-user')", () => {
    expect(src).toMatch(/supabase\.functions\.invoke\(["']invite-user["']/);
  });

  it("handleCancel demande confirmation via Dialog.confirm si saisie", () => {
    expect(src).toMatch(/handleCancel[\s\S]*?Dialog\.confirm/);
  });

  it("PageHero variant='violet' avec breadcrumbs", () => {
    expect(src).toMatch(/<PageHero[\s\S]*?variant="violet"/);
    expect(src).toMatch(/breadcrumbs=\{\[/);
  });
});

describe("0.58.14 - Récap composants premium (19 au total)", () => {
  it("19 composants exportés depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    const components = [
      "KpiCard", "Sparkline", "MetricCard",
      "Skeleton", "SkeletonText", "SkeletonRow", "SkeletonGrid",
      "SkeletonCard", "SkeletonAvatar", "SkeletonKpi",
      "EmptyState",
      "Toast", "showToast", "toast",
      "PageHero",
      "Tabs", "TabPanel",
      "Avatar", "AvatarGroup",
      "Select",
      "DatePicker",
      "Combobox",
      "TimePicker",
      "Dialog",
      "Drawer",
      "RangePicker",
      "Stepper", "StepperBody", "StepperFooter",
      "BulkToolbar",
      // Nouveaux 0.58.14
      "ProgressBar",
      "Tooltip",
    ];
    for (const c of components) {
      expect(idx).toMatch(new RegExp(`\\b${c}\\b`));
    }
  });
});
