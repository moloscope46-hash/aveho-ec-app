# 📱 Aveho EC — App native iOS / Android avec Capacitor (0.62.44)

App native wrapper qui charge le site Vercel. Avantage : **pas besoin de re-builder l'app native à chaque update web**.

---

## 🚀 Prérequis

### Pour iOS
- Mac avec **Xcode 15+** (App Store, gratuit)
- Compte **Apple Developer** (99 $/an) pour publier
- CocoaPods : `sudo gem install cocoapods`

### Pour Android
- **Android Studio** (gratuit, https://developer.android.com/studio)
- JDK 17+
- Compte **Google Play Console** (25 $ one-shot) pour publier

### Communs
- Node.js 18+

---

## ⚙️ Setup initial (UNE SEULE FOIS)

```bash
cd C:\aveho-ec-app

# 1. Install Capacitor + plugins
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/camera @capacitor/push-notifications
npm install @capacitor/geolocation @capacitor/preferences
npm install @capacitor/splash-screen @capacitor/status-bar
npm install @capacitor/keyboard @capacitor/local-notifications
npm install @capacitor/share @capacitor/network @capacitor/haptics
npm install @capacitor/app

# 2. Ajouter plateformes (crée dossiers ios/ android/)
npx cap add ios
npx cap add android

# 3. Sync initial
npx cap sync
```

---

## 🔄 Mode "server live" (recommandé)

Le `capacitor.config.ts` est configuré pour pointer vers `https://aveho-ec-app.vercel.app`.

**Avantages** :
- Pas besoin de re-builder l'app native à chaque update web
- Les users voient les mises à jour immédiatement
- Build native simple (juste un wrapper)

**Update natif** (seulement si tu ajoutes un nouveau plugin, change l'icône/splash, ou modifies des permissions) :
```bash
npx cap sync
npx cap open ios       # ou android
# Run/Archive dans Xcode/Android Studio
```

---

## 🍎 Build iOS

```bash
npx cap sync ios
npx cap open ios
```

Dans Xcode :
1. **Signing & Capabilities** : sélectionne ton Apple Developer team
2. Active : **Push Notifications**, **Background Modes** (Remote notifications + Location updates)
3. Run sur device : Cmd+R
4. TestFlight / App Store : Product → Archive → Distribute App

### Info.plist (permissions)
```xml
<key>NSCameraUsageDescription</key>
<string>Aveho EC utilise la caméra pour scanner les codes-barres et photographier le matériel</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Aveho EC utilise votre position pour le tracking des tournées de livraison</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Aveho EC utilise votre position en arrière-plan pour les tournées chauffeur</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Aveho EC accède à votre photothèque pour les photos de matériel</string>
```

---

## 🤖 Build Android

```bash
npx cap sync android
npx cap open android
```

Dans Android Studio :
1. Wait pour Gradle sync (2-5 min la 1ère fois)
2. Build → Run sur device/emulator
3. Play Store : Build → Generate Signed Bundle → **AAB**

### AndroidManifest.xml (permissions)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## 🔔 Push notifications natives

### iOS (APNS)
1. Apple Developer → Certificates → Crée un certificat APNS (.p8)
2. Upload dans Firebase Console (si tu passes par Firebase)
3. Active "Push Notifications" capability dans Xcode

### Android (FCM)
1. Crée un projet Firebase
2. Télécharge `google-services.json` → `android/app/`
3. Active le plugin Firebase dans Android Studio

### Backend
L'edge function `send-push` doit envoyer via :
- **APNS** pour iOS (token avec p8)
- **FCM** pour Android (server key)

Le token natif est récupéré côté front via `registerPush()` (voir `lib/capacitor.js`) et stocké dans `push_subscriptions.endpoint`.

---

## 🎨 Icons & Splash

```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor "#142131" --splashBackgroundColor "#142131"
```

Met ton logo dans `resources/icon.png` (1024×1024) et `resources/splash.png` (2732×2732).

---

## 🛠 Helper côté code : `lib/capacitor.js`

Le helper expose des wrappers cross-platform :

```js
import { isNative, takePhoto, registerPush, getCurrentLocation, vibrate, share } from "@/lib/capacitor";

// Détection
if (isNative()) { /* code uniquement natif */ }

// Photo native si dispo, fallback file input web
const photo = await takePhoto({ source: "camera", quality: 80 });

// Push natives + enregistrement token
await registerPush({ onToken: (t) => saveToDb(t) });

// Géoloc haute précision
const pos = await getCurrentLocation();

// Vibration / haptic
await vibrate("medium");
```

**Page test** : `/parametres/app-native` pour tester chaque feature interactivement.

---

## 🐛 Debug

### iOS
- Safari → Develop → [Device] → app → console
- Xcode console pour logs natifs

### Android
- Chrome → `chrome://inspect` → inspect device
- Android Studio Logcat

---

## 📦 Publication

### App Store
1. Xcode → Product → Archive
2. Window → Organizer → Distribute App → App Store Connect
3. App Store Connect → screenshots, description, mots-clés
4. Submit for Review (~1-3 jours)

### Play Store
1. Android Studio → Build → Generate Signed Bundle → AAB
2. Play Console → Release → Create new release → upload AAB
3. Store listing (screenshots, description)
4. Submit (~1-7 jours)

---

## 🆘 Troubleshooting

| Erreur | Solution |
|--------|----------|
| `Pod install failed` | `cd ios/App && pod install --repo-update` |
| `Cannot resolve symbol R` Android | Tools → Sync Project with Gradle Files |
| `Trust certificate` iOS device | Settings → General → Device Management → Trust |
| Push KO | Vérifier certificats APNS/FCM + capabilities Xcode |
| Pas de hot reload web | URL du `server.url` dans `capacitor.config.ts` |

---

**Version Capacitor recommandée** : 6.x (https://capacitorjs.com)
