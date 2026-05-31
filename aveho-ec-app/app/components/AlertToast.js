"use client";
// =============================================================
//  app/components/AlertToast.js (Alpha 0.55.38)
//
//  Popup d'alerte qui apparaît en bas à droite et disparaît
//  automatiquement après 20s. Supporte plusieurs alertes empilées.
//
//  Usage global :
//    import { showAlert } from './AlertToast';
//    showAlert({
//      type: 'google_review',
//      title: 'Nouvel avis 5⭐ sur EHPAD Les Tilleuls',
//      message: 'Marie D. : "Personnel formidable…"',
//      rating: 5,
//      onClick: () => router.push('/etablissement/fiche?id=...'),
//    });
//
//  Le composant <AlertToastContainer /> doit être monté dans le layout.
// =============================================================

import { useEffect, useState } from "react";

const SUBSCRIBERS = new Set();
let ALERTS_QUEUE = [];

export function showAlert(alert) {
  const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const item = { id, ...alert, createdAt: Date.now() };
  ALERTS_QUEUE = [...ALERTS_QUEUE, item];
  SUBSCRIBERS.forEach(fn => fn([...ALERTS_QUEUE]));
  // Auto-dismiss après 20s
  setTimeout(() => dismissAlert(id), alert.duration || 20000);
  return id;
}

export function dismissAlert(id) {
  ALERTS_QUEUE = ALERTS_QUEUE.filter(a => a.id !== id);
  SUBSCRIBERS.forEach(fn => fn([...ALERTS_QUEUE]));
}

export default function AlertToastContainer() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    SUBSCRIBERS.add(setAlerts);
    return () => SUBSCRIBERS.delete(setAlerts);
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      zIndex: 99999,
      display: "flex",
      flexDirection: "column-reverse",
      gap: 10,
      maxWidth: 380,
      pointerEvents: "none",
    }}>
      {alerts.map(a => (
        <AlertCard key={a.id} alert={a} />
      ))}
    </div>
  );
}

function AlertCard({ alert }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Petit délai pour animation d'entrée
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function handleClick() {
    if (alert.onClick) {
      alert.onClick();
      dismissAlert(alert.id);
    }
  }

  // Couleurs selon type/rating
  let color = "#185FA5";
  let icon = "ti-bell";
  if (alert.type === "google_review") {
    if (alert.rating >= 4) { color = "#5aa05a"; icon = "ti-star-filled"; }
    else if (alert.rating <= 2) { color = "#c0392b"; icon = "ti-alert-triangle"; }
    else { color = "#EF9F27"; icon = "ti-message-circle"; }
  } else if (alert.type === "error") { color = "#c0392b"; icon = "ti-alert-triangle"; }
  else if (alert.type === "success") { color = "#5aa05a"; icon = "ti-circle-check"; }
  else if (alert.type === "warning") { color = "#EF9F27"; icon = "ti-alert-circle"; }

  return (
    <div
      onClick={alert.onClick ? handleClick : undefined}
      style={{
        background: "#fff",
        border: `1px solid ${color}40`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 10,
        padding: "12px 14px",
        boxShadow: "0 6px 18px rgba(20,33,49,0.18)",
        cursor: alert.onClick ? "pointer" : "default",
        transform: visible ? "translateX(0)" : "translateX(20px)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s ease, opacity 0.3s ease",
        pointerEvents: "auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Barre de progression du timer */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: 2,
        background: color,
        width: "100%",
        transformOrigin: "left",
        animation: `shrink ${alert.duration || 20000}ms linear forwards`,
      }} />
      <style>{`
        @keyframes shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          background: `${color}22`,
          color,
          width: 32, height: 32,
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: 18 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#142131", marginBottom: 2 }}>
            {alert.title}
          </div>
          {alert.rating > 0 && (
            <div style={{ color: "#EF9F27", fontSize: 12, marginBottom: 3 }}>
              {"★".repeat(alert.rating)}
              <span style={{ color: "#d3d9e0" }}>{"★".repeat(5 - alert.rating)}</span>
            </div>
          )}
          {alert.message && (
            <div style={{ fontSize: 11.5, color: "#6c7a89", lineHeight: 1.4 }}>
              {alert.message}
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
          style={{
            background: "transparent",
            border: "none",
            color: "#8a98a8",
            cursor: "pointer",
            padding: 2,
            display: "flex",
            alignItems: "center",
            fontFamily: "inherit",
          }}
          aria-label="Fermer"
        >
          <i className="ti ti-x" />
        </button>
      </div>
    </div>
  );
}
