// Edge Function Supabase — Création d'utilisateur + email de bienvenue
// Déploiement : supabase functions deploy invite-user
// Secrets requis : SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SITE_URL
//
// Appel depuis l'app (page Utilisateurs) :
//   await supabase.functions.invoke("invite-user", { body: { email, nom, role, etablissements } })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TEMPLATE = `<!-- coller ici le contenu de _email-template.html, ou le charger -->`;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const { email, nom, collectivite, role, etablissements } = await req.json();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) créer/inviter l'utilisateur (génère un lien d'activation)
    const { data: invite, error: e1 } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: (Deno.env.get("SITE_URL") || "") + "/accueil",
      data: { nom_affiche: nom },
    });
    if (e1) throw e1;

    // 2) construire le mail
    const etabHtml = (etablissements || [])
      .map((e: string) => `<div style="display:inline-block;background:#eef6f6;color:#2a5a5a;border:1px solid #cfe6e6;border-radius:20px;padding:5px 14px;font-size:13px;font-weight:600;margin:3px 4px 3px 0">🏥 ${e}</div>`)
      .join("");
    const link = invite?.user?.confirmation_sent_at
      ? (Deno.env.get("SITE_URL") || "") + "/accueil"
      : (Deno.env.get("SITE_URL") || "");

    const html = TEMPLATE
      .replace(/{{NOM}}/g, nom || "")
      .replace(/{{COLLECTIVITE}}/g, collectivite || "votre collectivité")
      .replace(/{{ROLE}}/g, role || "Utilisateur")
      .replace(/{{ETABLISSEMENTS}}/g, etabHtml || "—")
      .replace(/{{LIEN}}/g, link);

    // 3) envoyer via Resend
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Aveho EC <onboarding@resend.dev>", // à remplacer par ton domaine vérifié
        to: [email],
        subject: "Bienvenue sur votre Espace Collectivité Aveho",
        html,
      }),
    });
    if (!r.ok) throw new Error("Envoi email échoué: " + (await r.text()));

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
});
