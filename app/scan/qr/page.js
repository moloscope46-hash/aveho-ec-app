"use client";
// =============================================================
//  app/scan/qr/page.js (Alpha 0.56.2)
//
//  Scan de QR codes et codes-barres via html5-qrcode.
//  Parser intelligent qui détecte le type (Vitale, GS1/UDI, URL,
//  texte) et propose des actions contextuelles.
// =============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/useAuth";
import { parseQrContent } from "../../../lib/qrParser";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import QrScanner from "../../QrScanner";
import { PageHead, Panel } from "../../ui";

export default function ScanQrPage() {
  const auth = useAuth();
  const router = useRouter();
  const cart = useCart();
  const [scanning, setScanning] = useState(true);
  const [parsed, setParsed] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  function handleResult({ text, format, source }) {
    setError(null);
    const p = parseQrContent(text);
    p.format = format;
    p.source = source;
    p.scanned_at = new Date();
    setParsed(p);
    setHistory(h => [p, ...h.slice(0, 9)]);
    setScanning(false);

    // Auto-navigate si lien interne Aveho
    if (p.type === "url_aveho") {
      setTimeout(() => router.push(p.url.pathname + p.url.search), 800);
    }
  }

  function rescan() {
    setParsed(null);
    setError(null);
    setScanning(true);
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="OUTILS SCAN · QR / CODE-BARRE"
          icon="ti-qrcode"
          title="Scan QR code"
          accent="(carte Vitale, étiquettes, matériel GS1)"
          sub="Pointe la caméra vers le code, ou charge une image depuis ton téléphone"
        />

        {scanning && !parsed && (
          <Panel style={{ marginBottom: 12 }}>
            <QrScanner
              active={scanning}
              onResult={handleResult}
              onError={(msg) => setError(msg)}
              autoStop
            />
            {error && (
              <div style={{ marginTop: 10, padding: 10, background: "#fce5e0", border: "1px solid #f0c4be", borderRadius: 6, fontSize: 12, color: "#7a2d23" }}>
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}
          </Panel>
        )}

        {parsed && <ResultDisplay parsed={parsed} onRescan={rescan} router={router} />}

        {/* Historique */}
        {history.length > 0 && (
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 13 }}>
              <i className="ti ti-history" /> Historique de la session ({history.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setParsed(h)}
                  style={{
                    textAlign: "left", padding: "6px 10px",
                    background: i === 0 && parsed === h ? "#dff5e0" : "#f4f7fa",
                    border: "1px solid #e3e9ee", borderRadius: 6,
                    cursor: "pointer", fontFamily: "inherit", fontSize: 12,
                    display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  <TypeBadge type={h.type} />
                  <span style={{ flex: 1, fontFamily: "Consolas, monospace", color: "#142131", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {h.raw.slice(0, 60)}{h.raw.length > 60 ? "…" : ""}
                  </span>
                  <span style={{ fontSize: 10, color: "#a0aeb9" }}>
                    {h.scanned_at?.toLocaleTimeString()}
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        )}

        {/* Pédagogie : types supportés */}
        <Panel style={{ marginTop: 12, background: "#f4f7fa" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>
            <i className="ti ti-help-circle" /> Types reconnus
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 6, fontSize: 11.5, color: "#445566" }}>
            <div><TypeBadge type="vitale_qr" /> NIR carte Vitale</div>
            <div><TypeBadge type="gs1" /> GS1/UDI matériel</div>
            <div><TypeBadge type="ean" /> EAN-13 / EAN-8</div>
            <div><TypeBadge type="url_aveho" /> Lien Aveho interne</div>
            <div><TypeBadge type="url" /> URL externe</div>
            <div><TypeBadge type="vcard" /> Contact vCard</div>
            <div><TypeBadge type="wifi" /> Config WiFi</div>
            <div><TypeBadge type="text" /> Texte libre</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  const styles = {
    vitale_qr: { bg: "#dff5e0", fg: "#2e6f33", lbl: "Vitale" },
    gs1: { bg: "#dbe7f5", fg: "#185FA5", lbl: "GS1/UDI" },
    ean: { bg: "#f3effa", fg: "#5a4a90", lbl: "EAN" },
    url_aveho: { bg: "#dff5e0", fg: "#2e6f33", lbl: "Aveho" },
    url: { bg: "#dbe7f5", fg: "#185FA5", lbl: "URL" },
    vcard: { bg: "#fff8ec", fg: "#7a4f15", lbl: "vCard" },
    wifi: { bg: "#fff8ec", fg: "#7a4f15", lbl: "WiFi" },
    text: { bg: "#f4f7fa", fg: "#6c7a89", lbl: "Texte" },
    empty: { bg: "#fce5e0", fg: "#7a2d23", lbl: "Vide" },
  };
  const s = styles[type] || styles.text;
  return (
    <span style={{
      display: "inline-block", background: s.bg, color: s.fg,
      fontSize: 9.5, fontWeight: 700, padding: "2px 7px",
      borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.3,
    }}>{s.lbl}</span>
  );
}

function ResultDisplay({ parsed, onRescan, router }) {
  return (
    <Panel style={{
      marginBottom: 12,
      background: "linear-gradient(135deg, #eef9ef, #fff)",
      borderColor: "#bfe2bf",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 32 }}>✅</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: "#2e6f33" }}>
            Scan réussi <TypeBadge type={parsed.type} />
          </h3>
          <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2 }}>
            {parsed.label} · format {parsed.format} · source {parsed.source === "camera" ? "📷 caméra" : "🖼 image"}
          </div>
        </div>
        <button onClick={onRescan} style={{
          background: "#185FA5", color: "#fff", border: "none",
          padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}>
          <i className="ti ti-refresh" /> Re-scanner
        </button>
      </div>

      {/* Affichage spécifique par type */}
      {parsed.type === "vitale_qr" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e3e9ee" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#142131" }}>
            <i className="ti ti-user-shield" style={{ color: "#5aa05a" }} /> Données patient détectées
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, fontSize: 12.5 }}>
            <Kv label="NIR" value={parsed.nir} mono />
            <Kv label="Sexe (NIR)" value={parsed.sexe} />
            <Kv label="Année naissance" value={parsed.annee_naissance} />
            <Kv label="Mois naissance" value={parsed.mois_naissance} />
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => router.push(`/patients?q=${encodeURIComponent(parsed.nir)}`)} style={btnPrimary}>
              <i className="ti ti-user-search" /> Chercher ce patient
            </button>
            <button onClick={() => router.push(`/patients?new=1&nir=${encodeURIComponent(parsed.nir)}`)} style={btnSecondary}>
              <i className="ti ti-user-plus" /> Nouveau patient avec ce NIR
            </button>
          </div>
          <div style={{ marginTop: 10, padding: 8, background: "#fff8ec", border: "1px solid #f0d59f", borderRadius: 6, fontSize: 11, color: "#7a4f15" }}>
            <i className="ti ti-info-circle" /> Le NIR seul ne suffit pas à identifier formellement le patient. Vérifie toujours l'identité avec la carte Vitale.
          </div>
        </div>
      )}

      {parsed.type === "gs1" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e3e9ee" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>
            <i className="ti ti-package" style={{ color: "#185FA5" }} /> Code GS1/UDI · {Object.keys(parsed.ais).length} attribut(s)
          </h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f4f7fa", color: "#6c7a89", fontSize: 10, textTransform: "uppercase" }}>
                <th style={{ textAlign: "left", padding: 6 }}>AI</th>
                <th style={{ textAlign: "left", padding: 6 }}>Libellé</th>
                <th style={{ textAlign: "left", padding: 6 }}>Valeur</th>
              </tr>
            </thead>
            <tbody>
              {parsed.ais_labeled.map((a, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f4f7fa" }}>
                  <td style={{ padding: 6, fontFamily: "Consolas, monospace", color: "#6c7a89" }}>({a.ai})</td>
                  <td style={{ padding: 6, fontWeight: 600 }}>{a.label}</td>
                  <td style={{ padding: 6, fontFamily: "Consolas, monospace" }}>{a.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsed.ais["01"] && (
            <div style={{ marginTop: 10 }}>
              <button onClick={() => router.push(`/materiels?gtin=${encodeURIComponent(parsed.ais["01"])}`)} style={btnPrimary}>
                <i className="ti ti-search" /> Chercher dans le matériel
              </button>
            </div>
          )}
        </div>
      )}

      {parsed.type === "ean" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e3e9ee" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>
            <i className="ti ti-barcode" style={{ color: "#5a4a90" }} /> {parsed.label}
          </h4>
          <Kv label="Code" value={parsed.ean} mono />
          <div style={{ marginTop: 10 }}>
            <button onClick={() => router.push(`/materiels?ean=${encodeURIComponent(parsed.ean)}`)} style={btnPrimary}>
              <i className="ti ti-search" /> Chercher matériel par EAN
            </button>
          </div>
        </div>
      )}

      {(parsed.type === "url" || parsed.type === "url_aveho") && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e3e9ee" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>
            <i className="ti ti-link" style={{ color: "#185FA5" }} /> {parsed.label}
          </h4>
          <div style={{ fontFamily: "Consolas, monospace", fontSize: 11.5, padding: 8, background: "#f4f7fa", borderRadius: 4, wordBreak: "break-all" }}>
            {parsed.raw}
          </div>
          <div style={{ marginTop: 10 }}>
            {parsed.type === "url_aveho" ? (
              <div style={{ background: "#dff5e0", border: "1px solid #bfe2bf", color: "#2e6f33", padding: 8, borderRadius: 6, fontSize: 12 }}>
                <i className="ti ti-arrow-right" /> Redirection automatique vers <code>{parsed.url.pathname}</code>…
              </div>
            ) : (
              <a href={parsed.raw} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, display: "inline-block", textDecoration: "none" }}>
                <i className="ti ti-external-link" /> Ouvrir le lien
              </a>
            )}
          </div>
        </div>
      )}

      {parsed.type === "vcard" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e3e9ee" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>
            <i className="ti ti-id-badge" style={{ color: "#7a4f15" }} /> Contact vCard
          </h4>
          {parsed.fn && <Kv label="Nom" value={parsed.fn} />}
          {parsed.tel && <Kv label="Téléphone" value={parsed.tel} mono />}
          {parsed.email && <Kv label="Email" value={parsed.email} />}
        </div>
      )}

      {parsed.type === "wifi" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e3e9ee" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>
            <i className="ti ti-wifi" style={{ color: "#7a4f15" }} /> Config WiFi
          </h4>
          <Kv label="SSID" value={parsed.ssid} />
          <Kv label="Type" value={parsed.auth} />
        </div>
      )}

      {parsed.type === "text" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e3e9ee" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>
            <i className="ti ti-text-caption" style={{ color: "#6c7a89" }} /> Texte libre
          </h4>
          <div style={{ fontFamily: "Consolas, monospace", fontSize: 12, padding: 8, background: "#f4f7fa", borderRadius: 4, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 200, overflowY: "auto" }}>
            {parsed.raw}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
            <button onClick={() => navigator.clipboard?.writeText(parsed.raw)} style={btnSecondary}>
              <i className="ti ti-copy" /> Copier
            </button>
          </div>
        </div>
      )}

      {/* Raw content (toujours visible en bas) */}
      <details style={{ marginTop: 10 }}>
        <summary style={{ fontSize: 10.5, color: "#6c7a89", cursor: "pointer" }}>
          Voir le contenu brut ({parsed.raw.length} car.)
        </summary>
        <pre style={{ background: "#142131", color: "#e8edf2", padding: 10, borderRadius: 6, fontSize: 10.5, marginTop: 6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 150 }}>
{parsed.raw}
        </pre>
      </details>
    </Panel>
  );
}

function Kv({ label, value, mono }) {
  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 1, fontFamily: mono ? "Consolas, monospace" : "inherit" }}>
        {value || "—"}
      </div>
    </div>
  );
}

const btnPrimary = {
  background: "#185FA5", color: "#fff", border: "none",
  padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
};
const btnSecondary = {
  background: "#fff", color: "#142131", border: "1px solid #d3d9e0",
  padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
};
