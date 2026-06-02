"use client";
// =============================================================
//  app/RppsVerifyBadge.js (Alpha 0.56.5)
//
//  Composant qui vérifie automatiquement un RPPS contre l'API
//  ANS / dump local et affiche le résultat (vert / ambré / rouge).
//
//  Props :
//    - rpps : RPPS à vérifier (string 11 chiffres)
//    - nomOcr, prenomOcr, specialiteOcr : données extraites par OCR
//      (pour comparaison)
//    - onOfficialData(official) : callback si l'user clique
//      "Utiliser les données officielles" pour écraser les champs OCR
// =============================================================

import { useEffect, useState } from "react";
import { fetchWithAuth } from "../lib/fetchWithAuth";

export default function RppsVerifyBadge({ rpps, nomOcr, prenomOcr, specialiteOcr, onOfficialData }) {
  const [status, setStatus] = useState("idle"); // idle | loading | match | divergences | not_found | error | invalid_rpps
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!rpps) { setStatus("idle"); return; }
    const clean = rpps.replace(/\s/g, "");
    if (!/^\d{11}$/.test(clean)) {
      setStatus("invalid_rpps");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const res = await fetchWithAuth("/api/prescriptions/verify-rpps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rpps: clean,
            nom_ocr: nomOcr,
            prenom_ocr: prenomOcr,
            specialite_ocr: specialiteOcr,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        setResult(data);
        setStatus(data.status || "error");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setResult({ message: e.message });
      }
    })();
    return () => { cancelled = true; };
  }, [rpps, nomOcr, prenomOcr, specialiteOcr]);

  if (status === "idle") return null;

  if (status === "invalid_rpps") {
    return (
      <div style={pillStyle("#c0392b", "#fce5e0", "#f0c4be")}>
        <i className="ti ti-alert-circle" /> RPPS invalide (doit être 11 chiffres)
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div style={pillStyle("#6c7a89", "#f4f7fa", "#e3e9ee")}>
        <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} />
        Vérification dans l'annuaire ANS…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={pillStyle("#c0392b", "#fce5e0", "#f0c4be")}>
        <i className="ti ti-alert-triangle" /> Vérification impossible : {result?.message || "erreur réseau"}
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div style={{ ...pillStyle("#c0392b", "#fce5e0", "#f0c4be"), display: "block" }}>
        <i className="ti ti-user-x" /> <b>RPPS inconnu</b>
        <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4 }}>
          Ce RPPS n'a été trouvé ni dans l'annuaire ANS officiel, ni dans le dump local. Vérifie manuellement les données du prescripteur.
        </div>
      </div>
    );
  }

  if (status === "match") {
    const official = result?.official || {};
    return (
      <div style={{ ...pillStyle("#2e6f33", "#dff5e0", "#bfe2bf"), display: "block" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <i className="ti ti-shield-check" />
          <b>Médecin vérifié</b>
          <span style={{ background: "#bfe2bf", color: "#2e6f33", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
            via {result?.source || "ANS"}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#2e6f33", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
          >
            {expanded ? "Replier" : "Détails"} <i className={`ti ${expanded ? "ti-chevron-up" : "ti-chevron-down"}`} />
          </button>
        </div>
        {expanded && (
          <div style={{ marginTop: 8, padding: 8, background: "#fff", borderRadius: 6, fontSize: 11.5 }}>
            <Row label="Nom officiel" value={`${official.civilite || ""} ${official.nom || ""} ${official.prenom || ""}`.trim()} />
            <Row label="Spécialité" value={official.specialite || official.profession} />
            <Row label="Lieu d'exercice" value={official.raison_sociale} />
            <Row label="Adresse" value={[official.adresse, official.code_postal, official.ville].filter(Boolean).join(", ")} />
            {official.telephone && <Row label="Téléphone" value={official.telephone} mono />}
            {official.finess && <Row label="FINESS" value={official.finess} mono />}
          </div>
        )}
      </div>
    );
  }

  if (status === "divergences") {
    const official = result?.official || {};
    const ocr = result?.ocr || {};
    const div = result?.divergences || [];
    return (
      <div style={{ ...pillStyle("#7a4f15", "#fff8ec", "#f0d59f"), display: "block" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <i className="ti ti-alert-triangle" />
          <b>Données divergentes</b>
          <span style={{ background: "#f0d59f", color: "#7a4f15", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
            {div.length} différence{div.length > 1 ? "s" : ""}
          </span>
          <span style={{ background: "#dbe7f5", color: "#185FA5", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
            via {result?.source || "ANS"}
          </span>
        </div>
        <div style={{ fontSize: 11.5, marginTop: 6 }}>
          Le RPPS existe dans l'annuaire mais certaines données extraites par l'OCR diffèrent :
        </div>
        <div style={{ marginTop: 8, padding: 8, background: "#fff", borderRadius: 6, fontSize: 11.5 }}>
          {div.includes("nom") && <DivergenceRow label="Nom" ocr={ocr.nom} official={official.nom} />}
          {div.includes("prenom") && <DivergenceRow label="Prénom" ocr={ocr.prenom} official={official.prenom} />}
          {div.includes("specialite") && <DivergenceRow label="Spécialité" ocr={ocr.specialite} official={official.specialite || official.profession} />}
        </div>
        {onOfficialData && (
          <button
            onClick={() => onOfficialData(official)}
            style={{
              marginTop: 8, background: "#7a4f15", color: "#fff", border: "none",
              padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <i className="ti ti-replace" /> Utiliser les données officielles
          </button>
        )}
      </div>
    );
  }

  return null;
}

function pillStyle(fg, bg, border) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: bg, color: fg, border: `1px solid ${border}`,
    padding: "8px 12px", borderRadius: 8,
    fontSize: 12, fontWeight: 600, lineHeight: 1.5,
  };
}

function Row({ label, value, mono }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 6, padding: "2px 0" }}>
      <span style={{ color: "#6c7a89", fontWeight: 600, minWidth: 90, fontSize: 11 }}>{label}</span>
      <span style={{ flex: 1, fontFamily: mono ? "Consolas, monospace" : "inherit" }}>{value}</span>
    </div>
  );
}

function DivergenceRow({ label, ocr, official }) {
  return (
    <div style={{ padding: "4px 0", borderBottom: "1px dashed #e3e9ee" }}>
      <div style={{ fontSize: 10, color: "#7a4f15", textTransform: "uppercase", fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11.5 }}>
        <div style={{ background: "#fce5e0", padding: "3px 8px", borderRadius: 4 }}>
          <i className="ti ti-scan" style={{ color: "#7a2d23", marginRight: 4 }} />
          <span style={{ color: "#7a2d23", fontStyle: "italic" }}>{ocr || "—"}</span>
        </div>
        <div style={{ background: "#dff5e0", padding: "3px 8px", borderRadius: 4 }}>
          <i className="ti ti-shield-check" style={{ color: "#2e6f33", marginRight: 4 }} />
          <span style={{ color: "#2e6f33", fontWeight: 600 }}>{official || "—"}</span>
        </div>
      </div>
    </div>
  );
}
