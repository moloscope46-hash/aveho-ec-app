// =============================================================
//  app/api/rpps/dump-status/route.js (Alpha 0.55.56)
//
//  Renvoie le statut du dump RPPS local (nb records, date extrait,
//  dernier seed, âge en jours). Lecture publique.
// =============================================================

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET() {
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
    return Response.json({ ok: false, error: e.message }, { status: 200 });
  }
}
