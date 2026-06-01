// =============================================================
//  app/api/google-reviews/sync/route.js (Alpha 0.56.6)
//
//  Déclenche manuellement l'Edge Function sync-google-reviews.
//  Utilisé depuis la page admin /admin/avis-google.
// =============================================================

import { createClient } from "@supabase/supabase-js";

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

  // Token utilisateur pour appeler l'Edge Function avec ses credentials
  const authHeader = req.headers.get("authorization") || "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });

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
          detail = chunks.join("");
        }
      } catch (_) { /* ignore */ }
      return Response.json({ ok: false, error: detail }, { status: 502 });
    }

    return Response.json({ ok: true, ...data });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
