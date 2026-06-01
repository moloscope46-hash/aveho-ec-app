// =============================================================
//  app/api/prescriptions/verify-rpps/route.js (Alpha 0.56.5)
//
//  Vérifie un RPPS de prescripteur extrait par OCR.
//  Appelle /api/rpps en interne (bénéficie du fallback ANS→dump
//  local mis en place en 0.55.56).
//
//  Compare les données OCR avec les données officielles et
//  retourne un diagnostic (match exact / divergences / non trouvé).
// =============================================================

export const dynamic = "force-dynamic";
export const maxDuration = 20;

function normalize(s) {
  return (s || "").toString().toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // enlever accents
    .replace(/\s+/g, " ");
}

function similar(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch (e) { return Response.json({ ok: false, error: "Body JSON invalide" }, { status: 400 }); }

  const { rpps, nom_ocr, prenom_ocr, specialite_ocr } = body;

  if (!rpps || !/^\d{11}$/.test(rpps.replace(/\s/g, ""))) {
    return Response.json({
      ok: false,
      status: "invalid_rpps",
      message: "RPPS doit être 11 chiffres",
    }, { status: 200 });
  }

  const cleanRpps = rpps.replace(/\s/g, "");

  // Appel /api/rpps qui a déjà le fallback ANS → dump local
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  try {
    const lookupRes = await fetch(`${baseUrl}/api/rpps?rpps=${encodeURIComponent(cleanRpps)}`, {
      headers: { "Authorization": req.headers.get("authorization") || "" },
    });
    const lookup = await lookupRes.json();

    if (!lookup.ok || !lookup.results || lookup.results.length === 0) {
      return Response.json({
        ok: true,
        status: "not_found",
        message: "RPPS non trouvé dans l'annuaire ANS ni dans le dump local",
        rpps: cleanRpps,
        source: lookup.source || null,
      });
    }

    const found = lookup.results[0];

    // Comparaison des champs OCR vs officiel
    const matches = {
      nom: !nom_ocr || similar(nom_ocr, found.nom),
      prenom: !prenom_ocr || similar(prenom_ocr, found.prenom),
      specialite: !specialite_ocr || similar(specialite_ocr, found.profession || found.specialite),
    };

    const divergences = Object.entries(matches)
      .filter(([_, ok]) => !ok)
      .map(([field]) => field);

    const status = divergences.length === 0 ? "match" : "divergences";

    return Response.json({
      ok: true,
      status,
      message: status === "match"
        ? "Médecin vérifié — les données OCR correspondent à l'annuaire officiel"
        : `Données divergentes : ${divergences.join(", ")}`,
      rpps: cleanRpps,
      source: lookup.source || found.source_record || "ANS FHIR",
      divergences,
      // Données officielles complètes pour proposer un écrasement
      official: {
        rpps: found.rpps,
        nom: found.nom,
        prenom: found.prenom,
        civilite: found.civilite,
        profession: found.profession || found.profession_libelle,
        specialite: found.specialite || found.specialite_libelle,
        raison_sociale: found.raison_sociale || found.raison_sociale_lieu,
        finess: found.finess,
        adresse: found.adresse,
        code_postal: found.cp || found.code_postal,
        ville: found.commune || found.ville,
        code_insee_commune: found.code_insee_commune,
        telephone: found.telephone,
        email: found.email,
        latitude: found.latitude,
        longitude: found.longitude,
      },
      ocr: {
        nom: nom_ocr,
        prenom: prenom_ocr,
        specialite: specialite_ocr,
      },
    });
  } catch (e) {
    return Response.json({
      ok: false,
      status: "error",
      error: e.message,
    }, { status: 200 });
  }
}
