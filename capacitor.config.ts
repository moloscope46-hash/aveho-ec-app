// =============================================================
//  Capacitor config (0.62.44 update) — App native iOS/Android
//  Mode "server live" : pointe vers Vercel, pas besoin de rebuild à chaque update web
//
//  Setup initial (UNE SEULE FOIS) :
//    npm install @capacitor/core @capacitor/cli
//    npm install @capacitor/ios @capacitor/android
//    npm install @capacitor/camera @capacitor/push-notifications
//    npm install @capacitor/geolocation @capacitor/preferences @capacitor/app
//    npm install @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard
//    npm install @capacitor/local-notifications @capacitor/share @capacitor/network
//    npx cap add ios
//    npx cap add android
//    npx cap sync
//
//  Build native (à chaque update) :
//    npx cap sync
//    npx cap open ios       # Xcode → Run sur device/simulator → archive pour App Store
//    npx cap open android   # Android Studio → Run sur device/emulator → build APK/AAB
// =============================================================
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.aveho.ec',
  appName: 'Aveho EC',
  webDir: 'out',                            // si tu veux du build statique embarqué
  bundledWebRuntime: false,

  // 🔑 MODE PRODUCTION : pointe directement vers Vercel
  // Avantage : pas besoin de re-builder l'app native à chaque mise à jour web,
  //            l'app native est juste un wrapper qui charge le site Vercel.
  server: {
    url: 'https://aveho-ec-app.vercel.app',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
    // Permet à l'app de revenir sur le site Vercel même après navigation hors-app
    allowNavigation: [
      'aveho-ec-app.vercel.app',
      '*.vercel.app',
      '*.supabase.co',
      'api-adresse.data.gouv.fr',
      'router.project-osrm.org',
      '*.openstreetmap.org',
      '*.tile.openstreetmap.org',
    ],
  },

  android: {
    backgroundColor: '#142131',              // navy AVEHO
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,      // true en dev seulement
    minWebViewVersion: 70,
  },

  ios: {
    backgroundColor: '#142131',
    contentInset: 'automatic',
    scrollEnabled: true,
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#142131',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#7CC8C8',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#142131',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7CC8C8',
      sound: 'beep.wav',
    },
    Camera: {
      // permissions demandées au runtime via Camera.requestPermissions()
    },
    Geolocation: {
      // permissions demandées au runtime pour tracking GPS chauffeur
    },
  },
};

export default config;
