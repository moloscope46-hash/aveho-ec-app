// Edge Function Supabase — Invitation utilisateur (mail avec lien custom)
// Déploiement : supabase functions deploy invite-user
// Secrets requis : RESEND_API_KEY (+ optionnel : RESEND_FROM)
//
// Alpha 0.55.12 : utilise le token custom de la table invitations
// Alpha 0.55.53 : diagnostic complet (retour détaillé Resend) + détection mode test
// Alpha 0.56.11 : CORS preflight + headers sur toutes les réponses
//
// Body attendu :
//   { email, nom, collectivite, role, etablissements, inviteLink,
//     rpps_profession?, rpps_specialite?, rpps?, lock_assignment? }

// Headers CORS appliqués sur TOUTES les réponses (preflight OPTIONS + réponses POST)
// 0.57.31 : import du helper de sécurité partagé (CORS + auth)
import { buildCorsHeaders, requireAuth } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  // 0.57.31 : CORS restrictif (only Aveho EC origins, plus de "*")
  const CORS_HEADERS = buildCorsHeaders(req);
  const JSON_HEADERS = { "Content-Type": "application/json", ...CORS_HEADERS };

  // Preflight CORS (le navigateur envoie OPTIONS avant POST cross-origin)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  // 0.57.31 : auth obligatoire (sinon vector de phishing massif :
  // un attaquant peut faire envoyer "Inscrivez-vous chez Aveho" depuis
  // notre serveur Resend avec son propre inviteLink malveillant)
  const authResult = await requireAuth(req);
  if (authResult.errorResponse) return authResult.errorResponse;

  try {
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) {
      // 0.55.53 : message clair si la clé Resend n'est pas configurée
      return new Response(JSON.stringify({
        ok: false,
        error: "RESEND_API_KEY non configurée côté Edge Function. Va dans Supabase → Settings → Edge Functions → Secrets et ajoute RESEND_API_KEY (ta clé sur resend.com/api-keys).",
        diagnostic: "missing_resend_key",
      }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const { email, nom, collectivite, role, etablissements, inviteLink,
            rpps_profession, rpps_specialite, rpps, lock_assignment } = await req.json();

    if (!inviteLink) {
      return new Response(JSON.stringify({
        ok: false, error: "inviteLink manquant (doit être fourni par l'app appelante)",
        diagnostic: "missing_invite_link",
      }), { status: 400, headers: JSON_HEADERS });
    }

    if (!email) {
      return new Response(JSON.stringify({
        ok: false, error: "email destinataire manquant",
        diagnostic: "missing_email",
      }), { status: 400, headers: JSON_HEADERS });
    }

    const etabHtml = (etablissements || [])
      .map((e: string) => `<div style="display:inline-block;background:#eef6f6;color:#2a5a5a;border:1px solid #cfe6e6;border-radius:20px;padding:5px 14px;font-size:13px;font-weight:600;margin:3px 4px 3px 0">🏥 ${e}</div>`)
      .join("");

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

    // 0.55.53 : adresse expéditeur configurable via secret RESEND_FROM
    // Par défaut : onboarding@resend.dev (uniquement vers le mail propriétaire de la clé Resend en mode test)
    // Recommandé : configurer un domaine vérifié sur resend.com puis RESEND_FROM="Aveho EC <noreply@tondomaine.fr>"
    const fromAddress = Deno.env.get("RESEND_FROM") || "Aveho EC <onboarding@resend.dev>";

    const t0 = Date.now();
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: rpps_profession
          ? `Invitation Aveho EC — ${rpps_profession}`
          : `Votre invitation à rejoindre Aveho EC`,
        html,
      }),
    });

    const duration_ms = Date.now() - t0;

    if (!r.ok) {
      const txt = await r.text();
      let parsed: any = null;
      try { parsed = JSON.parse(txt); } catch {}

      // 0.55.53 : décodage des erreurs Resend courantes
      let humanError = `Resend HTTP ${r.status}`;
      let diagnostic = "resend_http_error";

      if (parsed?.name === "validation_error" && parsed?.message?.includes("testing emails")) {
        humanError = "Resend mode test : tu ne peux envoyer qu'à l'email propriétaire du compte Resend. Pour envoyer à n'importe qui, vérifie un domaine sur resend.com/domains puis configure le secret RESEND_FROM avec une adresse de ce domaine.";
        diagnostic = "resend_test_mode_restricted";
      } else if (r.status === 401 || r.status === 403) {
        humanError = "Clé Resend invalide ou expirée. Régénère-la sur resend.com/api-keys et remets-la dans Supabase → Settings → Edge Functions → Secrets.";
        diagnostic = "resend_invalid_key";
      } else if (r.status === 429) {
        humanError = "Quota Resend dépassé (3000 mails/mois sur le plan gratuit). Attends ou upgrade.";
        diagnostic = "resend_rate_limit";
      } else if (parsed?.message) {
        humanError = `Resend : ${parsed.message}`;
      }

      return new Response(JSON.stringify({
        ok: false,
        error: humanError,
        diagnostic,
        resend_status: r.status,
        resend_body: parsed || txt.slice(0, 500),
        from_address: fromAddress,
        to: email,
        duration_ms,
      }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const resendData = await r.json();
    return new Response(JSON.stringify({
      ok: true,
      resend_id: resendData?.id,
      from_address: fromAddress,
      to: email,
      duration_ms,
    }), {
      headers: JSON_HEADERS,
    });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: String(e?.message || e),
      diagnostic: "exception",
    }), {
      status: 500,
      headers: JSON_HEADERS,
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
