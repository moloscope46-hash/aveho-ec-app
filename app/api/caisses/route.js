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
