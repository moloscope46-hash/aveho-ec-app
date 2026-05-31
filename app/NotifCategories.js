"use client";
// =============================================================
//  NotifCategories — Préférences notifications par catégorie
//  Alpha 0.49.0
//
//  Utilise la table user_notification_preferences existante (0.29).
//  Schéma prefs jsonb : { di: true, achat: true, maintenance: true, ... }
//  Si une clé est absente → considérée comme activée (défaut).
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";

const CATEGORIES = [
  { key: "di", label: "Demandes d'intervention", icon: "ti-tools", color: "#e35d5b", desc: "Nouvelles DI et changements de statut" },
  { key: "achat", label: "Achats", icon: "ti-shopping-bag", color: "#EF9F27", desc: "Demandes d'achat à valider, statuts" },
  { key: "maintenance", label: "Maintenance", icon: "ti-tool", color: "#5a8f8f", desc: "Maintenance planifiée, J-7, retards" },
  { key: "signalement", label: "Signalements", icon: "ti-message-circle", color: "#7CC8C8", desc: "Signalements créés et réponses" },
  { key: "transfert", label: "Transferts", icon: "ti-truck-delivery", color: "#185FA5", desc: "Nouveaux transferts inter-établissements" },
  { key: "commande", label: "Commandes", icon: "ti-shopping-cart", color: "#5a8f8f", desc: "Nouvelles commandes magasin" },
  { key: "consent_a_renouveler", label: "Consentement à renouveler", icon: "ti-shield-half", color: "#EF9F27", desc: "Alertes RGPD avant expiration" },
];

export default function NotifCategories({ auth }) {
  const supabase = createClient();
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (!auth?.user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("user_notification_preferences")
        .select("prefs")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      setPrefs(data?.prefs || {});
      setLoading(false);
    })();
  }, [auth?.user?.id]);

  function isEnabled(key) {
    // Absence de clé = défaut activé
    return prefs[key] !== false;
  }

  async function toggle(key) {
    const newPrefs = { ...prefs, [key]: !isEnabled(key) };
    setPrefs(newPrefs);
    setSaving(true);
    setSavedMsg("");
    try {
      const { error } = await supabase
        .from("user_notification_preferences")
        .upsert({
          user_id: auth.user.id,
          structure_id: auth.structureId,
          prefs: newPrefs,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) throw error;
      setSavedMsg("Préférences sauvegardées");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (e) {
      setSavedMsg("Erreur : " + e.message);
      // Rollback
      setPrefs(prefs);
    }
    setSaving(false);
  }

  if (loading) {
    return <p style={{ fontSize: 12.5, color: "#8a98a8" }}>Chargement…</p>;
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "#6c7a89", margin: "0 0 14px" }}>
        Choisis pour quelles catégories tu souhaites recevoir des notifications (in-app et push browser).
      </p>
      {CATEGORIES.map((cat) => {
        const on = isEnabled(cat.key);
        return (
          <div key={cat.key} style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            background: on ? "#f4f7fa" : "#fafbfc",
            border: `1px solid ${on ? "#e3e9ee" : "#eef0f2"}`,
            borderRadius: 8,
            marginBottom: 6,
            transition: "all .15s",
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: 8,
              background: cat.color + (on ? "22" : "11"),
              color: on ? cat.color : "#cfd5db",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
              transition: "all .15s",
            }} aria-hidden="true">
              <i className={`ti ${cat.icon}`} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: on ? "#142131" : "#8a98a8" }}>{cat.label}</div>
              <div style={{ fontSize: 11.5, color: "#8a98a8" }}>{cat.desc}</div>
            </div>
            <label style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(cat.key)}
                disabled={saving}
                style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                aria-label={`${cat.label} : ${on ? "activées" : "désactivées"}`}
              />
              <span style={{
                display: "inline-block",
                width: 38, height: 22, borderRadius: 11,
                background: on ? "#5aa05a" : "#cfd5db",
                position: "relative",
                transition: "background .2s",
              }} aria-hidden="true">
                <span style={{
                  position: "absolute",
                  top: 2, left: on ? 18 : 2,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                  transition: "left .2s",
                }} />
              </span>
            </label>
          </div>
        );
      })}
      {savedMsg && (
        <p style={{ marginTop: 10, fontSize: 12, color: savedMsg.startsWith("Erreur") ? "#c0392b" : "#5aa05a", fontWeight: 600 }}>
          <i className={`ti ${savedMsg.startsWith("Erreur") ? "ti-alert-circle" : "ti-circle-check"}`} /> {savedMsg}
        </p>
      )}
    </div>
  );
}
