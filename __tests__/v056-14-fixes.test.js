// =============================================================
//  Tests unitaires — 0.56.14
//  Login bio toujours visible · Dump RPPS lien direct ·
//  Google Reviews sync diagnostic enrichi
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.14 - Login page : boutons bio toujours visibles avec état grisé", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/login/page.js"), "utf-8");

  it("Composant BioButton défini avec état disabledReason", () => {
    expect(src).toContain("function BioButton");
    expect(src).toContain("disabledReason");
  });

  it("Bouton face TOUJOURS rendu si WebAuthn supporté", () => {
    expect(src).toContain('isWebAuthnSupported()');
    expect(src).toMatch(/<BioButton[\s\S]*?method="face"/);
    expect(src).toMatch(/<BioButton[\s\S]*?method="empreinte"/);
  });

  it("Raison grisé : bio non dispo, pas d'email, ou pas activé pour cet email", () => {
    expect(src).toContain("Ton appareil ne supporte pas la biométrie");
    expect(src).toContain("Renseigne d'abord ton email");
    expect(src).toContain("pas encore activée pour cet email");
  });

  it("État disabled avec couleur grise + cursor not-allowed + tooltip", () => {
    expect(src).toContain('"#d3d9e0"');
    expect(src).toContain('"not-allowed"');
    expect(src).toContain('title={disabledReason');
  });
});

describe("0.56.14 - Dump RPPS : liens directs ANS", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/admin/rpps-dump/page.js"), "utf-8");

  it("Panel 'Liens directs ANS' présent", () => {
    expect(src).toContain("Liens directs ANS");
  });

  it("Lien d'extraction publique", () => {
    expect(src).toContain("annuaire.sante.fr/web/site-pro/extractions-publiques");
    expect(src).toContain("Ouvrir la page d'extractions ANS");
  });

  it("Lien direct vers le CSV ZIP (telechargerCNOM)", () => {
    expect(src).toContain("telechargerCNOM");
    expect(src).toContain("Télécharger PS_LibreAcces");
  });
});

describe("0.56.14 - Google Reviews sync : diagnostic enrichi", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/google-reviews/sync/route.js"), "utf-8");

  it("Parse le JSON du body d'erreur", () => {
    expect(src).toContain("JSON.parse(detailRaw)");
  });

  it("Hint sur API_KEY manquante", () => {
    expect(src).toContain("GOOGLE_PLACES_API_KEY");
  });

  it("Hint sur fonction non déployée (404)", () => {
    expect(src).toContain("supabase functions deploy sync-google-reviews");
  });

  it("Hint sur timeout", () => {
    expect(src).toMatch(/hint.*timeout|timeout.*hint/i);
  });

  it("Retour structuré avec error + hint + raw", () => {
    expect(src).toContain("hint,");
    expect(src).toContain("raw: detailRaw");
  });
});

describe("0.56.14 - Affichage hint dans page avis-google", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/admin/avis-google/page.js"), "utf-8");

  it("syncMsg accepte un champ hint", () => {
    expect(src).toContain("hint: data.hint");
  });

  it("Hint affiché en sous-bloc italique", () => {
    expect(src).toContain("syncMsg.hint");
    expect(src).toContain("ti-bulb");
  });
});
