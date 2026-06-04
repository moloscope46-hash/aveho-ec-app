"use client";
import { createBrowserClient } from "@supabase/ssr";

// 0.58.18 : guard si l'env est absent (mauvaise config Vercel ou prod sans variables)
// Évite "createClient is not defined" qui était trompeur — la vraie cause est
// soit un import manquant, soit un env qui devient undefined au runtime.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (typeof window !== "undefined") {
      console.error(
        "[lib/supabase] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant. " +
        "Vérifiez la config Vercel ou le .env.local."
      );
    }
    // On retourne quand même un client (avec values undefined) pour ne pas
    // casser tout l'app — Supabase renverra des erreurs claires sur les queries
    // au lieu de planter au moment du createClient.
  }
  return createBrowserClient(url, key);
}
