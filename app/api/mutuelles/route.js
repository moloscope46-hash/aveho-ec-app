// =============================================================
//  /api/mutuelles — Recherche organismes complémentaires
//  Alpha 0.55.46
//
//  GET /api/mutuelles?q=Harmonie   → recherche par nom
//  GET /api/mutuelles?amc=25992142 → recherche par n° AMC
// =============================================================

import { createClient } from "@supabase/supabase-js";

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
    const authHeader = req.headers.get("authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

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

  if (!body.nom) return Response.json({ ok: false, error: "nom requis" }, { status: 400 });

  const authHeader = req.headers.get("authorization") || "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });

  const payload = {
    nom: body.nom,
    numero_amc: body.numero_amc || null,
    type: body.type || "mutuelle",
    adresse: body.adresse || null,
    code_postal: body.code_postal || null,
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

  const authHeader = req.headers.get("authorization") || "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });

  const { id, ...updates } = body;
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

  const authHeader = req.headers.get("authorization") || "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });

  const { error } = await supabase.from("mutuelles").delete().eq("id", id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 200 });
  return Response.json({ ok: true });
}
