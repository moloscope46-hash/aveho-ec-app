"use client";
// =============================================================
//  /webhooks — Page dédiée pour la configuration des webhooks
//  Alpha 0.47.0
//
//  Wrapper autour de <WebhookConfig> avec :
//   - Documentation des URLs Teams / Slack
//   - Section testeur webhook (envoi d'un payload de test custom)
//   - Liens vers la doc Microsoft Teams et Slack
// =============================================================
import { useState } from "react";
import { useAuth } from "../../lib/useAuth";
import { createClient } from "../../lib/supabase";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Btn } from "../ui";
import WebhookConfig from "../WebhookConfig";

export default function WebhooksPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [testUrl, setTestUrl] = useState("");
  const [testMsg, setTestMsg] = useState("Test depuis Aveho EC");
  const [testResult, setTestResult] = useState(null);
  const [testBusy, setTestBusy] = useState(false);

  const peutVoir = auth.role?.nom === "Administrateur" || auth.can?.("manage_collectivite");

  async function envoyerTest() {
    if (!testUrl.trim()) {
      setTestResult({ ok: false, msg: "Veuillez saisir une URL." });
      return;
    }
    setTestBusy(true);
    setTestResult(null);
    try {
      // Format générique Teams + Slack compatible (texte simple)
      const isTeams = testUrl.includes(".office.com") || testUrl.includes("teams.microsoft");
      const payload = isTeams
        ? { "@type": "MessageCard", "@context": "https://schema.org/extensions", text: testMsg }
        : { text: `🛎️ ${testMsg}` };

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const r = await fetch(`${supabaseUrl}/functions/v1/send-webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ url: testUrl, payload }),
      });

      if (r.ok) {
        setTestResult({ ok: true, msg: "Webhook envoyé ! Vérifie ton canal Teams/Slack." });
      } else {
        const txt = await r.text();
        setTestResult({ ok: false, msg: `Erreur ${r.status} : ${txt.slice(0, 200)}` });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: "Erreur réseau : " + e.message });
    } finally {
      setTestBusy(false);
    }
  }

  if (!peutVoir) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg><i className="ti ti-shield-x" /> Réservé aux administrateurs.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMINISTRATION · INTÉGRATIONS"
          icon="ti-webhook"
          title="Webhooks"
          accent="Teams & Slack"
          sub="Relaye les notifications critiques vers tes canaux d'équipe"
        />

        {/* Configuration principale */}
        <Panel style={{ marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#142131" }}>
            <i className="ti ti-settings" style={{ color: "#185FA5", marginRight: 6 }} /> Configuration
          </h3>
          <WebhookConfig auth={auth} />
        </Panel>

        {/* Testeur webhook */}
        <Panel style={{ marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#142131" }}>
            <i className="ti ti-flask" style={{ color: "#7a6fb0", marginRight: 6 }} /> Testeur webhook
          </h3>
          <p style={{ fontSize: 13, color: "#6c7a89", margin: "0 0 12px" }}>
            Envoie un message de test arbitraire à une URL webhook (utile pour vérifier la connexion avant de la sauvegarder ci-dessus).
          </p>
          <div className="fld">
            <label>URL du webhook à tester</label>
            <input 
              type="url" 
              value={testUrl} 
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://outlook.office.com/webhook/... ou https://hooks.slack.com/..."
            />
          </div>
          <div className="fld">
            <label>Message de test</label>
            <input 
              type="text" 
              value={testMsg} 
              onChange={(e) => setTestMsg(e.target.value)}
              placeholder="Test depuis Aveho EC"
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <Btn variant="primary" icon="ti-send" onClick={envoyerTest} disabled={testBusy || !testUrl}>
              {testBusy ? "Envoi…" : "Envoyer le test"}
            </Btn>
          </div>
          {testResult && (
            <div style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 8,
              background: testResult.ok ? "#eef9ef" : "#fef0ee",
              border: `1px solid ${testResult.ok ? "#bfe2bf" : "#f0c4be"}`,
              color: testResult.ok ? "#2e6f33" : "#7a2317",
              fontSize: 13,
            }}>
              <i className={`ti ${testResult.ok ? "ti-circle-check" : "ti-alert-circle"}`} /> {testResult.msg}
            </div>
          )}
        </Panel>

        {/* Documentation */}
        <Panel>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#142131" }}>
            <i className="ti ti-book-2" style={{ color: "#7CC8C8", marginRight: 6 }} /> Comment obtenir une URL webhook ?
          </h3>
          <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#f4f7fa", padding: 14, borderRadius: 8, borderLeft: "4px solid #4F5BD5" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#142131" }}>
                <i className="ti ti-brand-teams" /> Microsoft Teams
              </h4>
              <ol style={{ fontSize: 12.5, color: "#2a3a48", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Va dans le canal Teams où relayer</li>
                <li>Clique sur ⋯ → "Connecteurs"</li>
                <li>Cherche "Incoming Webhook" → Configurer</li>
                <li>Donne un nom (ex. "Aveho") + une image</li>
                <li>Copie l'URL générée</li>
              </ol>
              <a href="https://learn.microsoft.com/fr-fr/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 11.5, color: "#185FA5", textDecoration: "none", fontWeight: 600 }}>
                Doc officielle Microsoft <i className="ti ti-external-link" />
              </a>
            </div>
            <div style={{ background: "#f4f7fa", padding: 14, borderRadius: 8, borderLeft: "4px solid #4A154B" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#142131" }}>
                <i className="ti ti-brand-slack" /> Slack
              </h4>
              <ol style={{ fontSize: 12.5, color: "#2a3a48", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Va sur <code style={{ fontSize: 11 }}>api.slack.com/apps</code></li>
                <li>Crée une app → "From scratch"</li>
                <li>Active "Incoming Webhooks"</li>
                <li>"Add New Webhook to Workspace"</li>
                <li>Choisis le canal + Autorise → Copie l'URL</li>
              </ol>
              <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 11.5, color: "#185FA5", textDecoration: "none", fontWeight: 600 }}>
                Doc officielle Slack <i className="ti ti-external-link" />
              </a>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
