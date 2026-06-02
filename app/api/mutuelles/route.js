// =============================================================
//  /api/mutuelles — Recherche organismes complémentaires
//  Alpha 0.55.46
//
//  GET /api/mutuelles?q=Harmonie   → recherche par nom
//  GET /api/mutuelles?amc=25992142 → recherche par n° AMC
// =============================================================

// 0.57.10 : imports retirés (createClient non utilisés)

import { requireAuth, checkRateLimit } from "../../../lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const amc = (searchParams.get("amc") || "").trim();
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

    if (amc) {
      const { data, error } = await supabase
        .from("mutuelles")
        .select("*")
        .eq("numero_amc", amc)
        .limit(1);
      if (error) throw error;
      return Response.json({ ok: true, count: data?.length || 0, results: data || [] });
    }

    const { data, error } = await supabase.rpc("search_mutuelles", {
      p_query: q || null,
      p_limit: limit,
    });
    if (error) throw error;

    return Response.json({ ok: true, count: data?.length || 0, results: data || [] });
  } catch (e) {
    return Response.json({ ok: false, error: e.message, results: [] }, { status: 200 });
  }
}

// 0.56.4 : création d'une nouvelle mutuelle
export async function POST(req) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return Response.json({ ok: false, error: "Supabase non configuré" }, { status: 500 });
  }

  let body;
  try { body = await req.json(); }
  catch (e) { return Response.json({ ok: false, error: "Body JSON invalide" }, { status: 400 }); }

  if (!body.raison_sociale && !body.nom) {
    return Response.json({ ok: false, error: "raison_sociale requise" }, { status: 400 });
  }

  // 0.57.4 : auth + rate limit obligatoire


  const authCheck = await requireAuth(req);


  if (!authCheck.ok) return authCheck.response;


  const { user, supabase } = authCheck;


  const rate = checkRateLimit(user.id, { maxRequests: 60, windowMs: 60_000 });


  if (!rate.ok) return rate.response;

  // 0.56.12 : mapping vers le bon nom de colonne (la table a 'raison_sociale')
  const payload = {
    raison_sociale: body.raison_sociale || body.nom,
    numero_amc: body.numero_amc || null,
    type_organisme: body.type_organisme || body.type || "mutuelle",
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
    .from("mutuelles")
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

  return Response.json({ ok: true, mutuelle: data });
}

// 0.56.4 : mise à jour d'une mutuelle
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

  const { id, nom, code_postal, type, ...rest } = body;

  // 0.56.12 : remapper nom → raison_sociale, code_postal → cp, type → type_organisme
  const updates = { ...rest };
  if (nom !== undefined) updates.raison_sociale = nom;
  if (code_postal !== undefined) updates.cp = code_postal;
  if (type !== undefined) updates.type_organisme = type;

  const { data, error } = await supabase
    .from("mutuelles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ ok: false, error: error.message }, { status: 200 });
  return Response.json({ ok: true, mutuelle: data });
}

// 0.56.4 : suppression d'une mutuelle
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

  const { error } = await supabase.from("mutuelles").delete().eq("id", id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 200 });
  return Response.json({ ok: true });
}
