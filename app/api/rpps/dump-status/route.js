// =============================================================
//  app/api/rpps/dump-status/route.js (Alpha 0.55.56)
//
//  Renvoie le statut du dump RPPS local (nb records, date extrait,
//  dernier seed, âge en jours). Lecture publique.
// =============================================================

import { createClient } from "@supabase/supabase-js";
import { requireAuth, checkRateLimit } from "../../../../lib/apiAuth";
import { safeError } from "../../../../lib/safeError";  // 0.57.28

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(req) {
  // 0.56.21 : auth + rate limit (30 req/min/user)
  const authCheck = await requireAuth(req);
  if (!authCheck.ok) return authCheck.response;
  const { user } = authCheck;
  const rate = checkRateLimit(user.id, { maxRequests: 30, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data, error } = await supabase.rpc("rpps_dump_status");
    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 200 });
    }
    const row = (data && data[0]) || {};
    return Response.json({
      ok: true,
      total_records: row.total_records || 0,
      source_extract_date: row.source_extract_date,
      last_seed_at: row.last_seed_at,
      seed_status: row.seed_status || "idle",
      seed_message: row.seed_message,
      age_jours: row.age_jours,
      is_fresh: row.age_jours !== null && row.age_jours <= 60,
      empty: (row.total_records || 0) === 0,
    });
  } catch (e) {
    return Response.json(safeError(e, "Erreur RPPS dump-status"), { status: 200 });
  }
}
