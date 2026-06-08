"use client";
// =============================================================
//  lib/notifSounds.js (0.62.130)
//
//  Helpers pour notifications natives navigateur + sons.
//  Compatible PWA.
// =============================================================

const STORAGE_PREF_KEY = "aveho_notif_prefs";

// Préférences user (sons + notifications natives activés ?)
export function getNotifPrefs() {
  if (typeof window === "undefined") return { sound: true, native: true };
  try {
    const s = localStorage.getItem(STORAGE_PREF_KEY);
    return s ? JSON.parse(s) : { sound: true, native: true };
  } catch { return { sound: true, native: true }; }
}

export function setNotifPrefs(prefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREF_KEY, JSON.stringify(prefs));
  } catch {}
}

// Play un son court via Web Audio API (pas de fichier requis)
let audioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return null; }
  }
  return audioCtx;
}

export function playNotifSound(type = "info") {
  const prefs = getNotifPrefs();
  if (!prefs.sound) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  // Frequences par type
  const TONES = {
    info:    [{ f: 660, t: 0.08 }, { f: 880, t: 0.10 }],
    success: [{ f: 523, t: 0.06 }, { f: 659, t: 0.08 }, { f: 783, t: 0.10 }],
    warning: [{ f: 440, t: 0.10 }, { f: 380, t: 0.12 }],
    error:   [{ f: 220, t: 0.15 }, { f: 196, t: 0.20 }],
    urgent:  [{ f: 880, t: 0.08 }, { f: 660, t: 0.08 }, { f: 880, t: 0.08 }],
  };
  const seq = TONES[type] || TONES.info;
  let t = ctx.currentTime;
  seq.forEach(({ f, t: dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
    t += dur;
  });
}

// Notification native navigateur
export async function showNativeNotif(titre, options = {}) {
  const prefs = getNotifPrefs();
  if (!prefs.native) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "denied") return;
  if (Notification.permission === "default") {
    try {
      const res = await Notification.requestPermission();
      if (res !== "granted") return;
    } catch { return; }
  }
  try {
    const notif = new Notification(titre, {
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-72.png",
      ...options,
    });
    if (options.link) {
      notif.onclick = () => {
        window.focus();
        window.location.href = options.link;
        notif.close();
      };
    }
    // Auto-close après 8s
    setTimeout(() => notif.close(), 8000);
  } catch {}
}

// Demander la permission (à appeler depuis un user gesture)
export async function requestNotifPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch { return "denied"; }
}

// Trigger combined : son + native (utilisé par realtime)
export function notify(titre, message, options = {}) {
  const type = options.type || "info";
  playNotifSound(type);
  showNativeNotif(titre, { body: message, ...options });
}
