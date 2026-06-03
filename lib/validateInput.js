// =============================================================
//  lib/validateInput.js (Alpha 0.57.25)
//
//  Mini-validator léger pour valider les body des routes API.
//  Pas de dépendance externe (alternative simplifiée à zod/joi).
//
//  Bénéfices sécurité :
//   - Refuse les body mal formés AVANT d'arriver à la BDD
//   - Empêche les injections via longueurs excessives (DoS)
//   - Empêche les UUIDs malformés (anti-IDOR via type confusion)
//   - Empêche les valeurs hors enum (anti-data corruption)
//
//  Usage :
//    const errors = validate(body, {
//      patient_id: { type: "uuid", required: true },
//      nom: { type: "string", maxLen: 100, required: true },
//      age: { type: "number", min: 0, max: 150 },
//      role: { type: "enum", values: ["admin", "user"] },
//    });
//    if (errors.length) return Response.json({ ok: false, errors }, { status: 400 });
// =============================================================

// Regex UUID v4 standard (Supabase + Postgres natif)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Regex email simple (pas RFC complète mais bloque les évidents)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Regex pour les codes postaux français (5 chiffres)
const CP_FR_RE = /^\d{5}$/;

// Regex pour FINESS (9 chiffres)
const FINESS_RE = /^\d{9}$/;

// Regex pour RPPS (11 chiffres)
const RPPS_RE = /^\d{11}$/;

// Regex pour SIRET (14 chiffres)
const SIRET_RE = /^\d{14}$/;

// Longueurs raisonnables par défaut (anti-DoS)
const DEFAULT_MAX_STRING_LEN = 10_000;        // 10 KB par champ string
const DEFAULT_MAX_ARRAY_LEN = 1_000;          // 1000 items par array

/**
 * Valide un body contre un schema simple.
 * @param {object} body - Le body à valider
 * @param {object} schema - Map field → rules
 * @returns {string[]} Tableau de messages d'erreur (vide = OK)
 */
export function validate(body, schema) {
  const errors = [];

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return ["Body doit être un objet JSON"];
  }

  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];
    const exists = value !== undefined && value !== null;

    // Required ?
    if (rules.required && !exists) {
      errors.push(`Champ '${field}' requis`);
      continue;
    }
    // Si pas obligatoire et absent → OK
    if (!exists) continue;

    // Validation par type
    switch (rules.type) {
      case "string":
        if (typeof value !== "string") {
          errors.push(`'${field}' doit être une string`);
          break;
        }
        const maxLen = rules.maxLen || DEFAULT_MAX_STRING_LEN;
        if (value.length > maxLen) {
          errors.push(`'${field}' trop long (max ${maxLen} caractères)`);
        }
        if (rules.minLen && value.length < rules.minLen) {
          errors.push(`'${field}' trop court (min ${rules.minLen} caractères)`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`'${field}' format invalide`);
        }
        break;

      case "number":
        if (typeof value !== "number" || isNaN(value)) {
          errors.push(`'${field}' doit être un nombre`);
          break;
        }
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`'${field}' inférieur à ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`'${field}' supérieur à ${rules.max}`);
        }
        if (rules.integer && !Number.isInteger(value)) {
          errors.push(`'${field}' doit être entier`);
        }
        break;

      case "boolean":
        if (typeof value !== "boolean") {
          errors.push(`'${field}' doit être un booléen`);
        }
        break;

      case "uuid":
        if (typeof value !== "string" || !UUID_RE.test(value)) {
          errors.push(`'${field}' doit être un UUID valide`);
        }
        break;

      case "email":
        if (typeof value !== "string" || !EMAIL_RE.test(value) || value.length > 254) {
          errors.push(`'${field}' doit être un email valide`);
        }
        break;

      case "cp_fr":
        if (typeof value !== "string" || !CP_FR_RE.test(value)) {
          errors.push(`'${field}' doit être un code postal français (5 chiffres)`);
        }
        break;

      case "finess":
        if (typeof value !== "string" || !FINESS_RE.test(value)) {
          errors.push(`'${field}' doit être un FINESS valide (9 chiffres)`);
        }
        break;

      case "rpps":
        if (typeof value !== "string" || !RPPS_RE.test(value)) {
          errors.push(`'${field}' doit être un RPPS valide (11 chiffres)`);
        }
        break;

      case "siret":
        if (typeof value !== "string" || !SIRET_RE.test(value)) {
          errors.push(`'${field}' doit être un SIRET valide (14 chiffres)`);
        }
        break;

      case "enum":
        if (!Array.isArray(rules.values) || !rules.values.includes(value)) {
          errors.push(`'${field}' doit être l'une des valeurs : ${(rules.values || []).join(", ")}`);
        }
        break;

      case "array":
        if (!Array.isArray(value)) {
          errors.push(`'${field}' doit être un array`);
          break;
        }
        const maxArrLen = rules.maxLen || DEFAULT_MAX_ARRAY_LEN;
        if (value.length > maxArrLen) {
          errors.push(`'${field}' trop d'éléments (max ${maxArrLen})`);
        }
        break;

      case "object":
        if (typeof value !== "object" || Array.isArray(value)) {
          errors.push(`'${field}' doit être un objet`);
        }
        break;

      // Pas de type spécifié → autorise tout (skip silencieux)
      default:
        break;
    }
  }

  return errors;
}

/**
 * Helper : renvoie un Response JSON 400 si validation échoue.
 * @param {object} body
 * @param {object} schema
 * @returns {Response|null} Response à retourner direct si erreur, null sinon
 */
export function validateOr400(body, schema) {
  const errors = validate(body, schema);
  if (errors.length > 0) {
    return Response.json(
      { ok: false, error: "Body invalide", details: errors },
      { status: 400 }
    );
  }
  return null;
}

// Export les regex au cas où on en a besoin ailleurs
export const REGEX = {
  UUID: UUID_RE,
  EMAIL: EMAIL_RE,
  CP_FR: CP_FR_RE,
  FINESS: FINESS_RE,
  RPPS: RPPS_RE,
  SIRET: SIRET_RE,
};

/**
 * 0.57.28 : Valide les query params d'une URL contre un schema.
 * Conversion automatique : string → number/boolean selon le type attendu.
 *
 * Usage dans une route GET :
 *   const url = new URL(req.url);
 *   const errors = validateQueryParams(url.searchParams, {
 *     limit: { type: "number", min: 1, max: 100, integer: true },
 *     q: { type: "string", maxLen: 200 },
 *   });
 *   if (errors.length > 0) return Response.json({ ok: false, errors }, { status: 400 });
 */
export function validateQueryParams(searchParams, schema) {
  // Construit un objet depuis URLSearchParams avec conversion de types
  const body = {};
  for (const [field, rules] of Object.entries(schema)) {
    const raw = searchParams.get(field);
    if (raw === null) continue;

    // Conversion auto selon le type attendu
    if (rules.type === "number") {
      const n = Number(raw);
      if (!isNaN(n)) body[field] = n;
      else body[field] = raw; // gardera l'erreur "doit être un nombre"
    } else if (rules.type === "boolean") {
      if (raw === "true" || raw === "1") body[field] = true;
      else if (raw === "false" || raw === "0") body[field] = false;
      else body[field] = raw; // gardera l'erreur
    } else {
      body[field] = raw;
    }
  }
  return validate(body, schema);
}

/**
 * 0.57.27 : Échappe les wildcards SQL (% et _) pour les requêtes ILIKE.
 *
 * Pourquoi ?
 *  - Supabase JS client échappe les valeurs (parameterized queries),
 *    donc PAS de risque de vraie SQL injection.
 *  - MAIS les caractères wildcards % et _ ne sont pas échappés.
 *  - Donc un user peut envoyer `prescripteur_nom = "%"` qui matche TOUT.
 *  - Ou `nom = "_"` qui matche n'importe quelle string d'1 caractère.
 *  - Risque : DoS (scan full table) + comportement inattendu pour le user.
 *
 * Usage :
 *   query = query.ilike("nom", `%${escapeIlike(input)}%`)
 */
export function escapeIlike(s) {
  if (typeof s !== "string") return s;
  // En Postgres, ESCAPE par défaut est '\', donc :
  //  - % devient \%
  //  - _ devient \_
  //  - \  devient \\  (pour ne pas casser l'échappement lui-même)
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
