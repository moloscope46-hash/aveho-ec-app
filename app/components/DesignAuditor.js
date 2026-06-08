"use client";
// =============================================================
//  components/DesignAuditor.js (0.65.6)
//
//  Outil de DEV pour identifier les éléments à polir sur les pages :
//   - Encadre en orange les panels sans ombre
//   - Encadre en rouge les titres sans icône
//   - Encadre en violet les couleurs probablement invisibles
//   - Encadre en jaune les boutons sans hover effect
//
//  Activation : ?polish=1 dans l'URL OU touche P 3 fois
//  Désactivation : touche Échap ou bouton flotant
// =============================================================

import { useEffect, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";

export default function DesignAuditor() {
  const params = useSearchParams();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [stats, setStats] = useState({ panels: 0, titles: 0, buttons: 0, total: 0 });
  const [keyBuffer, setKeyBuffer] = useState([]);

  // Activation via ?polish=1
  useEffect(() => {
    if (params.get("polish") === "1") setActive(true);
  }, [params]);

  // Activation via "P" pressé 3x
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && active) { setActive(false); return; }
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA") return;
      if (e.key === "p" || e.key === "P") {
        const newBuf = [...keyBuffer, Date.now()].slice(-3);
        setKeyBuffer(newBuf);
        if (newBuf.length === 3 && (newBuf[2] - newBuf[0]) < 800) {
          setActive(!active);
          setKeyBuffer([]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, keyBuffer]);

  // Audit DOM quand actif
  useEffect(() => {
    if (!active) return;
    const findings = { panels: 0, titles: 0, buttons: 0, total: 0 };

    // 1. Panels sans ombre
    document.querySelectorAll(".panel, [class*='card'], section").forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.boxShadow === "none" && cs.background !== "rgba(0, 0, 0, 0)" && cs.padding !== "0px") {
        el.dataset.polishWarn = "no-shadow";
        findings.panels++;
        findings.total++;
      }
    });

    // 2. Titres sans icône
    document.querySelectorAll("h1, h2, h3").forEach(el => {
      if (!el.querySelector("i") && !el.textContent?.startsWith("🔍") && el.textContent?.length < 80) {
        el.dataset.polishWarn = "no-icon";
        findings.titles++;
        findings.total++;
      }
    });

    // 3. Boutons sans gradient ni hover
    document.querySelectorAll("button:not(.tb-icon):not(.menu-tile):not(.av-back-floating)").forEach(el => {
      const cs = getComputedStyle(el);
      if (!cs.background.includes("gradient") && cs.background.match(/rgb\(255,?\s*255,?\s*255\)|#fff/i)) {
        el.dataset.polishHint = "flat-button";
        findings.buttons++;
      }
    });

    setStats(findings);

    return () => {
      document.querySelectorAll("[data-polish-warn]").forEach(el => delete el.dataset.polishWarn);
      document.querySelectorAll("[data-polish-hint]").forEach(el => delete el.dataset.polishHint);
    };
  }, [active, pathname]);

  if (!active) return null;

  return (
    <>
      <style jsx global>{`
        [data-polish-warn="no-shadow"] {
          outline: 2px dashed #EF9F27 !important;
          outline-offset: 2px;
          position: relative;
        }
        [data-polish-warn="no-shadow"]::before {
          content: "Pas d'ombre";
          position: absolute;
          top: -22px; left: 0;
          background: #EF9F27; color: #fff;
          padding: 2px 6px; border-radius: 4px;
          font-size: 9.5px; font-weight: 700;
          z-index: 9998;
          pointer-events: none;
        }
        [data-polish-warn="no-icon"] {
          outline: 2px dashed #e35d5b !important;
          outline-offset: 2px;
          position: relative;
        }
        [data-polish-warn="no-icon"]::before {
          content: "Sans icône";
          position: absolute;
          top: -22px; left: 0;
          background: #e35d5b; color: #fff;
          padding: 2px 6px; border-radius: 4px;
          font-size: 9.5px; font-weight: 700;
          z-index: 9998;
          pointer-events: none;
        }
        [data-polish-hint="flat-button"] {
          outline: 1px dashed #c0a020 !important;
          outline-offset: 1px;
        }
      `}</style>

      {/* Toolbar flottante en bas */}
      <div style={{
        position: "fixed",
        bottom: 12, right: 12, zIndex: 99999,
        background: "linear-gradient(135deg, #142131, #1c5454)",
        color: "#fff",
        padding: "10px 14px",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,.4)",
        border: "1.5px solid rgba(124, 200, 200, .35)",
        fontFamily: "Quicksand, sans-serif",
        fontSize: 12,
        display: "flex", flexDirection: "column", gap: 6,
        minWidth: 220,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13, color: "#7CC8C8" }}>
          <i className="ti ti-brush" />
          POLISH MODE
        </div>
        <div style={{ fontSize: 10.5, color: "#bfe6e6", marginBottom: 4 }}>
          Audit visuel des éléments à améliorer
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          <span style={{ padding: "4px 6px", background: "rgba(239,159,39,.2)", border: "1px solid #EF9F27", borderRadius: 6, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#EF9F27" }}>{stats.panels}</div>
            <div style={{ fontSize: 8.5, color: "#bfe6e6" }}>panels sans ombre</div>
          </span>
          <span style={{ padding: "4px 6px", background: "rgba(227,93,91,.2)", border: "1px solid #e35d5b", borderRadius: 6, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e35d5b" }}>{stats.titles}</div>
            <div style={{ fontSize: 8.5, color: "#bfe6e6" }}>titres sans icône</div>
          </span>
          <span style={{ padding: "4px 6px", background: "rgba(192,160,32,.2)", border: "1px solid #c0a020", borderRadius: 6, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#c0a020" }}>{stats.buttons}</div>
            <div style={{ fontSize: 8.5, color: "#bfe6e6" }}>boutons plats</div>
          </span>
        </div>
        <button onClick={() => setActive(false)} style={{
          background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(124,200,200,.3)",
          borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700,
        }}>
          <i className="ti ti-x" /> Quitter (Échap)
        </button>
        <div style={{ fontSize: 9, color: "#9bb5b5", marginTop: 2, lineHeight: 1.4 }}>
          Active : ?polish=1 dans l'URL ou appuie P 3 fois
        </div>
      </div>
    </>
  );
}
