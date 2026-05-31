"use client";
// =============================================================
//  app/components/RppsSearch.js (Alpha 0.55.28)
//
//  Composant de recherche dans l'annuaire RPPS.
//  À utiliser dans :
//   - Fiche patient (sélection prescripteur)
//   - Création prescripteur libéral (non couvert par FINESS)
//   - Recherche professionnel de santé
//
//  Usage :
//    <RppsSearch
//      onSelect={(praticien) => setPrescripteur(praticien)}
//      defaultQuery="DUPONT"
//      defaultProfession="Médecin"
//    />
// =============================================================

import { useEffect, useState } from "react";
import { logger } from "../../lib/logger";

const PROFESSIONS = [
  { value: "", label: "Toutes professions" },
  { value: "Médecin", label: "Médecin" },
  { value: "Infirmier", label: "Infirmier(ère)" },
  { value: "Kinésithérapeute", label: "Kinésithérapeute" },
  { value: "Pharmacien", label: "Pharmacien" },
  { value: "Sage-femme", label: "Sage-femme" },
  { value: "Dentiste", label: "Chirurgien-dentiste" },
];

export default function RppsSearch({
  onSelect,
  defaultQuery = "",
  defaultProfession = "",
  defaultCp = "",
  showProfessionFilter = true,
  showCpFilter = true,
  maxResults = 20,
  embedded = false,  // si true, pas de Modal — juste le contenu
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [profession, setProfession] = useState(defaultProfession);
  const [cp, setCp] = useState(defaultCp);
  const [rppsExact, setRppsExact] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [err, setErr] = useState("");
  const [isMock, setIsMock] = useState(false);

  async function doSearch() {
    setBusy(true);
    setErr("");
    setIsMock(false);
    try {
      const params = new URLSearchParams();
      if (rppsExact) {
        params.set("rpps", rppsExact);
      } else {
        params.set("q", query || " ");  // espace pour forcer query non vide
      }
      if (profession) params.set("profession", profession);
      if (cp) params.set("cp", cp);
      params.set("limit", String(maxResults));

      const res = await fetch(`/api/rpps?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
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

  // Recherche auto si query par défaut fournie
  useEffect(() => {
    if (defaultQuery || defaultProfession) {
      doSearch();
    }
  }, []);

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  }

  return (
    <div>
      {isMock && (
        <div style={{
          background: "#fff8ec",
          border: "1px solid #f0d59f",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 11.5,
          color: "#7a4f15",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <i className="ti ti-alert-triangle" />
          <span>
            <b>Mode démonstration :</b> données simulées. L'API ANS officielle est utilisée en mode production.
          </span>
        </div>
      )}

      {!isMock && (
        <div style={{
          background: "#eef9ef",
          border: "1px solid #bfe2bf",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 11.5,
          color: "#2e6f33",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <i className="ti ti-circle-check" />
          <span>
            Source : <b>API FHIR ANS officielle</b> (~1,7 million de praticiens, libre accès).
          </span>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nom de famille (ex: DUPONT)"
            disabled={busy || !!rppsExact}
            style={{
              flex: 1, minWidth: 180,
              padding: "8px 10px",
              border: "1px solid #d3d9e0",
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
          <input
            type="text"
            value={rppsExact}
            onChange={(e) => setRppsExact(e.target.value.replace(/\D/g, "").slice(0, 11))}
            onKeyDown={handleKeyDown}
            placeholder="N° RPPS (11 chiffres)"
            disabled={busy}
            style={{
              width: 180,
              padding: "8px 10px",
              border: "1px solid #d3d9e0",
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "Consolas, monospace",
            }}
          />
        </div>
        {(showProfessionFilter || showCpFilter) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {showProfessionFilter && (
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                disabled={busy}
                style={{
                  flex: 1, minWidth: 180,
                  padding: "8px 10px",
                  border: "1px solid #d3d9e0",
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                {PROFESSIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            )}
            {showCpFilter && (
              <input
                type="text"
                value={cp}
                onChange={(e) => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))}
                onKeyDown={handleKeyDown}
                placeholder="Code postal"
                disabled={busy}
                style={{
                  width: 140,
                  padding: "8px 10px",
                  border: "1px solid #d3d9e0",
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              />
            )}
          </div>
        )}
        <button
          onClick={doSearch}
          disabled={busy || (!query && !rppsExact)}
          style={{
            background: busy ? "#8a98a8" : "linear-gradient(135deg, #142131, #185FA5)",
            color: "#fff",
            border: "none",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {busy ? (
            <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Recherche…</>
          ) : (
            <><i className="ti ti-search" /> Rechercher</>
          )}
        </button>
      </div>

      {/* Erreur */}
      {err && (
        <div style={{
          background: "#fce5e0",
          color: "#7a1f15",
          padding: "8px 12px",
          borderRadius: 6,
          fontSize: 12.5,
          marginBottom: 10,
        }}>
          <i className="ti ti-alert-circle" /> {err}
        </div>
      )}

      {/* Résultats */}
      {results.length === 0 && !busy && !err && (query || rppsExact) && (
        <div style={{ textAlign: "center", padding: 30, color: "#8a98a8", fontSize: 13 }}>
          <i className="ti ti-mood-search" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
          Aucun résultat.
        </div>
      )}
      {results.length > 0 && (
        <div style={{
          marginBottom: 6,
          fontSize: 11.5,
          color: "#6c7a89",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}>
          {results.length} résultat{results.length > 1 ? "s" : ""}
        </div>
      )}
      <div style={{ display: "grid", gap: 6 }}>
        {results.map((p) => (
          <button
            key={p.rpps}
            type="button"
            onClick={() => onSelect?.(p)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "10px 12px",
              background: "#fff",
              border: "1px solid #e3e9ee",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f4f7fa";
              e.currentTarget.style.borderColor = "#185FA5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#e3e9ee";
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: "#185FA522",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <i className="ti ti-user-circle" style={{ fontSize: 24, color: "#185FA5" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#142131" }}>
                {p.civilite} {p.prenom} {p.nom}
              </div>
              <div style={{ fontSize: 11.5, color: "#185FA5", fontWeight: 600, marginTop: 1 }}>
                {p.profession}{p.specialite ? ` — ${p.specialite}` : ""}
              </div>
              <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 3, lineHeight: 1.4 }}>
                {p.adresse && <span>{p.adresse}, </span>}
                {p.cp} {p.commune}
                {p.telephone && <span> · {p.telephone}</span>}
              </div>
              <div style={{ fontSize: 10, color: "#a0aeb9", marginTop: 2, fontFamily: "Consolas, monospace" }}>
                RPPS {p.rpps}{p.adeli ? ` · ADELI ${p.adeli}` : ""}
              </div>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 18, color: "#8a98a8", flexShrink: 0, alignSelf: "center" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
