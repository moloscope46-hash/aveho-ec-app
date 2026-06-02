"use client";
// =============================================================
//  NotificationPreferences — Préférences notif par utilisateur
//  Alpha 0.29.0 / 0.33.0
//
//  Permet à chaque utilisateur de choisir quels types d'events
//  il souhaite recevoir en push notification ET (depuis 0.33) en email.
//
//  Stockage prefs (jsonb) :
//   - "di" / "achat" / ... → push (default ON sauf consent_auto_archive)
//   - "email_di" / "email_achat" / ... → email (default OFF, opt-in)
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";

import { dialogs } from "./dialogs";
import { logger } from "../lib/logger";
const CATEGORIES = [
  { key: "di", label: "Demandes d'intervention", icon: "ti-tools", desc: "Nouvelles DI, urgences, assignations", default: true },
  { key: "achat", label: "Workflow achats", icon: "ti-shopping-cart", desc: "À valider, validées, refusées, reçues", default: true },
  { key: "transfert", label: "Transferts", icon: "ti-arrows-exchange", desc: "Créés, validés, réceptionnés", default: true },
  { key: "signalement", label: "Signalements / Idées", icon: "ti-message", desc: "Nouveaux signalements et réponses", default: true },
  { key: "maintenance", label: "Maintenance préventive", icon: "ti-tool", desc: "J-7, retards, récurrences", default: true },
  { key: "consent_a_renouveler", label: "Renouvellement RGPD", icon: "ti-shield-lock", desc: "Consentements expirant dans 30 jours", default: true },
  { key: "consent_auto_archive", label: "Archivage RGPD mensuel", icon: "ti-archive", desc: "Maintenance mensuelle (1er du mois)", default: false },
];

export default function NotificationPreferences({ auth }) {
  const supabase = createClient();
  const [prefs, setPrefs] = useState({});
  const [quietHours, setQuietHours] = useState(null);
  const [enableQuiet, setEnableQuiet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth?.user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("user_notification_preferences")
          .select("prefs, quiet_hours")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        setPrefs(data?.prefs || {});
        if (data?.quiet_hours) {
          setQuietHours(data.quiet_hours);
          setEnableQuiet(true);
        } else {
          setQuietHours({ start: "22:00", end: "07:00" });
          setEnableQuiet(false);
        }
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[NotificationPreferences] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth?.user?.id]);

  // ----- Push -----
  function isPushActive(key) {
    if (key in prefs) return prefs[key] === true;
    const cat = CATEGORIES.find((c) => c.key === key);
    return cat?.default !== false;
  }
  function togglePush(key) {
    setPrefs({ ...prefs, [key]: !isPushActive(key) });
  }

  // ----- Email (opt-in : false par défaut, peu importe la catégorie) -----
  function isEmailActive(key) {
    const emailKey = `email_${key}`;
    return prefs[emailKey] === true;
  }
  function toggleEmail(key) {
    const emailKey = `email_${key}`;
    setPrefs({ ...prefs, [emailKey]: !isEmailActive(key) });
  }

  async function save() {
    if (!auth?.user?.id) return;
    setBusy(true);
    try {
      const payload = {
        user_id: auth.user.id,
        structure_id: auth.structureId,
        prefs,
        quiet_hours: enableQuiet ? quietHours : null,
      };
      const { error } = await supabase
        .from("user_notification_preferences")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      setSavedMsg("Préférences enregistrées ✓");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (e) {
      setSavedMsg("Erreur : " + e.message);
      setTimeout(() => setSavedMsg(""), 4000);
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    if (!await dialogs.confirm({ title: "Réactiver toutes les notifications par défaut et désactiver les emails ?", variant: "danger" })) return;
    setPrefs({});
  }

  if (loading) return <p style={{ fontSize: 13, color: "#8a98a8" }}>Chargement des préférences…</p>;

  const nbPushActifs = CATEGORIES.filter((c) => isPushActive(c.key)).length;
  const nbEmailActifs = CATEGORIES.filter((c) => isEmailActive(c.key)).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <p style={{ fontSize: 12.5, color: "#6c7a89", margin: 0 }}>
          <i className="ti ti-info-circle" /> Choisis comment tu veux être notifié pour chaque type d'événement.
          <b style={{ color: "#185FA5", marginLeft: 8 }}>Push : {nbPushActifs}/{CATEGORIES.length}</b>
          <b style={{ color: "#7a6fb0", marginLeft: 8 }}>Email : {nbEmailActifs}/{CATEGORIES.length}</b>
        </p>
        <button
          onClick={resetAll}
          style={{ background: "#fff", color: "#8a98a8", border: "1px solid #e1e6eb", padding: "5px 11px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}
        >
          <i className="ti ti-refresh" /> Tout par défaut
        </button>
      </div>

      {/* En-tête colonnes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", gap: 10, padding: "0 14px 6px", fontSize: 10, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700 }}>
        <span>Catégorie</span>
        <span style={{ textAlign: "center" }}><i className="ti ti-bell" /> Push</span>
        <span style={{ textAlign: "center" }}><i className="ti ti-mail" /> Email</span>
      </div>

      {/* Liste catégories avec 2 toggles */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {CATEGORIES.map((c) => {
          const pushActive = isPushActive(c.key);
          const emailActive = isEmailActive(c.key);
          const anyActive = pushActive || emailActive;
          return (
            <div
              key={c.key}
              style={{
                display: "grid", gridTemplateColumns: "1fr 70px 70px", gap: 10,
                padding: "12px 14px", borderRadius: 10,
                background: anyActive ? "linear-gradient(135deg,#eef5fc,#f4f7fa)" : "#fff",
                border: `1.5px solid ${anyActive ? "#7CC8C8" : "#e3e9ee"}`,
                alignItems: "center",
                transition: "all .15s",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: anyActive ? "#142131" : "#6c7a89" }}>
                  <i className={`ti ${c.icon}`} style={{ color: anyActive ? "#185FA5" : "#8a98a8", fontSize: 16 }} />
                  {c.label}
                </div>
                <div style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 3 }}>{c.desc}</div>
              </div>
              {/* Toggle push */}
              <label style={{ display: "flex", justifyContent: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={pushActive}
                  onChange={() => togglePush(c.key)}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#185FA5" }}
                  title="Activer/désactiver la notification push"
                />
              </label>
              {/* Toggle email */}
              <label style={{ display: "flex", justifyContent: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={emailActive}
                  onChange={() => toggleEmail(c.key)}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#7a6fb0" }}
                  title="Activer/désactiver la notification email"
                />
              </label>
            </div>
          );
        })}
      </div>

      {/* Info email opt-in */}
      <div style={{ padding: "10px 14px", background: "#f3effb", border: "1px solid #d6cce8", borderRadius: 8, marginBottom: 14, fontSize: 12, color: "#5e4a8c" }}>
        <i className="ti ti-info-circle" /> Les emails sont <b>désactivés par défaut</b> pour éviter le spam. Active-les uniquement pour les catégories où tu veux recevoir aussi un email en plus de la notification push.
      </div>

      {/* Heures silencieuses */}
      <div style={{ padding: 14, background: "#f8fafc", border: "1px solid #e3e9ee", borderRadius: 10, marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "#142131", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={enableQuiet}
            onChange={(e) => setEnableQuiet(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <i className="ti ti-moon" style={{ color: "#7a6fb0", fontSize: 16 }} />
          Heures silencieuses
        </label>
        <p style={{ fontSize: 11.5, color: "#8a98a8", margin: "4px 0 0 26px" }}>
          Les notifications reçues entre ces heures seront silencieuses (pas de son ni de vibration). Visibles dans la cloche le lendemain.
        </p>
        {enableQuiet && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, marginLeft: 26 }}>
            <label style={{ fontSize: 12, color: "#6c7a89" }}>
              De :{" "}
              <input
                type="time"
                value={quietHours?.start || "22:00"}
                onChange={(e) => setQuietHours({ ...quietHours, start: e.target.value })}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e1e6eb", fontFamily: "inherit" }}
              />
            </label>
            <label style={{ fontSize: 12, color: "#6c7a89" }}>
              à :{" "}
              <input
                type="time"
                value={quietHours?.end || "07:00"}
                onChange={(e) => setQuietHours({ ...quietHours, end: e.target.value })}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e1e6eb", fontFamily: "inherit" }}
              />
            </label>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: savedMsg.startsWith("Erreur") ? "#c0392b" : "#5aa05a" }}>{savedMsg}</span>
        <button
          onClick={save}
          disabled={busy}
          style={{
            background: "#185FA5", color: "#fff", border: "none",
            padding: "9px 18px", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          <i className="ti ti-device-floppy" /> {busy ? "Enregistrement…" : "Enregistrer mes préférences"}
        </button>
      </div>
    </div>
  );
}
