// =============================================================
//  supabase/functions/_shared/auth.ts (Alpha 0.57.31)
//
//  Helper commun pour les Edge Functions Supabase appelées
//  depuis le client. Implémente :
//   - Vérification du Bearer token Supabase (auth)
//   - Check que le caller est membre de la structure_id ciblée
//   - CORS restrictif (only Aveho EC origins)
//
//  Pourquoi ?
//   Avant 0.57.31, les Edge Functions send-email, send-webhook,
//   send-push, invite-user faisaient confiance au structure_id
//   passé dans le body. Un attaquant authentifié pouvait :
//    - Envoyer des emails au nom d'autres structures
//    - Broadcast push notifications à toutes les autres structures
//    - Spammer les webhooks Teams/Slack des concurrents
//
//  Ce helper centralise les checks pour éviter de répéter le
//  code dans chaque fonction.
// =============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 0.57.31 : CORS restrictif — only Aveho EC origins
// 0.57.38 : élargissement des patterns vercel.app (toutes les previews Vercel d'Aveho)
const ALLOWED_ORIGINS = [
  "https://aveho-ec-app.vercel.app",
  "https://aveho.fr",
  "https://www.aveho.fr",
  "http://localhost:3000",       // dev local
  "http://127.0.0.1:3000",       // dev local
];

const ALLOWED_ORIGIN_PATTERNS = [
  // 0.57.38 : ANY sous-domaine vercel.app commençant par "aveho-ec-app"
  // Couvre : aveho-ec-app-<hash>-fleos-projects.vercel.app
  //          aveho-ec-app-git-main-fleos-projects.vercel.app
  //          aveho-ec-app-<branche>-fleos-projects.vercel.app
  /^https:\/\/aveho-ec-app[a-z0-9-]*\.vercel\.app$/,
];

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

/**
 * Construit les headers CORS à partir de l'origin de la requête.
 * Retourne l'origin si autorisée, sinon une string vide (= bloqué).
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = isAllowedOrigin(origin) ? (origin as string) : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",   // important pour les caches CDN
  };
}

/**
 * Vérifie l'authentification + retourne le user authentifié.
 *
 * Le client doit appeler la fonction avec :
 *   await supabase.functions.invoke("send-email", { body: {...} })
 * Le SDK Supabase ajoute automatiquement le header
 *   Authorization: Bearer <session_token>
 *
 * @returns { user, admin } si auth OK, { errorResponse } si non
 */
export async function requireAuth(req: Request): Promise<{
  user?: { id: string; email?: string };
  admin?: ReturnType<typeof createClient>;
  errorResponse?: Response;
}> {
  const corsHeaders = buildCorsHeaders(req);
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      errorResponse: new Response(
        JSON.stringify({ ok: false, error: "Authorization Bearer manquant" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Client public pour valider le token
  const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await publicClient.auth.getUser(token);
  if (error || !data?.user) {
    return {
      errorResponse: new Response(
        JSON.stringify({ ok: false, error: "Token invalide ou expiré" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }

  // Client admin (service role) pour les opérations qui suivent
  const admin = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  return { user: data.user, admin };
}

/**
 * Vérifie que le user authentifié est membre de la structure ciblée.
 *
 * Empêche un user de la structure A d'effectuer des actions sur
 * la structure B (envoi d'emails, broadcasts push, webhooks Teams/Slack).
 *
 * @returns null si OK, Response 403 si non
 */
export async function requireStructureMembership(
  admin: ReturnType<typeof createClient>,
  userId: string,
  structureId: string,
  req: Request,
): Promise<Response | null> {
  const corsHeaders = buildCorsHeaders(req);

  if (!structureId || typeof structureId !== "string") {
    return new Response(
      JSON.stringify({ ok: false, error: "structure_id requis" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validation format UUID strict (anti-type-confusion)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(structureId)) {
    return new Response(
      JSON.stringify({ ok: false, error: "structure_id invalide (format UUID attendu)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check que le user est bien membre de la structure
  const { data, error } = await admin
    .from("membres_structure")
    .select("user_id")
    .eq("user_id", userId)
    .eq("structure_id", structureId)
    .maybeSingle();

  if (error || !data) {
    return new Response(
      JSON.stringify({ ok: false, error: "Accès refusé : non membre de cette structure" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return null;  // OK, le user est membre
}

/**
 * 0.57.33 : Vérifie le header x-cron-secret pour les fonctions CRON.
 *
 * Pourquoi ?
 *  Avant 0.57.33, les 7 CRON Edge Functions (auto-archive-consents,
 *  maintenance-daily-cron, send-digest, send-renouvellement-rappels,
 *  sync-google-reviews, weekly-stats-digest, welcome-user) n'avaient
 *  AUCUNE vérification d'authentification. Un attaquant connaissant
 *  l'URL pouvait les déclencher à volonté :
 *   - DoS via génération massive d'opérations en BDD
 *   - Spam emails / push notifications au nom d'Aveho
 *   - Consommation du quota Google Places (sync-google-reviews)
 *   - Archivage forcé de consentements (auto-archive-consents)
 *
 *  Solution : header partagé x-cron-secret défini dans Supabase Vault
 *  ou env var CRON_SECRET. Le SQL cron.schedule() inclut ce header dans
 *  l'appel HTTP. La fonction reject 401 si manquant ou invalide.
 *
 * Compatible avec :
 *   - Crons Supabase via pg_cron + net.http_post (avec headers)
 *   - GitHub Actions (passer le secret en header)
 *   - Vercel Cron Jobs (idem)
 *
 * Comparaison "constant-time" pour éviter timing-attacks.
 *
 * @returns Response 401 si secret manquant/invalide, null sinon
 */
export function requireCronSecret(req: Request): Response | null {
  const corsHeaders = buildCorsHeaders(req);
  const expected = Deno.env.get("CRON_SECRET");

  if (!expected) {
    // Mode dégradé : si pas de secret configuré, on refuse tout (fail-secure)
    console.warn("[requireCronSecret] CRON_SECRET non configuré dans l'env. Refus par défaut.");
    return new Response(
      JSON.stringify({ ok: false, error: "CRON_SECRET non configuré côté serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const provided = req.headers.get("x-cron-secret") || "";

  // Comparaison constant-time pour éviter les timing attacks
  if (provided.length !== expected.length) {
    return new Response(
      JSON.stringify({ ok: false, error: "CRON secret invalide" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) {
    return new Response(
      JSON.stringify({ ok: false, error: "CRON secret invalide" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return null;  // OK, secret correct
}

/**
 * Helper combiné : preflight CORS + auth + check membership.
 *
 * Usage type dans une Edge Function :
 *   Deno.serve(async (req) => {
 *     // Preflight CORS
 *     if (req.method === "OPTIONS") {
 *       return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
 *     }
 *
 *     const body = await req.json();
 *     const auth = await authAndCheckStructure(req, body.structure_id);
 *     if (auth.errorResponse) return auth.errorResponse;
 *
 *     // ... logique métier avec auth.admin et auth.user
 *   });
 */
export async function authAndCheckStructure(req: Request, structureId: string): Promise<{
  user?: { id: string; email?: string };
  admin?: ReturnType<typeof createClient>;
  errorResponse?: Response;
}> {
  const authResult = await requireAuth(req);
  if (authResult.errorResponse) return authResult;

  const membershipError = await requireStructureMembership(
    authResult.admin!,
    authResult.user!.id,
    structureId,
    req,
  );
  if (membershipError) return { errorResponse: membershipError };

  return { user: authResult.user, admin: authResult.admin };
}
