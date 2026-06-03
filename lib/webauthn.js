"use client";
// =============================================================
//  lib/webauthn.js (Alpha 0.55.17)
//
//  Gestion connexion biométrique : empreinte ET détection faciale.
//
//  WebAuthn natif (Touch ID, Face ID, Windows Hello, fingerprint
//  Android) — l'OS choisit la méthode dispo. On sépare logiquement
//  les 2 méthodes pour l'UX : l'user choisit 'empreinte' ou 'face'
//  selon ce qu'il veut activer, et au login on lui propose la
//  méthode adéquate.
//
//  Storage local IndexedDB (clé = email) :
//    {
//      email,
//      empreinte: { credential_id, refresh_token, user_id, device_name, created_at },
//      face:      { credential_id, refresh_token, user_id, device_name, created_at },
//    }
// =============================================================

import { logger } from "./logger";

// ----- Détection de support -----

export function isWebAuthnSupported() {
  return typeof window !== "undefined"
    && "PublicKeyCredential" in window
    && typeof window.PublicKeyCredential === "function";
}

export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isMobileDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isTouchMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouchTablet = (navigator.maxTouchPoints || 0) > 1 && window.innerWidth < 1100;
  return isTouchMobile || isTouchTablet;
}

// Détecte si l'appareil supporte probablement la reconnaissance faciale
export function isLikelyFaceCapable() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua) && /OS 1[1-9]/.test(ua)) return true;
  if (/iPad/.test(ua) && /OS 1[3-9]/.test(ua)) return true;
  if (/Windows NT 1[0-9]/.test(ua)) return true;
  if (/Macintosh/.test(ua)) return true;
  return false;
}

export function getDeviceName() {
  if (typeof navigator === "undefined") return "Mon appareil";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "Mon iPhone";
  if (/iPad/.test(ua)) return "Mon iPad";
  if (/Android/.test(ua)) {
    return "Mon téléphone Android";
  }
  if (/Macintosh/.test(ua)) return "Mon Mac";
  if (/Windows/.test(ua)) return "Mon ordinateur (Windows)";
  if (/Linux/.test(ua)) return "Mon ordinateur (Linux)";
  return "Mon appareil";
}

// Labels et icônes pour les méthodes
export const METHOD_LABEL = {
  empreinte: "Empreinte digitale",
  face: "Détection faciale",
};
export const METHOD_ICON = {
  empreinte: "ti-fingerprint",
  face: "ti-face-id",
};
export const METHOD_COLOR = {
  empreinte: "#185FA5",
  face: "#7a6fb0",
};

// ----- IndexedDB local -----

const DB_NAME = "aveho-webauthn";
const STORE = "sessions";

function openDb() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") {
      rej(new Error("IndexedDB non disponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "email" });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function dbGet(email) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const r = store.get(email);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => rej(r.error);
  });
}

async function dbPut(item) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const r = store.put(item);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

async function dbDelete(email) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const r = store.delete(email);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

// Migration douce ancien format → nouveau format
// Ancien : { email, credential_id, refresh_token, ... }
// Nouveau : { email, empreinte: {...}, face: {...} }
function normalizeStorage(item) {
  if (!item) return null;
  if (item.empreinte || item.face) return item;
  if (item.credential_id && item.refresh_token) {
    return {
      email: item.email,
      empreinte: {
        credential_id: item.credential_id,
        refresh_token: item.refresh_token,
        user_id: item.user_id,
        device_name: item.device_name,
        created_at: item.created_at,
      },
    };
  }
  return { email: item.email };
}

// ----- Helpers base64url -----

function ab2b64u(buf) {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64u2ab(b64u) {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const bin = atob(b64 + pad);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// ----- API publique : check local credentials -----

// Renvoie les méthodes activées localement pour cet email : [] | ['empreinte'] | ['face'] | ['empreinte','face']
export async function getAvailableMethods(email) {
  if (!isWebAuthnSupported() || !email) return [];
  try {
    const raw = await dbGet(email.toLowerCase().trim());
    const item = normalizeStorage(raw);
    if (!item) return [];
    const methods = [];
    if (item.empreinte?.credential_id && item.empreinte?.refresh_token) methods.push("empreinte");
    if (item.face?.credential_id && item.face?.refresh_token) methods.push("face");
    return methods;
  } catch {
    return [];
  }
}

export async function hasLocalCredential(email, method = null) {
  const methods = await getAvailableMethods(email);
  if (!method) return methods.length > 0;
  return methods.includes(method);
}

export async function removeLocalCredential(email, method = null) {
  try {
    if (!method) {
      await dbDelete(email.toLowerCase().trim());
    } else {
      const raw = await dbGet(email.toLowerCase().trim());
      const item = normalizeStorage(raw);
      if (!item) return;
      delete item[method];
      if (!item.empreinte && !item.face) {
        await dbDelete(email.toLowerCase().trim());
      } else {
        await dbPut(item);
      }
    }
  } catch (e) {
    logger.warn("[WebAuthn] remove local fail:", e);
  }
}

// =============================================================
//  REGISTRATION
// =============================================================

export async function registerBiometric({
  supabase,
  email,
  userId,
  structureId,
  refreshToken,
  deviceName,
  authMethod = "empreinte",
}) {
  if (!isWebAuthnSupported()) throw new Error("WebAuthn non supporté sur ce navigateur");
  if (!email || !userId || !refreshToken) throw new Error("email, userId et refreshToken requis");
  if (!["empreinte", "face"].includes(authMethod)) throw new Error("authMethod invalide");

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(userId);

  let credential;
  try {
    credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Aveho EC", id: window.location.hostname },
        user: {
          id: userIdBytes,
          name: email,
          displayName: `${email} (${METHOD_LABEL[authMethod]})`,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    });
  } catch (e) {
    if (e.name === "NotAllowedError") throw new Error(`${METHOD_LABEL[authMethod]} refusée ou annulée`);
    if (e.name === "InvalidStateError") throw new Error("Cet appareil est déjà enregistré pour ce compte avec cette méthode");
    throw new Error(`Échec activation : ${e.message || e.name}`);
  }
  if (!credential) throw new Error("Aucun credential créé");

  const credentialId = ab2b64u(credential.rawId);
  const finalDeviceName = deviceName || getDeviceName();

  const { error: srvErr } = await supabase
    .from("webauthn_credentials")
    .insert({
      user_id: userId,
      structure_id: structureId,
      credential_id: credentialId,
      device_name: finalDeviceName,
      user_agent: navigator.userAgent.slice(0, 200),
      auth_method: authMethod,
      active: true,
    });
  if (srvErr) logger.warn("[WebAuthn] insert serveur fail:", srvErr);

  // Fusion avec entrée existante
  const emailKey = email.toLowerCase().trim();
  const raw = await dbGet(emailKey);
  const existing = normalizeStorage(raw) || { email: emailKey };
  existing[authMethod] = {
    credential_id: credentialId,
    refresh_token: refreshToken,
    user_id: userId,
    device_name: finalDeviceName,
    created_at: new Date().toISOString(),
  };
  await dbPut(existing);

  return { credentialId, deviceName: finalDeviceName, authMethod };
}

// =============================================================
//  AUTHENTICATION
// =============================================================

export async function authenticateBiometric({ supabase, email, method = "empreinte" }) {
  if (!isWebAuthnSupported()) throw new Error("WebAuthn non supporté");
  if (!email) throw new Error("Email requis");
  if (!["empreinte", "face"].includes(method)) throw new Error("Méthode invalide");

  const emailKey = email.toLowerCase().trim();
  const raw = await dbGet(emailKey);
  const item = normalizeStorage(raw);
  const session = item?.[method];

  if (!session) throw new Error(`${METHOD_LABEL[method]} non configurée sur cet appareil pour cet email`);

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  let assertion;
  try {
    assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{
          type: "public-key",
          id: b64u2ab(session.credential_id),
          transports: ["internal"],
        }],
        userVerification: "required",
        timeout: 60000,
      },
    });
  } catch (e) {
    if (e.name === "NotAllowedError") throw new Error(`${METHOD_LABEL[method]} refusée ou annulée`);
    throw new Error(`Échec authentification : ${e.message || e.name}`);
  }
  if (!assertion) throw new Error("Aucune signature obtenue");

  let data, error;
  try {
    const result = await supabase.auth.refreshSession({ refresh_token: session.refresh_token });
    data = result.data;
    error = result.error;
  } catch (e) {
    error = e;
  }

  if (error || !data?.session) {
    // 0.57.27 : distinguer erreur réseau vs token expiré
    // - Si erreur réseau / Supabase down → NE PAS supprimer le credential
    //   (l'user retentera quand le réseau sera revenu)
    // - Si refresh_token vraiment expiré/invalide → supprimer + message clair
    const isExpiredToken =
      error?.status === 400 ||                          // Supabase renvoie 400 "Invalid refresh token"
      /refresh.*token|invalid_grant|expir/i.test(error?.message || "");

    if (!isExpiredToken) {
      // Erreur réseau / autre → garder le credential, message neutre
      throw new Error("Connexion à Supabase impossible. Vérifiez votre réseau et réessayez.");
    }

    // Token vraiment expiré → on supprime + message clair
    await removeLocalCredential(email, method);
    throw new Error(
      "Votre " + METHOD_LABEL[method] + " n'est plus valide (inutilisée depuis longtemps). " +
      "Connectez-vous avec votre mot de passe, elle sera automatiquement réactivée."
    );
  }

  if (data.session.refresh_token) {
    const fresh = await dbGet(emailKey);
    const freshItem = normalizeStorage(fresh) || { email: emailKey };
    if (freshItem[method]) {
      freshItem[method].refresh_token = data.session.refresh_token;
      freshItem[method].last_used_at = new Date().toISOString();
      await dbPut(freshItem);
    }
  }

  try {
    await supabase.rpc("update_webauthn_last_used", {
      p_credential_id: session.credential_id,
    });
  } catch (e) {
    logger.warn("[WebAuthn] update last_used fail:", e);
  }

  return { ok: true, user: data.user, method };
}

// =============================================================
//  Gestion credentials (pour /profil)
// =============================================================

export async function listMyCredentials(supabase) {
  const { data, error } = await supabase
    .from("v_my_webauthn_credentials")
    .select("*");
  if (error) throw error;
  return data || [];
}

export async function revokeCredential(supabase, credentialUuid, email = null, method = null) {
  const { data, error } = await supabase.rpc("revoke_webauthn_credential", {
    p_credential_uuid: credentialUuid,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Révocation échouée");
  if (email && method) await removeLocalCredential(email, method);
  return data;
}

// =============================================================
//  Helper opt-in
// =============================================================

const OPT_IN_KEY = "aveho:webauthn:opt-in-state";

export async function shouldShowBiometricOptIn(email) {
  if (!isMobileDevice() && !isLikelyFaceCapable()) return false;
  if (!isWebAuthnSupported()) return false;
  const platformOk = await isPlatformAuthenticatorAvailable();
  if (!platformOk) return false;

  // Si user a déjà les 2 méthodes activées → on ne propose plus
  const methods = await getAvailableMethods(email);
  if (methods.length >= 2) return false;

  try {
    const raw = localStorage.getItem(OPT_IN_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      if (state.skippedAt && Date.now() - state.skippedAt < 7 * 24 * 3600 * 1000) {
        return false;
      }
    }
  } catch {}
  return true;
}

export function markOptInSkipped() {
  try { localStorage.setItem(OPT_IN_KEY, JSON.stringify({ skippedAt: Date.now() })); } catch {}
}
export function clearOptInState() {
  try { localStorage.removeItem(OPT_IN_KEY); } catch {}
}

// =============================================================
//  0.57.27 : Sync des refresh_tokens biométriques
//
//  Bug fix : avant cette version, le refresh_token stocké pour
//  empreinte/face n'était mis à jour QUE lors d'un login biométrique
//  réussi. Si le user se connectait toujours par mot de passe,
//  le refresh_token biométrique vieillissait jusqu'à expiration
//  (typiquement 60 jours côté Supabase) → erreur "Session expirée"
//  au prochain essai biométrique.
//
//  Fix : à chaque login mot de passe réussi, on met à jour le
//  refresh_token biométrique stocké pour cet email/appareil avec
//  le refresh_token frais reçu de la session courante.
//
//  Conséquence : tant que le user se connecte régulièrement (par
//  n'importe quel moyen), son refresh_token biométrique reste valide.
// =============================================================
export async function syncBiometricRefreshTokens({ supabase, email }) {
  if (!email) return;
  try {
    // Récupérer la session courante
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.refresh_token) return;

    // Voir si une biométrie existe localement pour cet email
    const emailKey = email.toLowerCase().trim();
    const raw = await dbGet(emailKey);
    const item = normalizeStorage(raw);
    if (!item) return;

    // Sync sur empreinte ET face si présentes
    let updated = false;
    for (const method of ["empreinte", "face"]) {
      if (item[method]?.refresh_token) {
        item[method].refresh_token = session.refresh_token;
        item[method].last_synced_at = new Date().toISOString();
        updated = true;
      }
    }
    if (updated) {
      await dbPut(item);
      logger.info("[WebAuthn] Refresh tokens biométriques synchronisés");
    }
  } catch (e) {
    // Non-bloquant : si ça échoue, on log mais on ne casse pas le login
    logger.warn("[WebAuthn] syncBiometricRefreshTokens fail:", e);
  }
}
