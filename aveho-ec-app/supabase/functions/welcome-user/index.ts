// Edge Function Supabase — Email de bienvenue après finalisation inscription
// Déploiement : supabase functions deploy welcome-user
// Secrets requis : RESEND_API_KEY, SITE_URL
//
// Appelée depuis app/inscription/[token]/page.js après accept_invitation OK
//
// Body attendu :
//   { email, prenom, nom, role, structure }

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { email, prenom, nom, role, structure } = await req.json();

    const siteUrl = Deno.env.get("SITE_URL") || "https://aveho-ec-app.vercel.app";
    const html = welcomeTemplate({ prenom, nom, role, structure, siteUrl });

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Aveho EC <onboarding@resend.dev>",
        to: [email],
        subject: `Bienvenue dans Aveho EC, ${prenom} !`,
        html,
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      console.warn("[welcome-user] Resend a échoué :", r.status, txt);
      // On n'échoue pas hard : le user a son compte créé, juste le mail qui rate
      return new Response(JSON.stringify({ ok: false, warn: "Email non envoyé", detail: txt }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
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

function welcomeTemplate({ prenom, nom, role, structure, siteUrl }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Bienvenue dans Aveho EC</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f4f7fa;color:#2a3a48">
  <div style="max-width:600px;margin:0 auto;background:#fff">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#142131 0%,#185FA5 50%,#7CC8C8 100%);padding:36px 28px;text-align:center;color:#fff">
      <div style="font-size:11px;letter-spacing:3px;font-weight:700;color:#cfe4f5;margin-bottom:8px">INSCRIPTION FINALISÉE 🎉</div>
      <div style="font-size:30px;font-weight:600;letter-spacing:2px;margin-bottom:8px">a<span style="color:#7CC8C8">v</span>eho</div>
      <h1 style="font-size:22px;font-weight:700;margin:14px 0 4px">Bienvenue ${prenom || ""} !</h1>
      <p style="margin:0;font-size:14px;color:#cfe4f5">Votre compte est désormais actif</p>
    </div>

    <!-- Body -->
    <div style="padding:28px 28px 18px">
      <p style="font-size:15px;line-height:1.6;color:#2a3a48;margin:0 0 18px">
        Bonjour <b>${prenom || ""} ${nom || ""}</b>,
      </p>
      <p style="font-size:14px;line-height:1.65;color:#2a3a48;margin:0 0 18px">
        Félicitations, votre inscription à Aveho EC pour <b>${structure || "votre établissement"}</b> est finalisée.
        Vous pouvez désormais accéder à votre Espace Collectivité avec votre email et le mot de passe que vous venez de créer.
      </p>

      <div style="background:#eef9ef;border:1px solid #bfe2bf;border-radius:10px;padding:14px 18px;margin:0 0 22px">
        <div style="font-size:11px;letter-spacing:2px;font-weight:700;color:#2e6f33;margin-bottom:6px">VOTRE PROFIL</div>
        <div style="font-size:13px;color:#2a3a48;line-height:1.7">
          <div><b>Rôle :</b> <span style="background:#185FA522;color:#185FA5;padding:2px 8px;border-radius:6px;font-weight:600;font-size:12px">${role || "Utilisateur"}</span></div>
          <div style="margin-top:6px"><b>Établissement :</b> ${structure || "—"}</div>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0">
        <a href="${siteUrl}/accueil" style="display:inline-block;background:linear-gradient(135deg,#142131,#185FA5);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
          → Accéder à mon espace
        </a>
      </div>

      <!-- Conseils -->
      <div style="border-top:1px solid #e3e9ee;padding-top:18px;margin-top:18px">
        <h2 style="font-size:14px;color:#142131;font-weight:700;margin:0 0 10px">
          🚀 Premiers pas
        </h2>
        <ul style="font-size:13px;line-height:1.7;color:#2a3a48;padding-left:20px;margin:0">
          <li>Complétez votre <a href="${siteUrl}/profil" style="color:#185FA5;font-weight:600;text-decoration:none">profil</a> et vos préférences de notifications</li>
          <li>Sur mobile, activez la <b>connexion par empreinte digitale</b> pour plus de rapidité (paramètres → sécurité)</li>
          <li>Installez l'application en tant que <b>PWA</b> sur votre téléphone pour un accès rapide</li>
          <li>Découvrez les nouveautés sur la page <a href="${siteUrl}/changelog" style="color:#185FA5;font-weight:600;text-decoration:none">Changelog</a></li>
        </ul>
      </div>

      <!-- Sécurité -->
      <div style="background:#fff8ec;border:1px solid #f0d59f;border-radius:8px;padding:12px 16px;margin-top:22px">
        <div style="font-size:12px;color:#7a4f15;line-height:1.55">
          🔒 <b>Sécurité :</b> Ne partagez jamais votre mot de passe.
          Aveho ne vous le demandera jamais par téléphone ou par mail.
          En cas de doute, contactez votre administrateur.
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#142131;color:#8a98a8;padding:18px 28px;text-align:center;font-size:11px">
      <p style="margin:0">Aveho — Espace Collectivité</p>
      <p style="margin:4px 0 0">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>

  </div>
</body>
</html>`;
}
