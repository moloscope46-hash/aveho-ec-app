// =============================================================
//  Tests unitaires — 0.55.53
//  Fix invitation mail : capture erreur Resend + diagnostic
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.53 - Edge Function invite-user v2 diagnostic", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "supabase/functions/invite-user/index.ts"), "utf-8");

  it("Détecte RESEND_API_KEY manquante", () => {
    expect(src).toContain('Deno.env.get("RESEND_API_KEY")');
    expect(src).toContain("missing_resend_key");
  });

  it("Support secret RESEND_FROM configurable", () => {
    expect(src).toContain('Deno.env.get("RESEND_FROM")');
  });

  it("Décode l'erreur mode test Resend (validation_error)", () => {
    expect(src).toContain("resend_test_mode_restricted");
    expect(src).toContain("testing emails");
  });

  it("Détecte clé invalide (401/403)", () => {
    expect(src).toContain("resend_invalid_key");
  });

  it("Détecte rate limit Resend (429)", () => {
    expect(src).toContain("resend_rate_limit");
    expect(src).toContain("3000 mails/mois");
  });

  it("Retour enrichi : diagnostic + resend_status + from/to + body", () => {
    expect(src).toContain("diagnostic:");
    expect(src).toContain("resend_status:");
    expect(src).toContain("resend_body");
    expect(src).toContain("from_address");
  });

  it("Retour succès : resend_id", () => {
    expect(src).toContain("resend_id:");
  });

  it("Liens documentation dans messages d'erreur", () => {
    expect(src).toContain("resend.com");
  });
});

describe("0.55.53 - App utilisateurs : capture vraie erreur invoke", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/utilisateurs/page.js"), "utf-8");

  it("Récupère error + data de invoke()", () => {
    expect(src).toContain("data: invokeData, error: invokeErr");
  });

  it("Lit le body de l'erreur (FunctionsHttpError)", () => {
    expect(src).toContain("invokeErr.context?.body");
    expect(src).toContain("TextDecoder");
  });

  it("Variable mailWarning passée à la popup", () => {
    expect(src).toContain("mailWarning");
    expect(src).toContain("createdInviteLink.mailWarning");
  });

  it("Popup change couleur si mail échoué (ambre au lieu de vert)", () => {
    expect(src).toContain("ti-alert-triangle");
    expect(src).toContain("Invitation créée — mail NON envoyé");
  });

  it("Bandeau d'erreur avec solution (envoyer manuellement)", () => {
    expect(src).toContain("envoie-le manuellement");
  });
});

describe("0.55.53 - Page admin /admin/mail-diagnostic", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/admin/mail-diagnostic/page.js"), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/admin/mail-diagnostic/page.js"))).toBe(true);
  });

  it("Invoke invite-user avec email custom", () => {
    expect(src).toContain('supabase.functions.invoke("invite-user"');
  });

  it("Décode le body de l'erreur Edge", () => {
    expect(src).toContain("error.context?.body");
  });

  it("Affiche diagnostic + resend_status + from/to", () => {
    expect(src).toContain("Diagnostic");
    expect(src).toContain("HTTP Resend");
    expect(src).toContain("From");
  });

  it("Pédagogie : liste des causes courantes + solutions", () => {
    expect(src).toContain("missing_resend_key");
    expect(src).toContain("resend_test_mode_restricted");
    expect(src).toContain("Vérifie les SPAM");
  });

  it("Liens vers resend.com/api-keys et resend.com/domains", () => {
    expect(src).toContain("resend.com/api-keys");
    expect(src).toContain("resend.com/domains");
  });
});

describe("0.55.53 - Menu admin inclut diagnostic mail", () => {
  it("Entrée /admin/mail-diagnostic", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
    expect(src).toContain("/admin/mail-diagnostic");
    expect(src).toContain("Diagnostic envoi mail");
  });
});
