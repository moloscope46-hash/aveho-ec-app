"use client";
// =============================================================
//  CodeBlock — Bloc de code/JSON premium avec copie (0.58.15)
//
//  Usage :
//    <CodeBlock code={JSON.stringify(data, null, 2)} language="json" />
//    <CodeBlock code={sqlString} language="sql" lineNumbers maxHeight={400} />
//    <CodeBlock code={errorStack} language="text" variant="danger" />
//
//  Props :
//    code         : string à afficher
//    language     : json | sql | js | text (juste pour le label, pas de coloration syntaxique lourde)
//    lineNumbers  : afficher les numéros de ligne (défaut true)
//    maxHeight    : px (défaut 360, contenu scrollable au-delà)
//    variant      : default | danger | success | info
//    title        : titre optionnel au-dessus
//    showCopy     : afficher le bouton copier (défaut true)
//    wrap         : wrap les lignes longues (défaut false, scroll horizontal)
//
//  Note : pas de coloration syntaxique heavy-weight (pas de Prism, Shiki, etc.)
//  pour rester léger. Mise en forme légère via regex pour le JSON
//  (strings en teal, numbers en violet, keys en navy bold).
// =============================================================

import { useState } from "react";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Highlight JSON très léger
function highlightJson(code) {
  // Échapper d'abord
  let html = escapeHtml(code);
  // Strings (clé + valeur)
  html = html.replace(/"([^"\\]|\\.)*"(?=\s*:)/g, '<span class="av-cb-key">$&</span>');
  html = html.replace(/(:\s*)"([^"\\]|\\.)*"/g, (m, prefix) => prefix + m.slice(prefix.length).replace(/^"/, '<span class="av-cb-str">"').replace(/"$/, '"</span>'));
  // Numbers
  html = html.replace(/(:\s*)(-?\d+(\.\d+)?([eE][+-]?\d+)?)/g, '$1<span class="av-cb-num">$2</span>');
  // Booleans + null
  html = html.replace(/(:\s*)(true|false|null)\b/g, '$1<span class="av-cb-bool">$2</span>');
  return html;
}

function highlightSql(code) {
  let html = escapeHtml(code);
  const keywords = [
    "SELECT", "FROM", "WHERE", "INSERT", "UPDATE", "DELETE", "INTO",
    "VALUES", "SET", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON",
    "AS", "GROUP", "ORDER", "BY", "HAVING", "LIMIT", "OFFSET", "CREATE",
    "TABLE", "INDEX", "VIEW", "DROP", "ALTER", "ADD", "COLUMN", "PRIMARY",
    "KEY", "FOREIGN", "REFERENCES", "NOT", "NULL", "AND", "OR", "IN",
    "LIKE", "BETWEEN", "IS", "RETURNING", "WITH", "DISTINCT", "UNION",
    "CASE", "WHEN", "THEN", "ELSE", "END", "BEGIN", "COMMIT", "ROLLBACK",
  ];
  const re = new RegExp("\\b(" + keywords.join("|") + ")\\b", "gi");
  html = html.replace(re, '<span class="av-cb-key">$1</span>');
  // Strings
  html = html.replace(/'([^']|'')*'/g, '<span class="av-cb-str">$&</span>');
  // Numbers
  html = html.replace(/\b(-?\d+(\.\d+)?)\b/g, '<span class="av-cb-num">$1</span>');
  // Comments
  html = html.replace(/(--[^\n]*)/g, '<span class="av-cb-cmt">$1</span>');
  return html;
}

function highlight(code, language) {
  if (language === "json") return highlightJson(code);
  if (language === "sql")  return highlightSql(code);
  return escapeHtml(code);
}

export default function CodeBlock({
  code = "",
  language = "text",
  lineNumbers = true,
  maxHeight = 360,
  variant = "default",
  title,
  showCopy = true,
  wrap = false,
  ariaLabel,
}) {
  const [copied, setCopied] = useState(false);

  const variants = {
    default: { bg: "#142131",  border: "rgba(124,200,200,.20)", accent: "#7CC8C8" },
    danger:  { bg: "#2a1517",  border: "rgba(201,134,127,.30)", accent: "#C9867F" },
    success: { bg: "#16241a",  border: "rgba(90,160,90,.30)",   accent: "#5aa05a" },
    info:    { bg: "#152030",  border: "rgba(24,95,165,.30)",   accent: "#185FA5" },
  };
  const v = variants[variant] || variants.default;

  const lines = code.split("\n");
  const lineCount = lines.length;
  const html = highlight(code, language);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback : selection text
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        const pre = document.createElement("textarea");
        pre.value = code;
        pre.style.position = "fixed";
        pre.style.left = "-9999px";
        document.body.appendChild(pre);
        pre.select();
        document.execCommand("copy");
        document.body.removeChild(pre);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {}
    }
  }

  const langLabel = {
    json: "JSON",
    sql:  "SQL",
    js:   "JavaScript",
    ts:   "TypeScript",
    html: "HTML",
    css:  "CSS",
    text: "Texte",
  }[language] || language.toUpperCase();

  return (
    <div
      className="av-codeblock"
      role="region"
      aria-label={ariaLabel || `Bloc de code ${langLabel}`}
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: 12,
        overflow: "hidden",
        fontFamily: "'Consolas', 'Monaco', 'Menlo', 'Liberation Mono', monospace",
        boxShadow: "0 4px 12px rgba(20,33,49,.10)",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderBottom: `1px solid ${v.border}`,
        background: "rgba(255,255,255,.03)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".8px",
            textTransform: "uppercase",
            color: v.accent,
            padding: "2px 8px",
            background: `${v.accent}15`,
            border: `1px solid ${v.accent}30`,
            borderRadius: 99,
            fontFamily: "'Quicksand', 'Segoe UI', sans-serif",
            flexShrink: 0,
          }}>
            {langLabel}
          </span>
          {title && (
            <span style={{
              fontSize: 12,
              color: "rgba(232,237,242,.85)",
              fontFamily: "'Quicksand', 'Segoe UI', sans-serif",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>{title}</span>
          )}
          {lineCount > 1 && (
            <span style={{
              fontSize: 10,
              color: "rgba(232,237,242,.50)",
              fontFamily: "'Quicksand', 'Segoe UI', sans-serif",
              fontWeight: 500,
            }}>
              {lineCount} ligne{lineCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {showCopy && (
          <button
            type="button"
            onClick={copy}
            aria-label="Copier le code"
            title={copied ? "Copié !" : "Copier"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              background: copied ? `${v.accent}25` : "rgba(255,255,255,.06)",
              border: `1px solid ${copied ? v.accent : "rgba(255,255,255,.10)"}`,
              borderRadius: 6,
              color: copied ? v.accent : "rgba(232,237,242,.80)",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Quicksand', 'Segoe UI', sans-serif",
              cursor: "pointer",
              transition: "all 180ms",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.background = "rgba(255,255,255,.12)";
                e.currentTarget.style.color = "#fff";
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.background = "rgba(255,255,255,.06)";
                e.currentTarget.style.color = "rgba(232,237,242,.80)";
              }
            }}
          >
            <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} style={{ fontSize: 13 }} />
            {copied ? "Copié" : "Copier"}
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{
        maxHeight,
        overflow: "auto",
        position: "relative",
      }}>
        <pre style={{
          margin: 0,
          padding: "12px 0",
          fontSize: 12.5,
          lineHeight: 1.6,
          color: "#e8edf2",
          fontFamily: "inherit",
          tabSize: 2,
          whiteSpace: wrap ? "pre-wrap" : "pre",
          wordBreak: wrap ? "break-word" : "normal",
        }}>
          {lineNumbers && lineCount > 1 ? (
            <table style={{
              borderCollapse: "collapse",
              width: "100%",
              fontFamily: "inherit",
            }}>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i}>
                    <td style={{
                      userSelect: "none",
                      textAlign: "right",
                      padding: "0 12px 0 14px",
                      color: "rgba(232,237,242,.30)",
                      fontSize: 11,
                      verticalAlign: "top",
                      width: 1,
                      borderRight: "1px solid rgba(255,255,255,.05)",
                    }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "0 14px", verticalAlign: "top" }}>
                      <span dangerouslySetInnerHTML={{ __html: highlight(line, language) || "&nbsp;" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <span
              style={{ padding: "0 14px", display: "block" }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </pre>
      </div>

      <style>{`
        .av-codeblock .av-cb-key  { color: #7CC8C8; font-weight: 600; }
        .av-codeblock .av-cb-str  { color: #b3e3a8; }
        .av-codeblock .av-cb-num  { color: #d9a3e8; }
        .av-codeblock .av-cb-bool { color: #f4b961; font-weight: 600; }
        .av-codeblock .av-cb-cmt  { color: rgba(232,237,242,.45); font-style: italic; }
      `}</style>
    </div>
  );
}
