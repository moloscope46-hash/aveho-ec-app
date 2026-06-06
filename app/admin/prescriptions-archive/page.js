"use client";
import { toast } from "../../components/ui-premium";
import AdminGuard from "../../components/AdminGuard"; // 0.57.34 anti-régression admin
// =============================================================
//  app/admin/prescriptions-archive/page.js (Alpha 0.56.8)
//
//  Recherche multi-critères dans l'archive des prescriptions.
//  Stats globales + Top médicaments + Top prescripteurs +
//  histogramme par mois + recherche + export CSV.
// =============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel} from "../../ui";
// 0.58.51 : migration UI premium
import { EmptyState } from "../../components/ui-premium";
import { fetchWithAuth } from "../../../lib/fetchWithAuth";  // 0.57.16 : auth Bearer obligatoire
function PrescriptionsArchivePageInner() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [tab, setTab] = useState("recherche"); // recherche | stats | top | tendances
  const [stats, setStats] = useState(null);
  const [topMeds, setTopMeds] = useState([]);
  const [topPresc, setTopPresc] = useState([]);
  const [parMois, setParMois] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Filtres recherche
  const [filters, setFilters] = useState({
    prescripteur_nom: "",
    prescripteur_rpps: "",
    medicament_query: "",
    dci_query: "",
    type_prescription: "all",
    source_creation: "all",
    statut: "all",
    date_debut: "",
    date_fin: "",
    rpps_verifie: null,
  });
  const [results, setResults] = useState([]);
  const [totalEstime, setTotalEstime] = useState(0);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!auth.ready) return;
    loadStats();
  }, [auth.ready]);

  async function loadStats() {
    setLoadingStats(true);
    const [{ data: s }, { data: m }, { data: p }, { data: pm }] = await Promise.all([
      supabase.rpc("prescriptions_archive_stats"),
      supabase.rpc("prescriptions_top_medicaments", { p_limit: 15 }),
      supabase.rpc("prescriptions_top_prescripteurs", { p_limit: 15 }),
      supabase.rpc("prescriptions_par_mois", { p_mois_count: 12 }),
    ]);
    setStats((s && s[0]) || null);
    setTopMeds(m || []);
    setTopPresc(p || []);
    setParMois(pm || []);
    setLoadingStats(false);
  }

  async function runSearch() {
    setSearching(true);
    const token = (await supabase.auth.getSession()).data?.session?.access_token;
    try {
      const res = await fetchWithAuth("/api/prescriptions/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...filters, limit: 100 }),
      });
      const data = await res.json();
      if (data.ok) {
        setResults(data.results || []);
        setTotalEstime(data.total_estime || 0);
      } else {
        toast.error("Erreur recherche : " + (data.error || "inconnue"));
      }
    } catch (e) {
      toast.error("Erreur réseau : " + e.message);
    } finally {
      setSearching(false);
    }
  }

  async function exportCsv(withLignes = false) {
    setExporting(true);
    const token = (await supabase.auth.getSession()).data?.session?.access_token;
    try {
      const res = await fetchWithAuth("/api/prescriptions/export-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...filters, include_lignes: withLignes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Erreur export : " + (err.error || res.status));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescriptions-archive-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Erreur réseau : " + e.message);
    } finally {
      setExporting(false);
    }
  }

  function resetFilters() {
    setFilters({
      prescripteur_nom: "", prescripteur_rpps: "",
      medicament_query: "", dci_query: "",
      type_prescription: "all", source_creation: "all", statut: "all",
      date_debut: "", date_fin: "",
      rpps_verifie: null,
    });
    setResults([]);
    setTotalEstime(0);
  }

  if (!auth.ready) return null;

  const setF = (k, v) => setFilters({ ...filters, [k]: v });

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMIN · ARCHIVES PRESCRIPTIONS"
          icon="ti-archive"
          title="Prescriptions archive"
          accent="(recherche + stats + export)"
          sub="Recherche multi-critères dans toutes les prescriptions enregistrées · top médicaments/prescripteurs · histogramme par mois · export CSV"
        />

        {/* Stats globales */}
        {stats && (
          <Panel style={{ marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
              <i className="ti ti-chart-bar" /> Vue d'ensemble
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
              <Kpi label="Total prescriptions" value={Number(stats.total_prescriptions).toLocaleString()} color="#5a4a90" icon="ti-prescription" big />
              <Kpi label="Lignes (méds)" value={Number(stats.total_lignes).toLocaleString()} color="#185FA5" icon="ti-pill" />
              <Kpi label="DCI uniques" value={Number(stats.total_medicaments_uniques).toLocaleString()} color="#7a6fb0" icon="ti-list" />
              <Kpi label="Prescripteurs" value={Number(stats.total_prescripteurs_uniques).toLocaleString()} color="#5aa05a" icon="ti-stethoscope" />
              <Kpi label="Patients" value={Number(stats.total_patients_uniques).toLocaleString()} color="#EF9F27" icon="ti-users" />
              <Kpi label="Via OCR" value={Number(stats.prescriptions_ocr).toLocaleString()} color="#7CC8C8" icon="ti-wand" />
              <Kpi label="RPPS vérifiés" value={Number(stats.rpps_verifies).toLocaleString()} color="#2e6f33" icon="ti-shield-check" />
              <Kpi label="Tokens IA" value={`${(Number(stats.tokens_total_in) + Number(stats.tokens_total_out)).toLocaleString()}`} color="#6c7a89" icon="ti-cpu" />
            </div>
            {stats.premier_date && (
              <p style={{ marginTop: 10, fontSize: 11, color: "#6c7a89" }}>
                <i className="ti ti-calendar" /> Période couverte : <b>{new Date(stats.premier_date).toLocaleDateString()}</b> → <b>{new Date(stats.dernier_date).toLocaleDateString()}</b>
              </p>
            )}
          </Panel>
        )}

        {/* Onglets */}
        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <TabBtn label="Recherche" icon="ti-search" color="#5a4a90" active={tab === "recherche"} onClick={() => setTab("recherche")} />
            <TabBtn label="Top médicaments" icon="ti-pill" color="#185FA5" count={topMeds.length} active={tab === "top_meds"} onClick={() => setTab("top_meds")} />
            <TabBtn label="Top prescripteurs" icon="ti-stethoscope" color="#7a6fb0" count={topPresc.length} active={tab === "top_presc"} onClick={() => setTab("top_presc")} />
            <TabBtn label="Tendances par mois" icon="ti-chart-line" color="#5aa05a" count={parMois.length} active={tab === "tendances"} onClick={() => setTab("tendances")} />
          </div>
        </Panel>

        {/* Recherche */}
        {tab === "recherche" && (
          <>
            <Panel style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
                <i className="ti ti-filter" /> Filtres
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <Field label="Prescripteur (nom)" value={filters.prescripteur_nom} onChange={(v) => setF("prescripteur_nom", v)} placeholder="Dupont, Martin…" />
                <Field label="RPPS (11 chiffres)" mono value={filters.prescripteur_rpps} onChange={(v) => setF("prescripteur_rpps", v)} placeholder="10100123456" />
                <Field label="Médicament" value={filters.medicament_query} onChange={(v) => setF("medicament_query", v)} placeholder="DOLIPRANE…" />
                <Field label="DCI" value={filters.dci_query} onChange={(v) => setF("dci_query", v)} placeholder="PARACETAMOL…" />
                <FieldSelect label="Type" value={filters.type_prescription} onChange={(v) => setF("type_prescription", v)} options={[
                  { v: "all", lbl: "Tous types" },
                  { v: "ordonnance", lbl: "Ordonnance simple" },
                  { v: "bizone", lbl: "Bizone (ALD)" },
                  { v: "medicaments_exception", lbl: "Médicaments d'exception" },
                  { v: "hospitaliere", lbl: "Hospitalière" },
                  { v: "securisee", lbl: "Sécurisée" },
                ]} />
                <FieldSelect label="Source" value={filters.source_creation} onChange={(v) => setF("source_creation", v)} options={[
                  { v: "all", lbl: "Toutes sources" },
                  { v: "ocr", lbl: "OCR uniquement" },
                  { v: "manuelle", lbl: "Manuelle" },
                  { v: "import", lbl: "Import" },
                ]} />
                <FieldSelect label="Statut" value={filters.statut} onChange={(v) => setF("statut", v)} options={[
                  { v: "all", lbl: "Tous statuts" },
                  { v: "active", lbl: "Active" },
                  { v: "archivee", lbl: "Archivée" },
                  { v: "annulee", lbl: "Annulée" },
                ]} />
                <Field label="Date début" type="date" value={filters.date_debut} onChange={(v) => setF("date_debut", v)} />
                <Field label="Date fin" type="date" value={filters.date_fin} onChange={(v) => setF("date_fin", v)} />
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={runSearch} disabled={searching} style={{
                  background: searching ? "#a0aeb9" : "#5a4a90", color: "#fff", border: "none",
                  padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 700,
                  cursor: searching ? "wait" : "pointer", fontFamily: "inherit",
                }}>
                  {searching ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-search" />}
                  {searching ? " Recherche…" : " Rechercher"}
                </button>
                <button onClick={resetFilters} style={btnGhost}>
                  <i className="ti ti-x" /> Réinitialiser
                </button>
                <div style={{ flex: 1 }} />
                {results.length > 0 && (
                  <>
                    <button onClick={() => exportCsv(false)} disabled={exporting} style={{
                      background: "#5aa05a", color: "#fff", border: "none",
                      padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                      cursor: exporting ? "wait" : "pointer", fontFamily: "inherit",
                    }}>
                      <i className="ti ti-download" /> Export CSV
                    </button>
                    <button onClick={() => exportCsv(true)} disabled={exporting} style={{
                      background: "#185FA5", color: "#fff", border: "none",
                      padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                      cursor: exporting ? "wait" : "pointer", fontFamily: "inherit",
                    }}>
                      <i className="ti ti-download" /> Export + médicaments
                    </button>
                  </>
                )}
              </div>
            </Panel>

            {results.length > 0 && (
              <Panel>
                <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
                  <i className="ti ti-list" /> Résultats ({results.length}
                  {totalEstime > results.length && ` · ${totalEstime} au total — affiche les 100 premières`})
                </h3>
                <div style={{ display: "grid", gap: 6 }}>
                  {results.map(p => (
                    <PrescriptionRow key={p.id} p={p} onOpen={() => router.push(`/patient/${p.patient_id}/edit?tab=prescriptions`)} />
                  ))}
                </div>
              </Panel>
            )}

            {results.length === 0 && !searching && (totalEstime === 0 && Object.values(filters).some(v => v && v !== "all" && v !== null)) && (
              <Panel>
                <EmptyState
                  icon="ti-mood-empty"
                  title="Aucun résultat"
                  description="Aucune prescription ne correspond aux filtres actuels. Essayez d'élargir vos critères pour voir plus de résultats."
                />
              </Panel>
            )}
          </>
        )}

        {/* Top médicaments */}
        {tab === "top_meds" && (
          <Panel>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
              <i className="ti ti-pill" style={{ color: "#185FA5" }} /> Top {topMeds.length} médicaments (par nb prescriptions)
            </h3>
            {loadingStats && <p style={{ fontSize: 12, color: "#6c7a89" }}>Chargement…</p>}
            {!loadingStats && topMeds.length === 0 && <p style={{ fontSize: 12, color: "#a0aeb9", fontStyle: "italic" }}>Aucun médicament prescrit</p>}
            {!loadingStats && topMeds.length > 0 && (
              <div style={{ display: "grid", gap: 4 }}>
                {topMeds.map((m, i) => {
                  const pct = Math.round((m.nb_prescriptions / topMeds[0].nb_prescriptions) * 100);
                  return (
                    <div key={i} style={{ padding: "6px 10px", background: "#f4f7fa", borderRadius: 6, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "#dbe7f522", zIndex: 0 }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
                        <span style={{ background: "#185FA5", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, minWidth: 24, textAlign: "center" }}>#{i + 1}</span>
                        <div style={{ flex: 1 }}>
                          <b style={{ fontSize: 13 }}>{m.medicament}</b>
                          {m.est_dci && <span style={{ marginLeft: 6, background: "#dff5e0", color: "#2e6f33", padding: "1px 6px", borderRadius: 4, fontSize: 9.5, fontWeight: 700 }}>DCI</span>}
                          <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2 }}>
                            {m.nb_patients_uniques} patient(s) · {m.nb_prescripteurs_uniques} prescripteur(s)
                          </div>
                        </div>
                        <b style={{ fontSize: 16, color: "#185FA5" }}>{Number(m.nb_prescriptions).toLocaleString()}</b>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {/* Top prescripteurs */}
        {tab === "top_presc" && (
          <Panel>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
              <i className="ti ti-stethoscope" style={{ color: "#7a6fb0" }} /> Top {topPresc.length} prescripteurs (par nb prescriptions)
            </h3>
            {loadingStats && <p style={{ fontSize: 12, color: "#6c7a89" }}>Chargement…</p>}
            {!loadingStats && topPresc.length === 0 && <p style={{ fontSize: 12, color: "#a0aeb9", fontStyle: "italic" }}>Aucun prescripteur</p>}
            {!loadingStats && topPresc.length > 0 && (
              <div style={{ display: "grid", gap: 4 }}>
                {topPresc.map((p, i) => {
                  const pct = Math.round((p.nb_prescriptions / topPresc[0].nb_prescriptions) * 100);
                  return (
                    <div key={i} style={{ padding: "6px 10px", background: "#f4f7fa", borderRadius: 6, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "#f3effa44", zIndex: 0 }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
                        <span style={{ background: "#7a6fb0", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, minWidth: 24, textAlign: "center" }}>#{i + 1}</span>
                        <div style={{ flex: 1 }}>
                          <b style={{ fontSize: 13 }}>Dr {p.prescripteur_nom} {p.prescripteur_prenom || ""}</b>
                          {p.rpps_verifie && <span style={{ marginLeft: 6, background: "#dff5e0", color: "#2e6f33", padding: "1px 6px", borderRadius: 4, fontSize: 9.5, fontWeight: 700 }}>
                            <i className="ti ti-shield-check" /> Vérifié
                          </span>}
                          <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2 }}>
                            {p.prescripteur_rpps && <code style={{ fontFamily: "Consolas, monospace", marginRight: 6 }}>{p.prescripteur_rpps}</code>}
                            {p.prescripteur_specialite && <span style={{ background: "#f3effa", color: "#5a4a90", padding: "1px 5px", borderRadius: 4, marginRight: 6 }}>{p.prescripteur_specialite}</span>}
                            <span>{p.nb_patients_uniques} patient(s) · {Number(p.nb_lignes).toLocaleString()} ligne(s)</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <b style={{ fontSize: 16, color: "#7a6fb0" }}>{Number(p.nb_prescriptions).toLocaleString()}</b>
                          {p.derniere_date && <div style={{ fontSize: 9.5, color: "#a0aeb9" }}>Dernière : {new Date(p.derniere_date).toLocaleDateString()}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {/* Tendances par mois */}
        {tab === "tendances" && (
          <Panel>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
              <i className="ti ti-chart-line" style={{ color: "#5aa05a" }} /> Activité sur 12 mois
            </h3>
            {loadingStats && <p style={{ fontSize: 12, color: "#6c7a89" }}>Chargement…</p>}
            {!loadingStats && parMois.length > 0 && (
              <>
                <MonthBarChart data={parMois} />
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 14 }}>
                  <thead>
                    <tr style={{ background: "#f4f7fa", color: "#6c7a89", fontSize: 10, textTransform: "uppercase" }}>
                      <th style={{ textAlign: "left", padding: 8 }}>Mois</th>
                      <th style={{ textAlign: "right", padding: 8 }}>Prescriptions</th>
                      <th style={{ textAlign: "right", padding: 8 }}>Lignes (méds)</th>
                      <th style={{ textAlign: "right", padding: 8 }}>Patients uniques</th>
                      <th style={{ textAlign: "right", padding: 8 }}>Via OCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parMois.map(m => (
                      <tr key={m.mois} style={{ borderBottom: "1px solid #f4f7fa" }}>
                        <td style={{ padding: 8 }}>{new Date(m.mois).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</td>
                        <td style={{ padding: 8, textAlign: "right", fontFamily: "Consolas, monospace", color: "#5a4a90", fontWeight: 700 }}>{Number(m.nb_prescriptions).toLocaleString()}</td>
                        <td style={{ padding: 8, textAlign: "right", fontFamily: "Consolas, monospace", color: "#185FA5" }}>{Number(m.nb_lignes).toLocaleString()}</td>
                        <td style={{ padding: 8, textAlign: "right", fontFamily: "Consolas, monospace", color: "#EF9F27" }}>{Number(m.nb_patients_uniques).toLocaleString()}</td>
                        <td style={{ padding: 8, textAlign: "right", fontFamily: "Consolas, monospace", color: "#7CC8C8" }}>{Number(m.nb_ocr).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function TabBtn({ label, icon, color, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color : "transparent",
        color: active ? "#fff" : color,
        border: `1.5px solid ${color}`,
        padding: "8px 14px", borderRadius: 8,
        fontSize: 13, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      <i className={`ti ${icon}`} /> {label}
      {count !== undefined && (
        <span style={{
          background: active ? "rgba(255,255,255,.25)" : `${color}22`,
          padding: "1px 7px", borderRadius: 10, fontSize: 10.5,
        }}>{count}</span>
      )}
    </button>
  );
}

function Kpi({ label, value, color, icon, big }) {
  return (
    <div style={{
      background: big ? `${color}11` : "#f4f7fa", borderRadius: 8, padding: "10px 12px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "#6c7a89", fontWeight: 600, textTransform: "uppercase" }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 11 }} /> {label}
      </div>
      <div style={{ fontSize: big ? 22 : 17, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "6px 9px", border: "1px solid #d3d9e0", borderRadius: 6,
          fontSize: 12, fontFamily: mono ? "Consolas, monospace" : "inherit",
        }}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        width: "100%", boxSizing: "border-box",
        padding: "6px 9px", border: "1px solid #d3d9e0", borderRadius: 6,
        fontSize: 12, background: "#fff", fontFamily: "inherit",
      }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.lbl}</option>)}
      </select>
    </div>
  );
}

function PrescriptionRow({ p, onOpen }) {
  return (
    <div onClick={onOpen} style={{
      padding: 10, background: "#f4f7fa", borderRadius: 6, cursor: "pointer",
      borderLeft: `3px solid ${p.statut === "active" ? "#5aa05a" : "#a0aeb9"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 12.5 }}>
          {p.date_prescription ? new Date(p.date_prescription).toLocaleDateString() : "Date inconnue"}
        </b>
        {p.patients && (
          <span style={{ fontSize: 11.5, color: "#185FA5", fontWeight: 600 }}>
            <i className="ti ti-user" /> {p.patients.nom} {p.patients.prenom}
            {p.patients.numero_dossier && <span style={{ marginLeft: 4, fontFamily: "Consolas, monospace", fontSize: 10, color: "#6c7a89" }}>n°{p.patients.numero_dossier}</span>}
          </span>
        )}
        {p.prescripteur_nom && (
          <span style={{ fontSize: 11, color: "#6c7a89" }}>
            <i className="ti ti-stethoscope" /> Dr {p.prescripteur_nom}{p.prescripteur_specialite && ` · ${p.prescripteur_specialite}`}
          </span>
        )}
        {p.rpps_verifie && (
          <span style={{ background: "#dff5e0", color: "#2e6f33", fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>
            <i className="ti ti-shield-check" /> RPPS OK
          </span>
        )}
        {p.source_creation === "ocr" && (
          <span style={{ background: "#dbe7f5", color: "#185FA5", fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>
            <i className="ti ti-wand" /> OCR
          </span>
        )}
        {p.type_prescription && p.type_prescription !== "ordonnance" && (
          <span style={{ background: "#f3effa", color: "#5a4a90", fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>
            {p.type_prescription}
          </span>
        )}
        <span style={{ background: p.statut === "active" ? "#dff5e0" : "#f4f7fa", color: p.statut === "active" ? "#2e6f33" : "#6c7a89", fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>
          {p.statut}
        </span>
        <i className="ti ti-chevron-right" style={{ marginLeft: "auto", color: "#a0aeb9" }} />
      </div>
    </div>
  );
}

function MonthBarChart({ data }) {
  const max = Math.max(...data.map(d => Number(d.nb_prescriptions) || 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, padding: "0 4px" }}>
      {data.map(d => {
        const h = Math.max(2, (Number(d.nb_prescriptions) / max) * 140);
        const moisLabel = new Date(d.mois).toLocaleDateString("fr-FR", { month: "short" }).slice(0, 3);
        return (
          <div key={d.mois} title={`${Number(d.nb_prescriptions)} prescriptions`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "#5a4a90", fontWeight: 700 }}>{Number(d.nb_prescriptions) > 0 ? Number(d.nb_prescriptions) : ""}</span>
            <div style={{
              width: "100%", height: h,
              background: "linear-gradient(180deg, #7a6fb0, #5a4a90)",
              borderRadius: "4px 4px 0 0",
              transition: "height 0.3s",
            }} />
            <span style={{ fontSize: 10, color: "#6c7a89", textTransform: "capitalize" }}>{moisLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

const btnGhost = {
  background: "#fff", color: "#142131", border: "1px solid #d3d9e0",
  padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};

// 0.57.34 : wrapper AdminGuard pour restreindre l'accès aux admins
export default function PrescriptionsArchivePage() {
  return (
    <AdminGuard>
      <PrescriptionsArchivePageInner />
    </AdminGuard>
  );
}
