"use client";
// =============================================================
//  components/AccordionTable.js (0.62.113)
//
//  Transforme une table à scroll horizontal en accordéon
//  empilable sur mobile : chaque ligne devient une carte
//  avec le résumé compact + bouton dépliant qui montre toutes
//  les colonnes en mode liste verticale.
//
//  Usage :
//    <AccordionTable
//      columns={[
//        { key: "nom", label: "Nom", primary: true },
//        { key: "ville", label: "Ville", secondary: true },
//        { key: "tel", label: "Téléphone", icon: "ti-phone" },
//        { key: "email", label: "Email", icon: "ti-mail" },
//      ]}
//      rows={data}
//      onRowClick={(r) => router.push(...)}
//      keyField="id"
//    />
// =============================================================

import { useState } from "react";

export default function AccordionTable({
  columns = [],
  rows = [],
  onRowClick,
  keyField = "id",
  emptyLabel = "Aucun élément",
  rowAccentColor = "#7CC8C8",
}) {
  const [expanded, setExpanded] = useState(new Set());

  function toggle(id) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!rows || rows.length === 0) {
    return (
      <div style={{
        padding: 30, textAlign: "center",
        color: "#8a98a8", fontSize: 13,
        background: "#fafbfc", borderRadius: 12, border: "1px dashed #e3e9ee",
      }}>
        <i className="ti ti-database-off" style={{ fontSize: 32, color: "#cfd8e0", marginBottom: 10, display: "block" }} />
        {emptyLabel}
      </div>
    );
  }

  const primaryCol = columns.find(c => c.primary) || columns[0];
  const secondaryCol = columns.find(c => c.secondary);
  const detailCols = columns.filter(c => !c.primary && !c.secondary);

  return (
    <div className="av-accordion-table" style={{
      display: "flex", flexDirection: "column", gap: 8,
      width: "100%",
    }}>
      {rows.map(r => {
        const id = r[keyField];
        const isOpen = expanded.has(id);
        return (
          <div
            key={id}
            style={{
              background: "#fff",
              border: `1px solid ${isOpen ? rowAccentColor : "#e3e9ee"}`,
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: isOpen ? `0 4px 16px ${rowAccentColor}22` : "0 1px 3px rgba(20,33,49,.04)",
              transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Header tappable */}
            <div
              onClick={() => {
                if (onRowClick) onRowClick(r);
                else toggle(id);
              }}
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {/* Colonne primaire */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: "#142131",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {primaryCol.render ? primaryCol.render(r) : r[primaryCol.key]}
                </div>
                {secondaryCol && (
                  <div style={{
                    fontSize: 12, color: "#5a6878", marginTop: 2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {secondaryCol.icon && <i className={`ti ${secondaryCol.icon}`} style={{ marginRight: 4, color: "#7a6fb0" }} />}
                    {secondaryCol.render ? secondaryCol.render(r) : r[secondaryCol.key]}
                  </div>
                )}
              </div>

              {/* Bouton chevron dépliant */}
              <button
                onClick={(e) => { e.stopPropagation(); toggle(id); }}
                aria-label={isOpen ? "Replier" : "Déplier"}
                aria-expanded={isOpen}
                style={{
                  background: isOpen ? rowAccentColor : "rgba(124,200,200,.12)",
                  color: isOpen ? "#fff" : rowAccentColor,
                  border: "none",
                  width: 36, height: 36,
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 200ms",
                  fontSize: 16,
                }}
              >
                <i className={`ti ${isOpen ? "ti-chevron-up" : "ti-chevron-down"}`} />
              </button>
            </div>

            {/* Détails dépliés */}
            {isOpen && detailCols.length > 0 && (
              <div style={{
                padding: "0 16px 14px",
                borderTop: `1px solid ${rowAccentColor}33`,
                background: `linear-gradient(180deg, ${rowAccentColor}08 0%, transparent 100%)`,
                animation: "av-accordion-down 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}>
                {detailCols.map(col => {
                  const value = col.render ? col.render(r) : r[col.key];
                  if (value === null || value === undefined || value === "") return null;
                  return (
                    <div
                      key={col.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "8px 0",
                        borderBottom: "1px dashed #f0f3f6",
                        fontSize: 13,
                      }}
                    >
                      <div style={{
                        color: "#5a6878",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        flex: "0 0 40%",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}>
                        {col.icon && <i className={`ti ${col.icon}`} style={{ color: rowAccentColor }} />}
                        {col.label}
                      </div>
                      <div style={{
                        color: "#142131",
                        fontWeight: 600,
                        textAlign: "right",
                        flex: 1,
                        wordBreak: "break-word",
                        fontSize: 13,
                      }}>
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <style jsx global>{`
        @keyframes av-accordion-down {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
