"use client";
// =============================================================
//  Toast — Système de notifications premium (0.58.0)
//
//  API simple :
//    import { showToast } from "./Toast";
//    showToast({ type: "success", title: "Sauvegardé !", message: "..." });
//
//  Auto-dismiss après 4s, fermeture manuelle, animations slide-in,
//  empilement vertical, plusieurs types (success/info/warning/error).
//
//  ⚠️ Distinct de showRealtimeToast (qui gère les events Realtime).
//  Ce Toast est pour les feedbacks d'action user (save, delete, etc).
// =============================================================

const TOAST_TYPES = {
  success: { color: "#5aa05a", bg: "#eef9ef", icon: "ti-circle-check" },
  info:    { color: "#185FA5", bg: "#e7f0fa", icon: "ti-info-circle" },
  warning: { color: "#EF9F27", bg: "#fff5e1", icon: "ti-alert-triangle" },
  error:   { color: "#c0392b", bg: "#ffe5e5", icon: "ti-alert-circle" },
};

let toastCounter = 0;

function ensureContainer() {
  if (typeof window === "undefined") return null;
  let c = document.getElementById("av-toast-container");
  if (!c) {
    c = document.createElement("div");
    c.id = "av-toast-container";
    Object.assign(c.style, {
      position: "fixed",
      top: "76px",
      right: "20px",
      zIndex: "9999",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      pointerEvents: "none",
      maxWidth: "380px",
      width: "calc(100vw - 40px)",
    });
    document.body.appendChild(c);
  }
  return c;
}

function removeToast(toast) {
  toast.style.transform = "translateX(110%)";
  toast.style.opacity = "0";
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 280);
}

/**
 * Affiche un toast.
 * @param {object} opts
 * @param {"success"|"info"|"warning"|"error"} opts.type
 * @param {string} opts.title
 * @param {string} [opts.message]
 * @param {number} [opts.duration] — durée en ms (default 4000, 0 = pas auto-dismiss)
 * @param {string} [opts.actionLabel]
 * @param {Function} [opts.onAction]
 */
export function showToast({ type = "info", title, message, duration = 4000, actionLabel, onAction }) {
  const container = ensureContainer();
  if (!container) return;

  const cfg = TOAST_TYPES[type] || TOAST_TYPES.info;
  const id = `av-toast-${++toastCounter}`;

  // Escape user content
  function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const toast = document.createElement("div");
  toast.id = id;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");

  Object.assign(toast.style, {
    background: "#fff",
    border: `1px solid ${cfg.color}30`,
    borderLeft: `4px solid ${cfg.color}`,
    borderRadius: "12px",
    padding: "12px 14px",
    boxShadow: "0 10px 25px rgba(20, 33, 49, 0.15), 0 4px 8px rgba(20, 33, 49, 0.08)",
    fontSize: "13.5px",
    fontFamily: "var(--font-quicksand), 'Quicksand', 'Segoe UI', sans-serif",
    color: "var(--av-navy)",
    pointerEvents: "auto",
    transform: "translateX(110%)",
    opacity: "0",
    transition: "transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms",
  });

  toast.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:11px;">
      <div style="
        flex-shrink:0;
        width:32px;height:32px;
        background:${cfg.bg};
        border-radius:8px;
        display:flex;align-items:center;justify-content:center;
      ">
        <i class="ti ${cfg.icon}" style="color:${cfg.color};font-size:18px;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;color:var(--av-navy);font-size:13.5px;line-height:1.3;margin-bottom:${message ? "3px" : "0"};">
          ${escapeHtml(title)}
        </div>
        ${message ? `<div style="color:var(--av-g700);font-size:12.5px;line-height:1.45;">${escapeHtml(message)}</div>` : ""}
        ${actionLabel ? `
          <button data-toast-action style="
            margin-top:8px;
            background:transparent;
            color:${cfg.color};
            border:none;
            padding:0;
            font-weight:600;
            font-size:12.5px;
            cursor:pointer;
            text-decoration:underline;
          ">${escapeHtml(actionLabel)}</button>
        ` : ""}
      </div>
      <button data-toast-close style="
        flex-shrink:0;
        background:transparent;border:none;
        color:var(--av-g500);cursor:pointer;
        padding:0;width:22px;height:22px;
        display:flex;align-items:center;justify-content:center;
        border-radius:4px;
        transition:background 120ms;
      " aria-label="Fermer">
        <i class="ti ti-x" style="font-size:14px;"></i>
      </button>
    </div>
  `;

  container.appendChild(toast);

  // Listener fermeture
  const closeBtn = toast.querySelector("[data-toast-close]");
  closeBtn.addEventListener("click", () => removeToast(toast));
  closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "var(--av-g100)"; });
  closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = "transparent"; });

  // Listener action si présent
  if (actionLabel && onAction) {
    const actionBtn = toast.querySelector("[data-toast-action]");
    if (actionBtn) {
      actionBtn.addEventListener("click", () => {
        try { onAction(); } catch {}
        removeToast(toast);
      });
    }
  }

  // Slide-in animation
  requestAnimationFrame(() => {
    toast.style.transform = "translateX(0)";
    toast.style.opacity = "1";
  });

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }

  return id;
}

// Helpers shortcuts
export const toast = {
  success: (title, message, opts) => showToast({ type: "success", title, message, ...opts }),
  info:    (title, message, opts) => showToast({ type: "info", title, message, ...opts }),
  warning: (title, message, opts) => showToast({ type: "warning", title, message, ...opts }),
  error:   (title, message, opts) => showToast({ type: "error", title, message, ...opts }),
};
