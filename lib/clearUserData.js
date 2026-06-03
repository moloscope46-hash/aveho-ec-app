// =============================================================
//  lib/clearUserData.js (Alpha 0.57.35 → 0.57.37)
//
//  Purge les données user-spécifiques du device au logout.
//  Critique pour les devices PARTAGÉS (poste de soin, tablette
//  commune) où user B ne doit pas voir les traces de user A.
//
//  Données purgées :
//   - localStorage clés "aveho:*" et "aveho_*"
//     (search-history, dashboard config, cart, snooze)
//   - localStorage clés "sb-*-auth-token" (defense-in-depth
//     0.57.37 : signOut() devrait les nettoyer mais on s'assure)
//   - Caches Storage du SW via message CLEAR_USER_CACHE
//   - IndexedDB "aveho-webauthn" (credentials face/empreinte)
//     ⚠️ 0.57.37 : purgée UNIQUEMENT en mode logoutComplet (param)
//     car sinon l'user re-perd ses droits biométriques à chaque
//     logout, ce qu'on ne veut pas (sauf si flag explicite)
//
//  Données CONSERVÉES (non sensibles, persistent OK) :
//   - Service Worker installé (sera invalidé naturellement)
//   - localStorage clés non-aveho/non-sb (autres apps)
//   - aveho-debug-logs (flag debug volontaire)
// =============================================================

/**
 * Liste des préfixes localStorage à purger.
 * Si on ajoute une nouvelle clé localStorage, l'ajouter ici si
 * elle contient des données user-spécifiques.
 */
const SENSITIVE_LS_PREFIXES = [
  "aveho:",       // aveho:search-history, aveho:login-attempts
  "aveho_",       // aveho_dashboard, aveho_lecture_seule
  "ville:",       // cache ville → coords (admin carte)
  "etab-photo-",  // cache photos établissement
  "sb-",          // 0.57.37 : Supabase Auth tokens (defense-in-depth)
];

/**
 * Liste blanche : clés à NE PAS purger même si elles matchent un préfixe.
 */
const KEEP_KEYS = [
  "aveho:debug-logs",  // flag de debug volontaire, persiste exprès
];

/**
 * Purge le localStorage : enlève toutes les clés qui commencent
 * par un préfixe sensible, sauf celles de la whitelist.
 *
 * @returns {number} nombre de clés purgées
 */
export function purgeLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) return 0;

  let purged = 0;
  const toRemove = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (KEEP_KEYS.includes(key)) continue;

      const isSensitive = SENSITIVE_LS_PREFIXES.some((prefix) => key.startsWith(prefix));
      if (isSensitive) toRemove.push(key);
    }
    for (const key of toRemove) {
      try {
        localStorage.removeItem(key);
        purged++;
      } catch {}
    }
  } catch {}

  return purged;
}

/**
 * Demande au Service Worker de vider DATA_CACHE et PAGE_CACHE.
 */
export async function clearSwCache() {
  if (typeof window === "undefined" || !navigator?.serviceWorker?.controller) {
    return false;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    const timeoutId = setTimeout(() => resolve(false), 2000);

    messageChannel.port1.onmessage = (event) => {
      clearTimeout(timeoutId);
      resolve(event.data?.ok === true);
    };

    try {
      navigator.serviceWorker.controller.postMessage(
        { type: "CLEAR_USER_CACHE" },
        [messageChannel.port2]
      );
    } catch {
      clearTimeout(timeoutId);
      resolve(false);
    }
  });
}

/**
 * 0.57.37 : Purge l'IndexedDB WebAuthn (credentials face/empreinte).
 * À n'utiliser QUE si on veut vraiment effacer toute trace bio
 * (option "logout complet" / "device prêté"). Le logout normal
 * NE doit PAS purger ça, sinon l'user perd sa biométrie à chaque déco.
 *
 * @returns {Promise<boolean>}
 */
export async function clearWebauthnDb() {
  if (typeof window === "undefined" || !window.indexedDB) return false;

  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase("aveho-webauthn");
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      req.onblocked = () => resolve(false);  // Onglet ouvert ailleurs, on n'attend pas
      setTimeout(() => resolve(false), 2000);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Purge complète au logout. Appelée AVANT supabase.auth.signOut().
 *
 * @param {object} options
 * @param {boolean} options.deepClean — si true, purge AUSSI l'IndexedDB
 *                  WebAuthn (face/empreinte). Mode "logout complet".
 * @returns {Promise<{ ls_purged: number, sw_cleared: boolean, bio_cleared: boolean }>}
 */
export async function clearUserData(options = {}) {
  const ls_purged = purgeLocalStorage();
  const sw_cleared = await clearSwCache();
  const bio_cleared = options.deepClean === true
    ? await clearWebauthnDb()
    : false;
  return { ls_purged, sw_cleared, bio_cleared };
}
