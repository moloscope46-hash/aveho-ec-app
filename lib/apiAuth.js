// =============================================================
//  lib/apiAuth.js (Alpha 0.56.20)
//
//  Helper centralisé d'authentification pour les routes API Next.
//  À utiliser sur TOUTES les routes qui font appel à des services
//  payants (OCR Claude, etc.) ou qui exposent des données.
//
//  Usage :
//    import { requireAuth } from "../../../lib/apiAuth";
//
//    export async function POST(req) {
//      const authCheck = await requireAuth(req);
//      if (!authCheck.ok) return authCheck.response;
//      const { user, supabase } = authCheck;
//      // ... ta logique
//    }
// =============================================================

import { createClient } from "@supabase/supabase-js";

/**
 * Vérifie qu'une requête API a un Authorization Bearer valide.
 * Retourne :
 *   { ok: true, user, supabase, token } si OK
 *   { ok: false, response } avec une Response 401 prête à renvoyer
 */
export async function requireAuth(req, opts = {}) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: "Supabase non configuré côté serveur" },
        { status: 500 }
      ),
    };
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: "Non authentifié (Bearer token manquant)" },
        { status: 401 }
      ),
    };
  }

  // Création d'un client Supabase qui propage le token
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Vérifier que le token est valide en lisant le user associé
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: "Token invalide ou expiré" },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true,
    user: data.user,
    supabase,
    token,
  };
}

/**
 * Rate limiter simple en mémoire (par user_id) — protection
 * basique contre l'abus des routes coûteuses comme l'OCR.
 *
 * NB : en mémoire = pas partagé entre serverless instances.
 * Pour du vrai rate limiting, utiliser Upstash Redis.
 */
const rateLimitStore = new Map();

export function checkRateLimit(userId, opts = {}) {
  const { maxRequests = 10, windowMs = 60_000 } = opts;
  const now = Date.now();
  const userBucket = rateLimitStore.get(userId) || { requests: [], blockedUntil: 0 };

  // Si bloqué, refuser
  if (userBucket.blockedUntil > now) {
    const retryAfter = Math.ceil((userBucket.blockedUntil - now) / 1000);
    return {
      ok: false,
      response: Response.json(
        {
          ok: false,
          error: `Trop de requêtes. Attends ${retryAfter}s avant de réessayer.`,
          retry_after_seconds: retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      ),
    };
  }

  // Nettoyer les requêtes hors fenêtre
  userBucket.requests = userBucket.requests.filter((t) => now - t < windowMs);

  if (userBucket.requests.length >= maxRequests) {
    userBucket.blockedUntil = now + windowMs;
    rateLimitStore.set(userId, userBucket);
    return {
      ok: false,
      response: Response.json(
        {
          ok: false,
          error: `Limite de ${maxRequests} requêtes/min atteinte. Réessaye dans 1 minute.`,
          retry_after_seconds: 60,
        },
        { status: 429, headers: { "Retry-After": "60" } }
      ),
    };
  }

  userBucket.requests.push(now);
  rateLimitStore.set(userId, userBucket);

  return { ok: true };
}
