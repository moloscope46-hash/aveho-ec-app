"use client";
// =============================================================
//  app/changelog/NoteModal.js (Alpha 0.57.10)
//
//  Modale autonome qui affiche la note HTML d'une version, avec :
//   - highlight des mots-clés liés au searchText (mark className="cl-match")
//   - navigation match précédent/suivant via boutons + F3 / n / p
//   - Escape pour fermer
//   - scroll auto vers le match courant via requestAnimationFrame (no reflow)
//   - bouton télécharger HTML brut
//
//  Reçoit `noteModal` (state object) et `setNoteModal` (pour MAJ currentMatch).
//  Le parent contrôle l'ouverture en passant `noteModal` à null ou rempli.
//
//  Extrait de app/changelog/page.js en 0.57.10 (~250 lignes en moins là-bas).
// =============================================================

import { useEffect, useRef } from "react";

const navBtn = {
  background: "transparent",
  color: "#fff",
  border: "none",
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: 14,
  borderRadius: 4,
  display: "flex",
  alignItems: "center",
};

export default function NoteModal({ noteModal, setNoteModal, onClose }) {
  const contentRef = useRef(null);

  // 0.55.16 → 0.57.10 : scroll auto vers le match courant + toggle classe .active
  useEffect(() => {
    if (!noteModal || !contentRef.current || noteModal.currentMatch < 0) return;
    const container = contentRef.current;
    // 0.55.20 : requestAnimationFrame pour éviter le forced reflow
    const raf = requestAnimationFrame(() => {
      container.querySelectorAll("mark.cl-match.active").forEach((el) => el.classList.remove("active"));
      const target = container.querySelector(`mark.cl-match[data-cl-idx="${noteModal.currentMatch}"]`);
      if (target) {
        target.classList.add("active");
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [noteModal?.currentMatch, noteModal?.html]);

  // 0.55.16 → 0.57.10 : Escape ferme la modale + F3 / n / p naviguent les matches
  useEffect(() => {
    if (!noteModal) return;
    function handleKey(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (noteModal.matchCount > 0) {
        if (e.key === "F3" || (e.key === "n" && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== "INPUT")) {
          e.preventDefault();
          setNoteModal((m) => m ? { ...m, currentMatch: (m.currentMatch + 1) % m.matchCount } : m);
        }
        if ((e.shiftKey && e.key === "F3") || (e.key === "p" && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== "INPUT")) {
          e.preventDefault();
          setNoteModal((m) => m ? { ...m, currentMatch: (m.currentMatch - 1 + m.matchCount) % m.matchCount } : m);
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [noteModal, setNoteModal, onClose]);

  if (!noteModal) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,33,49,.75)",
        zIndex: 9991,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 14px",
        animation: "fadeIn .15s",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          width: "100%",
          maxWidth: 960,
          height: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 80px rgba(0,0,0,.45)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, #142131 0%, ${noteModal.color || "#185FA5"} 100%)`,
          color: "#fff",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <i className="ti ti-file-text" style={{ fontSize: 22, color: "#7CC8C8", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#cfe4f5", fontWeight: 700 }}>
              NOTE DE VERSION — {noteModal.version}
            </div>
            <div style={{ fontSize: 12.5, fontFamily: "Consolas, monospace", marginTop: 2, opacity: 0.85 }}>
              {noteModal.noteFile}
            </div>
          </div>

          {/* Navigation matches */}
          {noteModal.matchCount > 0 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(255,255,255,.12)",
              border: "1px solid rgba(255,255,255,.22)",
              borderRadius: 8,
              padding: "2px 4px",
            }}>
              <button
                onClick={() => setNoteModal((m) => m ? { ...m, currentMatch: (m.currentMatch - 1 + m.matchCount) % m.matchCount } : m)}
                title="Match précédent"
                style={navBtn}
              >
                <i className="ti ti-chevron-up" />
              </button>
              <span style={{
                fontSize: 12.5,
                fontWeight: 700,
                padding: "0 8px",
                minWidth: 56,
                textAlign: "center",
                fontFamily: "Consolas, monospace",
              }}>
                {noteModal.currentMatch + 1}/{noteModal.matchCount}
              </span>
              <button
                onClick={() => setNoteModal((m) => m ? { ...m, currentMatch: (m.currentMatch + 1) % m.matchCount } : m)}
                title="Match suivant"
                style={navBtn}
              >
                <i className="ti ti-chevron-down" />
              </button>
            </div>
          )}

          <a
            href={`/changelog-notes/${noteModal.noteFile}`}
            target="_blank"
            rel="noopener noreferrer"
            download
            title="Télécharger la note"
            style={{
              background: "#7CC8C8",
              color: "#142131",
              border: "none",
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              minHeight: 34,
            }}
          >
            <i className="ti ti-download" /> HTML
          </a>

          <button
            onClick={onClose}
            title="Fermer (Échap)"
            style={{
              background: "transparent",
              color: "#fff",
              border: "none",
              padding: 6,
              cursor: "pointer",
              fontSize: 22,
              display: "flex",
              alignItems: "center",
            }}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Bandeau search context */}
        {noteModal.searchText && noteModal.keywords?.length > 0 && (
          <div style={{
            background: noteModal.matchCount > 0 ? "#fff8ec" : "#f4f7fa",
            borderBottom: `1px solid ${noteModal.matchCount > 0 ? "#f0d59f" : "#e3e9ee"}`,
            padding: "8px 18px",
            fontSize: 12,
            color: noteModal.matchCount > 0 ? "#7a4f15" : "#6c7a89",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}>
            <i className={`ti ${noteModal.matchCount > 0 ? "ti-highlight" : "ti-search-off"}`} />
            <span>
              {noteModal.matchCount > 0 ? (
                <>
                  <b>{noteModal.matchCount} passage{noteModal.matchCount > 1 ? "s" : ""}</b> surligné{noteModal.matchCount > 1 ? "s" : ""} pour&nbsp;
                </>
              ) : (
                <>Aucun passage correspondant trouvé pour&nbsp;</>
              )}
              <i style={{ color: "#142131" }}>« {noteModal.searchText.slice(0, 90)}{noteModal.searchText.length > 90 ? "…" : ""} »</i>
            </span>
            {noteModal.keywords?.length > 0 && (
              <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.7 }}>
                Mots : {noteModal.keywords.slice(0, 6).join(", ")}{noteModal.keywords.length > 6 ? "…" : ""}
              </span>
            )}
          </div>
        )}

        {/* Contenu HTML scrollable — 0.62.11 : fix mobile overflow */}
        <div
          ref={contentRef}
          className="cl-note-content-wrap"
          style={{
            flex: 1,
            overflow: "auto",
            background: "#f4f7fa",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {noteModal.loading || !noteModal.html ? (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              color: "#8a98a8",
            }}>
              <i className="ti ti-loader-2" style={{ fontSize: 24, animation: "spin 1s linear infinite" }} />
              <span style={{ marginLeft: 10, fontSize: 13 }}>Chargement de la note…</span>
            </div>
          ) : (
            <div className="cl-note-scope" dangerouslySetInnerHTML={{ __html: noteModal.html }} />
          )}
        </div>
      </div>

      {/* Styles inline pour les <mark> */}
      <style>{`
        .cl-note-scope mark.cl-match {
          background: #ffeb9c;
          color: #142131;
          padding: 1px 3px;
          border-radius: 3px;
          box-shadow: 0 0 0 1px rgba(239,159,39,.4);
          transition: background .15s, box-shadow .15s, outline .15s;
        }
        .cl-note-scope mark.cl-match.active {
          background: #EF9F27;
          color: #fff;
          box-shadow: 0 0 0 2px #EF9F27, 0 0 12px rgba(239,159,39,.5);
          outline: 2px solid #fff;
          outline-offset: 2px;
        }
        .cl-note-scope { font-family: 'Segoe UI', sans-serif; }
        .cl-note-scope .wrap { padding: 24px 28px 40px; }
        /* 0.62.11 : Force responsive sur le HTML injecté */
        .cl-note-content-wrap { padding: 0; }
        .cl-note-scope { max-width: 100%; box-sizing: border-box; }
        .cl-note-scope * { max-width: 100% !important; box-sizing: border-box !important; }
        .cl-note-scope body { max-width: 100% !important; padding: 16px !important; margin: 0 !important; }
        .cl-note-scope pre, .cl-note-scope code { white-space: pre-wrap !important; word-break: break-word !important; overflow-x: auto; max-width: 100%; }
        .cl-note-scope table { display: block; overflow-x: auto; max-width: 100%; }
        .cl-note-scope img { height: auto; }
        /* Mobile : padding réduit */
        @media (max-width: 640px) {
          .cl-note-scope body { padding: 12px !important; font-size: 14px !important; }
          .cl-note-scope h1 { font-size: 20px !important; }
          .cl-note-scope h2 { font-size: 15px !important; }
          .cl-note-scope .chantier { padding: 10px 12px !important; font-size: 13px !important; }
          .cl-note-scope .header { padding: 12px !important; }
        }
      `}</style>
    </div>
  );
}
