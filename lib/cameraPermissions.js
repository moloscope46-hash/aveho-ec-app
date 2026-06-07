// =============================================================
//  lib/cameraPermissions.js (0.62.87)
//
//  Helper pour demander explicitement les permissions caméra/micro
//  au navigateur. Force l'apparition du popup de demande de
//  permission si pas déjà accordée.
//
//  Usage :
//    const ok = await requestCameraPermission();
//    if (!ok) { alert("Permission refusée"); return; }
//    // Puis tu peux instancier html5-qrcode ou MediaRecorder
// =============================================================

/**
 * Demande la permission caméra au navigateur.
 * Retourne true si accordée, false sinon.
 * Affiche le popup natif du navigateur si pas encore décidé.
 *
 * @param {Object} opts - Options
 * @param {boolean} opts.video - Demander la caméra (default true)
 * @param {boolean} opts.audio - Demander le micro (default false)
 * @param {string} opts.facingMode - "environment" (arrière, default) ou "user" (frontale)
 * @returns {Promise<boolean>} true si permission accordée
 */
export async function requestCameraPermission({
  video = true,
  audio = false,
  facingMode = "environment",
} = {}) {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    console.error("[Camera] navigator.mediaDevices.getUserMedia non supporté");
    alert("Ton navigateur ne supporte pas l'accès à la caméra.\n\nUtilise Chrome, Firefox ou Safari récent.");
    return false;
  }

  // Vérifier HTTPS (obligatoire pour mediaDevices sauf localhost)
  if (location.protocol !== "https:" && location.hostname !== "localhost") {
    console.error("[Camera] HTTPS requis pour mediaDevices");
    alert("La caméra nécessite HTTPS.\n\nUtilise l'application depuis aveho-ec-app.vercel.app et non en HTTP local.");
    return false;
  }

  try {
    // Demander permission (popup navigateur si pas encore décidé)
    const constraints = {
      video: video ? { facingMode: { ideal: facingMode } } : false,
      audio: audio,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Stop immédiatement le stream — on voulait juste la permission
    stream.getTracks().forEach(t => t.stop());

    console.log("[Camera] ✓ Permission accordée");
    return true;
  } catch (err) {
    console.error("[Camera] Permission refusée :", err.name, err.message);

    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      alert(
        "Permission caméra refusée.\n\n" +
        "📱 Mobile : va dans Paramètres → Site → Caméra → Autoriser\n" +
        "💻 Desktop : clique sur l'icône caméra dans la barre d'adresse → Autoriser\n\n" +
        "Puis recharge la page."
      );
    } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      alert("Aucune caméra détectée sur ce périphérique.");
    } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      alert("La caméra est utilisée par une autre application. Ferme les autres apps puis réessaie.");
    } else if (err.name === "OverconstrainedError") {
      // Réessayer sans facingMode
      try {
        const stream2 = await navigator.mediaDevices.getUserMedia({ video: true, audio });
        stream2.getTracks().forEach(t => t.stop());
        return true;
      } catch (e2) {
        alert("Impossible d'utiliser la caméra : " + e2.message);
      }
    } else {
      alert("Erreur caméra : " + err.message);
    }
    return false;
  }
}

/**
 * Vérifie le statut actuel de la permission caméra sans déclencher de popup.
 * @returns {Promise<'granted'|'denied'|'prompt'|'unknown'>}
 */
export async function checkCameraPermissionStatus() {
  if (!navigator.permissions?.query) return "unknown";
  try {
    const result = await navigator.permissions.query({ name: "camera" });
    return result.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return "unknown";
  }
}

/**
 * Liste les caméras disponibles (après permission accordée).
 * @returns {Promise<Array<{deviceId, label, facingMode}>>}
 */
export async function listCameras() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === "videoinput")
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || "Caméra",
        facingMode: d.label?.toLowerCase().includes("back") || d.label?.toLowerCase().includes("rear")
          ? "environment" : "user",
      }));
  } catch {
    return [];
  }
}
