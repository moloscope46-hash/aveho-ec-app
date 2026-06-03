// =============================================================
//  lib/loginRateLimit.js (Alpha 0.57.36)
//
//  Rate-limit côté client pour empêcher le bruteforce sur le
//  formulaire de login. Supabase Auth a déjà un rate-limit serveur
//  mais ce helper ajoute une protection UX :
//   - Détecte plus rapidement les patterns d'abus
//   - Affiche un message clair à l'attaquant (effet dissuasif)
//   - Évite de hammer notre quota d'auth Supabase
//
//  Stratégie :
//   - 5 tentatives échouées en 5 minutes par email
//     → blocage 60 secondes (avec compteur visible)
//   - Reset complet du compteur après login réussi
//   - État stocké dans localStorage (clé "aveho:login-attempts")
//     pour persister entre rechargements de page
//
//  ⚠️ Limites :
//   - Côté client uniquement → un attaquant peut vider son localStorage
//   - Pour vrai bruteforce protection : Supabase Auth rate-limit serveur
//     (visible dans Dashboard → Logs → Auth)
//
//  Ce helper protège contre :
//   - Bruteforce manuel/script naïf (qui ne pense pas au clear)
//   - Credential stuffing automatisé basique
//   - DoS sur notre page de login (consommation quota Supabase)
// =============================================================

const STORAGE_KEY = "aveho:login-attempts";
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 5 * 60_000;   // 5 minutes
const BLOCK_DURATION_MS = 60_000;        // 1 minute de blocage

/**
 * Lit l'état actuel des tentatives depuis localStorage.
 * Retourne null si pas de tentative ou erreur.
 */
function readAttempts() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Écrit l'état dans localStorage. Silencieux si erreur (quota, mode privé).
 */
function writeAttempts(data) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    if (!data) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Vérifie si l'email est actuellement bloqué.
 *
 * @returns {{ blocked: boolean, remainingMs?: number, attempts?: number }}
 */
export function checkLoginBlock(email) {
  if (!email || typeof email !== "string") return { blocked: false };

  const data = readAttempts();
  if (!data) return { blocked: false };

  const entry = data[email.toLowerCase()];
  if (!entry) return { blocked: false };

  const now = Date.now();

  // Si bloqué et le blocage n'a pas expiré
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      blocked: true,
      remainingMs: entry.blockedUntil - now,
      attempts: entry.count || 0,
    };
  }

  // Si le blocage a expiré, on reset (mais on garde le count si dans la fenêtre)
  if (entry.blockedUntil && entry.blockedUntil <= now) {
    delete entry.blockedUntil;
    // Reset compteur après blocage expiré
    entry.count = 0;
    entry.firstAttemptAt = now;
    data[email.toLowerCase()] = entry;
    writeAttempts(data);
  }

  return { blocked: false, attempts: entry.count || 0 };
}

/**
 * Enregistre une tentative échouée.
 *
 * @returns {{ blocked: boolean, remainingMs?: number, attemptsLeft: number }}
 */
export function recordFailedLogin(email) {
  if (!email || typeof email !== "string") {
    return { blocked: false, attemptsLeft: MAX_ATTEMPTS };
  }

  const data = readAttempts() || {};
  const key = email.toLowerCase();
  const now = Date.now();

  let entry = data[key];

  // Première tentative OU fenêtre expirée → reset
  if (!entry || (entry.firstAttemptAt && now - entry.firstAttemptAt > ATTEMPT_WINDOW_MS)) {
    entry = { count: 1, firstAttemptAt: now };
  } else {
    entry.count = (entry.count || 0) + 1;
  }

  // Si max atteint, on déclenche le blocage
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
  }

  data[key] = entry;
  writeAttempts(data);

  if (entry.blockedUntil) {
    return {
      blocked: true,
      remainingMs: entry.blockedUntil - now,
      attemptsLeft: 0,
    };
  }

  return {
    blocked: false,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - entry.count),
  };
}

/**
 * Reset après login réussi : on enlève l'entrée pour cet email.
 */
export function resetLoginAttempts(email) {
  if (!email || typeof email !== "string") return;

  const data = readAttempts();
  if (!data) return;

  const key = email.toLowerCase();
  if (data[key]) {
    delete data[key];
    writeAttempts(Object.keys(data).length > 0 ? data : null);
  }
}

/**
 * Format human-readable du temps restant.
 */
export function formatBlockTime(ms) {
  if (ms <= 0) return "0 seconde";
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec} seconde${sec > 1 ? "s" : ""}`;
  const min = Math.ceil(sec / 60);
  return `${min} minute${min > 1 ? "s" : ""}`;
}

// Export des constantes pour les tests
export const CONFIG = {
  MAX_ATTEMPTS,
  ATTEMPT_WINDOW_MS,
  BLOCK_DURATION_MS,
  STORAGE_KEY,
};
