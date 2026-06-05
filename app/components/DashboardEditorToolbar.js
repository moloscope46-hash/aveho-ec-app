"use client";
// =============================================================
//  app/components/DashboardEditorToolbar.js (0.58.33)
//
//  Barre d'édition flottante en haut du dashboard quand le mode
//  édition est actif. Affiche :
//   - Badge "MODE ÉDITION"
//   - Liste des widgets cachés cliquables pour les ré-afficher
//   - Bouton "Réinitialiser"
//   - Bouton "Terminé" (ferme l'édition)
//
//  Le drag & drop est géré directement dans page.js (sur les widgets
//  rendus). Ce composant ne fait que la chrome d'édition.
// =============================================================

import { ALL_WIDGETS, resetDashboardLayout } from "../../lib/dashboardLayout";

export default function DashboardEditorToolbar({ active, order, onToggleWidget, onClose, onResetConfirm }) {
  // Widgets cachés = présents dans order mais désactivés (ou complètement absents)
  const hiddenWidgets = ALL_WIDGETS.filter(w => !active[w.id]);

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(124,200,200,.10), rgba(24,95,165,.06))",
      border: "1px solid rgba(124,200,200,.35)",
      borderRadius: 14,
      padding: 16,
      marginBottom: 18,
      animation: "av-dashboard-editor-in 280ms cubic-bezier(.2,.8,.2,1)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Scan border subtle */}
      <div style={{
        position: "absolute",
        inset: -1,
        borderRadius: 14,
        background: "conic-gradient(from 0deg, transparent 0%, rgba(124,200,200,.35) 50%, transparent 100%)",
        animation: "av-spin-slow 4s linear infinite",
        opacity: 0.30,
        pointerEvents: "none",
        zIndex: 0,
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "linear-gradient(135deg, #7CC8C8, #5da8a8)",
            color: "#fff",
            padding: "5px 12px",
            borderRadius: 99,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            boxShadow: "0 4px 12px rgba(124,200,200,.35)",
          }}>
            <i className="ti ti-edit" />
            MODE ÉDITION
          </span>
          <span style={{ fontSize: 13, color: "#1c5454", flex: 1 }}>
            Glissez les widgets pour les réorganiser, cliquez sur la croix pour les masquer.
          </span>
          <button
            onClick={onResetConfirm}
            style={{
              background: "transparent",
              color: "#7a4f15",
              border: "1px solid #f0d59f",
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            title="Réinitialiser aux valeurs par défaut"
          >
            <i className="ti ti-refresh" /> Réinitialiser
          </button>
          <button
            onClick={onClose}
            style={{
              background: "linear-gradient(135deg, #2a7ed1, #185FA5)",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(24,95,165,.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <i className="ti ti-check" /> Terminé
          </button>
        </div>

        {/* Widgets cachés à réactiver */}
        {hiddenWidgets.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#1c5454", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>
              Widgets masqués (clique pour ré-afficher) :
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {hiddenWidgets.map(w => (
                <button
                  key={w.id}
                  onClick={() => onToggleWidget(w.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#fff",
                    color: w.color,
                    border: `1px solid ${w.color}40`,
                    padding: "5px 11px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 150ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = w.color;
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.borderColor = w.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.color = w.color;
                    e.currentTarget.style.borderColor = `${w.color}40`;
                  }}
                  title={w.description}
                >
                  <i className={`ti ${w.icon}`} />
                  <span>{w.label}</span>
                  <i className="ti ti-plus" style={{ marginLeft: 2, fontSize: 13 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {hiddenWidgets.length === 0 && (
          <p style={{ fontSize: 11.5, color: "#5a7d7d", margin: 0, fontStyle: "italic" }}>
            <i className="ti ti-check" /> Tous les widgets sont affichés. Cliquez sur la croix d'un widget pour le masquer.
          </p>
        )}

      </div>

      <style jsx global>{`
        @keyframes av-dashboard-editor-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes av-spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
