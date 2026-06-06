"use client";
import { createBrowserClient } from "@supabase/ssr";

// 0.58.18 : guard si l'env est absent (mauvaise config Vercel ou prod sans variables)
// 0.58.66 : SSR-safe — ne throw plus au prerender SSG (qui n'a pas accès aux NEXT_PUBLIC_*)
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // 0.58.66 : au lieu de throw, on retourne un client stub qui répond null
    // pour toutes les opérations (utile au prerender SSG côté Vercel).
    // Au runtime côté browser, l'env est toujours présent.
    if (typeof window !== "undefined") {
      console.error(
        "[lib/supabase] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant. " +
        "Vérifiez la config Vercel ou le .env.local."
      );
    }
    // Stub minimal — chaque méthode retourne une promesse résolue avec data: null
    const stub = () => ({ data: null, error: null });
    const asyncStub = () => Promise.resolve({ data: null, error: null });
    const stubBuilder = new Proxy({}, {
      get: (_target, prop) => {
        if (prop === "then") return undefined;  // pas une promesse
        if (prop === Symbol.toPrimitive) return () => "[stub]";
        return (...args) => stubBuilder;
      },
    });
    return {
      from: () => stubBuilder,
      auth: { getUser: asyncStub, getSession: asyncStub, signOut: asyncStub, onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
      storage: { from: () => ({ upload: asyncStub, download: asyncStub, getPublicUrl: stub, remove: asyncStub, list: asyncStub }) },
      rpc: asyncStub,
      channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
      removeChannel: () => {},
      functions: { invoke: asyncStub },
    };
  }
  return createBrowserClient(url, key);
}
