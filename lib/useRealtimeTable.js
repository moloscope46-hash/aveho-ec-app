"use client";
// =============================================================
//  useRealtimeTable — Hook Supabase Realtime réutilisable
//  Alpha 0.44.0
//
//  Subscribe aux INSERT/UPDATE d'une table filtrée par structure_id.
//  Déclenche un toast in-app + un callback optionnel.
//
//  Pattern éprouvé en 0.43 sur NotifBell, généralisé pour DI, signalements, achats.
// =============================================================
import { useEffect, useRef } from "react";
import { createClient } from "./supabase";

/**
 * Subscribe à une table Supabase avec Realtime.
 *
 * @param {object} options
 * @param {string} options.table       — nom de la table (ex: "interventions")
 * @param {string} options.structureId — filtre RLS côté backend
 * @param {string} options.event       — "INSERT" | "UPDATE" | "*" (défaut: "INSERT")
 * @param {function} options.onInsert  — callback (row) à chaque INSERT
 * @param {function} options.onUpdate  — callback (row) à chaque UPDATE
 * @param {boolean} options.enabled    — false pour désactiver (défaut: true)
 */
export function useRealtimeTable({
  table,
  structureId,
  event = "INSERT",
  onInsert,
  onUpdate,
  enabled = true,
}) {
  const supabase = createClient();
  const cbRef = useRef({ onInsert, onUpdate });
  // Garder les callbacks à jour sans recréer la subscription
  useEffect(() => {
    cbRef.current = { onInsert, onUpdate };
  }, [onInsert, onUpdate]);

  useEffect(() => {
    if (!enabled || !structureId || !table) return;
    const channelName = `realtime:${table}:${structureId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          filter: `structure_id=eq.${structureId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && cbRef.current.onInsert) {
            cbRef.current.onInsert(payload.new);
          } else if (payload.eventType === "UPDATE" && cbRef.current.onUpdate) {
            cbRef.current.onUpdate(payload.new, payload.old);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, structureId, event, enabled]);
}

/**
 * Affiche un toast in-app simple (alternative au native Notification API).
 * Compose un élément flottant en bas à droite qui auto-disparaît.
 */
let toastContainer = null;
function ensureToastContainer() {
  if (typeof window === "undefined") return null;
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
  toastContainer = document.createElement("div");
  toastContainer.id = "aveho-toast-container";
  toastContainer.setAttribute("aria-live", "polite");
  toastContainer.setAttribute("aria-atomic", "true");
  Object.assign(toastContainer.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "9999",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxWidth: "320px",
    pointerEvents: "none",
  });
  document.body.appendChild(toastContainer);
  return toastContainer;
}

// 0.57.34 : helper escape pour empêcher XSS dans les toasts realtime
// Avant : `toast.innerHTML = ...${title}...${message}...` injectait du HTML user
// → Si user A créait une intervention avec titre `<img src=x onerror=alert(1)>`,
//   user B subissait du XSS quand le toast realtime arrivait
function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Whitelist des classes d'icône Tabler pour éviter `icon="ti-..."` malicieux
// (en pratique appelé en interne avec des constantes, mais defense-in-depth)
function safeIconClass(icon) {
  if (typeof icon !== "string") return "ti-bell";
  if (!/^ti-[a-z0-9-]{1,40}$/.test(icon)) return "ti-bell";
  return icon;
}

// Whitelist couleur hex (3 ou 6 chars + #) — defense-in-depth contre injection CSS
function safeColor(color) {
  if (typeof color !== "string") return "#185FA5";
  if (!/^#[0-9a-fA-F]{3,6}$/.test(color)) return "#185FA5";
  return color;
}

export function showRealtimeToast({ title, message, color = "#185FA5", icon = "ti-bell", duration = 5000 }) {
  if (typeof window === "undefined") return;
  const container = ensureToastContainer();
  if (!container) return;

  // 0.57.34 : sanitize tous les inputs avant injection (anti-XSS)
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeColorVal = safeColor(color);
  const safeIcon = safeIconClass(icon);

  const toast = document.createElement("div");
  toast.setAttribute("role", "status");
  Object.assign(toast.style, {
    background: "#fff",
    border: `1px solid ${safeColorVal}44`,
    borderLeft: `4px solid ${safeColorVal}`,
    borderRadius: "8px",
    padding: "12px 14px",
    boxShadow: "0 4px 16px rgba(20, 33, 49, 0.15)",
    fontSize: "13px",
    fontFamily: "Segoe UI, Quicksand, Helvetica, Arial, sans-serif",
    color: "#142131",
    pointerEvents: "auto",
    transform: "translateX(120%)",
    transition: "transform .3s ease-out, opacity .3s",
    opacity: "0",
  });
  toast.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 10px;">
      <i class="ti ${safeIcon}" style="color: ${safeColorVal}; font-size: 18px; flex-shrink: 0; margin-top: 1px;"></i>
      <div style="flex: 1;">
        <div style="font-weight: 700; color: ${safeColorVal}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px;">${safeTitle}</div>
        <div style="color: #2a3a48;">${safeMessage}</div>
      </div>
      <button style="background: transparent; border: none; color: #8a98a8; cursor: pointer; padding: 0; font-size: 16px; line-height: 1;" aria-label="Fermer">✕</button>
    </div>
  `;
  toast.querySelector("button").addEventListener("click", () => removeToast(toast));
  container.appendChild(toast);

  // Animation in
  requestAnimationFrame(() => {
    toast.style.transform = "translateX(0)";
    toast.style.opacity = "1";
  });

  // Auto remove
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.style.transform = "translateX(120%)";
  toast.style.opacity = "0";
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 300);
}
