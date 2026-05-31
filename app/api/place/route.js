// =============================================================
//  /api/place — Proxy Google Places API (sécurise la clé serveur)
//  Alpha 0.55.38
//
//  Query params : nom (requis), adresse (optionnel)
//  Réponse : { ok, place: { photoUrl, rating, userRatingsTotal,
//             openingHours[], phone, website, googleMapsUrl, placeId } }
//
//  Sans GOOGLE_PLACES_API_KEY → renvoie ok:true avec place:null
//  (l'app utilise alors son fallback gradient).
// =============================================================

const KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const nom = (searchParams.get("nom") || "").trim();
  const adresse = (searchParams.get("adresse") || "").trim();

  if (!nom) {
    return Response.json({ ok: false, error: "nom requis" }, { status: 400 });
  }

  // Sans clé : retourne null (fallback gradient côté client)
  if (!KEY) {
    return Response.json({
      ok: true,
      place: null,
      note: "GOOGLE_PLACES_API_KEY non configurée — utilisez le fallback gradient",
    });
  }

  try {
    // Étape 1 : findplacefromtext pour obtenir le place_id
    const query = adresse ? `${nom}, ${adresse}` : nom;
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry&key=${KEY}`;

    const findRes = await fetch(findUrl, { next: { revalidate: 86400 } });
    if (!findRes.ok) {
      return Response.json({ ok: false, error: `Find HTTP ${findRes.status}` }, { status: 200 });
    }
    const findData = await findRes.json();
    if (findData.status !== "OK" || !findData.candidates?.length) {
      return Response.json({ ok: true, place: null, status: findData.status });
    }

    const placeId = findData.candidates[0].place_id;

    // Étape 2 : details pour photo, horaires, rating, etc.
    const fields = [
      "photos", "rating", "user_ratings_total",
      "opening_hours", "formatted_phone_number",
      "website", "url", "name", "formatted_address",
    ].join(",");
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=fr&key=${KEY}`;

    const detRes = await fetch(detailsUrl, { next: { revalidate: 86400 } });
    if (!detRes.ok) {
      return Response.json({ ok: false, error: `Details HTTP ${detRes.status}` }, { status: 200 });
    }
    const detData = await detRes.json();
    if (detData.status !== "OK") {
      return Response.json({ ok: true, place: null, status: detData.status });
    }
    const d = detData.result || {};

    // URL photo via photoreference
    let photoUrl = null;
    if (d.photos?.[0]?.photo_reference) {
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${d.photos[0].photo_reference}&key=${KEY}`;
    }

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
    return Response.json({ ok: false, error: e.message, place: null }, { status: 200 });
  }
}
