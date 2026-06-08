"use client";
// =============================================================
//  InstallPWA — Enregistrement du service worker uniquement
//  Alpha 0.16.0 : le bouton "Télécharger l'appli" est maintenant
//  dans le menu utilisateur (UserMenu.js). Ce composant ne fait
//  plus que registrer le SW au boot.
// =============================================================
import { useEffect } from "react";

export default function InstallPWA() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
