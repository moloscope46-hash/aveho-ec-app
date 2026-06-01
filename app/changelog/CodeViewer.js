"use client";
// =============================================================
//  app/changelog/CodeViewer.js (Alpha 0.56.19)
//
//  Popup qui affiche un snippet de code modifié/ajouté pour
//  un chantier de version. Lecture seule + bouton Copier + lien
//  vers GitHub pour voir le fichier complet.
//
//  Coloration syntaxique simple (regex) pour JS/SQL/CSS.
// =============================================================

import { useEffect, useState } from "react";

const GITHUB_BASE = "https://github.com/moloscope46-hash/aveho-ec-app/blob/main";

export default function CodeViewer({ snippet, onClose }) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("after"); // "before" | "after"

  useEffect(() => {
    function onEsc(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!snippet) return null;

  const lang = snippet.lang || guessLang(snippet.file);
  const hasBefore = !!snippet.before;
  const code = tab === "before" ? snippet.before : snippet.after;

  function copy() {
    if (!code) return;
    try {
      navigator.clipboard?.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const ghUrl = snippet.file ? `${GITHUB_BASE}/${snippet.file}` : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(20,33,49,.7)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, animation: "code-fade-in 0.18s ease-out",
      }}
      role="dialog"
      aria-label="Aperçu du code"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e2a3a", color: "#e8edf2",
          borderRadius: 12, width: "min(900px, 100%)", maxHeight: "92vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "12px 16px",
          background: "linear-gradient(135deg, #142131, #2a3a4e)",
          borderBottom: "1px solid #3a4a5e",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          <i className="ti ti-code" style={{ fontSize: 20, color: "#7CC8C8" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#7a8a9a", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>
              {snippet.note || "Code modifié"}
            </div>
            <div style={{ fontFamily: "'Consolas', 'Menlo', monospace", fontSize: 13, color: "#e8edf2", fontWeight: 600, wordBreak: "break-all" }}>
              {snippet.file || "Snippet"}
            </div>
          </div>
          <span style={{
            background: langColor(lang) + "33", color: langColor(lang),
            fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
            textTransform: "uppercase",
          }}>
            {lang}
          </span>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "rgba(255,255,255,.1)", color: "#fff", border: "none",
              width: 30, height: 30, borderRadius: "50%",
              cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Onglets si before/after */}
        {hasBefore && (
          <div style={{ display: "flex", borderBottom: "1px solid #3a4a5e", background: "#162232" }}>
            <TabBtn label="Avant" icon="ti-minus" active={tab === "before"} onClick={() => setTab("before")} color="#e35d5b" />
            <TabBtn label="Après" icon="ti-plus" active={tab === "after"} onClick={() => setTab("after")} color="#5aa05a" />
          </div>
        )}

        {/* Code */}
        <div style={{
          flex: 1, overflowY: "auto", overflowX: "auto",
          padding: 16, background: "#1a2434",
        }}>
          <pre style={{
            margin: 0, fontFamily: "'Consolas', 'Menlo', monospace",
            fontSize: 12.5, lineHeight: 1.6,
            whiteSpace: "pre", color: "#e8edf2",
          }}>
            <code dangerouslySetInnerHTML={{ __html: highlightCode(code || "", lang) }} />
          </pre>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: "10px 16px", background: "#162232",
          borderTop: "1px solid #3a4a5e",
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        }}>
          <button
            onClick={copy}
            disabled={!code}
            style={{
              background: copied ? "#5aa05a" : "#3a4a5e",
              color: "#fff", border: "none",
              padding: "7px 14px", borderRadius: 6,
              cursor: code ? "pointer" : "not-allowed",
              fontFamily: "inherit", fontSize: 12, fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 6,
              transition: "background .2s",
            }}
          >
            <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} />
            {copied ? "Copié !" : "Copier"}
          </button>
          {ghUrl && (
            <a
              href={ghUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#185FA5", color: "#fff",
                padding: "7px 14px", borderRadius: 6, textDecoration: "none",
                fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <i className="ti ti-brand-github" />
              Voir sur GitHub
            </a>
          )}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "#7a8a9a", fontStyle: "italic" }}>
            <i className="ti ti-keyboard" /> ESC pour fermer
          </span>
        </div>

        <style jsx>{`
          @keyframes code-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

function TabBtn({ label, icon, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "8px 12px",
        background: active ? "#1a2434" : "transparent",
        color: active ? color : "#7a8a9a",
        border: "none",
        borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
        fontSize: 12, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}
    >
      <i className={`ti ${icon}`} />
      {label}
    </button>
  );
}

// =============================================================
//  Coloration syntaxique simple (regex)
// =============================================================
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightCode(code, lang) {
  let html = escapeHtml(code);

  // Common : commentaires
  if (lang === "sql") {
    html = html.replace(/(--[^\n]*)/g, '<span style="color:#7a8a9a;font-style:italic">$1</span>');
  } else {
    html = html.replace(/(\/\/[^\n]*)/g, '<span style="color:#7a8a9a;font-style:italic">$1</span>');
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#7a8a9a;font-style:italic">$1</span>');
  }

  // Strings (simple, on évite ce qui est déjà coloré dans un span)
  html = html.replace(/(['"`])((?:\\.|(?!\1).)*)\1/g, (m) => `<span style="color:#bfa9e0">${m}</span>`);

  // Mots-clés selon langage
  let keywords = [];
  if (lang === "sql") {
    keywords = ["select", "from", "where", "insert", "into", "update", "set", "delete", "create", "table", "function", "returns", "language", "as", "begin", "end", "if", "then", "else", "and", "or", "not", "in", "exists", "primary", "key", "default", "references", "join", "left", "right", "inner", "on", "group", "by", "order", "having", "limit", "with", "case", "when", "null", "true", "false", "drop", "alter", "policy", "trigger", "security", "definer", "for", "each", "row", "execute", "return", "declare", "raise", "exception"];
  } else {
    keywords = ["const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "new", "this", "super", "class", "extends", "import", "export", "from", "default", "async", "await", "try", "catch", "finally", "throw", "true", "false", "null", "undefined", "typeof", "instanceof"];
  }
  const kwRegex = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
  html = html.replace(kwRegex, '<span style="color:#7CC8C8;font-weight:600">$1</span>');

  // Nombres
  html = html.replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color:#EF9F27">$1</span>');

  return html;
}

function guessLang(file) {
  if (!file) return "js";
  if (file.endsWith(".sql")) return "sql";
  if (file.endsWith(".css")) return "css";
  if (file.endsWith(".ts") || file.endsWith(".tsx")) return "ts";
  return "js";
}

function langColor(lang) {
  return {
    js: "#EF9F27",
    ts: "#185FA5",
    sql: "#7a6fb0",
    css: "#7CC8C8",
  }[lang] || "#a0aeb9";
}
