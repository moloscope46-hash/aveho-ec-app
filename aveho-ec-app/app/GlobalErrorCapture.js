"use client";
// =============================================================
//  GlobalErrorCapture — Intercepte window.onerror et unhandledrejection
//  Alpha 0.52.0
//
//  Envoie automatiquement les erreurs JS non gérées vers app_logs.
//  Best-effort : si l'insert échoue, on ne fait rien (pas de boucle).
// =============================================================
import { useEffect } from "react";
import { createClient } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { logApp } from "../lib/appLog";

export default function GlobalErrorCapture() {
  const auth = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!auth?.ready) return;

    function onError(event) {
      logApp(supabase, auth, {
        level: "error",
        source: "client",
        message: event.message || "Unknown error",
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack?.slice(0, 2000),
        },
      });
    }

    function onUnhandledRejection(event) {
      const reason = event.reason;
      logApp(supabase, auth, {
        level: "error",
        source: "client",
        message: reason?.message || String(reason).slice(0, 500),
        context: {
          type: "unhandledrejection",
          stack: reason?.stack?.slice(0, 2000),
        },
      });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [auth?.ready, auth?.user?.id]);

  return null;
}
