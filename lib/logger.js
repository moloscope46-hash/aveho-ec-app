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
const SENSITIVE_KEYS = [
  "password", "passwd", "mot_de_passe", "mdp",
  "token", "refresh_token", "access_token", "secret", "api_key", "apikey",
  "credential_id",
];

/** Recursivement masque les valeurs sensibles dans un objet */
function redact(value, depth = 0) {
  if (depth > 4) return "[deep]";
  if (value == null) return value;
  if (typeof value === "string") {
    // Tronque les strings très longues qui peuvent être des tokens
    if (value.length > 100) return value.slice(0, 12) + "…[redacted]";
    return value;
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
