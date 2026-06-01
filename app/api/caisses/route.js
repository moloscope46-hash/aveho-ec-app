// =============================================================
//  /api/caisses — Recherche caisses d'assurance maladie
//  Alpha 0.55.46
//
//  GET /api/caisses?q=Paris       → caisses dont nom contient Paris
//  GET /api/caisses?dept=75       → toutes les caisses du dept 75
//  GET /api/caisses?code=751      → recherche par code organisme
// =============================================================

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
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
    const authHeader = req.headers.get("authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

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
    return Response.json({ ok: false, error: e.message, results: [] }, { status: 200 });
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

  if (!body.nom || !body.code_organisme) {
    return Response.json({ ok: false, error: "nom et code_organisme requis" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });

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

  const authHeader = req.headers.get("authorization") || "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });

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

  const authHeader = req.headers.get("authorization") || "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });

  const { error } = await supabase
    .from("caisses_assurance_maladie")
    .delete()
    .eq("id", id);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 200 });
  return Response.json({ ok: true });
}
