// =============================================================
//  supabase/functions/sync-google-reviews/index.ts (Alpha 0.56.6)
//
//  Edge Function qui synchronise les avis Google pour tous les
//  établissements ayant un google_place_id renseigné.
//
//  Appelée :
//    - Par le cron Supabase (toutes les 6h)
//    - Manuellement depuis l'admin /admin/avis-google
//
//  ENV VARIABLES REQUISES (Supabase Dashboard > Edge Functions > Secrets) :
//    - GOOGLE_PLACES_API_KEY : clé Google Places (AIzaSy…)
//    - SUPABASE_URL : URL Supabase
//    - SUPABASE_SERVICE_ROLE_KEY : clé service_role (pas anon)
//
//  Notes :
//    - L'API Google Places Details retourne max 5 reviews (limite Google)
//    - On les upserte via RPC pour gérer les doublons proprement
// =============================================================

// @ts-nocheck — Deno env, types non disponibles ici
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, requireAuth, requireCronSecret } from "../_shared/auth.ts";

const GOOGLE_API = "https://maps.googleapis.com/maps/api/place/details/json";

// 0.57.33 : check CRON_SECRET (si appel scheduled) OU requireAuth (si appel admin UI)
Deno.serve(async (req) => {
  const t0 = Date.now();
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: corsHeaders });
  }

  // Parsing body (optionnel — peut être appelé sans body depuis cron)
  let body = {};
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      body = await req.json();
    }
  } catch (_) { /* ignore */ }

  // 0.57.33 : double mode d'auth
  // Si appel admin UI (trigger_source === "manual" ou "admin") → requireAuth
  // Sinon (cron scheduled) → CRON_SECRET
  const triggerSource = body.trigger_source || "manual";
  const isAdminCall = triggerSource === "manual" || triggerSource === "admin";

  if (isAdminCall) {
    const authResult = await requireAuth(req);
    if (authResult.errorResponse) return authResult.errorResponse;
  } else {
    const cronCheck = requireCronSecret(req);
    if (cronCheck) return cronCheck;
  }

  const etabIdFilter = body.etablissement_id || null;  // optionnel : sync 1 seul établissement

  const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!GOOGLE_KEY) return jsonError("GOOGLE_PLACES_API_KEY manquante", 500);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return jsonError("Config Supabase manquante", 500);

  // Client service_role : bypass RLS
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) Liste des établissements à synchroniser
  let query = sb.from("etablissements")
    .select("id, nom, structure_id, google_place_id")
    .not("google_place_id", "is", null);

  if (etabIdFilter) query = query.eq("id", etabIdFilter);

  const { data: etabs, error: errFetch } = await query;

  if (errFetch) return jsonError(`Erreur fetch etablissements : ${errFetch.message}`, 500);

  if (!etabs || etabs.length === 0) {
    await logRun(sb, {
      trigger_source: triggerSource,
      etablissements_total: 0,
      etablissements_ok: 0,
      etablissements_errors: 0,
      nouveaux_avis: 0,
      duration_ms: Date.now() - t0,
      details: { message: "Aucun établissement avec google_place_id" },
    });
    return Response.json({
      ok: true,
      message: "Aucun établissement à synchroniser",
      etablissements_total: 0,
    });
  }

  let okCount = 0;
  let errCount = 0;
  let totalNouveaux = 0;
  const perEtab = [];

  for (const e of etabs) {
    const detail = { etablissement_id: e.id, nom: e.nom, place_id: e.google_place_id };
    try {
      const fields = [
        "name", "rating", "user_ratings_total",
        "reviews",
      ].join(",");
      const url = `${GOOGLE_API}?place_id=${encodeURIComponent(e.google_place_id)}&fields=${fields}&language=fr&key=${GOOGLE_KEY}`;

      const resp = await fetch(url);
      if (!resp.ok) {
        detail.error = `Google API HTTP ${resp.status}`;
        detail.status = "api_error";
        await sb.from("etablissements").update({
          google_sync_status: "api_error",
          google_last_sync_at: new Date().toISOString(),
        }).eq("id", e.id);
        errCount++;
        perEtab.push(detail);
        continue;
      }

      const data = await resp.json();

      if (data.status === "OVER_QUERY_LIMIT") {
        detail.error = "Rate limit Google atteint";
        detail.status = "rate_limited";
        await sb.from("etablissements").update({
          google_sync_status: "rate_limited",
          google_last_sync_at: new Date().toISOString(),
        }).eq("id", e.id);
        errCount++;
        perEtab.push(detail);
        // Arrêter pour ne pas brûler le quota
        break;
      }

      if (data.status !== "OK") {
        detail.error = `Google status ${data.status}`;
        detail.status = "api_error";
        await sb.from("etablissements").update({
          google_sync_status: "api_error",
          google_last_sync_at: new Date().toISOString(),
        }).eq("id", e.id);
        errCount++;
        perEtab.push(detail);
        continue;
      }

      const result = data.result || {};
      const reviews = result.reviews || [];

      // Update rating moyen + nb avis
      await sb.from("etablissements").update({
        google_rating: result.rating || null,
        google_ratings_count: result.user_ratings_total || 0,
        google_sync_status: "ok",
        google_last_sync_at: new Date().toISOString(),
      }).eq("id", e.id);

      // Préparer les avis pour upsert
      const avisPayload = reviews.map(r => ({
        google_review_id: r.author_name ? `${r.author_name}_${r.time}` : null,
        author_name: r.author_name,
        author_url: r.author_url,
        author_profile_photo_url: r.profile_photo_url,
        language: r.language || "fr",
        rating: r.rating,
        relative_time_description: r.relative_time_description,
        publish_time: r.time ? new Date(r.time * 1000).toISOString() : null,
        text_content: r.text || null,
        text_translated: r.translated || null,
        reply_text: null,
        reply_publish_time: null,
        raw_payload: r,
      }));

      let nouveaux = 0;
      if (avisPayload.length > 0) {
        const { data: upsertResult, error: errUpsert } = await sb.rpc("upsert_avis_google_batch", {
          p_etablissement_id: e.id,
          p_structure_id: e.structure_id,
          p_avis: avisPayload,
        });
        if (errUpsert) {
          detail.error = `RPC upsert : ${errUpsert.message}`;
          errCount++;
          perEtab.push(detail);
          continue;
        }
        nouveaux = upsertResult || 0;
        totalNouveaux += nouveaux;
      }

      detail.status = "ok";
      detail.rating = result.rating;
      detail.avis_total = result.user_ratings_total;
      detail.avis_recus = reviews.length;
      detail.avis_upsert = nouveaux;
      okCount++;
      perEtab.push(detail);
    } catch (err) {
      detail.error = err.message;
      detail.status = "exception";
      errCount++;
      perEtab.push(detail);
    }

    // Petit délai pour ménager Google
    await new Promise(r => setTimeout(r, 200));
  }

  await logRun(sb, {
    trigger_source: triggerSource,
    etablissements_total: etabs.length,
    etablissements_ok: okCount,
    etablissements_errors: errCount,
    nouveaux_avis: totalNouveaux,
    duration_ms: Date.now() - t0,
    details: { per_etab: perEtab },
  });

  return Response.json({
    ok: true,
    trigger_source: triggerSource,
    etablissements_total: etabs.length,
    etablissements_ok: okCount,
    etablissements_errors: errCount,
    nouveaux_avis: totalNouveaux,
    duration_ms: Date.now() - t0,
  });
});

async function logRun(sb, payload) {
  try {
    await sb.from("google_sync_logs").insert(payload);
  } catch (_) { /* silent */ }
}

function jsonError(msg, status = 500) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
