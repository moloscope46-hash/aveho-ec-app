"use client";
import { useEffect, useState } from "react";

export default function InstallPWA() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // enregistrer le service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // déjà installé ? (mode standalone)
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (standalone) { setInstalled(true); return; }

    // Android / desktop Chrome : événement beforeinstallprompt
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => { setShow(false); setInstalled(true); });

    // iOS Safari : pas de prompt, on détecte et on montre une aide
    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
    if (isIOS && isSafari && !standalone) { setShow(true); setIosHint(true); }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferred(null);
  }

  if (installed || !show) return null;

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;

  // iOS : bandeau d'instructions (pas de prompt natif)
  if (iosHint) {
    return (
      <div className="pwa-ios">
        <i className="ti ti-device-mobile" />
        <span>Installer l'appli : touchez <b>Partager</b> <i className="ti ti-share" /> puis <b>« Sur l'écran d'accueil »</b></span>
        <button onClick={() => setShow(false)} aria-label="Fermer"><i className="ti ti-x" /></button>
      </div>
    );
  }

  // Mobile : grosse barre en bas. Desktop : bouton discret en haut à droite.
  return isMobile ? (
    <button className="pwa-mobile" onClick={install}>
      <i className="ti ti-download" /> Installer l'application Aveho
    </button>
  ) : (
    <button className="pwa-desktop" onClick={install} title="Installer l'application">
      <i className="ti ti-download" /> Installer l'app
    </button>
  );
}
