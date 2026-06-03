// =============================================================
//  lib/securityAudit.js (Alpha 0.57.38)
//
//  Helper centralisé pour les événements de sécurité.
//  Distinct de lib/events.js (events métier) pour 3 raisons :
//   1. Les events sécurité ne créent jamais de notifications (silencieux)
//   2. Ils ont une catégorie spéciale "security_event" dans audit_log
//   3. Helpers prêts à l'emploi par catégorie (loginFailed, accessDenied, etc.)
//
//  Stocké dans la table audit_log existante avec :
//   - entite = "security_event"
//   - action = catégorie de l'event (cf SEC_EVENT_TYPES)
//   - details = JSON avec contexte (ua, ip_fingerprint, etc.)
//
//  Pour requêter les events sécurité :
//   SELECT * FROM audit_log WHERE entite = 'security_event' ORDER BY created_at DESC;
// =============================================================

import { logger } from "./logger";

/**
 * Catégories d'événements sécurité.
 * Garder cette liste FERMÉE (whitelist) pour éviter les typos.
 */
export const SEC_EVENT_TYPES = Object.freeze({
  // Authentification
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  LOGIN_BLOCKED: "login_blocked",            // rate-limit 5 tentatives
  LOGOUT: "logout",
  PASSWORD_RESET_REQUEST: "password_reset_request",
  PASSWORD_RESET_SUCCESS: "password_reset_success",

  // MFA
  MFA_ENROLLED: "mfa_enrolled",
  MFA_UNENROLLED: "mfa_unenrolled",
  MFA_CHALLENGE_SUCCESS: "mfa_challenge_success",
  MFA_CHALLENGE_FAILED: "mfa_challenge_failed",

  // Biométrie (WebAuthn)
  WEBAUTHN_ENROLLED: "webauthn_enrolled",
  WEBAUTHN_REVOKED: "webauthn_revoked",
  WEBAUTHN_USED: "webauthn_used",
  WEBAUTHN_FAILED: "webauthn_failed",

  // Accès / Autorisation
  ACCESS_DENIED: "access_denied",            // page admin sans droit
  ROLE_CHANGED: "role_changed",              // un admin change le rôle d'un user
  STRUCTURE_SWITCHED: "structure_switched",  // user change de structure

  // Données sensibles
  RGPD_EXPORT: "rgpd_export",                // export données patient
  RGPD_DELETE: "rgpd_delete",                // suppression patient
  BULK_EXPORT: "bulk_export",                // export massif CSV
  ADMIN_ACTION: "admin_action",              // action admin générique

  // Anomalies
  SUSPICIOUS_ACTIVITY: "suspicious_activity",
  CSP_VIOLATION: "csp_violation",
  HONEYPOT_TRIGGERED: "honeypot_triggered",  // bot détecté
});

/**
 * Helper bas-niveau : insère un événement sécurité dans audit_log.
 *
 * @param {SupabaseClient} supabase
 * @param {object} ctx — { structureId, userId, userEmail }
 * @param {string} eventType — une des constantes SEC_EVENT_TYPES
 * @param {object} details — données contextuelles supplémentaires
 */
export async function logSecurityEvent(supabase, ctx, eventType, details = {}) {
  // Tous les params doivent exister (sauf userId pour LOGIN_FAILED notamment
  // où on n'a pas encore le user — on log par email)
  if (!supabase || !eventType) return;

  // Vérifier que eventType est dans la whitelist
  if (!Object.values(SEC_EVENT_TYPES).includes(eventType)) {
    logger.warn(`[securityAudit] Type d'event non whitelisté : ${eventType}`);
    return;
  }

  // Enrichissement automatique du contexte browser (si dispo)
  const enrichedDetails = {
    ...details,
    ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
    locale: typeof navigator !== "undefined" ? navigator.language : null,
    timestamp_client: new Date().toISOString(),
  };

  try {
    await supabase.from("audit_log").insert({
      structure_id: ctx?.structureId || null,
      user_id: ctx?.userId || null,
      user_email: ctx?.userEmail || null,
      action: eventType,
      entite: "security_event",
      entite_id: null,
      details: enrichedDetails,
    });
  } catch (e) {
    // Ne JAMAIS bloquer le flow sécurité parce que l'audit a échoué
    logger.warn("[securityAudit] insert failed:", e?.message);
  }
}

// =============================================================
//  Helpers prêts à l'emploi (1 par catégorie)
// =============================================================

/**
 * Login réussi.
 */
export async function auditLoginSuccess(supabase, ctx, details = {}) {
  return logSecurityEvent(supabase, ctx, SEC_EVENT_TYPES.LOGIN_SUCCESS, details);
}

/**
 * Login échoué (mot de passe invalide, email inexistant, etc.).
 * NOTE : ctx.userId peut être null car on n'a pas encore identifié l'user.
 */
export async function auditLoginFailed(supabase, ctx, details = {}) {
  return logSecurityEvent(supabase, ctx, SEC_EVENT_TYPES.LOGIN_FAILED, details);
}

/**
 * Login bloqué par le rate-limit (5 tentatives échouées en 5 min).
 */
export async function auditLoginBlocked(supabase, ctx, details = {}) {
  return logSecurityEvent(supabase, ctx, SEC_EVENT_TYPES.LOGIN_BLOCKED, details);
}

/**
 * Accès refusé à une page admin (user non admin qui tente d'y aller).
 */
export async function auditAccessDenied(supabase, ctx, details = {}) {
  return logSecurityEvent(supabase, ctx, SEC_EVENT_TYPES.ACCESS_DENIED, details);
}

/**
 * 2FA enrôlé / désactivé.
 */
export async function auditMfaEnrolled(supabase, ctx, details = {}) {
  return logSecurityEvent(supabase, ctx, SEC_EVENT_TYPES.MFA_ENROLLED, details);
}
export async function auditMfaUnenrolled(supabase, ctx, details = {}) {
  return logSecurityEvent(supabase, ctx, SEC_EVENT_TYPES.MFA_UNENROLLED, details);
}

/**
 * Honeypot anti-bot déclenché : un bot a rempli un champ caché.
 */
export async function auditHoneypotTriggered(supabase, ctx, details = {}) {
  return logSecurityEvent(supabase, ctx, SEC_EVENT_TYPES.HONEYPOT_TRIGGERED, details);
}

/**
 * Export massif (CSV de patients, etc.).
 */
export async function auditBulkExport(supabase, ctx, details = {}) {
  return logSecurityEvent(supabase, ctx, SEC_EVENT_TYPES.BULK_EXPORT, details);
}

/**
 * Action admin (gestion des rôles, des collectivités, etc.).
 */
export async function auditAdminAction(supabase, ctx, details = {}) {
  return logSecurityEvent(supabase, ctx, SEC_EVENT_TYPES.ADMIN_ACTION, details);
}
