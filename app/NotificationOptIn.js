"use client";
// =============================================================
//  NotificationOptIn — Bouton d'opt-in aux notifications push
//  Alpha 0.17.1
//
//  Utilise l'API Push standard du navigateur + VAPID.
//  La clé publique VAPID doit être exposée via NEXT_PUBLIC_VAPID_PUBLIC_KEY.
//
//  Flow :
//   1. Vérifie que le navigateur supporte push + service worker
//   2. Demande la permission utilisateur
//   3. Souscrit auprès du service worker
//   4. Enregistre la subscription dans Supabase (table push_subscriptions)
//   5. Bouton "Tester" envoie un push via send-push Edge Function
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import { logger } from "../lib/logger";

// Convertit la clé VAPID base64-url en Uint8Array (format attendu par pushManager)
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function NotificationOptIn({ auth }) {
  const supabase = createClient();
  const [state, setState] = useState("idle"); // idle | unsupported | denied | subscribed | working
  const [error, setError] = useState("");
  const [testStatus, setTestStatus] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    // Vérifier si déjà abonné
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setState("subscribed");
      });
    });
  }, []);

  async function subscribe() {
    setError("");
    setState("working");
    const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPub) {
      setError("La clé VAPID publique n'est pas configurée. Contacte l'administrateur.");
      setState("idle");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPub),
        });
      }
      // Extraire les clés en base64
      const subJson = sub.toJSON();
      // Enregistrer en base
      const { error: e } = await supabase.from("push_subscriptions").insert({
        user_id: auth.user.id,
        structure_id: auth.structureId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        user_agent: navigator.userAgent.slice(0, 200),
      });
      // 23505 = doublon (déjà inscrit), on ignore
      if (e && e.code !== "23505") throw e;
      setState("subscribed");
    } catch (err) {
      logger.error(err);
      setError(err.message || "Échec de l'inscription aux notifications");
      setState("idle");
    }
  }

  async function unsubscribe() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("idle");
    } catch (err) {
      setError(err.message);
      setState("subscribed");
    }
  }

  async function sendTest() {
    setTestStatus("Envoi en cours…");
    try {
      const { data, error: e } = await supabase.functions.invoke("send-push", {
        body: {
          structure_id: auth.structureId,
          target_user_id: auth.user.id,
          title: "Test Aveho EC",
          body: "Si tu vois ce message, les notifications push fonctionnent ✅",
          url: "/parametres",
        },
      });
      if (e) throw e;
      if (data?.sent > 0) {
        setTestStatus(`✅ Envoyé (${data.sent} appareil(s))`);
      } else if (data?.reason === "vapid_not_configured") {
        setTestStatus("⚠️ Clés VAPID non configurées côté serveur.");
      } else {
        setTestStatus("⚠️ Aucun appareil trouvé.");
      }
      setTimeout(() => setTestStatus(""), 5000);
    } catch (err) {
      setTestStatus("❌ " + (err.message || "erreur"));
      setTimeout(() => setTestStatus(""), 5000);
    }
  }

  if (state === "unsupported") {
    return (
      <div className="optin-card" style={{ background:"#f4f7fa", color:"#6c7a89" }}>
        <i className="ti ti-bell-off" />
        <div><b>Notifications non disponibles</b><br/><small>Ton navigateur ne supporte pas les notifications push.</small></div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="optin-card" style={{ background:"#fff8ec", borderColor:"#f0d59f" }}>
        <i className="ti ti-bell-x" style={{ color:"#EF9F27" }} />
        <div>
          <b>Notifications refusées</b>
          <br/><small>Tu as bloqué les notifications. Pour réactiver, va dans les paramètres de ton navigateur (icône cadenas dans la barre d'adresse → Notifications → Autoriser).</small>
        </div>
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <div>
        <div className="optin-card" style={{ background:"#eef9ef", borderColor:"#bfe2bf" }}>
          <i className="ti ti-bell-check" style={{ color:"#5aa05a" }} />
          <div>
            <b>Notifications activées</b>
            <br/><small>Tu recevras les alertes critiques sur cet appareil (DI urgentes, achats à valider, etc.).</small>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:10, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={sendTest} style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #7CC8C8", background:"#fff", color:"#2a5a5a", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <i className="ti ti-send" /> Envoyer un test
          </button>
          <button onClick={unsubscribe} style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #e1e6eb", background:"#fff", color:"#6c7a89", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            Désactiver
          </button>
          {testStatus && <span style={{ fontSize:12, color:"#6c7a89" }}>{testStatus}</span>}
        </div>
      </div>
    );
  }

  // state === "idle" ou "working"
  return (
    <div>
      <div className="optin-card" style={{ background:"#eaf7f7", borderColor:"#bfe6e6" }}>
        <i className="ti ti-bell" style={{ color:"#2a5a5a" }} />
        <div>
          <b>Activer les notifications push</b>
          <br/><small>Recevoir une alerte directement sur cet appareil lorsqu'une DI urgente est créée, un achat est à valider, ou un signalement arrive.</small>
        </div>
      </div>
      <button onClick={subscribe} disabled={state === "working"} style={{ marginTop:10, padding:"9px 16px", borderRadius:8, border:"none", background:"#7CC8C8", color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" }}>
        {state === "working" ? "Demande en cours…" : <><i className="ti ti-bell" /> Autoriser les notifications</>}
      </button>
      {error && <div style={{ marginTop:8, color:"#c0392b", fontSize:12 }}>{error}</div>}
    </div>
  );
}
