// =============================================================
//  lib/logger.js (Alpha 0.55.26)
//
//  Logger qui sait taire les logs en production pour éviter
//  d'exposer des infos sensibles dans la console des utilisateurs
//  finaux (analyse de bug, screen sharing, etc.).
//
//  Usage : import { logger } from '@/lib/logger';
//          logger.warn("[Module]", "message", { context });
//
//  En production (NODE_ENV=production), seuls les .error
//  et .security passent. Le reste est filtré.
// =============================================================

const isProd = typeof window !== "undefined"
  && window.location?.hostname !== "localhost"
  && window.location?.hostname !== "127.0.0.1";

// Activé en dev par défaut. En prod, désactivé sauf si flag explicite.
const DEBUG_FLAG_KEY = "aveho:debug-logs";
function isDebugEnabled() {
  if (!isProd) return true;
  try {
    return localStorage.getItem(DEBUG_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

// Liste de mots-clés sensibles à masquer dans tous les logs
// 0.57.28 : ajout des données médicales/RGPD (email, NIR, RPPS, patient...)
const SENSITIVE_KEYS = [
  // Auth / secrets
  "password", "passwd", "mot_de_passe", "mdp",
  "token", "refresh_token", "access_token", "secret", "api_key", "apikey",
  "credential_id",
  // 0.57.28 : RGPD - identifiants personnels
  "email", "telephone", "mobile", "phone",
  // 0.57.28 : RGPD - données médicales
  "numero_secu", "nir", "numero_amc",
  "patient_nom", "patient_prenom", "patient_email", "patient_telephone",
  "date_naissance", "lieu_naissance",
  // 0.57.28 : Identifiants professionnels santé
  "rpps", "adeli", "finess",
];

// 0.57.28 : Patterns regex pour masquer dans les strings (URL avec token, etc.)
const URL_SENSITIVE_PATTERNS = [
  /(\?|&)(token|access_token|refresh_token|api_key|apikey|secret|password|key)=[^&\s]+/gi,
  /(Bearer\s+)[A-Za-z0-9._-]+/g,
  /(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g,  // JWT pattern
];

function maskString(s) {
  if (typeof s !== "string") return s;
  let out = s;
  for (const pat of URL_SENSITIVE_PATTERNS) {
    out = out.replace(pat, (match, p1) => {
      // Pour les query params : garde la clé, masque la valeur
      if (p1 === "?" || p1 === "&") {
        const eq = match.indexOf("=");
        return match.slice(0, eq + 1) + "[REDACTED]";
      }
      // Pour Bearer et JWT : masque tout sauf le préfixe
      if (p1?.startsWith("Bearer")) return p1 + "[REDACTED]";
      return "[REDACTED]";
    });
  }
  return out;
}

/** Recursivement masque les valeurs sensibles dans un objet */
function redact(value, depth = 0) {
  if (depth > 4) return "[deep]";
  if (value == null) return value;
  if (typeof value === "string") {
    // 0.57.28 : masque les patterns sensibles (token URL, Bearer, JWT)
    const masked = maskString(value);
    // Tronque les strings très longues qui peuvent être des tokens
    if (masked.length > 100) return masked.slice(0, 12) + "…[redacted]";
    return masked;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 10).map((v) => redact(v, depth + 1));

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
}

function safeArgs(args) {
  return args.map((a) => (typeof a === "object" ? redact(a) : a));
}

export const logger = {
  /** Log de debug — silent en prod */
  debug: (...args) => {
    if (!isDebugEnabled()) return;
    console.log(...safeArgs(args));
  },
  /** Info — silent en prod */
  info: (...args) => {
    if (!isDebugEnabled()) return;
    console.info(...safeArgs(args));
  },
  /** Warning — silent en prod sauf flag debug */
  warn: (...args) => {
    if (!isDebugEnabled()) return;
    console.warn(...safeArgs(args));
  },
  /** Error — toujours affiché (mais redacted) */
  error: (...args) => {
    console.error(...safeArgs(args));
  },
  /** Sécurité — toujours affiché (warning visible pour audit) */
  security: (...args) => {
    console.warn("[SECURITY]", ...safeArgs(args));
  },
  /** Active/désactive les logs en prod via localStorage */
  enableDebug: () => {
    try {
      localStorage.setItem(DEBUG_FLAG_KEY, "1");
      console.log("[Logger] Debug enabled");
    } catch {}
  },
  disableDebug: () => {
    try {
      localStorage.removeItem(DEBUG_FLAG_KEY);
      console.log("[Logger] Debug disabled");
    } catch {}
  },
  /** Helpers pour redact dans le code */
  redact,
};

// Helper global pour activer le debug depuis la console
if (typeof window !== "undefined") {
  window.__avehoEnableDebug = () => logger.enableDebug();
  window.__avehoDisableDebug = () => logger.disableDebug();
}
