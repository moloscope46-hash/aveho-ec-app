// =============================================================
//  useNotificationPrefs + sendNotification (0.61.0)
//  Gestion des préférences user + envoi multi-canal (in-app/email/push)
// =============================================================
"use client";
import { useEffect, useState } from "react";
import { createClient } from "./supabase";
import { useAuth } from "./useAuth";

export function useNotificationPrefs() {
  const supabase = createClient();
  const auth = useAuth();
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.user?.id) { setLoading(false); return; }
    (async () => {
      try {
        const r = await supabase.from("notifications_preferences").select("*").eq("user_id", auth.user.id).maybeSingle();
        if (r.data) setPrefs(r.data);
        else {
          // Crée des préférences par défaut
          const def = {
            user_id: auth.user.id,
            email: auth.user.email,
            email_actif: true,
            push_actif: false,
            sms_actif: false,
          };
          await supabase.from("notifications_preferences").insert(def);
          setPrefs(def);
        }
      } catch (e) { console.warn("[useNotificationPrefs]", e); }
      finally { setLoading(false); }
    })();
  }, [auth.ready, auth.user?.id]);

  async function updatePrefs(updates) {
    if (!prefs) return;
    const newPrefs = { ...prefs, ...updates, updated_at: new Date().toISOString() };
    setPrefs(newPrefs);
    await supabase.from("notifications_preferences").update(updates).eq("user_id", auth.user.id);
  }

  return { prefs, loading, updatePrefs };
}

// =============================================================
// Helper d'envoi de notification multi-canal
// =============================================================
export async function sendNotification(supabase, { userId, templateCode, variables = {}, urlPath = null }) {
  // 1. Récupère les préférences user
  const { data: prefs } = await supabase.from("notifications_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (!prefs) return { sent: 0 };

  // 2. Récupère le template
  const { data: template } = await supabase.from("notifications_templates").select("*").eq("code", templateCode).maybeSingle();
  if (!template) return { sent: 0, error: "Template introuvable" };

  // 3. Interpolation des variables {{x}} dans les chaînes
  const interp = (s) => (s || "").replace(/\{\{(\w+)\}\}/g, (_, k) => variables[k] ?? `{{${k}}}`);

  let sent = 0;
  // Notification in-app (toujours, sauf désactivation explicite)
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "system",
      titre: interp(template.push_titre || template.sujet_email),
      message: interp(template.push_message || template.sujet_email),
      url: urlPath,
      lu: false,
    });
    sent++;
  } catch (e) { console.warn("[notif in-app]", e); }

  // Log envoi (sera envoyé en email par cron / edge function plus tard)
  const log = {
    user_id: userId,
    template_code: templateCode,
    variables_used: variables,
    canal: "queue",
    sujet: interp(template.sujet_email),
    corps: interp(template.corps_email_html),
    envoye: false,
  };

  // 4. Email queue (si activé)
  if (prefs.email_actif && prefs.email) {
    try {
      await supabase.from("notifications_log").insert({ ...log, canal: "email", destinataire: prefs.email });
      sent++;
    } catch (e) { console.warn("[notif email]", e); }
  }
  // 5. SMS queue (si activé)
  if (prefs.sms_actif && prefs.telephone_sms) {
    try {
      await supabase.from("notifications_log").insert({ ...log, canal: "sms", destinataire: prefs.telephone_sms, corps: interp(template.corps_sms) });
      sent++;
    } catch (e) { console.warn("[notif sms]", e); }
  }
  // 6. Push web (si activé et subscription valide)
  if (prefs.push_actif && prefs.push_subscription) {
    try {
      await supabase.from("notifications_log").insert({ ...log, canal: "push", destinataire: prefs.push_endpoint });
      // L'envoi réel se fera via edge function (web-push)
      sent++;
    } catch (e) { console.warn("[notif push]", e); }
  }

  return { sent };
}

// =============================================================
// Web Push subscribe helper
// =============================================================
export async function subscribeWebPush(supabase, userId) {
  if (typeof window === "undefined") return { error: "Non-browser environment" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { error: "Push API non supportée par ce navigateur" };
  }

  try {
    // Permission notif
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { error: "Permission refusée" };

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // VAPID public key - à remplir avec ta vraie clé via edge function
      // applicationServerKey: urlBase64ToUint8Array("VAPID_PUBLIC_KEY"),
    });

    // Sauvegarde subscription en DB
    await supabase.from("notifications_preferences").update({
      push_actif: true,
      push_subscription: sub.toJSON(),
      push_endpoint: sub.endpoint,
    }).eq("user_id", userId);

    return { ok: true, subscription: sub };
  } catch (e) {
    return { error: e.message };
  }
}
