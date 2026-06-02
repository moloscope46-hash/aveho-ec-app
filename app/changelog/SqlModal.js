"use client";
// =============================================================
//  app/changelog/SqlModal.js (extrait depuis page.js en 0.57.2)
//
//  Modale qui affiche le contenu d'un patch SQL téléchargé depuis
//  /public/changelog-sql/. Gère son propre cache fetch + ESC + clipboard.
//
//  Props :
//    - sqlModal: { version, file, content? } ou null
//    - onClose: () => void
// =============================================================

import { useEffect, useRef, useState } from "react";

export default function SqlModal({ sqlModal, onClose }) {
  const [content, setContent] = useState(sqlModal?.content || null);
  const [copied, setCopied] = useState(false);
  const cacheRef = useRef({});

  // Fetch du contenu SQL quand on ouvre la modale
  useEffect(() => {
    if (!sqlModal) return;
    if (sqlModal.content) {
      setContent(sqlModal.content);
      return;
    }
    const { file } = sqlModal;
    if (cacheRef.current[file]) {
      setContent(cacheRef.current[file]);
      return;
    }
    setContent(null);
    (async () => {
      try {
        const res = await fetch(`/changelog-sql/${file}`, { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const txt = await res.text();
        cacheRef.current[file] = txt;
        setContent(txt);
      } catch (e) {
        setContent(`-- Erreur de chargement\n-- ${e.message}`);
      }
    })();
  }, [sqlModal?.file, sqlModal?.content]);

  // ESC pour fermer
  useEffect(() => {
    if (!sqlModal) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [sqlModal, onClose]);

  async function copyToClipboard() {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copie clipboard refusée. Utilisez Ctrl+A puis Ctrl+C dans la fenêtre.");
    }
  }

  if (!sqlModal) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,33,49,.7)",
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
          maxWidth: 920,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 80px rgba(0,0,0,.45)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #142131 0%, #185FA5 100%)",
          color: "#fff",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <i className="ti ti-database" style={{ fontSize: 22, color: "#7CC8C8" }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#cfe4f5", fontWeight: 700 }}>
              REQUÊTE SQL — VERSION {sqlModal.version}
            </div>
            <div style={{ fontSize: 13, fontFamily: "Consolas, monospace", marginTop: 2 }}>
              {sqlModal.file}
            </div>
          </div>
          <button
            onClick={copyToClipboard}
            disabled={!content}
            title="Copier dans le presse-papier"
            style={{
              background: copied ? "#5aa05a" : "#fff",
              color: copied ? "#fff" : "#142131",
              border: "none",
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: content ? "pointer" : "wait",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              minHeight: 36,
            }}
          >
            <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} />
            {copied ? "Copié !" : "Copier"}
          </button>
          <a
            href={content ? `/changelog-sql/${sqlModal.file}` : "#"}
            download={sqlModal.file}
            title="Télécharger le fichier .sql"
            style={{
              background: "#7CC8C8",
              color: "#142131",
              border: "none",
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              minHeight: 36,
            }}
          >
            <i className="ti ti-download" /> Télécharger
          </a>
          <button
            onClick={onClose}
            title="Fermer"
            style={{
              background: "transparent",
              color: "#fff",
              border: "none",
              padding: 6,
              cursor: "pointer",
              fontSize: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          background: "#fff8ec",
          borderBottom: "1px solid #f0d59f",
          padding: "8px 18px",
          fontSize: 11.5,
          color: "#7a4f15",
          lineHeight: 1.5,
        }}>
          <i className="ti ti-info-circle" /> Coller dans <b>Supabase Dashboard → SQL Editor → Run</b>. Le patch est idempotent (peut être exécuté plusieurs fois sans risque).
        </div>

        {/* Contenu SQL */}
        <div style={{
          flex: 1,
          overflow: "auto",
          background: "#142131",
          padding: 0,
        }}>
          {!content ? (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              color: "#7CC8C8",
            }}>
              <i className="ti ti-loader-2" style={{ fontSize: 24, animation: "spin 1s linear infinite" }} />
              <span style={{ marginLeft: 10, fontSize: 13 }}>Chargement…</span>
            </div>
          ) : (
            <pre style={{
              margin: 0,
              padding: "16px 20px",
              color: "#e8edf2",
              fontFamily: "Consolas, 'Menlo', monospace",
              fontSize: 12.5,
              lineHeight: 1.55,
              whiteSpace: "pre",
              overflow: "auto",
            }}>
              <code>{content}</code>
            </pre>
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: "#f4f7fa",
          borderTop: "1px solid #e3e9ee",
          padding: "8px 18px",
          fontSize: 11,
          color: "#8a98a8",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}>
          <span>
            <i className="ti ti-file-text" /> {content ? `${content.split("\n").length} lignes · ${(content.length / 1024).toFixed(1)} Ko` : "—"}
          </span>
          <span>Échap pour fermer</span>
        </div>
      </div>
    </div>
  );
}
