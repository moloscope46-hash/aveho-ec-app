"use client";
// =============================================================
//  app/LazyLayoutChrome.js (Alpha 0.57.8)
//
//  Regroupe les composants UI globaux qui sont chargés en lazy
//  (next/dynamic ssr: false) pour ne pas alourdir le bundle initial.
//
//  Pourquoi ce fichier ?
//  Next 15 interdit `ssr: false` dans next/dynamic au sein d'un
//  Server Component (= layout.js par défaut). Solution : déplacer
//  les imports dynamic dans un Client Component séparé.
//
//  Composants ici :
//   - InstallBanner       : proposition d'installation PWA (conditionnel)
//   - KeyboardHelp        : aide raccourcis (Shift+?)
//   - VersionCheck        : check nouvelle version (asynchrone après load)
//   - AnnoncesBanner      : annonces admin (conditionnel)
//   - FocusMode           : mode focus Esc Esc (interaction)
//   - GeolocPrompt        : demande géolocalisation (une fois)
//   - BiometricOptInModal : proposition empreinte mobile (conditionnel)
//   - FloatingActionBar   : barre flottante (visible mais après LCP)
//
//  Tous ces composants utilisent des browser APIs (navigator,
//  localStorage, etc.) — ssr: false est cohérent.
// =============================================================

import dynamic from "next/dynamic";

const InstallBanner = dynamic(() => import("./InstallBanner"), { ssr: false });
const KeyboardHelp = dynamic(() => import("./KeyboardHelp"), { ssr: false });
const VersionCheck = dynamic(() => import("./VersionCheck"), { ssr: false });
const AnnoncesBanner = dynamic(() => import("./AnnoncesBanner"), { ssr: false });
const FocusMode = dynamic(() => import("./FocusMode"), { ssr: false });
const GeolocPrompt = dynamic(() => import("./GeolocPrompt"), { ssr: false });
const BiometricOptInModal = dynamic(() => import("./BiometricOptInModal"), { ssr: false });
const FloatingActionBar = dynamic(() => import("./FloatingActionBar"), { ssr: false });

export default function LazyLayoutChrome() {
  return (
    <>
      {/* Alpha 0.36.0 : banner contextuel d'installation PWA */}
      <InstallBanner />
      <KeyboardHelp />
      {/* Alpha 0.48.0 : vérification version dispo */}
      <VersionCheck />
      {/* Alpha 0.50.0 : annonces broadcast admin */}
      <AnnoncesBanner />
      {/* Alpha 0.52.0 : mode focus Esc Esc */}
      <FocusMode />
      {/* Alpha 0.55.0 : demande géolocalisation au premier login */}
      <GeolocPrompt />
      {/* Alpha 0.55.13 : proposition activation empreinte après login (mobile) */}
      <BiometricOptInModal />
      {/* Alpha 0.56.16 : barre d'actions flottante en bas (mobile + desktop) */}
      <FloatingActionBar />
    </>
  );
}
