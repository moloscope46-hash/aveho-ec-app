// =============================================================
//  lib/fetchWithAuth.js (Alpha 0.56.21)
//
//  Helper qui wrap fetch() et ajoute automatiquement le header
//  Authorization: Bearer <token> via supabase.auth.getSession().
//
//  Usage :
//    import { fetchWithAuth } from "@/lib/fetchWithAuth";
//    const res = await fetchWithAuth("/api/rpps?q=DUPONT");
//    const res = await fetchWithAuth("/api/ocr/...", { method: "POST", body: ... });
//
//  Si l'utilisateur n'est pas connecté → le fetch est fait sans
//  Authorization (la route renverra alors 401 si elle est protégée).
// =============================================================

import { createClient } from "./supabase";

let cachedClient = null;
function getClient() {
  if (!cachedClient) cachedClient = createClient();
  return cachedClient;
}

export async function fetchWithAuth(url, options = {}) {
  let token = null;
  try {
    const supabase = getClient();
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token || null;
  } catch {
    // Pas grave : on tente le fetch sans Authorization
  }

  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}
