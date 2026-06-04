// =============================================================
//  Tests unitaires — 0.58.15 UI PHASE 14
//
//  CodeBlock premium + Branchement RangePicker queries Supabase
//  + Lien Onboarding depuis /utilisateurs + Tooltips partout
//  + ProgressBar dans exports lourds + Drawer détail intervention
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.15 - Version", () => {
  it("Version 0.58.15+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(15);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.15 - CodeBlock premium", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/CodeBlock.js"), "utf-8");

  it("'use client' + export default function CodeBlock", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function CodeBlock/);
  });

  it("Props : code, language, lineNumbers, maxHeight, variant, title, showCopy, wrap", () => {
    expect(src).toMatch(/code\s*=\s*["']{2}/);
    expect(src).toMatch(/language\s*=\s*["']text["']/);
    expect(src).toMatch(/lineNumbers\s*=\s*true/);
    expect(src).toMatch(/maxHeight\s*=\s*360/);
    expect(src).toMatch(/variant\s*=\s*["']default["']/);
    expect(src).toMatch(/showCopy\s*=\s*true/);
    expect(src).toMatch(/wrap\s*=\s*false/);
  });

  it("Helpers escapeHtml + highlightJson + highlightSql", () => {
    expect(src).toMatch(/function escapeHtml/);
    expect(src).toMatch(/function highlightJson/);
    expect(src).toMatch(/function highlightSql/);
  });

  it("JSON highlight : keys, strings, numbers, booleans/null", () => {
    expect(src).toMatch(/av-cb-key/);
    expect(src).toMatch(/av-cb-str/);
    expect(src).toMatch(/av-cb-num/);
    expect(src).toMatch(/av-cb-bool/);
  });

  it("SQL keywords list + comments", () => {
    expect(src).toMatch(/SELECT.*FROM.*WHERE/);
    expect(src).toMatch(/av-cb-cmt/);
  });

  it("4 variants (default/danger/success/info)", () => {
    expect(src).toMatch(/default:\s*\{[\s\S]*?#142131/);
    expect(src).toMatch(/danger:\s*\{[\s\S]*?#C9867F/);
    expect(src).toMatch(/success:\s*\{[\s\S]*?#5aa05a/);
    expect(src).toMatch(/info:\s*\{[\s\S]*?#185FA5/);
  });

  it("Bouton Copier avec feedback 'Copié' temporaire (1.8s)", () => {
    expect(src).toMatch(/navigator\.clipboard\.writeText/);
    expect(src).toMatch(/setCopied\(true\)/);
    expect(src).toMatch(/setTimeout\(\(\)\s*=>\s*setCopied\(false\),\s*1800\)/);
  });

  it("Fallback execCommand('copy') si clipboard refuse", () => {
    expect(src).toMatch(/document\.execCommand\(["']copy["']\)/);
  });

  it("Line numbers en table avec userSelect:none", () => {
    expect(src).toMatch(/userSelect:\s*["']none["']/);
    expect(src).toMatch(/\{i \+ 1\}/);
  });

  it("Exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/CodeBlock/);
  });
});

describe("0.58.15 - RangePicker branché sur queries Supabase /statistiques", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/statistiques/page.js"), "utf-8");

  it("Calcul dateFromISO/dateFromDate/dateToISO/dateToDate selon range", () => {
    expect(src).toMatch(/dateFromISO/);
    expect(src).toMatch(/dateToISO/);
    expect(src).toMatch(/range\.from/);
    expect(src).toMatch(/range\.to/);
  });

  it("Fallback 6 derniers mois si range vide", () => {
    expect(src).toMatch(/6\s*\*\s*30\s*\*\s*86400000/);
  });

  it("Helpers applyToISO + applyToDate pour appliquer .lte() dynamiquement", () => {
    expect(src).toMatch(/const applyToISO/);
    expect(src).toMatch(/const applyToDate/);
    expect(src).toMatch(/\.lte\(col,/);
  });

  it("Queries Supabase utilisent les helpers (gte + lte optionnel)", () => {
    // Au moins 2 queries enveloppées par applyToISO ou applyToDate
    const matches = src.match(/applyTo(ISO|Date)\(supabase\.from/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("useEffect dépend de range.from + range.to (re-fetch automatique)", () => {
    expect(src).toMatch(/\}, \[auth\.ready[^\]]*range\.from[^\]]*range\.to\]/);
  });

  it("Subtitle dynamique avec dates formatées si filtre actif", () => {
    expect(src).toMatch(/Période\s*:\s*\$\{fmt\(range\.from\)\}/);
    expect(src).toMatch(/toLocaleDateString\(["']fr-FR["']/);
  });

  it("Message 'Filtre appliqué' (vert) au lieu de 'Filtre actif — recharger'", () => {
    expect(src).toMatch(/Filtre appliqué/);
    expect(src).not.toMatch(/Filtre actif — recharger/);
  });

  it("setLoading(true) au début du useEffect (UX feedback rechargement)", () => {
    // Recherche dans la fonction
    expect(src).toMatch(/setLoading\(true\)/);
  });
});

describe("0.58.15 - Lien Onboarding depuis /utilisateurs", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/utilisateurs/page.js"), "utf-8");

  it("Lien <a href='/onboarding'> ajouté", () => {
    expect(src).toMatch(/href="\/onboarding"/);
  });

  it("Visible uniquement si auth.can('inviter')", () => {
    // Au moins 2 occurrences (le bouton existant + le nouveau lien)
    const matches = src.match(/auth\.can\(["']inviter["']\)/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("Icon ti-wand + label 'Onboarding guidé'", () => {
    expect(src).toMatch(/ti-wand/);
    expect(src).toMatch(/Onboarding guidé/);
  });

  it("Badge 'NEW' lavande", () => {
    expect(src).toMatch(/NEW/);
    expect(src).toMatch(/rgba\(122,111,176/);
  });

  it("Hover effect (translateY + box-shadow)", () => {
    expect(src).toMatch(/onMouseEnter[\s\S]*?translateY\(-1px\)/);
  });
});

describe("0.58.15 - Tooltips partout", () => {
  it("NotifBell : Tooltip importé + utilisé sur la cloche", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/NotifBell.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*Tooltip[^}]*\}\s+from\s+["']\.\/components\/ui-premium["']/);
    expect(src).toMatch(/<Tooltip[\s\S]*?content=\{nonLues\s*>\s*0/);
    expect(src).toMatch(/position="bottom"/);
  });

  it("NotifBell : title='Notifications' HTML supprimé (remplacé par Tooltip)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/NotifBell.js"), "utf-8");
    // title="Notifications" sur le button doit avoir disparu
    expect(src).not.toMatch(/className="notif-btn"[\s\S]{0,200}title="Notifications"/);
  });

  it("/interventions : Tooltip importé + utilisé sur dates relatives", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*Tooltip[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/<Tooltip[\s\S]*?content=\{r\.created_at/);
  });

  it("/interventions : Tooltip sur badge transfert_id", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/<Tooltip content="Un transfert/);
  });
});

describe("0.58.15 - ProgressBar dans exports lourds", () => {
  const interventions = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
  const stats = fs.readFileSync(path.resolve(process.cwd(), "app/statistiques/page.js"), "utf-8");

  it("/interventions : ProgressBar importé", () => {
    expect(interventions).toMatch(/import\s+\{[^}]*ProgressBar[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
  });

  it("/interventions : state exportProgress = { value, total }", () => {
    expect(interventions).toMatch(/exportProgress,\s*setExportProgress\]\s*=\s*useState\(null\)/);
  });

  it("/interventions : seuil 100 lignes pour activer la progress bar", () => {
    expect(interventions).toMatch(/total\s*>\s*100/);
    expect(interventions).toMatch(/useProgress/);
  });

  it("/interventions : yield au DOM tous les BATCH (50) items pour ne pas freezer", () => {
    expect(interventions).toMatch(/const BATCH = 50/);
    expect(interventions).toMatch(/new Promise\(\(res\)\s*=>\s*setTimeout\(res,\s*0\)\)/);
  });

  it("/interventions : ProgressBar floating affichée si exportProgress", () => {
    expect(interventions).toMatch(/\{exportProgress\s*&&\s*\(/);
    expect(interventions).toMatch(/<ProgressBar[\s\S]*?showPercent/);
  });

  it("/statistiques : ProgressBar importé", () => {
    expect(stats).toMatch(/import\s+\{[^}]*ProgressBar[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
  });

  it("/statistiques : state bilanExporting + ProgressBar indeterminate", () => {
    expect(stats).toMatch(/bilanExporting,\s*setBilanExporting\]\s*=\s*useState\(false\)/);
    expect(stats).toMatch(/setBilanExporting\(true\)/);
    expect(stats).toMatch(/setBilanExporting\(false\)/);
    expect(stats).toMatch(/<ProgressBar[\s\S]*?indeterminate[\s\S]*?variant="success"/);
  });

  it("/statistiques : ne bloque plus toute la page avec setLoading(true) pendant l'export Excel", () => {
    // Le bouton export Excel doit utiliser setBilanExporting (pas setLoading)
    expect(stats).toMatch(/Export CSV[\s\S]*?setBilanExporting/);
  });
});

describe("0.58.15 - Drawer de détail intervention", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");

  it("Drawer importé depuis ui-premium", () => {
    expect(src).toMatch(/import\s+\{[^}]*Drawer[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
  });

  it("State detailDi pour stocker l'intervention sélectionnée", () => {
    expect(src).toMatch(/detailDi,\s*setDetailDi\]\s*=\s*useState\(null\)/);
  });

  it("Bouton 'Détails' dans chaque ligne avec icon ti-layout-sidebar-right-expand", () => {
    expect(src).toMatch(/ti-layout-sidebar-right-expand/);
    expect(src).toMatch(/Détails/);
    expect(src).toMatch(/setDetailDi\(r\)/);
  });

  it("Drawer side='right' size='md' avec title dynamique", () => {
    expect(src).toMatch(/<Drawer[\s\S]*?open=\{!!detailDi\}/);
    expect(src).toMatch(/side="right"/);
    expect(src).toMatch(/title=\{detailDi\s*\?\s*`Intervention/);
  });

  it("Footer Drawer avec bouton Fermer + 'Passer à Suivant' si applicable", () => {
    expect(src).toMatch(/footer=\{[\s\S]*?Fermer/);
    expect(src).toMatch(/Passer à[\s\S]*?next\(detailDi\.statut\)/);
  });

  it("Drawer affiche : numéro + status tag + urgence", () => {
    expect(src).toMatch(/detailDi[\s\S]*?stCls\(r\.statut\)/);
  });

  it("Drawer affiche : matériel concerné (carte bleue avec SN/parc)", () => {
    expect(src).toMatch(/Matériel concerné/);
    expect(src).toMatch(/numero_serie/);
    expect(src).toMatch(/numero_parc/);
  });

  it("Drawer affiche : patient concerné avec Avatar", () => {
    expect(src).toMatch(/Patient concerné/);
    expect(src).toMatch(/<Avatar\s+name=\{`\$\{r\.patients\.prenom/);
  });

  it("Drawer affiche : description multiline + actions disponibles (réassigner, transfert)", () => {
    expect(src).toMatch(/whiteSpace:\s*["']pre-wrap["']/);
    expect(src).toMatch(/Actions disponibles/);
  });
});

describe("0.58.15 - Récap composants premium (20 au total)", () => {
  it("20 composants exportés depuis ui-premium", () => {
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
      "ProgressBar",
      "Tooltip",
      // Nouveau 0.58.15
      "CodeBlock",
    ];
    for (const c of components) {
      expect(idx).toMatch(new RegExp(`\\b${c}\\b`));
    }
  });
});
