"use client";
// =============================================================
//  /parametres/app-native — Activation features natives (0.62.44)
//  Push notifications native · permissions · diagnostics
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { isNative, getPlatform, registerPush, getCurrentLocation, vibrate, getNetworkStatus, share, takePhoto } from "../../../lib/capacitor";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import BackButton from "../../components/BackButton";

export default function AppNativePage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [platform, setPlatform] = useState("");
  const [native, setNative] = useState(false);
  const [pushStatus, setPushStatus] = useState("");
  const [pushToken, setPushToken] = useState("");
  const [geolocStatus, setGeolocStatus] = useState("");
  const [networkStatus, setNetworkStatus] = useState(null);
  const [testPhoto, setTestPhoto] = useState(null);

  useEffect(() => {
    setPlatform(getPlatform());
    setNative(isNative());
    getNetworkStatus().then(setNetworkStatus);
  }, []);

  async function activerPush() {
    setPushStatus("Demande d'autorisation...");
    const result = await registerPush({
      onToken: async (token) => {
        setPushToken(token);
        // Enregistrer le token dans Supabase pour pouvoir push à ce device
        try {
          await supabase.from("push_subscriptions").insert({
            user_id: auth.user?.id,
            endpoint: token,                 // Pour APNS/FCM, le "endpoint" est le token natif
            user_agent: navigator.userAgent,
          });
        } catch (e) { console.warn("Save token failed:", e); }
        setPushStatus("✅ Push natives activées · token enregistré");
      },
      onNotification: (notif) => {
        console.log("Push reçue:", notif);
        vibrate("medium");
      },
      onError: (err) => setPushStatus(`❌ ${err}`),
    });
    if (!result.ok && !pushToken) setPushStatus(`❌ ${result.error}`);
  }

  async function testGeoloc() {
    setGeolocStatus("Recherche position...");
    try {
      const pos = await getCurrentLocation();
      setGeolocStatus(`📍 ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)} · ±${Math.round(pos.accuracy)}m`);
      vibrate("light");
    } catch (e) { setGeolocStatus(`❌ ${e.message}`); }
  }

  async function testCamera() {
    const p = await takePhoto({ source: "camera", quality: 60 });
    if (p) setTestPhoto(p.dataUrl);
  }

  async function testVibrate() { await vibrate("heavy"); }
  async function testShare() {
    await share({
      title: "Aveho EC",
      text: "Application de gestion PSAD/FBM",
      url: "https://aveho-ec-app.vercel.app",
    });
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 880 }}>
        <BackButton />
        <PageHead icon="ti-device-mobile" title="App native (Capacitor)" subtitle="Activation des features natives iOS/Android" />

        {/* Plateforme détectée */}
        <Panel style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 12px", color: "#142131" }}>📱 Plateforme détectée</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{
              padding: "10px 16px", borderRadius: 10, fontWeight: 700,
              background: native ? "rgba(94,160,90,.12)" : "rgba(239,159,39,.12)",
              color: native ? "#5aa05a" : "#EF9F27",
              border: `1px solid ${native ? "#5aa05a" : "#EF9F27"}40`,
            }}>
              <i className={`ti ${native ? "ti-device-mobile" : "ti-browser"}`} /> {native ? "App native" : "Navigateur web"}
            </div>
            <div style={{ fontSize: 13, color: "#5a6878" }}>Plateforme : <b>{platform || "—"}</b></div>
            {networkStatus && (
              <div style={{ fontSize: 13, color: "#5a6878" }}>
                Réseau : <b style={{ color: networkStatus.connected ? "#5aa05a" : "#e35d5b" }}>{networkStatus.connected ? "Connecté" : "Hors ligne"}</b> · {networkStatus.type}
              </div>
            )}
          </div>
          {!native && (
            <div style={{ marginTop: 14, padding: 10, background: "rgba(24,95,165,.08)", borderLeft: "3px solid #185FA5", borderRadius: 6, fontSize: 12, color: "#5a6878" }}>
              ℹ Tu es sur navigateur. Les features natives (push iOS/Android, camera native, etc.) ne sont actives que dans l'app installée depuis l'App Store / Play Store. Voir <code>CAPACITOR.md</code> pour le build.
            </div>
          )}
        </Panel>

        {/* Tests des features */}
        <Panel style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 14px", color: "#142131" }}>🧪 Tests des features natives</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>

            <FeatBox icon="ti-bell" title="Push notifications" status={pushStatus} onTest={activerPush}>
              {pushToken && <div style={{ fontSize: 9, color: "#5a6878", marginTop: 6, wordBreak: "break-all", fontFamily: "Consolas,monospace" }}>{pushToken.substring(0, 30)}...</div>}
            </FeatBox>

            <FeatBox icon="ti-map-pin" title="Géolocalisation" status={geolocStatus} onTest={testGeoloc} />

            <FeatBox icon="ti-camera" title="Caméra" onTest={testCamera}>
              {testPhoto && <img src={testPhoto} alt="" style={{ width: "100%", borderRadius: 6, marginTop: 6, maxHeight: 100, objectFit: "cover" }} />}
            </FeatBox>

            <FeatBox icon="ti-vibrate" title="Vibration / Haptic" onTest={testVibrate} />

            <FeatBox icon="ti-share" title="Partage natif" onTest={testShare} />

            <FeatBox icon="ti-wifi" title="État réseau" status={networkStatus ? `${networkStatus.connected ? "Connecté" : "Offline"} · ${networkStatus.type}` : ""} onTest={() => getNetworkStatus().then(setNetworkStatus)} />
          </div>
        </Panel>

        {/* Doc setup */}
        <Panel style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 10px", color: "#142131" }}>📚 Setup déploiement</h3>
          <p style={{ fontSize: 13, color: "#5a6878", lineHeight: 1.6 }}>
            Pour builder l'app native et la déployer sur App Store / Play Store, consulte le fichier <code style={{ background: "#f4f7fa", padding: "2px 6px", borderRadius: 4 }}>CAPACITOR.md</code> à la racine du projet. Il contient toutes les commandes nécessaires (install, build, sync, ouverture Xcode / Android Studio, signing, archive, upload).
          </p>
          <div style={{ marginTop: 12, padding: 14, background: "#0d1620", color: "#e4eaf0", borderRadius: 8, fontSize: 12, fontFamily: "Consolas,monospace", overflowX: "auto" }}>
            <div style={{ color: "#7CC8C8" }}># Install Capacitor une seule fois</div>
            <div>npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android</div>
            <div>npm install @capacitor/camera @capacitor/push-notifications @capacitor/geolocation</div>
            <div>npm install @capacitor/preferences @capacitor/haptics @capacitor/share @capacitor/network</div>
            <br />
            <div style={{ color: "#7CC8C8" }}># Setup plateformes (une seule fois)</div>
            <div>npx cap add ios</div>
            <div>npx cap add android</div>
            <br />
            <div style={{ color: "#7CC8C8" }}># À chaque update : sync</div>
            <div>npx cap sync</div>
            <br />
            <div style={{ color: "#7CC8C8" }}># Ouvrir dans Xcode / Android Studio</div>
            <div>npx cap open ios       <span style={{ color: "#8a98a8" }}># puis Run sur device/simulator</span></div>
            <div>npx cap open android   <span style={{ color: "#8a98a8" }}># puis Run sur device/emulator</span></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function FeatBox({ icon, title, status, children, onTest }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#185FA5,#0d4a8c)", color: "#fff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
          <i className={`ti ${icon}`} />
        </div>
        <strong style={{ fontSize: 13, color: "#142131" }}>{title}</strong>
      </div>
      <button onClick={onTest} style={{ marginTop: 10, width: "100%", background: "#142131", color: "#fff", border: "none", borderRadius: 6, padding: "7px 12px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        Tester
      </button>
      {status && <div style={{ marginTop: 8, fontSize: 11.5, color: "#5a6878", lineHeight: 1.4 }}>{status}</div>}
      {children}
    </div>
  );
}
