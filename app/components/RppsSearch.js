"use client";
// =============================================================
//  app/components/RppsSearch.js (Alpha 0.55.33)
//
//  Composant unique de recherche RPPS — utilisé partout :
//   - /annuaire-rpps  (mode actions : Rattacher + Inviter)
//   - /partenaires-rpps  (mode onSelect : ajouter à la table)
//   - /utilisateurs  (mode onSelect : pré-remplir invitation)
//
//  API du composant :
//    <RppsSearch
//      onSelect={(p) => ...}            // mode simple : clic tuile = sélectionne
//      renderActions={(p) => <JSX/>}    // mode actions : boutons custom
//      maxResults={50}                  // jusqu'à 100
//      showRichFilters={true}           // active filtres étendus (ville, mode)
//    />
// =============================================================

import { useEffect, useState } from "react";
import { logger } from "../../lib/logger";
import { fetchWithAuth } from "../../lib/fetchWithAuth";
import ContactActions from "./ContactActions";

const PROFESSIONS = [
  { value: "", label: "Toutes professions" },
  { value: "Médecin", label: "Médecin" },
  { value: "Infirmier", label: "Infirmier(ère)" },
  { value: "Kinésithérapeute", label: "Kinésithérapeute" },
  { value: "Pharmacien", label: "Pharmacien" },
  { value: "Sage-femme", label: "Sage-femme" },
  { value: "Dentiste", label: "Chirurgien-dentiste" },
  { value: "Pédicure", label: "Pédicure-podologue" },
  { value: "Orthophoniste", label: "Orthophoniste" },
  { value: "Ergothérapeute", label: "Ergothérapeute" },
  { value: "Psychologue", label: "Psychologue" },
  { value: "Manipulateur", label: "Manipulateur ERM" },
];

const MODES_EXERCICE = [
  { value: "", label: "Tous modes" },
  { value: "libéral", label: "Libéral" },
  { value: "salarié", label: "Salarié" },
  { value: "remplaçant", label: "Remplaçant" },
];

export default function RppsSearch({
  onSelect,
  renderActions,
  defaultQuery = "",
  defaultProfession = "",
  defaultCp = "",
  defaultVille = "",
  maxResults = 50,
  showRichFilters = true,
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [profession, setProfession] = useState(defaultProfession);
  const [modeExercice, setModeExercice] = useState("");
  const [cp, setCp] = useState(defaultCp);
  const [ville, setVille] = useState(defaultVille);
  const [rppsExact, setRppsExact] = useState("");
  const [limit, setLimit] = useState(maxResults);

  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [err, setErr] = useState("");
  const [isMock, setIsMock] = useState(false);
  const [searched, setSearched] = useState(false);

  async function doSearch() {
    setBusy(true);
    setErr("");
    setIsMock(false);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (rppsExact) {
        params.set("rpps", rppsExact);
      } else if (query.trim().length >= 2) {
        params.set("q", query.trim());
      }
      if (profession) params.set("profession", profession);
      if (cp) params.set("cp", cp);
      if (ville) params.set("ville", ville);
      if (modeExercice) params.set("mode", modeExercice);
      params.set("limit", String(Math.min(limit, 100)));

      const res = await fetchWithAuth(`/api/rpps?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erreur recherche");
      setResults(data.results || []);
      if (data.mock) setIsMock(true);
    } catch (e) {
      logger.warn("[RppsSearch] error:", e);
      setErr(e.message || "Erreur de recherche");
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (defaultQuery || defaultProfession) doSearch();
  }, []);

  function handleKeyDown(e) {
    if (e.key === "Enter") { e.preventDefault(); doSearch(); }
  }

  function resetFilters() {
    setQuery(""); setProfession(""); setModeExercice("");
    setCp(""); setVille(""); setRppsExact("");
    setLimit(maxResults); setResults([]); setSearched(false);
  }

  return (
    <div>
      {!isMock && (
        <div style={{ background: "#eef9ef", border: "1px solid #bfe2bf", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, color: "#2e6f33", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-circle-check" />
          <span>Source : <b>API FHIR ANS officielle</b> (~1,7 million de praticiens, libre accès).</span>
        </div>
      )}
      {isMock && (
        <div style={{ background: "#fff8ec", border: "1px solid #f0d59f", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, color: "#7a4f15", marginBottom: 12 }}>
          <i className="ti ti-alert-triangle" /> Mode démonstration : données simulées.
        </div>
      )}

      {/* === Filtres === */}
      <div style={{ background: "#f4f7fa", border: "1px solid #e3e9ee", borderRadius: 10, padding: 12, marginBottom: 12 }}>
        {/* Ligne 1 : nom + RPPS exact */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={lblStyle}>Nom / recherche libre</label>
            <input type="text" value={query}
              onChange={(e) => { setQuery(e.target.value); setRppsExact(""); }}
              onKeyDown={handleKeyDown} placeholder="DUPONT, MARTIN…"
              disabled={busy} style={inputStyle} />
          </div>
          <div>
            <label style={lblStyle}>N° RPPS exact</label>
            <input type="text" value={rppsExact}
              onChange={(e) => { setRppsExact(e.target.value.replace(/\D/g, "").slice(0, 11)); setQuery(""); }}
              onKeyDown={handleKeyDown} placeholder="10000000001"
              disabled={busy} style={{ ...inputStyle, fontFamily: "Consolas, monospace" }} />
          </div>
        </div>

        {showRichFilters && (
          <>
            {/* Ligne 2 : profession + mode + limite */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 100px", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={lblStyle}>Profession</label>
                <select value={profession} onChange={(e) => setProfession(e.target.value)} disabled={busy} style={inputStyle}>
                  {PROFESSIONS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                </select>
              </div>
              <div>
                <label style={lblStyle}>Mode d'exercice</label>
                <select value={modeExercice} onChange={(e) => setModeExercice(e.target.value)} disabled={busy} style={inputStyle}>
                  {MODES_EXERCICE.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
              </div>
              <div>
                <label style={lblStyle}>Limite</label>
                <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} disabled={busy} style={inputStyle}>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Ligne 3 : ville + CP */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={lblStyle}>Ville</label>
                <input type="text" value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  onKeyDown={handleKeyDown} placeholder="Paris, Lyon, Gramat…"
                  disabled={busy} style={inputStyle} />
              </div>
              <div>
                <label style={lblStyle}>CP / département</label>
                <input type="text" value={cp}
                  onChange={(e) => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  onKeyDown={handleKeyDown} placeholder="75 ou 75011"
                  disabled={busy} style={inputStyle} />
              </div>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={resetFilters} disabled={busy} style={btnGhostStyle}>
            <i className="ti ti-x" /> Effacer
          </button>
          <button onClick={doSearch}
            disabled={busy || (!query && !rppsExact && !profession && !cp && !ville)}
            style={busy ? { ...btnPrimaryStyle, background: "#8a98a8" } : btnPrimaryStyle}>
            {busy ? (<><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Recherche…</>)
                  : (<><i className="ti ti-search" /> Rechercher</>)}
          </button>
        </div>
      </div>

      {err && (
        <div style={{ background: "#fce5e0", color: "#7a1f15", padding: "8px 12px", borderRadius: 6, fontSize: 12.5, marginBottom: 10 }}>
          <i className="ti ti-alert-circle" /> {err}
        </div>
      )}

      {searched && results.length === 0 && !busy && !err && (
        <div style={{ textAlign: "center", padding: 30, color: "#8a98a8", fontSize: 13 }}>
          <i className="ti ti-mood-search" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
          Aucun résultat. Essayez d'élargir les critères.
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginBottom: 8, fontSize: 11.5, color: "#6c7a89", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "flex", justifyContent: "space-between" }}>
          <span>{results.length} résultat{results.length > 1 ? "s" : ""}</span>
          {results.length >= limit && (
            <span style={{ color: "#7a4f15" }}>
              <i className="ti ti-info-circle" /> Augmente la limite pour voir plus
            </span>
          )}
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {results.map((p, idx) => (
          <RppsResultTile key={p.rpps || `${p.nom}-${idx}`}
            praticien={p} onSelect={onSelect} renderActions={renderActions} />
        ))}
      </div>
    </div>
  );
}

function RppsResultTile({ praticien: p, onSelect, renderActions }) {
  const hasActions = !!renderActions;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 14px", background: "#fff",
      border: "1px solid #e3e9ee", borderRadius: 10,
      cursor: hasActions ? "default" : "pointer",
      transition: "all 0.15s",
    }}
    onClick={hasActions ? undefined : () => onSelect?.(p)}
    onMouseEnter={hasActions ? undefined : (e) => { e.currentTarget.style.borderColor = "#185FA5"; }}
    onMouseLeave={hasActions ? undefined : (e) => { e.currentTarget.style.borderColor = "#e3e9ee"; }}>
      <div style={{ width: 44, height: 44, borderRadius: 10,
        background: "linear-gradient(135deg, #185FA5, #7CC8C8)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: "#fff" }}>
        <i className="ti ti-user-circle" style={{ fontSize: 26 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>
            {p.civilite} {p.prenom} {p.nom}
          </div>
          {p.profession && (
            <span style={{ background: "#185FA522", color: "#185FA5", padding: "1px 8px", borderRadius: 8, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>
              {p.profession}
            </span>
          )}
        </div>
        {p.specialite && (
          <div style={{ fontSize: 12, color: "#5a4a90", fontWeight: 600, marginTop: 2 }}>
            <i className="ti ti-prescription" style={{ fontSize: 11 }} /> {p.specialite}
          </div>
        )}
        {p.mode_exercice && (
          <div style={{ fontSize: 11, color: "#7a4f15", marginTop: 2 }}>
            <i className="ti ti-briefcase" style={{ fontSize: 11 }} /> {p.mode_exercice}
          </div>
        )}
        {(p.adresse || p.cp || p.commune) && (
          <div style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 4, lineHeight: 1.4 }}>
            <i className="ti ti-map-pin" style={{ fontSize: 11 }} />
            {" "}{p.adresse ? `${p.adresse}, ` : ""}{p.cp} {p.commune}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
          <ContactActions
            telephone={p.telephone}
            email={p.email}
            adresse={p.adresse}
            cp={p.cp}
            commune={p.commune}
          />
        </div>
        <div style={{ fontSize: 10, color: "#a0aeb9", marginTop: 4, fontFamily: "Consolas, monospace" }}>
          {p.rpps && <>RPPS {p.rpps}</>}
          {p.adeli && <> · ADELI {p.adeli}</>}
        </div>

        {hasActions && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {renderActions(p)}
          </div>
        )}
      </div>
      {!hasActions && (
        <i className="ti ti-chevron-right" style={{ fontSize: 18, color: "#8a98a8", flexShrink: 0, alignSelf: "center" }} />
      )}
    </div>
  );
}

const lblStyle = { display: "block", fontSize: 10.5, color: "#6c7a89", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 3 };
const inputStyle = { width: "100%", padding: "7px 10px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13, fontFamily: "inherit", background: "#fff" };
const btnPrimaryStyle = { background: "linear-gradient(135deg, #142131, #185FA5)", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 };
const btnGhostStyle = { background: "transparent", color: "#142131", border: "1px solid #d3d9e0", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
