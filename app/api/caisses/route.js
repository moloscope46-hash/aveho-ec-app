// =============================================================
//  /api/caisses — Recherche caisses d'assurance maladie
//  Alpha 0.55.46
//
//  GET /api/caisses?q=Paris       → caisses dont nom contient Paris
//  GET /api/caisses?dept=75       → toutes les caisses du dept 75
//  GET /api/caisses?code=751      → recherche par code organisme
// =============================================================

// 0.57.10 : imports retirés (createClient non utilisés)

import { requireAuth, checkRateLimit } from "../../../lib/apiAuth";
import { safeError } from "../../../lib/safeError";  // 0.57.28

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  // 0.57.28 : validation searchParams
  const { validateQueryParams } = await import("../../../lib/validateInput");
  const paramErrors = validateQueryParams(searchParams, {
    q: { type: "string", maxLen: 200 },
    dept: { type: "string", maxLen: 10 },
    code: { type: "string", maxLen: 20 },
    limit: { type: "number", min: 1, max: 100, integer: true },
  });
  if (paramErrors.length > 0) {
    return Response.json(
      { ok: false, error: "Paramètres invalides", details: paramErrors, results: [] },
      { status: 400 }
    );
  }

  const q = (searchParams.get("q") || "").trim();
  const dept = (searchParams.get("dept") || "").trim() || null;
  const code = (searchParams.get("code") || "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return Response.json({ ok: false, error: "Supabase non configuré", results: [] });
  }

  try {
    // 0.57.4 : auth + rate limit obligatoire

    const authCheck = await requireAuth(req);

    if (!authCheck.ok) return authCheck.response;

    const { user, supabase } = authCheck;

    const rate = checkRateLimit(user.id, { maxRequests: 60, windowMs: 60_000 });

    if (!rate.ok) return rate.response;

    // Si code exact, lookup direct
    if (code) {
      const { data, error } = await supabase
        .from("caisses_assurance_maladie")
        .select("*")
        .eq("code_organisme", code)
        .limit(1);
      if (error) throw error;
      return Response.json({ ok: true, count: data?.length || 0, results: data || [] });
    }

    // Sinon RPC search_caisses (tolérant à la casse, supporte LIKE)
    const { data, error } = await supabase.rpc("search_caisses", {
      p_query: q || null,
      p_dept: dept,
      p_limit: limit,
    });
    if (error) throw error;

    return Response.json({ ok: true, count: data?.length || 0, results: data || [] });
  } catch (e) {
    return Response.json(safeError(e, "Erreur API caisses", { results: [] }), { status: 200 });
  }
}

// 0.56.4 : création d'une nouvelle caisse
export async function POST(req) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return Response.json({ ok: false, error: "Supabase non configuré" }, { status: 500 });
  }

  let body;
  try { body = await req.json(); }
  catch (e) { return Response.json({ ok: false, error: "Body JSON invalide" }, { status: 400 }); }

  // 0.57.26 : auth + rate limit AVANT validation (économise les ressources si non-auth)
  const authCheck = await requireAuth(req);
  if (!authCheck.ok) return authCheck.response;
  const { user, supabase } = authCheck;
  const rate = checkRateLimit(user.id, { maxRequests: 60, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  // 0.57.26 : validation schema des inputs (anti-DoS + anti-type-confusion)
  const { validate } = await import("../../../lib/validateInput");
  const errors = validate(body, {
    nom: { type: "string", required: true, minLen: 1, maxLen: 200 },
    code_organisme: { type: "string", required: true, minLen: 1, maxLen: 20 },
    type_caisse: { type: "string", maxLen: 50 },
    type: { type: "string", maxLen: 50 },              // alias legacy
    regime: { type: "string", maxLen: 50 },
    departement: { type: "string", maxLen: 100 },
    region: { type: "string", maxLen: 100 },
    adresse: { type: "string", maxLen: 500 },
    cp: { type: "string", maxLen: 10 },
    code_postal: { type: "string", maxLen: 10 },        // alias legacy
    ville: { type: "string", maxLen: 200 },
    telephone: { type: "string", maxLen: 30 },
    email: { type: "string", maxLen: 254 },
  });
  if (errors.length > 0) {
    return Response.json(
      { ok: false, error: "Body invalide", details: errors },
      { status: 400 }
    );
  }

  // 0.56.13 : mapping vers les bons noms de colonnes (type_caisse, cp)
  const payload = {
    nom: body.nom,
    code_organisme: body.code_organisme,
    type_caisse: body.type_caisse || body.type || "CPAM",
    regime: body.regime || "general",
    departement: body.departement || null,
    region: body.region || null,
    adresse: body.adresse || null,
    cp: body.cp || body.code_postal || null,
    ville: body.ville || null,
    telephone: body.telephone || null,
    email: body.email || null,
    site_web: body.site_web || null,
    latitude: body.latitude || null,
    longitude: body.longitude || null,
  };

  const { data, error } = await supabase
    .from("caisses_assurance_maladie")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return Response.json({
      ok: false,
      error: error.message,
      duplicate: error.code === "23505",
    }, { status: 200 });
  }

  return Response.json({ ok: true, caisse: data });
}

// 0.56.4 : mise à jour d'une caisse existante
export async function PUT(req) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let body;
  try { body = await req.json(); }
  catch (e) { return Response.json({ ok: false, error: "Body JSON invalide" }, { status: 400 }); }

  if (!body.id) return Response.json({ ok: false, error: "id requis" }, { status: 400 });

  // 0.57.4 : auth + rate limit obligatoire


  const authCheck = await requireAuth(req);


  if (!authCheck.ok) return authCheck.response;


  const { user, supabase } = authCheck;


  const rate = checkRateLimit(user.id, { maxRequests: 60, windowMs: 60_000 });


  if (!rate.ok) return rate.response;

  // 0.56.13 : remap les anciens noms vers les bons (rétrocompat)
  const { id, code_postal, type, ...rest } = body;
  const updates = { ...rest };
  if (code_postal !== undefined) updates.cp = code_postal;
  if (type !== undefined) updates.type_caisse = type;

  const { data, error } = await supabase
    .from("caisses_assurance_maladie")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ ok: false, error: error.message }, { status: 200 });
  return Response.json({ ok: true, caisse: data });
}

// 0.56.4 : suppression d'une caisse
export async function DELETE(req) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "id requis" }, { status: 400 });

  // 0.57.4 : auth + rate limit obligatoire


  const authCheck = await requireAuth(req);


  if (!authCheck.ok) return authCheck.response;


  const { user, supabase } = authCheck;


  const rate = checkRateLimit(user.id, { maxRequests: 60, windowMs: 60_000 });


  if (!rate.ok) return rate.response;

  const { error } = await supabase
    .from("caisses_assurance_maladie")
    .delete()
    .eq("id", id);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 200 });
  return Response.json({ ok: true });
}
