"use client";
import AdminGuard from "../../components/AdminGuard"; // 0.57.34 anti-régression admin
// =============================================================
//  app/admin/rpps-diagnostic/page.js (Alpha 0.55.48)
//
//  Page de diagnostic complet de l'API ANS RPPS.
//  - Lance /api/rpps/diagnostic
//  - Affiche IP sortante, région Vercel, status par endpoint
//  - Permet de tester une query custom
// =============================================================

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg } from "../../ui";
// 0.58.52 : migration UI premium
import { EmptyState, SkeletonRow } from "../../components/ui-premium";

function RppsDiagnosticPageInner() {
  const auth = useAuth();
  const cart = useCart();
  const [diag, setDiag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState("");

  async function runDiagnostic(q = "") {
    setLoading(true);
    try {
      const url = q ? `/api/rpps/diagnostic?q=${encodeURIComponent(q)}` : "/api/rpps/diagnostic";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      setDiag(data);
    } catch (e) {
      setDiag({ ok: false, error: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (auth.ready) runDiagnostic();
  }, [auth.ready]);

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMIN · DIAGNOSTIC"
          icon="ti-stethoscope"
          title="Diagnostic API RPPS"
          accent="(ANS FHIR)"
          sub="Vérifier si l'API Annuaire Santé répond depuis cet environnement (IP sortante, codes HTTP, durée)"
        />

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => runDiagnostic()}
            disabled={loading}
            style={{
              background: "#185FA5", color: "#fff", border: "none",
              padding: "10px 16px", borderRadius: 8, fontWeight: 700,
              cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            {loading ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-refresh" />}
            {loading ? "Test en cours…" : "Relancer le diagnostic"}
          </button>

          <input
            type="text"
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="Tester une query custom (ex: Martin)"
            style={{
              padding: "8px 12px", border: "1px solid #d3d9e0",
              borderRadius: 6, fontSize: 13, fontFamily: "inherit",
              flex: 1, maxWidth: 240,
            }}
          />
          <button
            onClick={() => runDiagnostic(customQuery)}
            disabled={loading || !customQuery.trim()}
            style={{
              background: "#7a6fb0", color: "#fff", border: "none",
              padding: "8px 14px", borderRadius: 8, fontSize: 13,
              cursor: customQuery.trim() ? "pointer" : "not-allowed",
              opacity: customQuery.trim() ? 1 : 0.5,
              fontFamily: "inherit",
            }}
          >
            Tester
          </button>
        </div>

        {loading && !diag && <Panel><SkeletonRow count={4} /></Panel>}

        {diag && diag.ok && (
          <>
            {/* RÉSUMÉ */}
            <Panel style={{
              marginBottom: 14,
              borderLeft: `4px solid ${diag.summary.color === "green" ? "#5aa05a" : diag.summary.color === "amber" ? "#EF9F27" : "#c0392b"}`,
              background: diag.summary.color === "green" ? "#eef9ef" : diag.summary.color === "amber" ? "#fff8ec" : "#fce5e0",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{
                  background: diag.summary.color === "green" ? "#5aa05a" : diag.summary.color === "amber" ? "#EF9F27" : "#c0392b",
                  color: "#fff", width: 36, height: 36, borderRadius: 18,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>
                  <i className={`ti ${diag.summary.color === "green" ? "ti-check" : "ti-alert-triangle"}`} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#6c7a89", fontWeight: 700, letterSpacing: 0.5 }}>DIAGNOSTIC</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#142131" }}>{diag.summary.code}</div>
                </div>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#2a3a48", lineHeight: 1.5 }}>{diag.summary.msg}</p>
            </Panel>

            {/* INFOS ENV */}
            <Panel style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#142131" }}>
                <i className="ti ti-server" style={{ color: "#185FA5" }} /> Environnement d'exécution
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <Kv label="IP sortante" value={diag.outgoing_ip || "?"} mono color="#185FA5" />
                <Kv label="Hébergeur" value={diag.environment.vercel ? "Vercel" : "Local/autre"} />
                <Kv label="Environnement" value={diag.environment.vercel_env || "—"} />
                <Kv label="Région Vercel" value={diag.environment.vercel_region || "—"} mono />
                <Kv label="Node" value={diag.environment.node} mono />
                <Kv label="Durée totale" value={`${diag.duration_total_ms}ms`} />
              </div>
              {diag.outgoing_ip && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#f4f7fa", borderRadius: 6, fontSize: 12, color: "#6c7a89" }}>
                  <i className="ti ti-info-circle" /> Si l'API ANS bloque (403), c'est l'IP <code>{diag.outgoing_ip}</code> qu'il faut faire whitelister auprès de l'ANS (cyber@esante.gouv.fr).
                </div>
              )}
            </Panel>

            {/* TESTS */}
            <Panel>
              <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#142131" }}>
                <i className="ti ti-test-pipe" style={{ color: "#7a6fb0" }} /> Tests par endpoint ({diag.tests.length})
              </h3>
              {diag.tests.map((t, i) => <TestCard key={i} test={t} />)}
              {diag.user_test && (
                <>
                  <div style={{ marginTop: 14, marginBottom: 6, fontSize: 12, color: "#6c7a89", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    🧪 Test custom
                  </div>
                  <TestCard test={diag.user_test} />
                </>
              )}
            </Panel>
          </>
        )}

        {diag && !diag.ok && (
          <StateMsg type="error" icon="ti-alert-circle">
            Échec du diagnostic : {diag.error || "inconnu"}
          </StateMsg>
        )}

        <Panel style={{ marginTop: 14, background: "#fff8ec", borderColor: "#f0d59f" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 13, color: "#7a4f15" }}>
            <i className="ti ti-help-circle" /> Comment lire ce diagnostic ?
          </h3>
          <ul style={{ fontSize: 12, color: "#7a4f15", margin: "4px 0 0 18px", lineHeight: 1.7 }}>
            <li><b>HTTP 200</b> : tout va bien, l'API ANS répond</li>
            <li><b>HTTP 403</b> : l'IP <code>{diag?.outgoing_ip || "X"}</code> est <b>blacklistée</b>. L'ANS bloque les IPs cloud/proxy par défaut</li>
            <li><b>HTTP 0 / TIMEOUT</b> : l'ANS ne répond pas (réseau ou maintenance)</li>
            <li><b>HTTP 400 / 422</b> : erreur de paramètre dans la requête (à corriger dans le code)</li>
            <li><b>HTTP 500+</b> : crash côté ANS, réessayer plus tard</li>
          </ul>
          <p style={{ fontSize: 12, color: "#7a4f15", margin: "8px 0 0" }}>
            <b>Si Vercel est blacklistée</b> : 3 options possibles —
          </p>
          <ol style={{ fontSize: 12, color: "#7a4f15", margin: "2px 0 0 18px", lineHeight: 1.7 }}>
            <li>Demander whitelist à l'ANS (cyber@esante.gouv.fr) avec l'IP affichée</li>
            <li>Utiliser un proxy/relay (Cloudflare Workers, EU-based VPS)</li>
            <li>Importer le dump RPPS open data depuis data.gouv.fr (mise à jour mensuelle, déjà 1,7M de praticiens) → recherche full-text en local sans dépendre de l'API ANS</li>
          </ol>
        </Panel>
      </div>
    </div>
  );
}

function Kv({ label, value, mono, color }) {
  return (
    <div style={{ background: "#f4f7fa", borderRadius: 6, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>{label}</div>
      <div style={{
        fontSize: 13, fontWeight: 700, marginTop: 2,
        color: color || "#142131",
        fontFamily: mono ? "Consolas, monospace" : "inherit",
      }}>{value}</div>
    </div>
  );
}

function TestCard({ test }) {
  const ok = test.ok;
  const is403 = test.status === 403;
  const bg = ok ? "#eef9ef" : is403 ? "#fce5e0" : "#fff8ec";
  const border = ok ? "#bfe2bf" : is403 ? "#f0c4be" : "#f0d59f";
  const statusColor = ok ? "#2e6f33" : is403 ? "#7a2d23" : "#7a4f15";

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: 8, padding: "12px 14px", marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#142131", flex: 1, minWidth: 200 }}>
          {test.label}
        </div>
        <span style={{
          background: ok ? "#5aa05a" : is403 ? "#c0392b" : "#EF9F27",
          color: "#fff", fontSize: 11, fontWeight: 700,
          padding: "2px 8px", borderRadius: 6, fontFamily: "Consolas, monospace",
        }}>
          {test.status} {test.statusText}
        </span>
        <span style={{ fontSize: 11, color: "#6c7a89", fontFamily: "Consolas, monospace" }}>
          {test.duration_ms}ms
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#6c7a89", fontFamily: "Consolas, monospace", wordBreak: "break-all", marginBottom: 6 }}>
        {test.url}
      </div>
      {test.fhir_total !== null && test.fhir_total !== undefined && (
        <div style={{ fontSize: 12, color: statusColor }}>
          📊 FHIR total : <b>{test.fhir_total}</b> · entries dans la page : <b>{test.fhir_entry_count}</b>
        </div>
      )}
      {test.error && (
        <div style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>
          ⚠️ Erreur : <code>{test.error}</code>
        </div>
      )}
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 11, color: "#6c7a89", cursor: "pointer" }}>Voir réponse brute ({test.body_size || 0} bytes)</summary>
        <pre style={{
          background: "#142131", color: "#e8edf2",
          padding: 10, borderRadius: 6, fontSize: 11,
          overflowX: "auto", marginTop: 6, maxHeight: 250,
        }}>{test.body_raw || "(aucune)"}</pre>
        {test.headers && (
          <pre style={{
            background: "#1d2c40", color: "#7CC8C8",
            padding: 8, borderRadius: 6, fontSize: 10.5,
            overflowX: "auto", marginTop: 4,
          }}>
{Object.entries(test.headers).slice(0, 10).map(([k, v]) => `${k}: ${v}`).join("\n")}
          </pre>
        )}
      </details>
    </div>
  );
}

// 0.57.34 : wrapper AdminGuard pour restreindre l'accès aux admins
export default function RppsDiagnosticPage() {
  return (
    <AdminGuard>
      <RppsDiagnosticPageInner />
    </AdminGuard>
  );
}
