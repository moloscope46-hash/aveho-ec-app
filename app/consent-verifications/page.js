"use client";
// =============================================================
//  Page Admin — Audit des vérifications de hash (scans QR)
//  Alpha 0.23.0
//
//  Permet à un admin de voir qui a scanné quel QR de consentement,
//  depuis quelle IP, quel navigateur, avec quel résultat (hash OK/KO).
//  Indispensable pour audit CNIL : on doit pouvoir prouver que :
//    - les vérifications publiques sont tracées
//    - les tentatives invalides sont aussi tracées
// =============================================================
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, FilterBar } from "../ui";
import { KpiRow } from "../kpis";
import { fmtDate, relativeTime } from "../../lib/format";

export default function ConsentVerificationsPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreResultat, setFiltreResultat] = useState("tous"); // 'tous' | 'valides' | 'invalides'
  const [search, setSearch] = useState("");
  const [detailModal, setDetailModal] = useState(null);

  async function load() {
    if (!auth.structureId) return;
    const { data } = await supabase.from("v_audit_verifications")
      .select("*")
      .eq("structure_id", auth.structureId)
      .order("verified_at", { ascending: false })
      .limit(500);
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready]);

  // Alpha 0.24.0 : export CSV de toutes les vérifications pour audit annuel
  const [exportBusy, setExportBusy] = useState(false);
  async function exportCSV() {
    setExportBusy(true);
    try {
      // Récupère TOUTES les vérifications via la vue export (pas de limite 500)
      const { data, error } = await supabase
        .from("v_audit_verifications_export")
        .select("*")
        .eq("structure_id", auth.structureId)
        .order("verification_date", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) {
        alert("Aucune vérification à exporter.");
        return;
      }

      // Construit le CSV (séparateur point-virgule, compatible Excel FR)
      const headers = [
        "Date vérification",
        "Résultat",
        "Patient",
        "Consent. signé le",
        "Consent. expire le",
        "Statut consent.",
        "Consent. archivé",
        "Origine IP",
        "Navigateur",
        "Système",
        "Hash fourni",
        "Hash attendu",
      ];
      const escape = (v) => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        // Échapper guillemets, retours ligne, point-virgule
        if (s.includes(";") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const rows = data.map((r) => [
        r.verification_date,
        r.resultat,
        r.patient || "—",
        r.consent_signe_le || "",
        r.consent_expire_le || "",
        r.consent_statut || "",
        r.consent_archive || "",
        r.origine_ip || "",
        r.navigateur || "",
        r.systeme || "",
        r.hash_fourni || "",
        r.hash_attendu || "",
      ].map(escape).join(";"));
      // BOM UTF-8 pour Excel
      const csv = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");

      // Téléchargement
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      const collectiviteSlug = (auth.structureNom || "structure")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      link.href = url;
      link.download = `audit-verifications-rgpd-${collectiviteSlug}-${today}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      alert("Erreur export : " + (e.message || "inconnue"));
    } finally {
      setExportBusy(false);
    }
  }

  if (!auth.ready) return null;

  // Restriction d'accès : admin uniquement
  const peutVoir = auth.can("gerer_roles") || auth.can("manage_collectivite") || auth.role?.systeme === "admin" || auth.role?.nom === "Administrateur";

  if (!peutVoir) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel>
            <StateMsg>
              <i className="ti ti-shield-x" /> Cette page est réservée aux administrateurs.
            </StateMsg>
          </Panel>
        </div>
      </div>
    );
  }

  // Filtres
  const q = search.trim().toLowerCase();
  const visibles = rows.filter((v) => {
    if (filtreResultat === "valides" && !v.hash_match) return false;
    if (filtreResultat === "invalides" && v.hash_match) return false;
    if (q) {
      const hay = `${v.patient_nom_prenom || ""} ${v.ip_address || ""} ${v.navigateur || ""} ${v.os || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // KPIs
  const total = rows.length;
  const valides = rows.filter((v) => v.hash_match).length;
  const invalides = rows.filter((v) => !v.hash_match).length;
  const semDerniere = rows.filter((v) => (Date.now() - new Date(v.verified_at).getTime()) < 7 * 86400000).length;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="CONFORMITÉ · AUDIT" icon="ti-shield-search" title="Audit" accent="vérifications RGPD"
          sub="Historique des scans QR de vérification d'intégrité. Indispensable pour audit CNIL." />

        <KpiRow tiles={[
          { label: "Total vérifications", value: total, icon: "ti-shield-search", color: "#185FA5" },
          { label: "7 derniers jours", value: semDerniere, icon: "ti-calendar", color: "#7CC8C8" },
          { label: "Valides ✓", value: valides, icon: "ti-shield-check", color: "#5aa05a" },
          { label: "Invalides ✗", value: invalides, icon: "ti-shield-x", color: "#c0392b" },
        ]} />

        <Panel>
          <FilterBar
            label="Résultat :"
            value={filtreResultat}
            onChange={setFiltreResultat}
            options={[
              { v: "tous", l: "Tous", count: total },
              { v: "valides", l: "Valides", count: valides },
              { v: "invalides", l: "Invalides", count: invalides },
            ]}
            rightSlot={
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <i className="ti ti-search" style={{ position: "absolute", left: 10, color: "#8a98a8", fontSize: 14, pointerEvents: "none" }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Patient, IP, navigateur…"
                    aria-label="Rechercher"
                    style={{ padding: "6px 28px 6px 32px", borderRadius: 8, border: "1px solid #e1e6eb", fontFamily: "inherit", fontSize: 13, width: 240, background: "#fff" }}
                  />
                  {search && <button onClick={() => setSearch("")} aria-label="Effacer" style={{ position: "absolute", right: 6, background: "transparent", border: "none", cursor: "pointer", color: "#8a98a8", fontSize: 14, padding: 4 }}><i className="ti ti-x" /></button>}
                </div>
                {/* Alpha 0.24.0 : bouton export CSV (audit annuel) */}
                <button
                  onClick={exportCSV}
                  disabled={exportBusy || rows.length === 0}
                  title="Exporter toutes les vérifications en CSV (audit annuel)"
                  style={{
                    padding: "6px 12px", borderRadius: 8,
                    border: "1px solid #5aa05a",
                    background: exportBusy ? "#cccccc" : "#fff",
                    color: "#2e6f33",
                    cursor: exportBusy ? "wait" : "pointer",
                    fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}
                >
                  <i className="ti ti-file-spreadsheet" /> {exportBusy ? "Export…" : "Export CSV"}
                </button>
              </div>
            }
          />
          {loading ? <StateMsg>Chargement…</StateMsg> : visibles.length === 0 ? (
            <StateMsg>
              {search ? `Aucune vérification trouvée pour "${search}".` :
               filtreResultat === "valides" ? "Aucune vérification valide pour l'instant." :
               filtreResultat === "invalides" ? "Aucune tentative invalide détectée. 🎉" :
               "Aucune vérification de hash effectuée pour cette structure."}
            </StateMsg>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Résultat</th>
                  <th>Origine</th>
                  <th>Navigateur / OS</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontSize: 13 }} title={new Date(v.verified_at).toLocaleString("fr-FR")}>
                      {fmtDate(v.verified_at)}<br/>
                      <span style={{ fontSize: 11, color: "#8a98a8" }}>{relativeTime(v.verified_at)}</span>
                    </td>
                    <td>
                      <b>{v.patient_nom_prenom || <span style={{ color: "#c0392b", fontStyle: "italic" }}>Inconnu (consentement supprimé ?)</span>}</b>
                      {v.date_signature && <span style={{ fontSize: 11, color: "#8a98a8", display: "block" }}>Signé le {fmtDate(v.date_signature)}</span>}
                    </td>
                    <td>
                      {v.hash_match ? (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 8, background: "#eef9ef", color: "#2e6f33" }}>
                          <i className="ti ti-shield-check" /> Hash valide
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 8, background: "#fef0ee", color: "#c0392b" }}>
                          <i className="ti ti-shield-x" /> Hash invalide
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, fontFamily: "monospace" }}>
                      {v.ip_address || <span style={{ color: "#8a98a8" }}>—</span>}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <i className={`ti ${v.navigateur === "Chrome" ? "ti-brand-chrome" : v.navigateur === "Firefox" ? "ti-brand-firefox" : v.navigateur === "Safari" ? "ti-brand-safari" : v.navigateur === "Edge" ? "ti-brand-edge" : "ti-browser"}`} /> {v.navigateur}
                      <span style={{ fontSize: 11, color: "#8a98a8", display: "block" }}>
                        <i className={`ti ${v.os === "iOS" ? "ti-brand-apple" : v.os === "Android" ? "ti-brand-android" : v.os === "Windows" ? "ti-brand-windows" : v.os === "macOS" ? "ti-brand-apple" : "ti-device-desktop"}`} /> {v.os}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <i className="ti ti-eye" style={{ color: "#185FA5", cursor: "pointer", fontSize: 16 }} onClick={() => setDetailModal(v)} title="Détails" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rows.length === 500 && (
            <p style={{ fontSize: 12, color: "#8a98a8", marginTop: 12 }}>
              <i className="ti ti-info-circle" /> Affichage limité aux 500 plus récentes vérifications. Pour un audit complet, exporter via la base.
            </p>
          )}
        </Panel>
      </div>

      {/* Modale détail */}
      {detailModal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setDetailModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 560 }}>
            <div className="modal-head" style={{ background: detailModal.hash_match ? "linear-gradient(135deg,#5aa05a,#2e6f33)" : "linear-gradient(135deg,#c0392b,#7a1f15)", color: "#fff" }}>
              <i className={`ti ${detailModal.hash_match ? "ti-shield-check" : "ti-shield-x"}`} style={{ marginRight: 6 }} />
              <span>Vérification {detailModal.hash_match ? "valide" : "INVALIDE"}</span>
              <i className="ti ti-x" style={{ cursor: "pointer", marginLeft: "auto" }} onClick={() => setDetailModal(null)} aria-label="Fermer" role="button" tabIndex={0} />
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div><b>Date :</b> {new Date(detailModal.verified_at).toLocaleString("fr-FR")}</div>
                <div><b>Patient :</b> {detailModal.patient_nom_prenom || "—"}</div>
                <div><b>Consentement signé le :</b> {detailModal.date_signature ? new Date(detailModal.date_signature).toLocaleString("fr-FR") : "—"}</div>
                <div><b>Statut du consentement :</b> {detailModal.consent_statut || "—"}</div>
                <div><b>Adresse IP :</b> <code>{detailModal.ip_address || "—"}</code></div>
                <div><b>Navigateur :</b> {detailModal.navigateur}</div>
                <div><b>OS :</b> {detailModal.os}</div>
              </div>
              <div style={{ marginTop: 16, padding: 12, background: "#f4f7fa", borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#185FA5", marginBottom: 6 }}>HASH FOURNI DANS LE QR</div>
                <code style={{ fontSize: 11, wordBreak: "break-all", display: "block" }}>{detailModal.hash_provided || "—"}</code>
              </div>
              {detailModal.user_agent && (
                <div style={{ marginTop: 12, padding: 12, background: "#f4f7fa", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#185FA5", marginBottom: 6 }}>USER AGENT COMPLET</div>
                  <code style={{ fontSize: 11, wordBreak: "break-all", display: "block" }}>{detailModal.user_agent}</code>
                </div>
              )}
              {!detailModal.hash_match && (
                <div style={{ marginTop: 16, padding: 14, background: "#fef0ee", border: "1px solid #f0c4be", borderRadius: 8 }}>
                  <b style={{ color: "#c0392b" }}><i className="ti ti-alert-triangle" /> Alerte de sécurité</b>
                  <p style={{ fontSize: 12, margin: "6px 0 0", color: "#7a1f15" }}>
                    Cette vérification a échoué : le hash fourni ne correspond pas à celui enregistré pour ce consentement. Causes possibles :
                  </p>
                  <ul style={{ fontSize: 12, color: "#7a1f15", margin: "6px 0", paddingLeft: 20 }}>
                    <li>QR code provenant d'une copie altérée du document</li>
                    <li>Lien manipulé manuellement</li>
                    <li>Tentative d'usurpation</li>
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setDetailModal(null)}>Fermer</button>
              {detailModal.consentement_id && (
                <button className="btn-save" onClick={() => router.push(`/consentements?id=${detailModal.consentement_id}`)}>
                  <i className="ti ti-shield-lock" /> Voir le consentement
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
