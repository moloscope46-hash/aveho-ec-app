"use client";
// =============================================================
//  app/admin/mail-diagnostic/page.js (Alpha 0.55.53)
//
//  Test l'envoi du mail d'invitation pour diagnostiquer pourquoi
//  les destinataires ne reçoivent rien.
// =============================================================

import { useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg } from "../../ui";

export default function MailDiagnosticPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function runTest() {
    if (!email) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email,
          nom: "Test diagnostic",
          collectivite: auth.structureNom || "Test",
          role: "Test",
          etablissements: [],
          inviteLink: `${window.location.origin}/inscription/TEST_TOKEN`,
        },
      });

      // L'Edge Function 0.55.53 retourne maintenant un body riche même en cas d'erreur
      // On l'extrait via le context.body si error présent
      let payload = data;
      if (error) {
        try {
          if (error.context?.body) {
            const reader = error.context.body.getReader();
            const { value } = await reader.read();
            const text = new TextDecoder().decode(value);
            payload = JSON.parse(text);
          }
        } catch {}
        payload = payload || { ok: false, error: error.message };
      }

      setResult(payload);
    } catch (e) {
      setResult({ ok: false, error: e.message, diagnostic: "exception_app" });
    } finally {
      setLoading(false);
    }
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMIN · DIAGNOSTIC"
          icon="ti-mail"
          title="Diagnostic envoi mail"
          accent="(Resend / Edge Function)"
          sub="Tester l'envoi d'une invitation pour comprendre pourquoi rien n'arrive"
        />

        <Panel>
          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
            <i className="ti ti-test-pipe" /> Tester l'envoi
          </h3>
          <p style={{ fontSize: 12.5, color: "#6c7a89", margin: "0 0 10px" }}>
            Tape ton propre email (ou un autre) → l'Edge Function va tenter l'envoi via Resend et retourner les détails techniques (status, body, diagnostic).
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton.email@example.com"
              style={{ flex: 1, padding: "9px 12px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}
            />
            <button
              onClick={runTest}
              disabled={loading || !email}
              style={{
                background: "#185FA5", color: "#fff", border: "none",
                padding: "9px 18px", borderRadius: 6, fontWeight: 700,
                cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              {loading ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-send" />}
              {loading ? "Test…" : "Tester l'envoi"}
            </button>
          </div>
        </Panel>

        {result && (
          <Panel style={{
            marginTop: 12,
            borderLeft: `4px solid ${result.ok ? "#5aa05a" : "#c0392b"}`,
            background: result.ok ? "#eef9ef" : "#fce5e0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <i className={`ti ${result.ok ? "ti-check-circle" : "ti-x-circle"}`} style={{ fontSize: 22, color: result.ok ? "#2e6f33" : "#7a2d23" }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6c7a89", letterSpacing: 1, textTransform: "uppercase" }}>RÉSULTAT</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: result.ok ? "#2e6f33" : "#7a2d23" }}>
                  {result.ok ? "✓ Mail envoyé avec succès" : "✗ Échec d'envoi"}
                </div>
              </div>
            </div>

            {result.error && (
              <div style={{ background: "#fff", border: "1px solid #f0c4be", borderRadius: 6, padding: 10, marginBottom: 8, fontSize: 12.5, color: "#7a2d23" }}>
                <b>Erreur :</b> {result.error}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
              {result.diagnostic && <Kv label="Diagnostic" value={result.diagnostic} mono />}
              {result.resend_status && <Kv label="HTTP Resend" value={result.resend_status} mono />}
              {result.from_address && <Kv label="From" value={result.from_address} />}
              {result.to && <Kv label="To" value={result.to} />}
              {result.resend_id && <Kv label="Resend ID" value={result.resend_id} mono />}
              {result.duration_ms && <Kv label="Durée" value={`${result.duration_ms}ms`} />}
            </div>

            {result.resend_body && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ fontSize: 11, color: "#6c7a89", cursor: "pointer" }}>Voir réponse Resend brute</summary>
                <pre style={{ background: "#142131", color: "#e8edf2", padding: 10, borderRadius: 6, fontSize: 11, overflowX: "auto", marginTop: 6 }}>
                  {typeof result.resend_body === "string" ? result.resend_body : JSON.stringify(result.resend_body, null, 2)}
                </pre>
              </details>
            )}
          </Panel>
        )}

        <Panel style={{ marginTop: 14, background: "#fff8ec", borderColor: "#f0d59f" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13.5, color: "#7a4f15" }}>
            <i className="ti ti-help-circle" /> Causes fréquentes et solutions
          </h3>
          <ul style={{ fontSize: 12, color: "#7a4f15", margin: 0, paddingLeft: 18, lineHeight: 1.65 }}>
            <li><b>missing_resend_key</b> → Configure <code>RESEND_API_KEY</code> dans Supabase Dashboard → Project Settings → Edge Functions → Secrets (clé sur <a href="https://resend.com/api-keys" target="_blank" rel="noopener" style={{ color: "#185FA5" }}>resend.com/api-keys</a>)</li>
            <li><b>resend_test_mode_restricted</b> → En mode test, Resend n'envoie qu'à l'email du propriétaire du compte. Solutions : (1) vérifier un domaine sur <a href="https://resend.com/domains" target="_blank" rel="noopener" style={{ color: "#185FA5" }}>resend.com/domains</a> puis configurer <code>RESEND_FROM</code> avec une adresse de ce domaine, OU (2) tester avec ton propre mail Resend pour valider, puis upgrade plan</li>
            <li><b>resend_invalid_key</b> → La clé Resend est expirée ou révoquée. Régénère-la et remplace le secret</li>
            <li><b>resend_rate_limit</b> → Quota dépassé (3000 mails/mois sur le plan gratuit). Attends ou upgrade</li>
            <li><b>Mail bien envoyé mais pas reçu</b> → Vérifie les SPAM. Si toujours rien, regarde le dashboard Resend (Logs) pour voir si Resend a essayé de le livrer</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Kv({ label, value, mono }) {
  return (
    <div style={{ background: "rgba(255,255,255,.7)", borderRadius: 6, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2, color: "#142131", fontFamily: mono ? "Consolas, monospace" : "inherit", wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}
