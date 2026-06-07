// =============================================================
//  Capacitor config (0.62.48) — Format JS (pas de TypeScript requis)
//  Mode "server live" : pointe vers Vercel
// =============================================================
/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'fr.aveho.ec',
  appName: 'Aveho EC',
  webDir: 'out',
  bundledWebRuntime: false,

  server: {
    url: 'https://aveho-ec-app.vercel.app',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
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
    backgroundColor: '#142131',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
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
    Keyboard: { resize: 'body', style: 'DARK', resizeOnFullScreen: true },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7CC8C8',
      sound: 'beep.wav',
    },
  },
};

module.exports = config;
