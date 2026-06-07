"use client";
// =============================================================
//  Tabs — Navigation par onglets premium (0.58.3)
//
//  3 styles : pills (par défaut), underline, segmented.
//
//  Usage :
//    const [active, setActive] = useState("general");
//    <Tabs
//      active={active}
//      onChange={setActive}
//      style="pills"
//      tabs={[
//        { id: "general", label: "Général", icon: "ti-info-circle" },
//        { id: "stats", label: "Statistiques", icon: "ti-chart-bar", count: 12 },
//        { id: "rgpd", label: "RGPD", icon: "ti-shield-check" },
//      ]}
//    />
// =============================================================

import { useRef, useEffect, useState } from "react";

export default function Tabs({
  active,
  onChange,
  tabs = [],
  style: variant = "pills",
  size = "md",
  // 0.58.59 : drag&drop optionnel des onglets
  reorderable = false,
  storageKey = null,  // si fourni → persistance dans localStorage
}) {
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({});
  // 0.58.59 : ordre des tabs persistant + state drag
  const [tabOrder, setTabOrder] = useState(null);
  const [draggedTabId, setDraggedTabId] = useState(null);
  const [dragOverTabId, setDragOverTabId] = useState(null);
  const [reorderEditMode, setReorderEditMode] = useState(false);

  // Charge l'ordre persistant + réconcilie
  useEffect(() => {
    if (!reorderable || !storageKey) {
      setTabOrder(tabs.map(t => t.id));
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      const stored = raw ? JSON.parse(raw) : [];
      const currentIds = tabs.map(t => t.id);
      const validStored = stored.filter(id => currentIds.includes(id));
      const missing = currentIds.filter(id => !validStored.includes(id));
      setTabOrder([...validStored, ...missing]);
    } catch {
      setTabOrder(tabs.map(t => t.id));
    }
  }, [reorderable, storageKey, tabs.length]);

  // Persiste à chaque changement
  useEffect(() => {
    if (!reorderable || !storageKey || !tabOrder) return;
    try { localStorage.setItem(storageKey, JSON.stringify(tabOrder)); } catch {}
  }, [tabOrder, reorderable, storageKey]);

  // Tabs réordonnés
  const orderedTabs = tabOrder
    ? tabOrder.map(id => tabs.find(t => t.id === id)).filter(Boolean)
    : tabs;

  function handleTabDragStart(e, id) {
    setDraggedTabId(id);
    try { e.dataTransfer.effectAllowed = "move"; } catch {}
  }
  function handleTabDragOver(e, id) {
    e.preventDefault();
    if (id !== draggedTabId) setDragOverTabId(id);
  }
  function handleTabDrop(e, targetId) {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetId) {
      setDraggedTabId(null); setDragOverTabId(null);
      return;
    }
    setTabOrder(prev => {
      const arr = [...prev];
      const fromIdx = arr.indexOf(draggedTabId);
      const toIdx = arr.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, draggedTabId);
      return arr;
    });
    setDraggedTabId(null); setDragOverTabId(null);
  }
  function handleTabDragEnd() {
    setDraggedTabId(null); setDragOverTabId(null);
  }
  function resetTabOrder() {
    setTabOrder(tabs.map(t => t.id));
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch {}
    }
  }
  const isTabOrderModified = tabOrder && tabOrder.join(",") !== tabs.map(t => t.id).join(",");

  // Calcul de la position de l'indicator (pour variant underline + segmented)
  useEffect(() => {
    if (variant === "pills") return;
    if (!containerRef.current) return;

    const activeBtn = containerRef.current.querySelector(`[data-tab-id="${active}"]`);
    if (!activeBtn) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    setIndicatorStyle({
      width: btnRect.width,
      left: btnRect.left - containerRect.left,
      opacity: 1,
    });
  }, [active, variant, tabs]);

  const sizes = {
    sm: { padH: 12, padV: 6, fontSize: 12, gap: 5, iconSize: 13 },
    md: { padH: 16, padV: 9, fontSize: 13, gap: 6, iconSize: 14 },
    lg: { padH: 20, padV: 12, fontSize: 14, gap: 7, iconSize: 16 },
  };
  const sz = sizes[size] || sizes.md;

  // === STYLE PILLS (par défaut) ===
  if (variant === "pills") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: "100%" }}>
      <div
        ref={containerRef}
        role="tablist"
        style={{
          display: "flex",
          flexWrap: "wrap",  /* 0.62.67 : wrap les onglets si trop nombreux */
          gap: 4,
          padding: 4,
          background: "var(--av-g100)",
          borderRadius: "var(--av-r-lg)",  /* 0.62.67 : radius standard (plus full) pour gérer le wrap */
          border: `1px solid ${reorderEditMode ? "var(--av-teal)" : "var(--av-g200)"}`,
          boxShadow: reorderEditMode ? "0 0 0 3px rgba(124,200,200,.15)" : "none",
          transition: "border-color 200ms, box-shadow 200ms",
          maxWidth: "100%",
        }}
      >
        {orderedTabs.map((t) => {
          const isActive = t.id === active;
          const isDragged = draggedTabId === t.id;
          const isDropTarget = dragOverTabId === t.id && draggedTabId !== t.id;
          return (
            <button
              key={t.id}
              data-tab-id={t.id}
              role="tab"
              aria-selected={isActive}
              draggable={reorderable && reorderEditMode}
              onDragStart={reorderEditMode ? (e) => handleTabDragStart(e, t.id) : undefined}
              onDragOver={reorderEditMode ? (e) => handleTabDragOver(e, t.id) : undefined}
              onDrop={reorderEditMode ? (e) => handleTabDrop(e, t.id) : undefined}
              onDragEnd={reorderEditMode ? handleTabDragEnd : undefined}
              onClick={() => !reorderEditMode && onChange?.(t.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: sz.gap,
                padding: `${sz.padV}px ${sz.padH}px`,
                background: isActive ? "var(--av-g0)" : "transparent",
                color: isActive ? "var(--av-navy)" : "var(--av-g600)",
                border: isDropTarget ? "2px solid var(--av-teal)" : "none",
                borderRadius: "var(--av-r-full)",
                fontWeight: isActive ? 600 : 500,
                fontSize: sz.fontSize,
                cursor: reorderEditMode ? "grab" : "pointer",
                transition: "background 200ms var(--av-ease-out), color 200ms, opacity 150ms",
                boxShadow: isActive ? "var(--av-shadow-sm)" : "none",
                whiteSpace: "nowrap",
                opacity: isDragged ? 0.4 : 1,
                transform: isDropTarget ? "translateY(-1px)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive && !reorderEditMode) e.currentTarget.style.color = "var(--av-navy)";
              }}
              onMouseLeave={(e) => {
                if (!isActive && !reorderEditMode) e.currentTarget.style.color = "var(--av-g600)";
              }}
            >
              {reorderEditMode && (
                <span style={{ color: "var(--av-teal)", fontWeight: 900, letterSpacing: -2, fontSize: 12, marginRight: -2 }}>⋮⋮</span>
              )}
              {t.icon && <i className={`ti ${t.icon}`} style={{ fontSize: sz.iconSize }} />}
              {t.label}
              {t.count !== undefined && t.count !== null && (
                <span style={{
                  marginLeft: 4,
                  padding: "1px 7px",
                  background: isActive ? "var(--av-teal)" : "var(--av-g200)",
                  color: isActive ? "#fff" : "var(--av-g700)",
                  borderRadius: "var(--av-r-full)",
                  fontSize: 11,
                  fontWeight: 700,
                  minWidth: 16,
                  textAlign: "center",
                  transition: "background 200ms",
                }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* 0.58.59 : bouton pour activer le mode réorganisation */}
      {reorderable && (
        <div style={{ display: "inline-flex", gap: 4 }}>
          <button
            onClick={() => setReorderEditMode(!reorderEditMode)}
            title={reorderEditMode ? "Terminer le réordonnancement" : "Réorganiser les onglets"}
            style={{
              background: reorderEditMode ? "linear-gradient(135deg, #7CC8C8, #5da8a8)" : "transparent",
              color: reorderEditMode ? "#fff" : "var(--av-g600)",
              border: `1px solid ${reorderEditMode ? "#7CC8C8" : "var(--av-g300)"}`,
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <i className={reorderEditMode ? "ti ti-check" : "ti ti-arrows-shuffle"} />
            {reorderEditMode ? "OK" : ""}
          </button>
          {isTabOrderModified && !reorderEditMode && (
            <button
              onClick={resetTabOrder}
              title="Réinitialiser l'ordre des onglets"
              style={{
                background: "transparent",
                color: "#c0392b",
                border: "1px solid #fcc",
                padding: "5px 8px",
                borderRadius: 6,
                fontSize: 10.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <i className="ti ti-restore" />
            </button>
          )}
        </div>
      )}
      </div>
    );
  }

  // === STYLE UNDERLINE ===
  if (variant === "underline") {
    return (
      <div
        ref={containerRef}
        role="tablist"
        style={{
          position: "relative",
          display: "inline-flex",
          gap: 4,
          borderBottom: "1px solid var(--av-g200)",
          paddingBottom: 1,
        }}
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              data-tab-id={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange?.(t.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: sz.gap,
                padding: `${sz.padV + 2}px ${sz.padH}px`,
                background: "transparent",
                color: isActive ? "var(--av-blue)" : "var(--av-g600)",
                border: "none",
                fontWeight: isActive ? 600 : 500,
                fontSize: sz.fontSize,
                cursor: "pointer",
                transition: "color 200ms var(--av-ease-out)",
                whiteSpace: "nowrap",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--av-navy)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--av-g600)";
              }}
            >
              {t.icon && <i className={`ti ${t.icon}`} style={{ fontSize: sz.iconSize }} />}
              {t.label}
              {t.count !== undefined && t.count !== null && (
                <span style={{
                  padding: "1px 6px",
                  background: "var(--av-g100)",
                  color: "var(--av-g700)",
                  borderRadius: "var(--av-r-full)",
                  fontSize: 10.5,
                  fontWeight: 700,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Indicator animé sous l'onglet actif */}
        <div style={{
          position: "absolute",
          bottom: -1,
          height: 2.5,
          background: "linear-gradient(90deg, #185FA5, #7CC8C8)",
          borderRadius: "var(--av-r-full)",
          transition: "left 280ms var(--av-ease-out), width 280ms var(--av-ease-out)",
          ...indicatorStyle,
        }} />
      </div>
    );
  }

  // === STYLE SEGMENTED ===
  return (
    <div
      ref={containerRef}
      role="tablist"
      style={{
        position: "relative",
        display: "inline-flex",
        background: "var(--av-g100)",
        borderRadius: "var(--av-r-md)",
        border: "1px solid var(--av-g200)",
        padding: 3,
      }}
    >
      {/* Indicator background */}
      <div style={{
        position: "absolute",
        top: 3,
        bottom: 3,
        background: "var(--av-g0)",
        borderRadius: "calc(var(--av-r-md) - 3px)",
        boxShadow: "var(--av-shadow-sm)",
        transition: "left 280ms var(--av-ease-out), width 280ms var(--av-ease-out)",
        ...indicatorStyle,
      }} />

      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            data-tab-id={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(t.id)}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: sz.gap,
              padding: `${sz.padV}px ${sz.padH}px`,
              background: "transparent",
              color: isActive ? "var(--av-navy)" : "var(--av-g600)",
              border: "none",
              fontWeight: isActive ? 600 : 500,
              fontSize: sz.fontSize,
              cursor: "pointer",
              transition: "color 200ms",
              whiteSpace: "nowrap",
              zIndex: 1,
            }}
          >
            {t.icon && <i className={`ti ${t.icon}`} style={{ fontSize: sz.iconSize }} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================
//  TabPanel — Wrapper qui anime le contenu au changement de tab
//  (0.58.11)
//
//  Usage :
//    <TabPanel active={activeTab} id="general">
//      {activeTab === "general" && <div>Contenu général</div>}
//    </TabPanel>
//
//  Joue une animation slide horizontal 280ms à chaque changement.
//  Le sens du slide est calculé automatiquement (vers la droite si
//  on va vers un tab "plus loin" dans la liste).
//
//  0.58.26 : prop `loading` qui affiche un skeleton shimmer premium
//  pendant le chargement du contenu du tab.
// =============================================================
export function TabPanel({ active, id, children, loading = false }) {
  // L'animation utilise la key={active} pour forcer un re-mount visuel
  // → CSS keyframe av-tab-slide-in déclenché à chaque changement
  return (
    <div
      key={active}
      role="tabpanel"
      aria-labelledby={`tab-${id || active}`}
      style={{
        animation: "av-tab-slide-in 280ms cubic-bezier(.2, .8, .2, 1)",
        willChange: "opacity, transform",
      }}
    >
      {loading ? <TabPanelSkeleton /> : children}
    </div>
  );
}

// 0.58.26 : Skeleton générique pour les TabPanel (shimmer Aveho)
function TabPanelSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "8px 0" }}>
      {/* Header skel : titre + sous-titre */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="av-skel-line" style={{ width: "45%", height: 24 }} />
        <div className="av-skel-line" style={{ width: "70%", height: 13 }} />
      </div>

      {/* Form-like : 3 paires label + input */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="av-skel-line" style={{ width: 120, height: 10 }} />
          <div className="av-skel-line" style={{ width: "100%", height: 36, borderRadius: 8 }} />
        </div>
      ))}

      {/* Grid 2 KPI mini-cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{
            background: "var(--av-g50, #f4f7fa)",
            borderRadius: 10,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            <div className="av-skel-line" style={{ width: 80, height: 10 }} />
            <div className="av-skel-line" style={{ width: "60%", height: 22 }} />
            <div className="av-skel-line" style={{ width: "40%", height: 10 }} />
          </div>
        ))}
      </div>

      {/* Footer : 2 boutons */}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <div className="av-skel-line" style={{ width: 110, height: 36, borderRadius: 10 }} />
        <div className="av-skel-line" style={{ width: 90, height: 36, borderRadius: 10 }} />
      </div>
    </div>
  );
}
