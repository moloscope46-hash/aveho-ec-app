"use client";
// =============================================================
//  components/PushSubscribe.js (0.62.75)
//
//  Demande la permission et abonne le user aux push notifications.
//  Stocke le PushSubscription dans Supabase (table push_subscriptions).
//
//  Requiert :
//   - NEXT_PUBLIC_VAPID_PUBLIC_KEY dans .env / Vercel
//   - Table push_subscriptions créée
//   - Service worker enregistré (déjà OK avec sw.js)
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  if (!base64String) return null;
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function PushSubscribe({ compact = false }) {
  const auth = useAuth();
  const supabase = createClient();
  const [status, setStatus] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [hasSub, setHasSub] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission);

    // Vérifie si déjà abonné
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => setHasSub(!!sub));
    }).catch(() => {});
  }, []);

  async function subscribe() {
    if (!auth?.user) { alert("Connecte-toi d'abord"); return; }
    if (!VAPID_PUBLIC_KEY) {
      alert("⚠️ NEXT_PUBLIC_VAPID_PUBLIC_KEY non configurée.\n\nGénère les clés VAPID :\nnpx web-push generate-vapid-keys\n\nPuis ajoute la clé publique dans Vercel.");
      return;
    }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm);
      if (perm !== "granted") {
        alert("Permission refusée. Tu peux la réactiver dans les paramètres du navigateur.");
        setBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = subscription.toJSON();

      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: auth.user.id,
        structure_id: auth.structureId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 200),
      }, { onConflict: "endpoint" });

      if (error) throw error;

      setHasSub(true);
      alert("✓ Notifications activées sur cet appareil !");
    } catch (e) {
      console.error(e);
      alert("Erreur : " + e.message);
    }
    setBusy(false);
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setHasSub(false);
      alert("Notifications désactivées sur cet appareil.");
    } catch (e) { alert("Erreur : " + e.message); }
    setBusy(false);
  }

  if (status === "unsupported") {
    return compact ? null : (
      <div style={{ padding: 12, background: "#fafbfc", borderRadius: 8, fontSize: 12, color: "#8a98a8" }}>
        <i className="ti ti-bell-off" /> Notifications non supportées sur ce navigateur
      </div>
    );
  }

  const isOn = hasSub && status === "granted";

  if (compact) {
    return (
      <button onClick={isOn ? unsubscribe : subscribe} disabled={busy}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 12px",
          background: isOn ? "linear-gradient(135deg, #5aa05a, #4a8a4a)" : "rgba(255,255,255,.08)",
          color: isOn ? "#fff" : "#cfd5dd",
          border: `1px solid ${isOn ? "transparent" : "rgba(255,255,255,.15)"}`,
          borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit",
        }}>
        <i className={`ti ti-bell${isOn ? "-ringing" : ""}`} />
        {busy ? "..." : isOn ? "Notifs ON" : "Activer notifs"}
      </button>
    );
  }

  return (
    <div style={{
      padding: 16,
      background: isOn ? "linear-gradient(135deg, rgba(90,160,90,.08), rgba(124,200,200,.05))" : "linear-gradient(135deg, rgba(24,95,165,.04), rgba(124,200,200,.04))",
      border: `1px solid ${isOn ? "rgba(90,160,90,.3)" : "#e3e9ee"}`,
      borderRadius: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${isOn ? "#5aa05a, #4a8a4a" : "#185FA5, #7CC8C8"})`,
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>
          <i className={`ti ti-bell${isOn ? "-ringing" : ""}`} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>
            Notifications push {isOn ? "actives" : "inactives"}
          </div>
          <div style={{ fontSize: 11.5, color: "#5a6878" }}>
            {isOn ? "Tu recevras les alertes DI urgentes, SAV, livraisons" : "Active pour recevoir les alertes en temps réel"}
          </div>
        </div>
      </div>
      <button onClick={isOn ? unsubscribe : subscribe} disabled={busy}
        style={{
          width: "100%", padding: "10px 14px",
          background: isOn ? "rgba(227,93,91,.10)" : "linear-gradient(135deg, #185FA5, #7CC8C8)",
          color: isOn ? "#c0392b" : "#fff",
          border: isOn ? "1px solid #e35d5b30" : "none",
          borderRadius: 8,
          fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>
        {busy ? "..." : isOn ? "Désactiver" : "Activer les notifications"}
      </button>
    </div>
  );
}
