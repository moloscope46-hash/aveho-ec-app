// =============================================================
//  app/api/google-reviews/sync/route.js (Alpha 0.56.6)
//
//  Déclenche manuellement l'Edge Function sync-google-reviews.
//  Utilisé depuis la page admin /admin/avis-google.
// =============================================================

// 0.57.10 : imports retirés (createClient non utilisés)

import { requireAuth, checkRateLimit } from "../../../../lib/apiAuth";
import { safeError } from "../../../../lib/safeError";  // 0.57.28

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return Response.json({ ok: false, error: "Config Supabase manquante" }, { status: 500 });
  }

  let body = {};
  try { body = await req.json(); } catch (_) { /* empty body OK */ }

  // 0.57.4 : auth + rate limit obligatoire
  const authCheck = await requireAuth(req);
  if (!authCheck.ok) return authCheck.response;
  const { user, supabase } = authCheck;
  const rate = checkRateLimit(user.id, { maxRequests: 5, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  // 0.57.26 : validation schema
  const { validate } = await import("../../../../lib/validateInput");
  const errors = validate(body, {
    etablissement_id: { type: "uuid" },
    trigger_source: { type: "string", maxLen: 50 },
  });
  if (errors.length > 0) {
    return Response.json(
      { ok: false, error: "Body invalide", details: errors },
      { status: 400 }
    );
  }

  // Appelle l'Edge Function
  try {
    const { data, error } = await supabase.functions.invoke("sync-google-reviews", {
      body: {
        trigger_source: "manual",
        etablissement_id: body.etablissement_id || null,
      },
    });

    // Si erreur edge, lire le body pour debug clair
    if (error) {
      let detail = error.message || "Edge function error";
      let detailRaw = null;
      try {
        if (error.context?.body) {
          const reader = error.context.body.getReader();
          const decoder = new TextDecoder();
          const chunks = [];
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            chunks.push(decoder.decode(value, { stream: true }));
          }
          detailRaw = chunks.join("");
          // 0.56.14 : essayer de parser le JSON pour un message clair
          try {
            const parsed = JSON.parse(detailRaw);
            detail = parsed.error || parsed.message || detailRaw;
          } catch {
            detail = detailRaw;
          }
        }
      } catch (_) { /* ignore */ }

      // 0.56.14 : diagnostic enrichi avec hints sur les causes courantes
      let hint = null;
      if (/google_places_api_key|api.key|missing key/i.test(detail)) {
        hint = "Variable GOOGLE_PLACES_API_KEY non configurée côté Edge Function. Va dans Supabase → Settings → Edge Functions → Secrets et ajoute-la.";
      } else if (/not.found|404/i.test(detail)) {
        hint = "L'Edge Function sync-google-reviews n'est peut-être pas déployée. Lance : supabase functions deploy sync-google-reviews";
      } else if (/timeout/i.test(detail)) {
        hint = "Timeout — beaucoup d'établissements à synchroniser ? Lance avec etablissement_id spécifique pour tester.";
      }

      return Response.json({
        ok: false,
        error: detail,
        hint,
        raw: detailRaw,
      }, { status: 502 });
    }

    return Response.json({ ok: true, ...data });
  } catch (e) {
    // 0.57.28 : safeError → message générique en prod
    return Response.json({
      ...safeError(e, "Erreur Google Reviews sync"),
      hint: "Vérifie les logs Vercel",
    }, { status: 500 });
  }
}
