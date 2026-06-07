// =============================================================
//  Capacitor config (0.62.0) — App native iOS/Android
//  Pour wrapper Aveho EC en app native installable depuis stores
//
//  Setup :
//    npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
//    npx cap init aveho-ec com.aveho.ec
//    npm run build && npm run export   # Next.js static export
//    npx cap add ios
//    npx cap add android
//    npx cap sync
//    npx cap open ios       # ouvre Xcode
//    npx cap open android   # ouvre Android Studio
// =============================================================
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aveho.ec',
  appName: 'Aveho EC',
  webDir: 'out',  // Next.js static export
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    // En dev, pointer vers prod ou local
    // url: 'https://aveho-ec-app.vercel.app',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#142131',
      androidSplashResourceName: 'splash',
      showSpinner: true,
      spinnerColor: '#7CC8C8',
    },
    StatusBar: {
      backgroundColor: '#142131',
      style: 'DARK',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Geolocation: {
      // Permissions pour tracking GPS chauffeur
    },
    Camera: {
      // Permissions pour scan code-barres natif
    },
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#142131',
  },
  android: {
    backgroundColor: '#142131',
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
