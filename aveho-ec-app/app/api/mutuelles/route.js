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
