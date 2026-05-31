"use client";
// =============================================================
//  GeolocPrompt.js
//  Alpha 0.55.0 — Modal de demande de permission géolocalisation
//
//  Affiche un modal explicatif au premier login (ou si jamais demandé)
//  pour proposer à l'user de partager sa position. Stocke le choix
//  dans localStorage pour ne pas redemander à chaque fois.
//
//  La position est ensuite disponible via window._avehoUserPosition
//  et la page /carte affiche un marqueur "Ma position".
// =============================================================
import { useEffect, useState } from "react";

const LS_KEY = "aveho_geoloc_choice";
const LS_POS_KEY = "aveho_geoloc_last_pos";

export function getStoredPosition() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_POS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Position considérée valide 24h
    if (!data.t || Date.now() - data.t > 24 * 3600 * 1000) return null;
    return { lat: data.lat, lng: data.lng };
  } catch { return null; }
}

export function getGeolocChoice() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(LS_KEY); }
  catch { return null; }
}

export default function GeolocPrompt({ onComplete }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) return;  // pas dispo, on ne demande pas

    const choice = getGeolocChoice();
    if (choice === "accepted") {
      // Déjà accepté précédemment : on relit la dernière position connue depuis localStorage
      // (pas de getCurrentPosition() ici : Chrome refuse les appels géoloc hors user gesture)
      const stored = getStoredPosition();
      if (stored) {
        window._avehoUserPosition = { lat: stored.lat, lng: stored.lng };
        if (onComplete) onComplete({ ...stored, t: Date.now() });
      }
      // Le rafraîchissement de la position se fera quand l'user clique "Ma position" 
      // sur la carte (user gesture explicite) — voir /carte/page.js
      return;
    }
    if (choice === "declined") return;  // refusé, on ne redemande pas

    // Premier passage : afficher le modal
    // Délai 800ms pour ne pas bloquer le rendu initial
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, []);

  function accept() {
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const data = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now() };
        try {
          localStorage.setItem(LS_KEY, "accepted");
          localStorage.setItem(LS_POS_KEY, JSON.stringify(data));
        } catch {}
        window._avehoUserPosition = { lat: data.lat, lng: data.lng };
        setBusy(false);
        setOpen(false);
        if (onComplete) onComplete(data);
      },
      (err) => {
        setBusy(false);
        if (err.code === 1) {
          // Permission refusée au niveau navigateur
          setError("Permission refusée par le navigateur. Tu peux l'activer dans les paramètres du site.");
          try { localStorage.setItem(LS_KEY, "denied_browser"); } catch {}
        } else if (err.code === 2) {
          setError("Position indisponible. Vérifie que la géoloc est activée sur ton appareil.");
        } else if (err.code === 3) {
          setError("Délai dépassé. Réessaie dans un instant.");
        } else {
          setError("Erreur géolocalisation : " + err.message);
        }
      },
      { 
        enableHighAccuracy: false,  // plus rapide
        timeout: 8000, 
        maximumAge: 60000 
      }
    );
  }

  function decline() {
    try { localStorage.setItem(LS_KEY, "declined"); } catch {}
    setOpen(false);
    if (onComplete) onComplete(null);
  }

  if (!open) return null;

  return (
    <div 
      style={{
        position: "fixed", inset: 0,
        background: "rgba(20,33,49,.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100,
        padding: 16,
        animation: "fadeIn .25s ease",
      }}
    >
      <div style={{
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 24px 60px rgba(20,33,49,.30)",
        maxWidth: 460,
        width: "100%",
        padding: 28,
        position: "relative",
        animation: "slideUp .35s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Illustration top */}
        <div style={{
          background: "linear-gradient(135deg, #5aa05a 0%, #1c5454 100%)",
          width: 70, height: 70, borderRadius: "50%",
          margin: "0 auto 18px",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(90,160,90,.35)",
          position: "relative",
        }}>
          <i className="ti ti-map-pin" style={{ fontSize: 36, color: "#fff" }} />
          {/* Pulsation */}
          <span style={{
            position: "absolute",
            inset: -8,
            border: "3px solid #5aa05a",
            borderRadius: "50%",
            opacity: 0.4,
            animation: "pulse 2s ease-out infinite",
          }} />
        </div>

        <h2 style={{
          margin: "0 0 8px",
          fontSize: 20, fontWeight: 700, color: "#142131",
          textAlign: "center",
        }}>
          Activer la géolocalisation ?
        </h2>
        <p style={{
          margin: "0 0 18px",
          fontSize: 13.5, color: "#6c7a89",
          textAlign: "center",
          lineHeight: 1.55,
        }}>
          Aveho peut afficher votre position sur la <b>carte logistique</b> pour vous situer par rapport à vos établissements et aux véhicules en mission.
        </p>

        <div style={{
          background: "#f4f7fa",
          border: "1px solid #e3e9ee",
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 18,
          fontSize: 12, color: "#2a3a48",
          lineHeight: 1.6,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontWeight: 600, color: "#185FA5" }}>
            <i className="ti ti-shield-check" /> Confidentialité
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Position uniquement stockée dans votre navigateur</li>
            <li>Jamais transmise à un serveur Aveho</li>
            <li>Choix modifiable à tout moment dans les paramètres</li>
          </ul>
        </div>

        {error && (
          <div style={{
            background: "#fef0ee", border: "1px solid #f0c4be",
            borderRadius: 8, padding: "8px 12px",
            fontSize: 12, color: "#7a1f15",
            marginBottom: 14,
          }}>
            <i className="ti ti-alert-triangle" /> {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={decline}
            disabled={busy}
            style={{
              flex: "1 1 140px",
              background: "#fff",
              border: "1px solid #e3e9ee",
              color: "#6c7a89",
              padding: "11px 16px",
              borderRadius: 10,
              fontSize: 13.5, fontWeight: 600,
              cursor: busy ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Plus tard
          </button>
          <button
            onClick={accept}
            disabled={busy}
            style={{
              flex: "1 1 180px",
              background: busy ? "#8aa48a" : "linear-gradient(135deg, #5aa05a, #1c5454)",
              border: "none",
              color: "#fff",
              padding: "11px 16px",
              borderRadius: 10,
              fontSize: 13.5, fontWeight: 700,
              cursor: busy ? "wait" : "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 12px rgba(90,160,90,.30)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {busy ? (
              <>
                <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} />
                Localisation…
              </>
            ) : (
              <>
                <i className="ti ti-map-pin" />
                Activer la géolocalisation
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(.95); opacity: .5; }
          70% { transform: scale(1.3); opacity: 0; }
          100% { transform: scale(.95); opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
