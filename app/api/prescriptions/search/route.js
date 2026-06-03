// =============================================================
//  app/api/prescriptions/search/route.js (Alpha 0.56.8)
//
//  Recherche multi-critères dans l'archive des prescriptions.
//
//  POST body :
//    {
//      patient_id?, prescripteur_nom?, prescripteur_rpps?,
//      medicament_query?, dci_query?, type_prescription?,
//      source_creation?, statut?, ald?,
//      date_debut?, date_fin?,
//      rpps_verifie?,
//      limit?, offset?, sort? (date_desc|date_asc)
//    }
//  Réponse : { ok, count, results, total_estime }
// =============================================================

// 0.57.10 : imports retirés (createClient non utilisés)

import { requireAuth, checkRateLimit } from "../../../../lib/apiAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return Response.json({ ok: false, error: "Supabase non configuré" }, { status: 500 });
  }

  let body = {};
  try { body = await req.json(); }
  catch (e) { return Response.json({ ok: false, error: "Body JSON invalide" }, { status: 400 }); }

  // 0.57.26 : auth + rate limit AVANT validation
  const authCheck = await requireAuth(req);
  if (!authCheck.ok) return authCheck.response;
  const { user, supabase } = authCheck;
  const rate = checkRateLimit(user.id, { maxRequests: 30, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  // 0.57.26 : validation schema (recherche → strings courtes + ints bornés)
  // 0.57.27 : + escapeIlike pour les ILIKE queries
  const { validate, escapeIlike } = await import("../../../../lib/validateInput");
  const errors = validate(body, {
    patient_id: { type: "uuid" },
    prescripteur_nom: { type: "string", maxLen: 200 },
    prescripteur_rpps: { type: "string", maxLen: 20 },
    type_prescription: { type: "string", maxLen: 50 },
    medicament_query: { type: "string", maxLen: 200 },
    dci_query: { type: "string", maxLen: 200 },
    sort: { type: "string", maxLen: 30 },
    limit: { type: "number", min: 1, max: 500, integer: true },
    offset: { type: "number", min: 0, max: 1_000_000, integer: true },
    date_min: { type: "string", maxLen: 30 },
    date_max: { type: "string", maxLen: 30 },
    include_lignes: { type: "boolean" },
    etablissement_id: { type: "uuid" },
    structure_id: { type: "uuid" },
  });
  if (errors.length > 0) {
    return Response.json(
      { ok: false, error: "Body invalide", details: errors },
      { status: 400 }
    );
  }

  const limit = Math.min(parseInt(body.limit) || 50, 500);
  const offset = parseInt(body.offset) || 0;
  const sort = body.sort === "date_asc" ? { col: "date_prescription", asc: true } : { col: "date_prescription", asc: false };

  // Si recherche par médicament/DCI : on doit passer par prescriptions_lignes
  const hasMedSearch = body.medicament_query || body.dci_query;

  let query;

  if (hasMedSearch) {
    // Récupère d'abord les prescription_ids qui matchent
    let linesQuery = supabase
      .from("prescriptions_lignes")
      .select("prescription_id", { count: "exact" });

    if (body.medicament_query) {
      // 0.57.27 : escape wildcards SQL (% et _) pour éviter le wildcard injection
      linesQuery = linesQuery.ilike("medicament_nom", `%${escapeIlike(body.medicament_query)}%`);
    }
    if (body.dci_query) {
      linesQuery = linesQuery.ilike("medicament_dci", `%${escapeIlike(body.dci_query)}%`);
    }

    const { data: ligneIds } = await linesQuery.limit(2000);
    const prescriptionIds = Array.from(new Set((ligneIds || []).map(l => l.prescription_id)));

    if (prescriptionIds.length === 0) {
      return Response.json({ ok: true, count: 0, results: [], total_estime: 0 });
    }

    query = supabase
      .from("prescriptions")
      .select("*, patients(nom, prenom, numero_dossier), etablissements(nom)", { count: "exact" })
      .in("id", prescriptionIds);
  } else {
    query = supabase
      .from("prescriptions")
      .select("*, patients(nom, prenom, numero_dossier), etablissements(nom)", { count: "exact" });
  }

  // Filtres communs
  if (body.patient_id) query = query.eq("patient_id", body.patient_id);
  if (body.prescripteur_nom) query = query.ilike("prescripteur_nom", `%${escapeIlike(body.prescripteur_nom)}%`);  // 0.57.27 : escape wildcards
  if (body.prescripteur_rpps) query = query.eq("prescripteur_rpps", body.prescripteur_rpps);
  if (body.type_prescription && body.type_prescription !== "all") query = query.eq("type_prescription", body.type_prescription);
  if (body.source_creation && body.source_creation !== "all") query = query.eq("source_creation", body.source_creation);
  if (body.statut && body.statut !== "all") query = query.eq("statut", body.statut);
  if (body.date_debut) query = query.gte("date_prescription", body.date_debut);
  if (body.date_fin) query = query.lte("date_prescription", body.date_fin);
  if (typeof body.rpps_verifie === "boolean") query = query.eq("rpps_verifie", body.rpps_verifie);

  query = query
    .order(sort.col, { ascending: sort.asc, nullsLast: true })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    count: data?.length || 0,
    total_estime: count || 0,
    results: data || [],
  });
}
