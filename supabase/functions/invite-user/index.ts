// Edge Function Supabase — Invitation utilisateur (mail avec lien custom)
// Déploiement : supabase functions deploy invite-user
// Secrets requis : RESEND_API_KEY, SITE_URL
//
// Alpha 0.55.12 : utilise le token custom de la table invitations
//   (au lieu de admin.auth.admin.inviteUserByEmail qui créait un user
//   incomplet directement dans auth.users). Le user n'est créé qu'à
//   la finalisation de l'inscription via /inscription/[token].
//
// Body attendu :
//   { email, nom, collectivite, role, etablissements, inviteLink }

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { email, nom, collectivite, role, etablissements, inviteLink, rpps_profession, rpps_specialite, rpps, lock_assignment } = await req.json();

    if (!inviteLink) {
      throw new Error("inviteLink manquant (doit être fourni par l'app appelante)");
    }

    const etabHtml = (etablissements || [])
      .map((e: string) => `<div style="display:inline-block;background:#eef6f6;color:#2a5a5a;border:1px solid #cfe6e6;border-radius:20px;padding:5px 14px;font-size:13px;font-weight:600;margin:3px 4px 3px 0">🏥 ${e}</div>`)
      .join("");

    // 0.55.30 : bloc RPPS si renseigné
    const rppsHtml = rpps ? `
      <div style="background:#f3effa;border:1px solid #d6c9ec;border-radius:10px;padding:14px 18px;margin:16px 0">
        <div style="font-size:11px;color:#5a4a90;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">
          🩺 Identité professionnelle (RPPS)
        </div>
        ${rpps_profession ? `<div style="font-size:14px;color:#142131"><b>${rpps_profession}</b>${rpps_specialite ? ` · ${rpps_specialite}` : ""}</div>` : ""}
        <div style="font-size:12px;color:#5a4a90;margin-top:4px;font-family:Consolas,monospace">RPPS ${rpps}</div>
      </div>
    ` : "";

    const lockHtml = lock_assignment && etablissements?.length ? `
      <div style="background:#fff8ec;border:1px solid #f0d59f;border-radius:8px;padding:10px 14px;margin:12px 0;font-size:12px;color:#7a4f15">
        🔒 <b>Rattachement verrouillé :</b> votre rattachement aux établissements a été défini par votre administrateur et ne peut pas être modifié à l'inscription.
      </div>
    ` : "";

    const html = inviteTemplate({
      nom: nom || "",
      collectivite: collectivite || "votre collectivité",
      role: role || "Utilisateur",
      etabHtml,
      inviteLink,
      rppsHtml,
      lockHtml,
    });

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Aveho EC <onboarding@resend.dev>",
        to: [email],
        subject: rpps_profession
          ? `Invitation Aveho EC — ${rpps_profession}`
          : `Votre invitation à rejoindre Aveho EC`,
        html,
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      throw new Error("Envoi email échoué: " + txt);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function inviteTemplate({ nom, collectivite, role, etabHtml, inviteLink, rppsHtml, lockHtml }: any) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Invitation Aveho EC</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f4f7fa;color:#2a3a48">
  <div style="max-width:600px;margin:0 auto;background:#fff">
    <div style="background:linear-gradient(135deg,#142131 0%,#185FA5 50%,#7CC8C8 100%);padding:36px 28px;text-align:center;color:#fff">
      <div style="font-size:11px;letter-spacing:3px;font-weight:700;color:#cfe4f5;margin-bottom:8px">VOUS AVEZ ÉTÉ INVITÉ(E)</div>
      <div style="font-size:30px;font-weight:600;letter-spacing:2px;margin-bottom:8px">a<span style="color:#7CC8C8">v</span>eho</div>
      <h1 style="font-size:20px;font-weight:700;margin:14px 0 4px">Rejoignez ${collectivite}</h1>
      <p style="margin:0;font-size:13px;color:#cfe4f5">Espace Collectivité — gestion médicale & logistique</p>
    </div>
    <div style="padding:28px 28px 18px">
      <p style="font-size:15px;line-height:1.6;color:#2a3a48;margin:0 0 16px">Bonjour ${nom || ""},</p>
      <p style="font-size:14px;line-height:1.65;color:#2a3a48;margin:0 0 18px">
        Vous avez été invité(e) à rejoindre <b>${collectivite}</b> sur Aveho EC, la plateforme de gestion de matériel médical et de patients.
      </p>
      ${rppsHtml || ""}
      <div style="background:#eef9ef;border:1px solid #bfe2bf;border-radius:10px;padding:14px 18px;margin:0 0 14px">
        <div style="font-size:11px;letter-spacing:2px;font-weight:700;color:#2e6f33;margin-bottom:6px">VOTRE PROFIL</div>
        <div style="font-size:13px;color:#2a3a48;line-height:1.7">
          <div><b>Rôle :</b> <span style="background:#185FA522;color:#185FA5;padding:2px 8px;border-radius:6px;font-weight:600;font-size:12px">${role}</span></div>
          ${etabHtml ? `<div style="margin-top:8px"><b>Établissements :</b> ${etabHtml}</div>` : ""}
        </div>
      </div>
      ${lockHtml || ""}
      <div style="text-align:center;margin:24px 0">
        <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#142131,#185FA5);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
          → Finaliser mon inscription
        </a>
      </div>
      <p style="font-size:12px;color:#6c7a89;line-height:1.6;margin:18px 0 0;text-align:center">
        Ou copiez ce lien dans votre navigateur :<br/>
        <span style="font-family:Consolas,monospace;font-size:11px;word-break:break-all;color:#185FA5">${inviteLink}</span>
      </p>
      <div style="background:#fff8ec;border:1px solid #f0d59f;border-radius:8px;padding:12px 16px;margin-top:22px">
        <div style="font-size:12px;color:#7a4f15;line-height:1.55">
          ⏱ <b>Ce lien est valide pendant 7 jours.</b><br/>
          🔒 Lors de votre inscription, vous choisirez votre propre mot de passe — il ne sera jamais transmis par email.
        </div>
      </div>
    </div>
    <div style="background:#142131;color:#8a98a8;padding:18px 28px;text-align:center;font-size:11px">
      <p style="margin:0">Aveho — Espace Collectivité</p>
      <p style="margin:4px 0 0">Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.</p>
    </div>
  </div>
</body>
</html>`;
}
