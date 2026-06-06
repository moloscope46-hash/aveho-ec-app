import "./globals.css";
import { Quicksand } from "next/font/google";
// 0.57.8 : Composants visibles dès le 1er render ou très petits → import statique
import InstallPWA from "./InstallPWA";
import OfflineBanner from "./OfflineBanner";
import LectureSeuleBadge from "./LectureSeuleBadge";
import GlobalSearch from "./GlobalSearch";
import AlertToastContainer from "./components/AlertToast";
import { DialogsHost } from "./dialogs";
import GlobalErrorCapture from "./GlobalErrorCapture";
// 0.58.10 : transition douce entre routes (fade + slide-up)
import PageTransition from "./components/PageTransition";
// 0.58.23 : Mode présentation pour démos clients (Ctrl+Shift+P)
import PresentationModeBoot from "./PresentationModeBoot";
// 0.58.28 : Hints clavier en bas pendant modes présentation/focus
import KeyboardHints from "./KeyboardHints";
// 0.57.8 : Composants non critiques pour le LCP regroupés dans un Client
// Component pour permettre next/dynamic ssr: false (interdit dans les
// Server Components depuis Next 15). Économise du JS sur le bundle initial.
import LazyLayoutChrome from "./LazyLayoutChrome";
// 0.58.83 : FAB Continuer sur le téléphone (QR code de la page courante)
import SwitchToPhoneFab from "./components/SwitchToPhoneFab";

// 0.57.8 : Quicksand via next/font (self-hosted + préchargée + 0 FOUT/CLS)
// Avant : link href Google Fonts CDN dans le head — round-trip réseau bloquant
//          + risque de layout shift au swap.
// Après : next/font télécharge le woff2 au build, l'inline en preload et
// applique font-display: swap optimisé pour pas de CLS.
const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-quicksand",
});

export const metadata = {
  title: "Aveho — Espace Collectivité",
  description: "Espace Collectivité Aveho : établissements, patients, matériel, stock et commandes.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Aveho EC" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport = {
  themeColor: "#142131",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={quicksand.variable}>
      <head>
        {/* 0.57.8 : Quicksand est maintenant chargé via next/font (cf import).
            On garde quand même un preconnect Google Fonts au cas où d'autres
            polices seraient ajoutées plus tard. */}
        {/* 0.57.8 : Preconnect au backend Supabase pour anticiper la première
            requête API (gagne ~100ms sur le TTFB de la 1ère query). */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
        )}
        {/* Alpha 0.55.5 : Tabler icons maintenant chargés via globals.css (npm), plus de CDN bloqué par Edge/Brave */}
        {/* Alpha 0.16.1 : tags PWA modernes (le tag apple- legacy reste via appleWebApp metadata) */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Aveho EC" />
        {/* Alpha 0.36.0 : favicons multi-tailles */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        {/* Alpha 0.36.0 : splash screens iOS (un par taille d'écran connue) */}
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1290-2796.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1179-2556.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1284-2778.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1170-2532.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1125-2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1242-2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-828-1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1242-2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-750-1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-2048-2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1668-2388.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1620-2160.png" media="(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1536-2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
      </head>
      <body>
        {/* Alpha 0.18.0 : skip-link accessibilité clavier */}
        <a href="#main-content" className="skip-to-content">Aller au contenu principal</a>
        <OfflineBanner />
        <LectureSeuleBadge />
        <GlobalSearch />
        <AlertToastContainer />
        {/* 0.58.23 : init mode présentation + shortcut Ctrl+Shift+P */}
        <PresentationModeBoot />
        {/* 0.58.28 : hints clavier en bas-gauche pendant modes présentation/focus */}
        <KeyboardHints />
        {/* 0.58.10 : transition douce entre routes */}
        <PageTransition>{children}</PageTransition>
        <InstallPWA />
        {/* Alpha 0.46.0 : host global pour dialogs.confirm() / dialogs.alert() */}
        <DialogsHost />
        {/* Alpha 0.52.0 : capture erreurs JS globales → app_logs */}
        <GlobalErrorCapture />
        {/* 0.57.8 : composants non critiques pour le LCP (InstallBanner,
            KeyboardHelp, VersionCheck, AnnoncesBanner, FocusMode, GeolocPrompt,
            BiometricOptInModal, FloatingActionBar) chargés en lazy via
            next/dynamic ssr: false. Voir LazyLayoutChrome.js */}
        <LazyLayoutChrome />
        {/* 0.58.83 : FAB Continuer sur le téléphone (visible sur toutes les pages) */}
        <SwitchToPhoneFab />
      </body>
    </html>
  );
}
