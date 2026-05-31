import { logger } from "./logger";
// =============================================================
//  lib/appLog.js — Helper pour logger côté front via app_logs
//  Alpha 0.52.0
//
//  Usage :
//    import { logApp } from "@/lib/appLog";
//    logApp(supabase, auth, { level: "error", message: "...", context: {...} });
//
//  Best-effort : si insert échoue (offline, RLS, etc.) → silencieux
// =============================================================

/**
 * @param {object} supabase - Client Supabase
 * @param {object} auth - Objet auth de useAuth()
 * @param {object} payload - { level, source, message, context }
 */
export async function logApp(supabase, auth, payload) {
  if (typeof window === "undefined") return;  // server-side noop
  if (!payload || !payload.message) return;
  
  try {
    await supabase.from("app_logs").insert({
      structure_id: auth?.structureId || null,
      user_id: auth?.user?.id || null,
      user_email: auth?.user?.email || null,
      level: payload.level || "info",
      source: payload.source || "client",
      message: payload.message,
      context: payload.context || null,
      user_agent: navigator.userAgent || null,
      url: window.location.href,
    });
  } catch (e) {
    // Best-effort : on n'aggrave pas la situation
    logger.warn("logApp failed (silenced):", e?.message);
  }
}
