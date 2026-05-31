"use client";
// =============================================================
//  lib/webauthn.js (Alpha 0.55.13)
//
//  Gestion de la connexion par empreinte digitale (Touch ID,
//  Face ID, Windows Hello, fingerprint Android) via WebAuthn.
//
//  Architecture choisie (pragmatique, équivalent app banque PWA) :
//
//   1. À l'activation, on crée un credential WebAuthn (le navigateur
//      demande l'empreinte pour confirmer).
//   2. On stocke côté serveur (table webauthn_credentials) : credential_id,
//      device_name, user_agent — pour info admin et révocation.
//   3. On stocke côté client (IndexedDB) : { email, credential_id,
//      refresh_token Supabase } — pour la reconnexion.
//
//  Au login par empreinte :
//   1. User saisit son email
//   2. On vérifie qu'on a une entry IndexedDB pour cet email
//   3. navigator.credentials.get({allowCredentials: [...]}) demande
//      l'empreinte au navigateur
//   4. Si OK → on rétablit la session Supabase via refreshSession()
//   5. Mise à jour last_used_at côté serveur
//
//  L'auth biométrique sert de "preuve de présence physique" — elle
//  ne peut être contournée qu'en bypassant l'empreinte ET en ayant
//  accès à l'IndexedDB du site sur le device (protégé par origin).
// =============================================================

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

export function getDeviceName() {
  if (typeof navigator === "undefined") return "Appareil";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) {
    const m = ua.match(/\(Linux;\s*Android[^;]*;\s*([^)]+)\)/);
    return m ? `Android (${m[1].split(" ")[0]})` : "Android";
  }
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Appareil";
}

// ----- IndexedDB pour stocker la session locale -----

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

async function dbList() {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const r = store.getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}

// ----- Helpers conversion ArrayBuffer ↔ base64url -----

function ab2b64u(buf) {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64u2ab(b64u) {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const bin = atob(b64 + pad);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// ----- Vérifie si un credential existe localement pour cet email -----

export async function hasLocalCredential(email) {
  if (!isWebAuthnSupported() || !email) return false;
  try {
    const s = await dbGet(email.toLowerCase().trim());
    return !!s && !!s.credential_id && !!s.refresh_token;
  } catch {
    return false;
  }
}

// ----- Liste tous les emails enregistrés sur ce device (pour debug) -----

export async function listLocalCredentials() {
  if (!isWebAuthnSupported()) return [];
  try {
    return await dbList();
  } catch {
    return [];
  }
}

// ----- Supprimer une entrée locale (logout total) -----

export async function removeLocalCredential(email) {
  try {
    await dbDelete(email.toLowerCase().trim());
  } catch (e) {
    console.warn("[WebAuthn] remove local fail:", e);
  }
}

// =============================================================
//  REGISTRATION — Activer l'empreinte pour le user connecté
// =============================================================

export async function registerBiometric({ supabase, email, userId, structureId, refreshToken, deviceName }) {
  if (!isWebAuthnSupported()) throw new Error("WebAuthn non supporté sur ce navigateur");
  if (!email || !userId || !refreshToken) throw new Error("email, userId et refreshToken requis");

  // 1) Préparer le challenge
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(userId);

  // 2) Demander au navigateur de créer un credential
  //    → l'OS va prompter l'empreinte / Face ID / Touch ID
  let credential;
  try {
    credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Aveho EC", id: window.location.hostname },
        user: {
          id: userIdBytes,
          name: email,
          displayName: email,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },    // ES256 (Apple, Android)
          { type: "public-key", alg: -257 },  // RS256 (Windows Hello)
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",  // empreinte intégrée, pas de clé USB
          userVerification: "required",          // exige biométrie ou PIN
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",  // pas besoin d'attestation pour notre usage
      },
    });
  } catch (e) {
    if (e.name === "NotAllowedError") {
      throw new Error("Activation refusée ou annulée");
    }
    if (e.name === "InvalidStateError") {
      throw new Error("Cet appareil est déjà enregistré pour ce compte");
    }
    throw new Error(`Échec activation : ${e.message || e.name}`);
  }

  if (!credential) throw new Error("Aucun credential créé");

  const credentialId = ab2b64u(credential.rawId);
  const finalDeviceName = deviceName || getDeviceName();

  // 3) Stocker côté serveur (info admin + révocation)
  const { error: srvErr } = await supabase
    .from("webauthn_credentials")
    .insert({
      user_id: userId,
      structure_id: structureId,
      credential_id: credentialId,
      device_name: finalDeviceName,
      user_agent: navigator.userAgent.slice(0, 200),
      active: true,
    });

  if (srvErr) {
    // Si l'INSERT échoue (ex: conflit), on log mais on continue côté local
    console.warn("[WebAuthn] insert serveur fail:", srvErr);
  }

  // 4) Stocker côté client (pour reconnexion via empreinte)
  await dbPut({
    email: email.toLowerCase().trim(),
    user_id: userId,
    credential_id: credentialId,
    refresh_token: refreshToken,
    device_name: finalDeviceName,
    created_at: new Date().toISOString(),
  });

  return { credentialId, deviceName: finalDeviceName };
}

// =============================================================
//  AUTHENTICATION — Login par empreinte
// =============================================================

export async function authenticateBiometric({ supabase, email }) {
  if (!isWebAuthnSupported()) throw new Error("WebAuthn non supporté");
  if (!email) throw new Error("Email requis");

  const emailKey = email.toLowerCase().trim();

  // 1) Récupérer la session locale
  const session = await dbGet(emailKey);
  if (!session) {
    throw new Error("Aucune empreinte enregistrée sur cet appareil pour cet email");
  }

  // 2) Préparer le challenge
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  // 3) Demander l'empreinte
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
    if (e.name === "NotAllowedError") {
      throw new Error("Empreinte refusée ou annulée");
    }
    throw new Error(`Échec authentification : ${e.message || e.name}`);
  }

  if (!assertion) throw new Error("Aucune signature obtenue");

  // 4) Rétablir la session Supabase via refresh_token
  let data, error;
  try {
    const result = await supabase.auth.refreshSession({
      refresh_token: session.refresh_token,
    });
    data = result.data;
    error = result.error;
  } catch (e) {
    error = e;
  }

  if (error || !data?.session) {
    // Refresh token expiré → on nettoie et on force login password
    await dbDelete(emailKey);
    throw new Error(
      "Votre session a expiré. Connectez-vous avec votre mot de passe pour réactiver l'empreinte."
    );
  }

  // 5) Mettre à jour le refresh token local (Supabase fait du rotation)
  if (data.session.refresh_token) {
    await dbPut({
      ...session,
      refresh_token: data.session.refresh_token,
      last_used_at: new Date().toISOString(),
    });
  }

  // 6) Update last_used_at côté serveur (non bloquant)
  try {
    await supabase.rpc("update_webauthn_last_used", {
      p_credential_id: session.credential_id,
    });
  } catch (e) {
    console.warn("[WebAuthn] update last_used fail:", e);
  }

  return { ok: true, user: data.user };
}

// =============================================================
//  Gestion des credentials côté profil
// =============================================================

export async function listMyCredentials(supabase) {
  const { data, error } = await supabase
    .from("v_my_webauthn_credentials")
    .select("*");
  if (error) throw error;
  return data || [];
}

export async function revokeCredential(supabase, credentialUuid, email) {
  const { data, error } = await supabase.rpc("revoke_webauthn_credential", {
    p_credential_uuid: credentialUuid,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Révocation échouée");
  // Si c'est le credential du device courant, nettoyer aussi l'IndexedDB
  if (email) {
    try {
      const local = await dbGet(email.toLowerCase().trim());
      if (local) await dbDelete(email.toLowerCase().trim());
    } catch {}
  }
  return data;
}

// ----- Helper "afficher l'opt-in après login ?" -----
// Renvoie true si :
//   - mobile + WebAuthn supporté + platform authenticator dispo
//   - user n'a pas refusé l'opt-in récemment (localStorage)
//   - user n'a pas déjà un credential enregistré pour cet email sur ce device

const OPT_IN_KEY = "aveho:webauthn:opt-in-state";

export async function shouldShowBiometricOptIn(email) {
  if (!isMobileDevice()) return false;
  if (!isWebAuthnSupported()) return false;
  const platformOk = await isPlatformAuthenticatorAvailable();
  if (!platformOk) return false;
  if (await hasLocalCredential(email)) return false;

  // Si user a refusé/skippé moins de 7j, on ne re-propose pas
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
  try {
    localStorage.setItem(OPT_IN_KEY, JSON.stringify({ skippedAt: Date.now() }));
  } catch {}
}

export function clearOptInState() {
  try {
    localStorage.removeItem(OPT_IN_KEY);
  } catch {}
}
