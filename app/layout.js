import "./globals.css";
import InstallPWA from "./InstallPWA";
import InstallBanner from "./InstallBanner";
import KeyboardHelp from "./KeyboardHelp";
import OfflineBanner from "./OfflineBanner";
import LectureSeuleBadge from "./LectureSeuleBadge";
import GlobalSearch from "./GlobalSearch";
import AlertToastContainer from "./components/AlertToast";
import { DialogsHost } from "./dialogs";
import VersionCheck from "./VersionCheck";
import AnnoncesBanner from "./AnnoncesBanner";
import GlobalErrorCapture from "./GlobalErrorCapture";
import FocusMode from "./FocusMode";
import GeolocPrompt from "./GeolocPrompt";
import BiometricOptInModal from "./BiometricOptInModal";
import FloatingActionBar from "./FloatingActionBar";

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
    <html lang="fr">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
        {children}
        <InstallPWA />
        {/* Alpha 0.36.0 : banner contextuel d'installation PWA */}
        <InstallBanner />
        <KeyboardHelp />
        {/* Alpha 0.46.0 : host global pour dialogs.confirm() / dialogs.alert() */}
        <DialogsHost />
        {/* Alpha 0.48.0 : vérification version dispo */}
        <VersionCheck />
        {/* Alpha 0.50.0 : annonces broadcast admin */}
        <AnnoncesBanner />
        {/* Alpha 0.52.0 : capture erreurs JS globales → app_logs */}
        <GlobalErrorCapture />
        {/* Alpha 0.52.0 : mode focus Esc Esc */}
        <FocusMode />
        {/* Alpha 0.55.0 : demande géolocalisation au premier login */}
        <GeolocPrompt />
        {/* Alpha 0.55.13 : proposition activation empreinte après login (mobile) */}
        <BiometricOptInModal />
        {/* Alpha 0.56.16 : barre d'actions flottante en bas (mobile + desktop) */}
        <FloatingActionBar />
      </body>
    </html>
  );
}
