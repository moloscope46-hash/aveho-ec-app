"use client";
// =============================================================
//  Dialog — Composant amélioré au-dessus de Modal (0.58.12)
//
//  Wrappers ergonomiques pour les cas d'usage courants :
//
//  • Dialog.confirm({ title, message, danger })
//      → Promise<boolean>
//
//  • Dialog.prompt({ title, message, defaultValue, placeholder,
//                    validate, multiline })
//      → Promise<string | null>
//
//  • Dialog.alert({ title, message, variant })
//      → Promise<void>
//
//  Usage :
//    import { Dialog } from "@/components/ui-premium";
//
//    const ok = await Dialog.confirm({
//      title: "Supprimer ce patient ?",
//      message: "Cette action est irréversible.",
//      danger: true,
//    });
//    if (ok) doDelete();
//
//    const reason = await Dialog.prompt({
//      title: "Motif de rejet",
//      placeholder: "Expliquer pourquoi…",
//      validate: (v) => v.length < 10 ? "Au moins 10 caractères" : null,
//      multiline: true,
//    });
//    if (reason) doReject(reason);
//
//  Implementation : monte un container DOM à la racine, render React
//  via createRoot, retourne une Promise résolue à la fermeture.
// =============================================================

import { useState, useEffect, useRef } from "react";

// On utilise dynamiquement createRoot pour éviter SSR
let _ReactDOM = null;
async function getReactDOM() {
  if (_ReactDOM) return _ReactDOM;
  _ReactDOM = await import("react-dom/client");
  return _ReactDOM;
}

function ensureRoot() {
  if (typeof document === "undefined") return null;
  let root = document.getElementById("av-dialog-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "av-dialog-root";
    document.body.appendChild(root);
  }
  return root;
}

// =============================================================
//  Composant interne : DialogShell
//  Reproduit l'esthétique du Modal v2 sans dépendance circulaire
// =============================================================
function DialogShell({ open, onClose, title, subtitle, icon, color, children, footer, size = "sm" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement;
    setTimeout(() => {
      const first = dialogRef.current?.querySelector("button, input, textarea, [tabindex]:not([tabindex='-1'])");
      first?.focus?.();
    }, 100);
    function onKey(ev) {
      if (ev.key === "Escape") { ev.preventDefault(); onClose?.(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 380, md: 480, lg: 620 };

  return (
    <div className="modal-bg" onClick={(ev) => ev.target.classList.contains("modal-bg") && onClose?.()}>
      <div
        ref={dialogRef}
        className="modal modal-v2"
        style={{ maxWidth: widths[size] || widths.sm }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head-v2" style={{ background: color || "#142131" }}>
          <span className="modal-ic" aria-hidden="true">
            <i className={`ti ${icon || "ti-info-circle"}`} />
          </span>
          <span className="modal-title-wrap" style={{ flex: 1, minWidth: 0 }}>
            <span className="modal-title" style={{ display: "block", fontWeight: 700 }}>{title}</span>
            {subtitle && (
              <span className="modal-subtitle" style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                opacity: 0.85,
                marginTop: 2,
              }}>{subtitle}</span>
            )}
          </span>
          <button className="modal-x" onClick={onClose} aria-label="Fermer">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// =============================================================
//  Confirm dialog
// =============================================================
function ConfirmDialog({ title, message, danger, preview, confirmLabel, cancelLabel, onClose }) {
  const color = danger ? "#C9867F" : "#185FA5";
  const icon = danger ? "ti-alert-triangle" : "ti-help-circle";
  return (
    <DialogShell
      open
      onClose={() => onClose(false)}
      title={title}
      icon={icon}
      color={color}
      size="sm"
      footer={
        <>
          <button
            onClick={() => onClose(false)}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              border: "1px solid var(--av-g200, #e3e9ee)",
              background: "var(--av-g0, #fff)",
              color: "var(--av-g700, #4a5868)",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {cancelLabel || "Annuler"}
          </button>
          <button
            onClick={() => onClose(true)}
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              border: "none",
              background: danger
                ? "linear-gradient(135deg, #C9867F 0%, #b06d65 100%)"
                : "linear-gradient(135deg, #7CC8C8 0%, #5db5b5 100%)",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: danger
                ? "0 4px 10px rgba(201,134,127,.40)"
                : "0 4px 10px rgba(124,200,200,.40)",
            }}
          >
            {confirmLabel || (danger ? "Supprimer" : "Confirmer")}
          </button>
        </>
      }
    >
      {message && (
        <p style={{ margin: 0, color: "#4a5868", fontSize: 13.5, lineHeight: 1.55 }}>
          {message}
        </p>
      )}
      {preview && (
        <div style={{
          marginTop: 14,
          padding: "12px 14px",
          background: "var(--av-g100, #f4f7fa)",
          border: "1px dashed var(--av-g200, #e3e9ee)",
          borderRadius: 10,
          fontSize: 12.5,
          color: "var(--av-g700, #4a5868)",
        }}>
          {preview}
        </div>
      )}
    </DialogShell>
  );
}

// =============================================================
//  Prompt dialog
// =============================================================
function PromptDialog({
  title,
  message,
  defaultValue = "",
  placeholder,
  validate,
  multiline,
  confirmLabel,
  cancelLabel,
  onClose,
}) {
  const [val, setVal] = useState(defaultValue);
  const [error, setError] = useState(null);

  function submit() {
    if (validate) {
      const err = validate(val);
      if (err) { setError(err); return; }
    }
    onClose(val);
  }

  return (
    <DialogShell
      open
      onClose={() => onClose(null)}
      title={title}
      icon="ti-edit"
      color="#185FA5"
      size="sm"
      footer={
        <>
          <button
            onClick={() => onClose(null)}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              border: "1px solid var(--av-g200, #e3e9ee)",
              background: "var(--av-g0, #fff)",
              color: "var(--av-g700, #4a5868)",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {cancelLabel || "Annuler"}
          </button>
          <button
            onClick={submit}
            disabled={!val}
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              border: "none",
              background: val
                ? "linear-gradient(135deg, #7CC8C8 0%, #5db5b5 100%)"
                : "var(--av-g200, #e3e9ee)",
              color: val ? "#fff" : "var(--av-g500, #8a98a8)",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              cursor: val ? "pointer" : "not-allowed",
              boxShadow: val ? "0 4px 10px rgba(124,200,200,.40)" : "none",
            }}
          >
            {confirmLabel || "Valider"}
          </button>
        </>
      }
    >
      {message && (
        <p style={{ margin: "0 0 12px", color: "#4a5868", fontSize: 13.5, lineHeight: 1.55 }}>
          {message}
        </p>
      )}
      {multiline ? (
        <textarea
          value={val}
          onChange={(e) => { setVal(e.target.value); setError(null); }}
          placeholder={placeholder}
          rows={4}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "var(--av-g0, #fff)",
            border: error ? "1.5px solid #c0392b" : "1.5px solid var(--av-g200, #e3e9ee)",
            borderRadius: 10,
            fontSize: 13.5,
            fontFamily: "inherit",
            resize: "vertical",
            minHeight: 80,
            outline: "none",
          }}
        />
      ) : (
        <input
          type="text"
          value={val}
          onChange={(e) => { setVal(e.target.value); setError(null); }}
          placeholder={placeholder}
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "var(--av-g0, #fff)",
            border: error ? "1.5px solid #c0392b" : "1.5px solid var(--av-g200, #e3e9ee)",
            borderRadius: 10,
            fontSize: 13.5,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      )}
      {error && (
        <div style={{
          marginTop: 8,
          padding: "6px 10px",
          background: "#fee",
          border: "1px solid #f8c5c0",
          borderRadius: 8,
          fontSize: 12,
          color: "#c0392b",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <i className="ti ti-alert-circle" />
          {error}
        </div>
      )}
    </DialogShell>
  );
}

// =============================================================
//  Alert dialog (vs dialogs.alert legacy — celui-ci est premium)
// =============================================================
function AlertDialog({ title, message, variant, confirmLabel, onClose }) {
  const cfgByVariant = {
    info:    { color: "#185FA5", icon: "ti-info-circle" },
    success: { color: "#5aa05a", icon: "ti-circle-check" },
    warning: { color: "#EF9F27", icon: "ti-alert-triangle" },
    danger:  { color: "#C9867F", icon: "ti-alert-octagon" },
  };
  const cfg = cfgByVariant[variant] || cfgByVariant.info;

  return (
    <DialogShell
      open
      onClose={() => onClose()}
      title={title}
      icon={cfg.icon}
      color={cfg.color}
      size="sm"
      footer={
        <button
          onClick={() => onClose()}
          style={{
            padding: "9px 20px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #7CC8C8 0%, #5db5b5 100%)",
            color: "#fff",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(124,200,200,.40)",
          }}
        >
          {confirmLabel || "OK"}
        </button>
      }
    >
      {message && (
        <p style={{ margin: 0, color: "#4a5868", fontSize: 13.5, lineHeight: 1.55 }}>
          {message}
        </p>
      )}
    </DialogShell>
  );
}

// =============================================================
//  API publique : Dialog.confirm / prompt / alert
// =============================================================

async function open(Component, props) {
  if (typeof document === "undefined") return null;
  const root = ensureRoot();
  const ReactDOM = await getReactDOM();
  return new Promise((resolve) => {
    const container = document.createElement("div");
    root.appendChild(container);
    const reactRoot = ReactDOM.createRoot(container);
    function close(result) {
      // Animation : laisse le temps au modal-bg de fade out (CSS animation)
      setTimeout(() => {
        try { reactRoot.unmount(); } catch {}
        if (container.parentNode) container.parentNode.removeChild(container);
      }, 250);
      resolve(result);
    }
    reactRoot.render(<Component {...props} onClose={close} />);
  });
}

export const Dialog = {
  /**
   * Boîte de confirmation premium.
   * @param {object} opts
   * @param {string} opts.title
   * @param {string} [opts.message]
   * @param {boolean} [opts.danger] - rouge terra forcé
   * @param {string} [opts.preview] - aperçu du contenu à supprimer (style code)
   * @param {string} [opts.confirmLabel]
   * @param {string} [opts.cancelLabel]
   * @returns {Promise<boolean>}
   */
  confirm: (opts) => open(ConfirmDialog, opts),

  /**
   * Boîte de saisie avec validation.
   * @param {object} opts
   * @param {string} opts.title
   * @param {string} [opts.message]
   * @param {string} [opts.defaultValue]
   * @param {string} [opts.placeholder]
   * @param {Function} [opts.validate] - (val) => null | string-erreur
   * @param {boolean} [opts.multiline]
   * @returns {Promise<string|null>}
   */
  prompt: (opts) => open(PromptDialog, opts),

  /**
   * Boîte d'alerte premium (remplace dialogs.alert legacy).
   * @param {object} opts
   * @param {string} opts.title
   * @param {string} [opts.message]
   * @param {"info"|"success"|"warning"|"danger"} [opts.variant]
   * @returns {Promise<void>}
   */
  alert: (opts) => open(AlertDialog, opts),
};

export default Dialog;
