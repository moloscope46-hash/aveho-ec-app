// =============================================================
//  /api/health — Endpoint healthcheck
//  Alpha 0.51.0
//
//  Vérifie l'état des services backend :
//   - Supabase (PostgreSQL via ping count)
//   - Realtime (WebSocket — vérifiable côté client uniquement)
//   - Edge Functions (skip pour le moment, supabase admin only)
//
//  Renvoie un objet { services: [{name, status, latency_ms, error?}], overall }
//  overall = "operational" | "degraded" | "down"
// =============================================================
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const services = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 1) Supabase PostgreSQL — count rapide sur une table publique
  {
    const t0 = Date.now();
    try {
      const sb = createClient(url, anonKey);
      const { error } = await sb.from("structures").select("id", { count: "exact", head: true });
      const ms = Date.now() - t0;
      services.push({
        name: "Supabase PostgreSQL",
        status: error ? "degraded" : "operational",
        latency_ms: ms,
        error: error?.message || null,
      });
    } catch (e) {
      services.push({
        name: "Supabase PostgreSQL",
        status: "down",
        latency_ms: Date.now() - t0,
        error: e?.message || "Unknown error",
      });
    }
  }

  // 2) Supabase REST endpoint — ping de l'API
  {
    const t0 = Date.now();
    try {
      const r = await fetch(`${url}/rest/v1/`, {
        method: "HEAD",
        headers: { apikey: anonKey },
      });
      services.push({
        name: "Supabase REST API",
        status: r.ok ? "operational" : "degraded",
        latency_ms: Date.now() - t0,
        error: r.ok ? null : `HTTP ${r.status}`,
      });
    } catch (e) {
      services.push({
        name: "Supabase REST API",
        status: "down",
        latency_ms: Date.now() - t0,
        error: e?.message || "Unknown error",
      });
    }
  }

  // Status global
  const hasDown = services.some(s => s.status === "down");
  const hasDegraded = services.some(s => s.status === "degraded");
  const overall = hasDown ? "down" : hasDegraded ? "degraded" : "operational";

  return NextResponse.json({
    overall,
    services,
    timestamp: new Date().toISOString(),
  });
}
