"use client";
// =============================================================
//  DigestPreferences — Préférences de digest email
//  Alpha 0.40.0
//
//  3 modes : jamais (défaut) | quotidien (8h) | hebdo (lundi 8h)
//  Stockage : table notification_digest_prefs (1 ligne par user)
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";

const MODES = [
  { v: "jamais", l: "Jamais", desc: "Pas de récap automatique", icon: "ti-bell-off" },
  { v: "quotidien", l: "Quotidien", desc: "Tous les matins à 8h", icon: "ti-sun" },
  { v: "hebdo", l: "Hebdomadaire", desc: "Lundi matin à 8h", icon: "ti-calendar-week" },
];

export default function DigestPreferences({ auth }) {
  const supabase = createClient();
  const [mode, setMode] = useState("jamais");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  // Alpha 0.41.0 : test d'envoi
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (!auth?.user?.id || !auth?.structureId) return;
    (async () => {
      const { data } = await supabase
        .from("notification_digest_prefs")
        .select("frequence")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (data?.frequence) setMode(data.frequence);
      setLoading(false);
    })();
  }, [auth?.user?.id, auth?.structureId]);

  async function save(newMode) {
    if (!auth?.user?.id || !auth?.structureId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("notification_digest_prefs")
        .upsert({
          user_id: auth.user.id,
          structure_id: auth.structureId,
          frequence: newMode,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      setMode(newMode);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2000);
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // Alpha 0.41.0 : envoi d'un digest test (Edge Function send-digest avec dry_run=false, force=true)
  async function sendTest() {
    if (!auth?.user?.id) return;
    setTestBusy(true);
    setTestResult(null);
    try {
      // Récupérer session pour le token (la Edge Function send-digest accepte auth.uid())
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée — recharge la page");
      const url = supabase.supabaseUrl.replace(".supabase.co", ".functions.supabase.co") + "/send-digest";
      // Note : la version standalone-friendly utilise simplement /functions/v1/send-digest
      const fnUrl = supabase.supabaseUrl + "/functions/v1/send-digest";
      const resp = await fetch(fnUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: auth.user.id, force_send: true }),
      });
      const data = await resp.json();
      if (data.ok) {
        const sent = (data.results || []).find((r) => r.sent || r.dry_run);
        setTestResult({
          ok: true,
          message: sent ? `Envoyé à ${sent.email || "ton email"}` : "Aucun contenu à envoyer pour le moment (DI/achats/signalements vides)",
        });
      } else {
        setTestResult({ ok: false, message: data.error || "Erreur inconnue" });
      }
    } catch (e) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTestBusy(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  }

  if (loading) {
    return <p style={{ color: "#8a98a8", fontSize: 13 }}>Chargement…</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: 10, fontSize: 12.5, color: "#6c7a89" }}>
        Reçois un récap par email avec : DI ouvertes, achats à valider, signalements non traités, consentements à renouveler.
        {savedAt && (
          <span style={{ marginLeft: 8, color: "#5aa05a", fontWeight: 600 }}>
            <i className="ti ti-check" /> Enregistré
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {MODES.map((m) => {
          const active = mode === m.v;
          return (
            <button
              key={m.v}
              onClick={() => save(m.v)}
              disabled={saving || active}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: active ? "2px solid #185FA5" : "1px solid #e3e9ee",
                background: active ? "#eef5fc" : "#fff",
                cursor: active ? "default" : "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                transition: "all .15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className={`ti ${m.icon}`} style={{ color: active ? "#185FA5" : "#6c7a89", fontSize: 18 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: active ? "#185FA5" : "#142131" }}>{m.l}</span>
                {active && <i className="ti ti-check" style={{ marginLeft: "auto", color: "#185FA5" }} />}
              </div>
              <div style={{ fontSize: 11.5, color: "#6c7a89" }}>{m.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Alpha 0.41.0 : bouton "Envoyer un test maintenant" */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #e3e9ee", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: "#6c7a89" }}>
          <i className="ti ti-test-pipe" /> Tu peux recevoir un récap test à n'importe quel moment pour vérifier le format.
        </div>
        <button
          onClick={sendTest}
          disabled={testBusy}
          style={{
            padding: "7px 14px", borderRadius: 8,
            border: "1px solid #185FA5",
            background: testBusy ? "#eef5fc" : "#fff",
            color: "#185FA5",
            cursor: testBusy ? "wait" : "pointer",
            fontFamily: "inherit", fontSize: 12, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <i className={`ti ${testBusy ? "ti-loader-2" : "ti-send"}`} style={testBusy ? { animation: "aveho-spin 1s linear infinite" } : null} />
          {testBusy ? "Envoi…" : "Envoyer un test maintenant"}
        </button>
      </div>
      {testResult && (
        <div style={{
          marginTop: 8,
          padding: "8px 12px",
          borderRadius: 6,
          background: testResult.ok ? "#eef9ef" : "#fef0ee",
          color: testResult.ok ? "#2e6f33" : "#c0392b",
          fontSize: 12,
          border: `1px solid ${testResult.ok ? "#bfe2bf" : "#f4c4be"}`,
        }}>
          <i className={`ti ${testResult.ok ? "ti-check" : "ti-x"}`} /> {testResult.message}
        </div>
      )}
    </div>
  );
}
