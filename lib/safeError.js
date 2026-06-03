// =============================================================
//  lib/safeError.js (Alpha 0.57.28)
//
//  Helper pour sanitize les messages d'erreur renvoyés au client.
//
//  Pourquoi ? Les routes API qui font `error: e.message` peuvent
//  exposer des infos sensibles au client :
//   - Messages Postgres : "duplicate key value violates unique
//     constraint <nom_constraint>" → leak structure de BDD
//   - Stack traces avec paths internes
//   - Versions de libs (utiles pour exploitation CVE)
//   - Détails OS / Node.js internes
//
//  Fix : helper qui retourne :
//   - En dev (NODE_ENV=development) : le vrai message pour debug
//   - En prod : message générique + error_id pour cross-référencer
//     avec les logs serveur Vercel
//
//  Usage :
//    try { ... }
//    catch (e) {
//      return Response.json(safeError(e, "Erreur API caisses"), { status: 500 });
//    }
// =============================================================

import { logger } from "./logger";

/**
 * Génère un ID d'erreur court et unique pour cross-référencer
 * avec les logs serveur (Vercel logs).
 */
function generateErrorId() {
  // 8 caractères alphanumériques, ~47 bits d'entropie (largement suffisant)
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Retourne un objet d'erreur safe à envoyer au client.
 *
 * @param {Error|any} e - L'erreur capturée
 * @param {string} category - Catégorie (visible en prod, ex: "Erreur API caisses")
 * @param {object} extra - Champs additionnels à inclure (results: [], etc.)
 * @returns {object} { ok: false, error, error_id, ...extra }
 */
export function safeError(e, category = "Erreur serveur", extra = {}) {
  const errorId = generateErrorId();
  const realMessage = e?.message || (typeof e === "string" ? e : String(e));

  // Log côté serveur avec l'ID pour traçabilité
  logger.warn(`[${category}] ${errorId}:`, realMessage, e?.stack || "");

  // En dev → message complet pour faciliter le debug
  // En prod → message générique + ID
  const isDev = process.env.NODE_ENV === "development";
  return {
    ok: false,
    error: isDev ? realMessage : category,
    error_id: errorId,
    ...extra,
  };
}

/**
 * Variante : retourne directement un Response.json prêt à l'emploi.
 *
 * Usage :
 *   catch (e) {
 *     return safeErrorResponse(e, "Erreur API caisses", { status: 500 });
 *   }
 */
export function safeErrorResponse(e, category, options = {}) {
  const { status = 500, extra = {} } = options;
  return Response.json(safeError(e, category, extra), { status });
}
