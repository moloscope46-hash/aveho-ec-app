// =============================================================
//  lib/capacitor.js — Helpers app native Capacitor (0.62.44)
//  Détecte si on tourne sur iOS/Android native vs web,
//  expose des wrappers qui fallback en web si pas natif.
//
//  Utilisation :
//    import { isNative, takePhoto, registerPush, getCurrentLocation, vibrate } from "@/lib/capacitor";
//    if (isNative()) { ... }
//    const photo = await takePhoto(); // marche natif OU web (input file)
// =============================================================

// ===== DÉTECTION PLATEFORME =====
export function isNative() {
  if (typeof window === "undefined") return false;
  return !!(window.Capacitor?.isNativePlatform?.() ||
           window.Capacitor?.platform === "ios" ||
           window.Capacitor?.platform === "android");
}

export function getPlatform() {
  if (typeof window === "undefined") return "server";
  return window.Capacitor?.platform || "web";
}

export function isIOS() { return getPlatform() === "ios"; }
export function isAndroid() { return getPlatform() === "android"; }

// ===== CAMERA (photo / scan barcode) =====
/**
 * Prend une photo avec la caméra native si dispo, fallback file input web
 * @param {{quality?:number, allowEditing?:boolean, source?:'camera'|'photos'|'prompt'}} opts
 * @returns {Promise<{dataUrl:string, format:string}|null>}
 */
export async function takePhoto(opts = {}) {
  const { quality = 80, allowEditing = false, source = "prompt" } = opts;

  if (isNative() && window.Capacitor?.Plugins?.Camera) {
    try {
      const { Camera } = window.Capacitor.Plugins;
      const photo = await Camera.getPhoto({
        quality,
        allowEditing,
        resultType: "DataUrl",
        source: source === "camera" ? "CAMERA" : source === "photos" ? "PHOTOS" : "PROMPT",
        saveToGallery: false,
      });
      return { dataUrl: photo.dataUrl, format: photo.format };
    } catch (e) {
      console.warn("[capacitor] Camera failed, fallback web:", e);
    }
  }

  // Fallback web : input file
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = source === "camera" ? "environment" : undefined;
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result, format: file.type.split("/")[1] || "jpeg" });
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

// ===== PUSH NOTIFICATIONS =====
/**
 * Enregistre l'appareil pour les push notifications natives
 * @param {{onToken:(token:string)=>void, onNotification:(notif:any)=>void, onError:(err:any)=>void}} handlers
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function registerPush(handlers = {}) {
  if (!isNative() || !window.Capacitor?.Plugins?.PushNotifications) {
    // Fallback web : Web Push API (déjà en place via service worker)
    return { ok: false, error: "Not native — utilise Web Push API à la place" };
  }
  try {
    const { PushNotifications } = window.Capacitor.Plugins;
    // Permission
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") {
      return { ok: false, error: "Permission refusée" };
    }
    // Register
    await PushNotifications.register();

    // Listeners
    PushNotifications.addListener("registration", (token) => {
      console.log("[push] token registered:", token.value);
      handlers.onToken?.(token.value);
    });
    PushNotifications.addListener("registrationError", (error) => {
      console.error("[push] registration error:", error);
      handlers.onError?.(error);
    });
    PushNotifications.addListener("pushNotificationReceived", (notif) => {
      console.log("[push] received:", notif);
      handlers.onNotification?.(notif);
    });
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[push] action:", action);
      handlers.onNotification?.(action);
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ===== GEOLOCATION (tracking chauffeur amélioré) =====
/**
 * Position GPS courante (haute précision si native)
 */
export async function getCurrentLocation(opts = {}) {
  if (isNative() && window.Capacitor?.Plugins?.Geolocation) {
    try {
      const { Geolocation } = window.Capacitor.Plugins;
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== "granted") throw new Error("Permission refusée");
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, ...opts });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
      };
    } catch (e) { console.warn("[capacitor] Geoloc native failed, fallback web:", e); }
  }
  // Fallback web
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("Géoloc non supportée"));
    navigator.geolocation.getCurrentPosition(
      (p) => res({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy,
        altitude: p.coords.altitude,
        speed: p.coords.speed,
        heading: p.coords.heading,
      }),
      rej,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ===== HAPTIC FEEDBACK (vibration) =====
export async function vibrate(style = "medium") {
  if (isNative() && window.Capacitor?.Plugins?.Haptics) {
    try {
      const { Haptics } = window.Capacitor.Plugins;
      if (style === "light") await Haptics.impact({ style: "LIGHT" });
      else if (style === "heavy") await Haptics.impact({ style: "HEAVY" });
      else await Haptics.impact({ style: "MEDIUM" });
      return true;
    } catch (e) { console.warn("Haptic failed:", e); }
  }
  // Fallback web
  if (navigator.vibrate) {
    navigator.vibrate(style === "light" ? 10 : style === "heavy" ? 50 : 25);
    return true;
  }
  return false;
}

// ===== STORAGE NATIF (préférences) =====
export async function setPref(key, value) {
  const v = typeof value === "string" ? value : JSON.stringify(value);
  if (isNative() && window.Capacitor?.Plugins?.Preferences) {
    await window.Capacitor.Plugins.Preferences.set({ key, value: v });
    return;
  }
  try { localStorage.setItem(key, v); } catch {}
}
export async function getPref(key) {
  if (isNative() && window.Capacitor?.Plugins?.Preferences) {
    const r = await window.Capacitor.Plugins.Preferences.get({ key });
    return r.value;
  }
  try { return localStorage.getItem(key); } catch { return null; }
}

// ===== PARTAGE NATIF =====
export async function share({ title, text, url, dialogTitle }) {
  if (isNative() && window.Capacitor?.Plugins?.Share) {
    try {
      await window.Capacitor.Plugins.Share.share({ title, text, url, dialogTitle });
      return true;
    } catch (e) { console.warn("Share native failed:", e); }
  }
  // Fallback web : navigator.share
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return true; } catch {}
  }
  // Fallback ultime : copier l'URL
  if (url) {
    await navigator.clipboard?.writeText(url);
    return "copied";
  }
  return false;
}

// ===== INFO RÉSEAU =====
export async function getNetworkStatus() {
  if (isNative() && window.Capacitor?.Plugins?.Network) {
    try {
      const s = await window.Capacitor.Plugins.Network.getStatus();
      return { connected: s.connected, type: s.connectionType };
    } catch {}
  }
  return {
    connected: typeof navigator !== "undefined" ? navigator.onLine : true,
    type: typeof navigator !== "undefined" && navigator.connection?.effectiveType || "unknown",
  };
}
