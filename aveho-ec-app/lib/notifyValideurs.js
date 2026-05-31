// =============================================================
//  lib/notifyValideurs.js
//  Alpha 0.53.0 (BC) — Notifie par email tous les valideurs d'achat
//  quand un achat passe au statut "À valider"
// =============================================================
export async function notifyValideurs(supabase, { structureId, achat, demandeurEmail }) {
  if (!structureId || !achat) return { sent: 0, errors: [] };

  try {
    const { data: members, error } = await supabase
      .from("membres_structure")
      .select("user_id, role_id, roles(nom, droits)")
      .eq("structure_id", structureId);
    if (error || !members) return { sent: 0, errors: [error?.message] };

    const valideurIds = members
      .filter(m => {
        const droits = m.roles?.droits;
        if (!droits) return false;
        const droitsStr = JSON.stringify(droits);
        return droitsStr.includes("valider_achat") || m.roles?.nom === "Administrateur";
      })
      .map(m => m.user_id);
    if (valideurIds.length === 0) return { sent: 0, errors: [] };

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, nom, prenom")
      .in("id", valideurIds);
    const emails = (profiles || []).map(p => p.email).filter(Boolean);
    if (emails.length === 0) return { sent: 0, errors: [] };

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const subject = `[Aveho] Commande à valider — ${achat.numero}`;
    const body_html = `
      <p>Bonjour,</p>
      <p>Une nouvelle commande nécessite votre validation :</p>
      <table style="border-collapse:collapse;margin:14px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#6c7a89"><b>Numéro</b></td><td>${escapeHtml(achat.numero)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6c7a89"><b>Demandeur</b></td><td>${escapeHtml(demandeurEmail || "—")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6c7a89"><b>Motif</b></td><td>${escapeHtml(achat.motif || "—")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6c7a89"><b>Fournisseur</b></td><td>${escapeHtml(achat.fournisseur || "—")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6c7a89"><b>Budget estimé</b></td><td>${achat.budget_estime ? `${achat.budget_estime} €` : "—"}</td></tr>
      </table>
    `.trim();
    const body_text = [
      "Bonjour,", "",
      "Une nouvelle commande nécessite votre validation :", "",
      `• Numéro : ${achat.numero}`,
      `• Demandeur : ${demandeurEmail || "—"}`,
      `• Motif : ${achat.motif || "—"}`,
      `• Fournisseur : ${achat.fournisseur || "—"}`,
      `• Budget estimé : ${achat.budget_estime ? `${achat.budget_estime} €` : "—"}`,
      "",
      "Connectez-vous à l'Espace Pro pour la valider.",
      "", "— L'équipe Aveho",
    ].join("\n");

    const { data, error: invokeErr } = await supabase.functions.invoke("send-email", {
      body: {
        structure_id: structureId,
        target_emails: emails,
        event_type: "validation_achat",
        subject, body_html, body_text,
        cta_label: "Voir la commande",
        cta_url: `${origin}/achats`,
      },
    });
    if (invokeErr) return { sent: 0, errors: [invokeErr.message] };
    return { sent: data?.sent || emails.length, errors: data?.errors || [] };
  } catch (e) {
    return { sent: 0, errors: [e?.message || "Erreur inconnue"] };
  }
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
