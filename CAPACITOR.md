# 📱 Aveho EC — App native iOS/Android (Capacitor)

## Pré-requis
- Mac (pour iOS) avec Xcode 15+
- Android Studio (pour Android)
- Compte Apple Developer (99 $/an pour App Store)
- Compte Google Play Developer (25 $ une fois)

## Installation

```bash
# 1. Installer Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/splash-screen @capacitor/status-bar
npm install @capacitor/push-notifications @capacitor/geolocation @capacitor/camera

# 2. Build Next.js en mode static export
# Dans next.config.mjs : `output: 'export'`
npm run build

# 3. Init Capacitor
npx cap init aveho-ec com.aveho.ec

# 4. Ajouter plateformes
npx cap add ios
npx cap add android

# 5. Sync code → projet natif
npx cap sync
```

## Développement

```bash
# Build + sync
npm run build && npx cap sync

# Ouvrir Xcode (iOS)
npx cap open ios

# Ouvrir Android Studio (Android)
npx cap open android

# Lancer en device/simulateur depuis l'IDE natif
```

## Production

### iOS — TestFlight + App Store
1. Xcode → Product → Archive
2. Distribution → App Store Connect
3. Upload + soumettre review

### Android — Google Play
1. Android Studio → Build → Generate Signed APK/AAB
2. Upload AAB sur Play Console
3. Soumettre review

## Fonctionnalités natives ajoutées
- **Push notifications** natives (au lieu de web push)
- **Géolocalisation** background pour tracking GPS chauffeur
- **Caméra** native pour scan code-barres (meilleur que BarcodeDetector web)
- **Splash screen** Aveho avec logo
- **Status bar** themée navy

## Limitations static export
- Pas de SSR / Server Actions (mais on en utilise pas)
- Pas de `next/image` avec optimisation serveur (utiliser `unoptimized: true`)
- Pas de routes API Next.js (utiliser edge functions Supabase à la place — déjà le cas)

## Configuration `next.config.mjs` pour static export

```js
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};
```
