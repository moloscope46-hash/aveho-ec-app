// =============================================================
//  lib/honeypot.js (Alpha 0.57.38)
//
//  Honeypot anti-bot pour les formulaires PUBLICS (login, inscription).
//  Les bots automatisés remplissent typiquement TOUS les champs d'un formulaire,
//  y compris les champs cachés. En ajoutant un champ piège invisible pour
//  les humains, on détecte les bots.
//
//  Stratégie :
//   1. Champ caché avec un nom plausible (website, url, fax)
//   2. Style display:none + aria-hidden + tabIndex=-1 + autocomplete=off
//   3. Si rempli côté serveur → c'est un bot, on rejette
//   4. Optionnel : log dans audit_log pour analyse
//
//  Différencié du captcha :
//   - Pas de friction pour les humains (invisibles)
//   - Pas de dépendance externe (vs reCAPTCHA Google)
//   - Léger en bande passante
//
//  Limites :
//   - Ne stoppe que les bots NAÏFS (qui remplissent tout aveuglément)
//   - Les bots sophistiqués lisent le CSS et skipent les champs display:none
//     → pour ceux-là, captcha ou rate-limit serveur reste nécessaire
// =============================================================

import { useState } from "react";

/**
 * Nom des champs honeypot disponibles (rotation possible).
 * On utilise des noms plausibles pour ne pas éveiller les soupçons des bots qui
 * regardent la liste de champs avant de remplir.
 */
export const HONEYPOT_FIELD_NAMES = Object.freeze([
  "website_url",
  "company_fax",
  "extra_phone",
  "secondary_email",
]);

/**
 * Hook React qui retourne :
 *  - { honeypotProps }: à étaler sur le <input> caché
 *  - isBot: function () => boolean (true si rempli côté client)
 *  - getHoneypotValue: function pour récupérer la valeur (pour audit/log)
 *
 * Usage type :
 *   const { honeypotProps, isBot } = useHoneypot();
 *
 *   async function submit() {
 *     if (isBot()) {
 *       // Bot détecté : on log + on simule un délai + on retourne erreur générique
 *       await new Promise((r) => setTimeout(r, 800));
 *       setErr("Erreur inattendue. Réessaie.");
 *       return;
 *     }
 *     // ... flow normal
 *   }
 *
 *   return (
 *     <form>
 *       <input {...honeypotProps} />
 *       ... vrais champs ...
 *     </form>
 *   );
 */
export function useHoneypot(fieldName = HONEYPOT_FIELD_NAMES[0]) {
  const [value, setValue] = useState("");

  const honeypotProps = {
    type: "text",
    name: fieldName,
    value,
    onChange: (e) => setValue(e.target.value),
    // Invisible pour les humains
    style: {
      position: "absolute",
      left: "-9999px",
      width: "1px",
      height: "1px",
      opacity: 0,
      pointerEvents: "none",
    },
    tabIndex: -1,
    autoComplete: "off",
    "aria-hidden": "true",
  };

  return {
    honeypotProps,
    isBot: () => value.length > 0,
    getHoneypotValue: () => value,
    fieldName,
  };
}

/**
 * Helper pour les formulaires HTML pur (non-React).
 * Retourne le markup HTML d'un champ honeypot.
 *
 * @param {string} name — nom du champ
 * @returns {string} HTML à insérer
 */
export function getHoneypotHtml(name = HONEYPOT_FIELD_NAMES[0]) {
  return `<input type="text" name="${name}" value="" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;" />`;
}

/**
 * Helper côté serveur (API routes) : extrait la valeur du honeypot
 * du body et détermine si bot.
 *
 * @param {object} body — req.body
 * @param {string|string[]} fieldNames — noms à checker (défaut : tous)
 * @returns {boolean} true si bot détecté
 */
export function detectBotFromBody(body, fieldNames = HONEYPOT_FIELD_NAMES) {
  if (!body || typeof body !== "object") return false;
  const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
  return names.some((name) => {
    const val = body[name];
    return val !== undefined && val !== null && String(val).trim().length > 0;
  });
}
