// =============================================================
//  Helpers RGPD — Alpha 0.21.0
//  - Template du consentement (générique santé à domicile)
//  - Hash SHA-256 de la signature pour intégrité
//  - Liste des finalités cochables
// =============================================================

export const VERSION_TEMPLATE = "1.0";

// Liste des finalités proposées au consentement.
// Chacune a une clé courte (stockée en base) et un libellé long.
export const FINALITES = [
  {
    k: "soins",
    l: "Suivi médical et soins à domicile",
    d: "Gestion du dossier de soins, suivi des interventions, échanges avec les professionnels de santé impliqués."
  },
  {
    k: "materiel",
    l: "Gestion du matériel médical mis à disposition",
    d: "Suivi du matériel (lits, perfusion, oxygénothérapie, etc.) loué ou livré, maintenances, retours."
  },
  {
    k: "facturation",
    l: "Facturation et tiers payant",
    d: "Émission des factures, télétransmission à la Sécurité Sociale et aux mutuelles."
  },
  {
    k: "amelioration",
    l: "Amélioration de la qualité du service",
    d: "Analyse statistique anonymisée, enquêtes de satisfaction, audit interne."
  },
  {
    k: "communication",
    l: "Communication par email/SMS (optionnel)",
    d: "Rappels de RDV, informations sur la prise en charge, retours d'enquête. Désinscription possible à tout moment."
  },
];

// Template du consentement (markdown léger, transformé en HTML à l'affichage)
// Variables remplacées dynamiquement : {{patient_nom_prenom}}, {{etablissement_nom}}, etc.
export const TEMPLATE_CONSENTEMENT = `
**FORMULAIRE DE CONSENTEMENT À LA COLLECTE ET AU TRAITEMENT DES DONNÉES PERSONNELLES**

Conformément au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679) et à la loi Informatique et Libertés modifiée.

---

**RESPONSABLE DU TRAITEMENT**

{{collectivite_nom}}{{etablissement_nom_block}}

**PERSONNE CONCERNÉE**

{{patient_nom_prenom}}{{patient_naissance_block}}{{patient_dossier_block}}

---

**1. NATURE DES DONNÉES COLLECTÉES**

Dans le cadre de votre prise en charge à domicile, nous collectons et traitons les données suivantes :
- Données d'identification (nom, prénom, date de naissance, coordonnées)
- Données de santé strictement nécessaires à la prise en charge
- Données administratives (numéro de Sécurité Sociale, mutuelle, médecin traitant)
- Données techniques liées au matériel mis à disposition

**2. FINALITÉS DU TRAITEMENT**

Les finalités du traitement, pour lesquelles vous donnez votre consentement éclairé ci-dessous, sont :

{{finalites_block}}

**3. BASE LÉGALE**

Le traitement est fondé sur :
- Votre consentement éclairé pour les finalités optionnelles (communication)
- L'exécution du contrat de soins pour les finalités essentielles (soins, matériel, facturation)
- Une obligation légale pour la facturation et la conservation des dossiers médicaux

**4. DESTINATAIRES**

Vos données peuvent être transmises à :
- Le personnel soignant et administratif de {{collectivite_nom}} habilité
- Les professionnels de santé impliqués dans votre prise en charge (médecin traitant, IDE, kinésithérapeute, etc.)
- Les organismes de Sécurité Sociale et votre mutuelle (pour la facturation uniquement)
- Les autorités sanitaires en cas d'obligation légale

Vos données ne sont jamais cédées ni vendues à des tiers à des fins commerciales.

**5. DURÉE DE CONSERVATION**

- Dossier médical : 20 ans à compter de la fin de prise en charge (obligation légale)
- Données de facturation : 10 ans (obligation légale)
- Données de communication : jusqu'à votre désinscription ou 3 ans après la dernière interaction

**6. VOS DROITS**

Vous disposez à tout moment des droits suivants :
- **Droit d'accès** : connaître les données détenues à votre sujet
- **Droit de rectification** : corriger des données inexactes
- **Droit à l'effacement** : dans les limites des obligations légales
- **Droit à la limitation** du traitement
- **Droit d'opposition** au traitement pour motif légitime
- **Droit à la portabilité** : récupérer vos données dans un format lisible
- **Droit de retrait** du consentement à tout moment

Pour exercer ces droits, contactez le délégué à la protection des données (DPO) de {{collectivite_nom}} ou écrivez à l'établissement.

**7. RÉCLAMATION**

En cas de difficulté, vous pouvez introduire une réclamation auprès de la **CNIL** (Commission Nationale de l'Informatique et des Libertés) : www.cnil.fr

---

**SIGNATURE**

Je soussigné(e) **{{patient_nom_prenom}}**{{patient_naissance_block_signature}}, déclare avoir pris connaissance du présent document et **accepter** la collecte et le traitement de mes données personnelles pour les finalités cochées ci-dessus.

Fait le {{date_signature}}.
`;

// Remplace les placeholders dans le template
export function renderConsentement(template, vars) {
  let out = template;
  // Remplacements simples
  out = out.replace(/\{\{patient_nom_prenom\}\}/g, vars.patient_nom_prenom || "—");
  out = out.replace(/\{\{collectivite_nom\}\}/g, vars.collectivite_nom || "—");
  out = out.replace(/\{\{date_signature\}\}/g, vars.date_signature || new Date().toLocaleDateString("fr-FR"));

  // Blocs optionnels selon les données disponibles
  out = out.replace(/\{\{etablissement_nom_block\}\}/g,
    vars.etablissement_nom ? ` — ${vars.etablissement_nom}` : "");
  out = out.replace(/\{\{patient_naissance_block\}\}/g,
    vars.patient_date_naissance ? `, né(e) le ${new Date(vars.patient_date_naissance).toLocaleDateString("fr-FR")}` : "");
  out = out.replace(/\{\{patient_naissance_block_signature\}\}/g,
    vars.patient_date_naissance ? `, né(e) le ${new Date(vars.patient_date_naissance).toLocaleDateString("fr-FR")}` : "");
  out = out.replace(/\{\{patient_dossier_block\}\}/g,
    vars.patient_numero_dossier ? `, dossier n° ${vars.patient_numero_dossier}` : "");

  // Bloc finalités (liste à puces des cochées + non cochées en gris)
  const fin = (vars.finalites_acceptees || []);
  const finalitesText = FINALITES.map((f) => {
    const coche = fin.includes(f.k) ? "✓" : "☐";
    return `${coche} **${f.l}**\n   ${f.d}`;
  }).join("\n\n");
  out = out.replace(/\{\{finalites_block\}\}/g, finalitesText);

  // Alpha 0.40.0 : variables custom de la structure
  if (Array.isArray(vars.custom_vars)) {
    vars.custom_vars.forEach((cv) => {
      if (!cv?.key) return;
      // Échapper la clé pour le regex (au cas où)
      const safeKey = cv.key.replace(/[^a-z_]/g, "");
      if (!safeKey) return;
      const re = new RegExp(`\\{\\{${safeKey}\\}\\}`, "g");
      out = out.replace(re, cv.value || "—");
    });
  }

  return out;
}

// Transforme le markdown léger en HTML pour l'affichage
export function consentementToHtml(md) {
  let html = md;
  // Échapper HTML d'abord
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Gras **xx**
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Séparateurs ---
  html = html.replace(/^---$/gm, "<hr />");
  // Listes - xxx
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  // Sauts de ligne doubles -> paragraphes
  html = html.split(/\n\n+/).map((p) => p.trim().startsWith("<") ? p : `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("\n");
  return html;
}

// Hash SHA-256 d'un blob (image) pour garantir l'intégrité
// Utilise Web Crypto API native
export async function hashBlob(blob) {
  const buffer = await blob.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Détection device type pour métadonnées
export function detectDeviceType() {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua) || (ua.includes("android") && !ua.includes("mobile"))) {
    return "tablette";
  }
  if (/iphone|ipod|android.*mobile|windows phone|blackberry/.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

// =============================================================
//  Alpha 0.34.0 : Chargement du template depuis BDD
// =============================================================

/**
 * Charge le template actif pour une structure (+ éventuellement un établissement) 
 * depuis la vue v_consent_template_actif.
 * 
 * Alpha 0.42.0 : priorité etablissement > structure > hardcode.
 * La vue résout automatiquement la priorité ; le front passe juste les 2 IDs.
 * Si etablissementId est null, la vue renvoie le template global structure.
 *
 * @param {object} supabase — client Supabase
 * @param {string} structureId
 * @param {string|null} etablissementId — optionnel, pour template etab-spécifique
 * @returns {Promise<{id: string|null, version: string, contenu_md: string, nom: string|null}>}
 */
export async function loadActiveTemplate(supabase, structureId, etablissementId = null) {
  if (!structureId) {
    return { id: null, version: VERSION_TEMPLATE, contenu_md: TEMPLATE_CONSENTEMENT, nom: "Template par défaut (code)" };
  }
  try {
    let q = supabase
      .from("v_consent_template_actif")
      .select("template_id, version, contenu_md, nom")
      .eq("structure_id", structureId);
    // Alpha 0.42.0 : filtre etab-spécifique si fourni, sinon ligne NULL (template global)
    if (etablissementId) {
      q = q.eq("etablissement_id", etablissementId);
    } else {
      q = q.is("etablissement_id", null);
    }
    const { data, error } = await q.maybeSingle();
    if (error || !data) {
      // Fallback : template hardcodé
      return { id: null, version: VERSION_TEMPLATE, contenu_md: TEMPLATE_CONSENTEMENT, nom: "Template par défaut (code)" };
    }
    return {
      id: data.template_id,
      version: data.version,
      contenu_md: data.contenu_md,
      nom: data.nom,
    };
  } catch (e) {
    console.warn("loadActiveTemplate:", e?.message);
    return { id: null, version: VERSION_TEMPLATE, contenu_md: TEMPLATE_CONSENTEMENT, nom: "Template par défaut (code)" };
  }
}

/**
 * Variables disponibles dans les templates (avec description et exemple).
 * Affichées dans l'éditeur pour aider l'utilisateur.
 */
export const TEMPLATE_VARIABLES = [
  { key: "patient_nom_prenom", label: "Nom + prénom du patient", example: "Dupont Marie" },
  { key: "patient_naissance_block", label: "Bloc date de naissance (si fourni)", example: ", né(e) le 12/03/1958" },
  { key: "patient_dossier_block", label: "Bloc numéro de dossier (si fourni)", example: ", dossier n° D-2026-042" },
  { key: "patient_naissance_block_signature", label: "Bloc date de naissance dans la signature", example: ", né(e) le 12/03/1958" },
  { key: "collectivite_nom", label: "Nom de la collectivité", example: "Aveho Soft & Services" },
  { key: "etablissement_nom_block", label: "Bloc nom de l'établissement (si rattaché)", example: " — Hôpital Cédric" },
  { key: "date_signature", label: "Date de signature (auto)", example: "31/05/2026" },
  { key: "finalites_block", label: "Liste des finalités avec coches", example: "✓ Suivi médical et soins à domicile\n   ..." },
];

/**
 * Valide qu'un template contient bien les variables essentielles
 * (signature, nom patient, etc.). Renvoie un tableau d'avertissements.
 *
 * Alpha 0.40.0 : accepte une liste de variables custom de la structure
 * (clés string → nom de la variable accepté sans warning).
 */
export function validateTemplate(contenu_md, customVarKeys = []) {
  const warnings = [];
  const required = ["patient_nom_prenom", "date_signature", "finalites_block"];
  required.forEach((v) => {
    if (!contenu_md.includes(`{{${v}}}`)) {
      warnings.push(`Variable manquante : {{${v}}} — recommandée pour la validité juridique`);
    }
  });
  // Variables inconnues (typo) — exclut les variables custom de la structure
  const knownKeys = [...TEMPLATE_VARIABLES.map((v) => v.key), ...customVarKeys];
  const matches = contenu_md.match(/\{\{([a-z_]+)\}\}/g) || [];
  const unknown = matches
    .map((m) => m.replace(/[{}]/g, ""))
    .filter((k) => !knownKeys.includes(k));
  const uniqueUnknown = [...new Set(unknown)];
  uniqueUnknown.forEach((k) => {
    warnings.push(`Variable inconnue : {{${k}}} — ne sera pas remplacée (typo ?)`);
  });
  return warnings;
}

/**
 * Alpha 0.40.0 : charge les variables custom définies pour la structure
 * Stocké dans structures.parametres.rgpd_custom_vars (jsonb array)
 * Format : [{ key: "partenaire_nom", label: "...", value: "...", example: "..." }]
 */
export async function loadCustomVariables(supabase, structureId) {
  if (!structureId) return [];
  try {
    const { data } = await supabase
      .from("structures")
      .select("parametres")
      .eq("id", structureId)
      .maybeSingle();
    const params = data?.parametres || {};
    const custom = params.rgpd_custom_vars;
    if (!Array.isArray(custom)) return [];
    return custom.filter((v) => v && typeof v.key === "string" && /^[a-z_]+$/.test(v.key));
  } catch (e) {
    console.warn("loadCustomVariables:", e?.message);
    return [];
  }
}

/**
 * Alpha 0.40.0 : enregistre la liste des variables custom
 */
export async function saveCustomVariables(supabase, structureId, variables) {
  if (!structureId) return false;
  // Valider chaque variable
  const cleaned = (variables || [])
    .filter((v) => v && v.key && /^[a-z_]+$/.test(v.key))
    .map((v) => ({
      key: v.key,
      label: v.label || v.key,
      value: v.value || "",
      example: v.example || v.value || "",
    }));
  // Récupérer parametres existant
  const { data: row } = await supabase
    .from("structures")
    .select("parametres")
    .eq("id", structureId)
    .maybeSingle();
  const params = row?.parametres || {};
  params.rgpd_custom_vars = cleaned;
  const { error } = await supabase
    .from("structures")
    .update({ parametres: params })
    .eq("id", structureId);
  return !error;
}

/**
 * Génère un numéro de version semver-like simple :
 *   1.0 → 1.1 → 1.2 ... → 2.0 (à la main si refonte)
 *
 * @param {string} latestVersion — ex: "1.3"
 * @returns {string} ex: "1.4"
 */
export function nextVersion(latestVersion) {
  if (!latestVersion) return "1.0";
  const match = latestVersion.match(/^(\d+)\.(\d+)$/);
  if (!match) return "1.0";
  const [, major, minor] = match;
  return `${major}.${parseInt(minor) + 1}`;
}
