// =============================================================
//  /api/place — Proxy Google Places API + logging usage
//  Alpha 0.55.39
// =============================================================

// 0.57.10 : imports retirés (createClient non utilisés)

import { requireAuth, checkRateLimit } from "../../../lib/apiAuth";

const KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const dynamic = "force-dynamic";

async function logCall(req, status, httpStatus, errorMessage, durationMs, endpoint) {
  // Best-effort logging — ne bloque jamais la réponse
  if (!SUPABASE_URL || !SUPABASE_ANON) return;
  try {
    // 0.57.4 : auth + rate limit obligatoire

    const authCheck = await requireAuth(req);

    if (!authCheck.ok) return authCheck.response;

    const { user, supabase } = authCheck;

    const rate = checkRateLimit(user.id, { maxRequests: 30, windowMs: 60_000 });

    if (!rate.ok) return rate.response;
    await supabase.rpc("log_api_call", {
      p_api_name: "google_places",
      p_endpoint: endpoint,
      p_status: status,
      p_http_status: httpStatus,
      p_error_message: errorMessage,
      p_duration_ms: durationMs,
    });
  } catch (_) {}
}

export async function GET(req) {
  const t0 = Date.now();
  const { searchParams } = new URL(req.url);
  const nom = (searchParams.get("nom") || "").trim();
  const adresse = (searchParams.get("adresse") || "").trim();

  if (!nom) {
    return Response.json({ ok: false, error: "nom requis" }, { status: 400 });
  }

  // Sans clé : retourne null
  if (!KEY) {
    logCall(req, "no_key", null, null, Date.now() - t0, "no_key");
    return Response.json({
      ok: true,
      place: null,
      note: "GOOGLE_PLACES_API_KEY non configurée",
    });
  }

  try {
    const query = adresse ? `${nom}, ${adresse}` : nom;
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry&key=${KEY}`;

    const findRes = await fetch(findUrl, { next: { revalidate: 86400 } });
    if (!findRes.ok) {
      logCall(req, "error", findRes.status, `find http ${findRes.status}`, Date.now() - t0, "findplacefromtext");
      return Response.json({ ok: false, error: `Find HTTP ${findRes.status}` }, { status: 200 });
    }
    const findData = await findRes.json();
    if (findData.status !== "OK" || !findData.candidates?.length) {
      logCall(req, "ok", 200, null, Date.now() - t0, "findplacefromtext_no_result");
      return Response.json({ ok: true, place: null, status: findData.status });
    }

    const placeId = findData.candidates[0].place_id;

    const fields = [
      "photos", "rating", "user_ratings_total",
      "opening_hours", "formatted_phone_number",
      "website", "url", "name", "formatted_address",
    ].join(",");
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=fr&key=${KEY}`;

    const detRes = await fetch(detailsUrl, { next: { revalidate: 86400 } });
    if (!detRes.ok) {
      logCall(req, "error", detRes.status, `details http ${detRes.status}`, Date.now() - t0, "details");
      return Response.json({ ok: false, error: `Details HTTP ${detRes.status}` }, { status: 200 });
    }
    const detData = await detRes.json();
    if (detData.status !== "OK") {
      logCall(req, "ok", 200, null, Date.now() - t0, "details_no_result");
      return Response.json({ ok: true, place: null, status: detData.status });
    }
    const d = detData.result || {};

    let photoUrl = null;
    if (d.photos?.[0]?.photo_reference) {
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${d.photos[0].photo_reference}&key=${KEY}`;
    }

    logCall(req, "ok", 200, null, Date.now() - t0, "details");
    return Response.json({
      ok: true,
      place: {
        placeId,
        photoUrl,
        rating: d.rating || 0,
        userRatingsTotal: d.user_ratings_total || 0,
        openingHours: d.opening_hours?.weekday_text || [],
        openNow: d.opening_hours?.open_now ?? null,
        phone: d.formatted_phone_number || null,
        website: d.website || null,
        googleMapsUrl: d.url || null,
        nom: d.name || nom,
        adresse: d.formatted_address || adresse,
      },
    });
  } catch (e) {
    logCall(req, "error", 500, e.message, Date.now() - t0, "exception");
    return Response.json({ ok: false, error: e.message, place: null }, { status: 200 });
  }
}
