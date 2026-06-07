"use client";
// =============================================================
//  /parametres/notifications — Préférences notifications (0.61.0)
//  Configure email/sms/push + types de notifs
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useNotificationPrefs, subscribeWebPush } from "../../../lib/useNotificationPrefs";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import BackButton from "../../components/BackButton";

const TYPES_NOTIFS = [
  { key: "notif_di_nouvelle", lbl: "Nouvelle DI à traiter", ic: "ti-truck-loading", col: "#EF9F27" },
  { key: "notif_di_validee", lbl: "DI validée", ic: "ti-check", col: "#5aa05a" },
  { key: "notif_di_refusee", lbl: "DI refusée", ic: "ti-x", col: "#e35d5b" },
  { key: "notif_sav_executee", lbl: "Bilan SAV exécuté", ic: "ti-clipboard-check", col: "#7CC8C8" },
  { key: "notif_rapport_valide", lbl: "Rapport SAV validé", ic: "ti-shield-check", col: "#5a8f8f" },
  { key: "notif_transfert_etape", lbl: "Étape transfert", ic: "ti-truck", col: "#7a6fb0" },
  { key: "notif_stock_bas", lbl: "Alerte stock bas", ic: "ti-alert-triangle", col: "#EF9F27" },
  { key: "notif_rbeu_renouvellement", lbl: "RBEU à renouveler", ic: "ti-shield", col: "#7a6fb0" },
  { key: "notif_digest_hebdo", lbl: "Digest hebdomadaire", ic: "ti-mail-bolt", col: "#185FA5" },
];

export default function NotifPrefsPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const { prefs, loading, updatePrefs } = useNotificationPrefs();
  const [pushStatus, setPushStatus] = useState("");

  async function activatePush() {
    setPushStatus("Demande de permission...");
    const r = await subscribeWebPush(supabase, auth.user?.id);
    if (r.error) { setPushStatus(`❌ ${r.error}`); return; }
    setPushStatus("✓ Notifications push activées");
    setTimeout(() => setPushStatus(""), 3000);
  }

  async function deactivatePush() {
    await updatePrefs({ push_actif: false, push_subscription: null, push_endpoint: null });
    setPushStatus("✓ Notifications push désactivées");
    setTimeout(() => setPushStatus(""), 3000);
  }

  if (loading || !prefs) {
    return (
      <div className="page-shell">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="page-content"><BackButton />
          <Panel><div style={{ padding: 30, textAlign: "center" }}>Chargement des préférences...</div></Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />
        <PageHead icon="ti-bell-cog" title="Préférences de notifications" subtitle="Configure les canaux d'envoi (email/SMS/push) et les types d'événements" />

        {/* Canaux d'envoi */}
        <Panel>
          <h3 style={{ margin: "0 0 12px", color: "#EF9F27" }}>📬 Canaux d'envoi</h3>

          <CanalCard
            icon="ti-mail" col="#185FA5" lbl="Email"
            desc="Recevoir les notifs importantes par email"
            actif={prefs.email_actif}
            onToggle={(v) => updatePrefs({ email_actif: v })}
            extra={
              <div className="fld" style={{ marginTop: 6 }}>
                <label style={{ fontSize: 11, color: "#5a6878" }}>Adresse email</label>
                <input value={prefs.email || ""} onChange={(e) => updatePrefs({ email: e.target.value })}
                  placeholder="email@example.com" type="email"
                  style={{ padding: "6px 10px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, width: "100%" }} />
              </div>
            }
          />

          <CanalCard
            icon="ti-message" col="#5aa05a" lbl="SMS"
            desc="Recevoir les notifs critiques par SMS (à venir)"
            actif={prefs.sms_actif}
            onToggle={(v) => updatePrefs({ sms_actif: v })}
            extra={
              <div className="fld" style={{ marginTop: 6 }}>
                <label style={{ fontSize: 11, color: "#5a6878" }}>Numéro de téléphone</label>
                <input value={prefs.telephone_sms || ""} onChange={(e) => updatePrefs({ telephone_sms: e.target.value })}
                  placeholder="+33 6 12 34 56 78" type="tel"
                  style={{ padding: "6px 10px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, width: "100%" }} />
              </div>
            }
          />

          <CanalCard
            icon="ti-device-mobile" col="#7a6fb0" lbl="Notifications push"
            desc="Recevoir les notifs sur cet appareil même si l'app est fermée"
            actif={prefs.push_actif}
            onToggle={null}
            extra={
              <div style={{ marginTop: 6 }}>
                {!prefs.push_actif ? (
                  <Btn variant="primary" icon="ti-bell" onClick={activatePush}>Activer les notifs push sur cet appareil</Btn>
                ) : (
                  <Btn variant="ghost" icon="ti-bell-off" onClick={deactivatePush} style={{ color: "#e35d5b" }}>Désactiver</Btn>
                )}
                {pushStatus && <div style={{ marginTop: 6, fontSize: 11.5, color: pushStatus.startsWith("✓") ? "#5aa05a" : "#e35d5b" }}>{pushStatus}</div>}
              </div>
            }
          />
        </Panel>

        {/* Types d'événements */}
        <Panel style={{ marginTop: 12 }}>
          <h3 style={{ margin: "0 0 12px", color: "#5a8f8f" }}>🔔 Types d'événements à notifier</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 8 }}>
            {TYPES_NOTIFS.map(t => (
              <ToggleLine key={t.key} icon={t.ic} col={t.col} lbl={t.lbl}
                on={prefs[t.key] !== false}
                onChange={(v) => updatePrefs({ [t.key]: v })} />
            ))}
          </div>
        </Panel>

        {/* Info techniques */}
        <Panel style={{ marginTop: 12, background: "rgba(94,143,143,.08)", borderLeft: "4px solid #5a8f8f" }}>
          <h3 style={{ margin: "0 0 8px", color: "#5a8f8f", fontSize: 14 }}>ℹ Comment ça marche ?</h3>
          <div style={{ fontSize: 12, color: "#5a6878", lineHeight: 1.6 }}>
            <p><b>📱 In-app</b> (cloche TopBar) : toujours activée, immédiate.</p>
            <p><b>📧 Email</b> : envoyé par Aveho (Edge Function Supabase + Resend). Configure ton email ci-dessus.</p>
            <p><b>📲 Push</b> : utilise l'API Web Push de ton navigateur. Doit être activée par appareil. Fonctionne même si l'app est fermée (Chrome/Edge/Firefox).</p>
            <p><b>📞 SMS</b> : à venir (intégration Twilio). Recevoir uniquement les notifs critiques.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function CanalCard({ icon, col, lbl, desc, actif, onToggle, extra }) {
  return (
    <div style={{
      padding: 12, background: actif ? `${col}11` : "#fff", border: `1px solid ${actif ? col : "#e3e9ee"}`,
      borderLeft: `4px solid ${col}`, borderRadius: 10, marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <i className={`ti ${icon}`} style={{ color: col, fontSize: 22 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: "#142131", fontSize: 13.5 }}>{lbl}</div>
          <div style={{ fontSize: 11.5, color: "#5a6878" }}>{desc}</div>
        </div>
        {onToggle && (
          <button onClick={() => onToggle(!actif)} style={{
            width: 44, height: 24, borderRadius: 12,
            background: actif ? col : "#cfd8e0",
            border: "none", position: "relative", cursor: "pointer",
            transition: "background 200ms",
          }}>
            <span style={{
              position: "absolute", top: 2, left: actif ? 22 : 2,
              width: 20, height: 20, borderRadius: 10, background: "#fff",
              transition: "left 200ms",
            }} />
          </button>
        )}
      </div>
      {extra}
    </div>
  );
}

function ToggleLine({ icon, col, lbl, on, onChange }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: 8, background: on ? `${col}08` : "#fafbfc",
      border: `1px solid ${on ? `${col}33` : "#e3e9ee"}`, borderRadius: 6,
    }}>
      <i className={`ti ${icon}`} style={{ color: col, fontSize: 18 }} />
      <span style={{ flex: 1, fontSize: 12.5, color: "#142131", fontWeight: on ? 600 : 400 }}>{lbl}</span>
      <button onClick={() => onChange(!on)} style={{
        width: 32, height: 18, borderRadius: 9,
        background: on ? col : "#cfd8e0", border: "none", position: "relative", cursor: "pointer",
      }}>
        <span style={{
          position: "absolute", top: 2, left: on ? 16 : 2,
          width: 14, height: 14, borderRadius: 7, background: "#fff",
        }} />
      </button>
    </div>
  );
}
