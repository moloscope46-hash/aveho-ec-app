// =============================================================
//  Helper Events (Alpha 0.4)
//  Centralise la trace d'audit ET la création de notifications.
//  Toute action significative dans l'app appelle logEvent() une seule fois ;
//  ce helper se charge ensuite :
//    - d'insérer une ligne dans audit_log
//    - de créer une notification le cas échéant (selon le type d'action)
//
//  Usage type dans une page :
//    import { logEvent } from "../../lib/events";
//    await logEvent(supabase, auth, {
//      action: "creer", entite: "transfert", entite_id: t.id,
//      titre: "Transfert créé", message: `Transfert ${t.numero} en attente.`,
//      lien: "/transferts", notif: true
//    });
// =============================================================

import { logger } from "./logger";

/**
 * Enregistre une action et, si demandé, crée une notification.
 *
 * @param {object} supabase - client Supabase
 * @param {object} auth - contexte useAuth (structureId, etabId, user)
 * @param {object} ev - { action, entite, entite_id?, details?, titre?, message?, lien?, notif?, notifType? }
 */
/**
 * Pose un événement (= 1 ligne audit_log + 0..N lignes notifications).
 * @param {object} ev - { action, entite, entite_id?, details?, titre?, message?, lien?, notif?, notifType? }
 */
export async function logEvent(supabase, auth, ev) {
  if (!auth?.structureId || !auth?.user?.id) return;

  // 1) audit log (immutable, toujours posé)
  // 0.58.24 : on attrape silencieusement le 403 si la RLS n'est pas configurée
  // (cf. scripts/SQL-FIX-audit_log-rls-0.58.24.sql à exécuter en base).
  // L'audit log n'est pas critique pour l'UX — on log juste un warn discret.
  try {
    const { error } = await supabase.from("audit_log").insert({
      structure_id: auth.structureId,
      etablissement_id: auth.etabId || null,
      user_id: auth.user.id,
      user_email: auth.user.email || null,
      action: ev.action,
      entite: ev.entite,
      entite_id: ev.entite_id || null,
      details: ev.details || null,
    });
    if (error) {
      // Spécifiquement pour 403 RLS : log discret (warn) sans stack trace
      if (error.code === "42501" || /forbidden|policy|RLS/i.test(error.message || "")) {
        // RLS pas configurée — message diagnostic doux
        if (typeof window !== "undefined" && !window._audit_log_warned_) {
          window._audit_log_warned_ = true;
          console.warn("[audit_log] RLS bloque les inserts. Exécutez scripts/SQL-FIX-audit_log-rls-0.58.24.sql en base.");
        }
      } else {
        logger.warn("logEvent - audit échoué :", error.message);
      }
    }
  } catch (e) {
    logger.warn("logEvent - audit exception :", e?.message || e);
  }

  // 2) notification (optionnelle, ev.notif === true ou notif explicite)
  if (ev.notif === true || ev.notifType) {
    const titre = ev.titre || defaultTitre(ev);
    const message = ev.message || null;
    const lien = ev.lien || null;
    try {
      await supabase.from("notifications").insert({
        structure_id: auth.structureId,
        // user_id null = pour tous les membres de la collectivité
        // pour cibler quelqu'un précis : ev.notifUserId
        user_id: ev.notifUserId || null,
        type: ev.notifType || mapNotifType(ev.entite),
        titre,
        message,
        lien,
      });
    } catch (e) {
      logger.warn("logEvent - notif échouée :", e);
    }

    // Alpha 0.17.1 : relais vers push VAPID et webhooks Teams/Slack
    // Alpha 0.33.0 : relais vers send-email (filtrage par prefs email_X opt-in)
    // En silencieux : on n'attend pas la réponse, on ne plante pas si pas configuré.
    if (ev.push || ev.webhook || ev.notif === true) {
      const eventType = mapEventType(ev);
      // Push VAPID (fire-and-forget)
      // Alpha 0.20.0 : event_type transmis pour le tag de regroupement côté SW
      supabase.functions.invoke("send-push", {
        body: {
          structure_id: auth.structureId,
          target_user_id: ev.notifUserId || null,
          title: titre,
          body: message || titre,
          url: lien || "/accueil",
          event_type: eventType,
          tag: eventType,
        },
      }).catch((e) => logger.warn("send-push:", e?.message));

      // Webhook Teams/Slack (fire-and-forget)
      supabase.functions.invoke("send-webhook", {
        body: {
          structure_id: auth.structureId,
          event_type: eventType,
          title: titre,
          message: message || titre,
          url: lien ? (typeof window !== "undefined" ? window.location.origin + lien : lien) : null,
          fields: ev.details || {},
        },
      }).catch((e) => logger.warn("send-webhook:", e?.message));

      // Alpha 0.33.0 : Email Resend (fire-and-forget, opt-in dans prefs user)
      // Le filtrage est fait côté Edge Function : si email_{eventType} != true → pas d'envoi.
      // Skip si ev.skipEmail explicite (ex: pour les hot reload / events de masse silencieux)
      if (!ev.skipEmail) {
        // event_type pour les prefs : mappé sur les catégories de NotificationPreferences
        const emailEventType = mapEmailEventType(ev);
        const ctaUrl = lien && typeof window !== "undefined"
          ? `${window.location.origin}${lien}`
          : null;
        supabase.functions.invoke("send-email", {
          body: {
            structure_id: auth.structureId,
            target_user_id: ev.notifUserId || null,
            event_type: emailEventType,
            subject: titre,
            body_html: buildEmailBody(ev, titre, message),
            body_text: message || titre,
            cta_label: ctaUrl ? "Voir dans Aveho" : null,
            cta_url: ctaUrl,
          },
        }).catch((e) => logger.warn("send-email:", e?.message));
      }
    }
  }
}

// Alpha 0.33.0 : mapping vers les catégories de NotificationPreferences (0.29).
// Doit correspondre aux clés "di", "achat", "transfert", "signalement",
// "maintenance", "consent_a_renouveler", "consent_auto_archive".
// → Stockées en prefs sous email_di, email_achat, etc.
export function mapEmailEventType(ev) {
  if (ev.entite === "intervention" || ev.notifType === "di") return "di";
  if (ev.entite === "achat") return "achat";
  if (ev.entite === "transfert") return "transfert";
  if (ev.entite === "signalement") return "signalement";
  if (ev.entite === "maintenance") return "maintenance";
  if (ev.entite === "consentement") return "consent_a_renouveler";
  return "autre";
}

// Alpha 0.33.0 : génère un body HTML simple à partir des champs ev
function buildEmailBody(ev, titre, message) {
  const lines = [];
  if (message && message !== titre) {
    lines.push(`<p>${escapeHtml(message)}</p>`);
  }
  // Détails additionnels (numéro, statut, etc.) en mini-tableau
  if (ev.details && typeof ev.details === "object") {
    const rows = [];
    for (const [k, v] of Object.entries(ev.details)) {
      if (v === null || v === undefined || v === "") continue;
      const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      rows.push(`<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e3e9ee;color:#6c7a89;font-size:13px;">${escapeHtml(label)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e3e9ee;color:#142131;font-size:13px;font-weight:600;">${escapeHtml(String(v))}</td>
      </tr>`);
    }
    if (rows.length > 0) {
      lines.push(`<table style="width:100%;border-collapse:collapse;margin-top:14px;background:#f8fafc;border-radius:8px;overflow:hidden;">${rows.join("")}</table>`);
    }
  }
  return lines.join("") || `<p>${escapeHtml(titre)}</p>`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Mapper entite -> type de notif (pour l'icône cloche)
export function mapNotifType(entite) {
  const m = {
    transfert: "transfert", di: "di", intervention: "di",
    invitation: "invitation", commande: "commande",
    patient: "systeme", materiel: "systeme", article: "systeme",
  };
  return m[entite] || "systeme";
}

// Alpha 0.17.1 : Mapper l'événement vers le filtre webhook
// Sert à Edge Function send-webhook pour respecter structures.webhook_filters
export function mapEventType(ev) {
  if (ev.notifType === "di" || ev.entite === "intervention") return "di_urgente";
  if (ev.entite === "achat") return "achat_a_valider";
  if (ev.entite === "signalement") return "signalement";
  return ev.notifType || "autre";
}

export function defaultTitre(ev) {
  const verbe = { creer: "créé", modifier: "modifié", supprimer: "supprimé", valider: "validé", recevoir: "reçu", inviter: "invité" }[ev.action] || ev.action;
  return `${ev.entite.charAt(0).toUpperCase() + ev.entite.slice(1)} ${verbe}`;
}
