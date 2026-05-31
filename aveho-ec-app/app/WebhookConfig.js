"use client";
// =============================================================
//  WebhookConfig — Configuration des URLs webhook Teams/Slack
//  Alpha 0.17.1 — pour relayer les notifs critiques vers ces canaux
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";

const FILTRES = [
  { k: "di_urgente", l: "DI urgentes créées" },
  { k: "achat_a_valider", l: "Achats à valider" },
  { k: "signalement", l: "Nouveaux signalements" },
];

export default function WebhookConfig({ auth }) {
  const supabase = createClient();
  const [teamsUrl, setTeamsUrl] = useState("");
  const [slackUrl, setSlackUrl] = useState("");
  const [filters, setFilters] = useState({ di_urgente: true, achat_a_valider: true, signalement: false });
  const [savedMsg, setSavedMsg] = useState("");
  const [testMsg, setTestMsg] = useState({});

  useEffect(() => {
    if (!auth.structureId) return;
    (async () => {
      const { data } = await supabase.from("structures")
        .select("webhook_teams_url, webhook_slack_url, webhook_filters")
        .eq("id", auth.structureId)
        .single();
      if (data) {
        setTeamsUrl(data.webhook_teams_url || "");
        setSlackUrl(data.webhook_slack_url || "");
        if (data.webhook_filters) setFilters(data.webhook_filters);
      }
    })();
  }, [auth.structureId]);

  async function save() {
    if (!auth.can("gerer_collectivite") && !auth.can("ecrire")) {
      setSavedMsg("Ton rôle ne permet pas de modifier la collectivité.");
      return;
    }
    const { error } = await supabase.from("structures")
      .update({
        webhook_teams_url: teamsUrl || null,
        webhook_slack_url: slackUrl || null,
        webhook_filters: filters,
      })
      .eq("id", auth.structureId);
    if (error) setSavedMsg("Erreur : " + error.message);
    else { setSavedMsg("✅ Configuration enregistrée."); setTimeout(() => setSavedMsg(""), 3000); }
  }

  async function test(channel) {
    setTestMsg({ ...testMsg, [channel]: "Envoi…" });
    try {
      const { data, error } = await supabase.functions.invoke("send-webhook", {
        body: {
          structure_id: auth.structureId,
          channels: [channel],
          title: `Test ${channel === "teams" ? "Microsoft Teams" : "Slack"} — Aveho EC`,
          message: "Si tu vois ce message dans ton canal, le webhook est correctement configuré ✅",
          url: typeof window !== "undefined" ? window.location.origin + "/parametres" : "",
          fields: { Collectivité: auth.structureNom || "—", Émetteur: auth.user?.email || "—" },
        },
      });
      if (error) throw error;
      const status = data?.[channel];
      if (status === "sent") setTestMsg({ ...testMsg, [channel]: "✅ Envoyé" });
      else setTestMsg({ ...testMsg, [channel]: `⚠️ ${status || "URL non configurée"}` });
      setTimeout(() => setTestMsg((t) => ({ ...t, [channel]: "" })), 5000);
    } catch (e) {
      setTestMsg({ ...testMsg, [channel]: "❌ " + (e.message || "erreur") });
      setTimeout(() => setTestMsg((t) => ({ ...t, [channel]: "" })), 5000);
    }
  }

  return (
    <div className="webhook-section">
      <h3><i className="ti ti-webhook" style={{ color:"#185FA5", marginRight:6 }} /> Webhooks notifications</h3>
      <p style={{ fontSize:12, color:"#6c7a89", margin:"4px 0 14px" }}>
        Configure une URL de webhook pour Microsoft Teams ou Slack afin de recevoir les notifs Aveho dans ton canal d'équipe.
        Pour Teams, crée un workflow "Post to channel" qui te donne une URL. Pour Slack, crée une "Incoming Webhook" app.
      </p>

      <div className="webhook-row">
        <label><i className="ti ti-brand-teams" style={{ color:"#6264a7" }} /> Microsoft Teams</label>
        <input type="url" value={teamsUrl} onChange={(e) => setTeamsUrl(e.target.value)} placeholder="https://outlook.office.com/webhook/..." />
        <button onClick={() => test("teams")} disabled={!teamsUrl}>
          {testMsg.teams || "Tester"}
        </button>
      </div>

      <div className="webhook-row">
        <label><i className="ti ti-brand-slack" style={{ color:"#4a154b" }} /> Slack</label>
        <input type="url" value={slackUrl} onChange={(e) => setSlackUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
        <button onClick={() => test("slack")} disabled={!slackUrl}>
          {testMsg.slack || "Tester"}
        </button>
      </div>

      <div style={{ marginTop:14, padding:"10px 12px", background:"#fff", borderRadius:8, border:"1px solid #e3e9ee" }}>
        <div style={{ fontSize:12, color:"#5a6776", fontWeight:600, marginBottom:8 }}>Événements à relayer :</div>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
          {FILTRES.map((f) => (
            <label key={f.k} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5, cursor:"pointer" }}>
              <input type="checkbox" checked={!!filters[f.k]} onChange={(e) => setFilters({ ...filters, [f.k]: e.target.checked })} />
              {f.l}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginTop:14, display:"flex", gap:10, alignItems:"center" }}>
        <button onClick={save} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#7CC8C8", color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          Enregistrer
        </button>
        {savedMsg && <span style={{ fontSize:12, color: savedMsg.startsWith("✅") ? "#5aa05a" : "#c0392b" }}>{savedMsg}</span>}
      </div>
    </div>
  );
}
