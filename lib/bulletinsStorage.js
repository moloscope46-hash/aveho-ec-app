// =============================================================
//  lib/bulletinsStorage.js (Alpha 0.56.1 → 0.57.32)
//
//  Helpers pour le bucket Supabase "bulletins-scannes".
//  Chemin convention : {structure_id}/{patient_id}/{timestamp}-{filename}
//
//  0.57.32 : durcissement sécurité
//   - Validation UUID stricte structure_id / patient_id (anti path-traversal)
//   - MAX_FILE_SIZE 10 MB (anti-DoS)
//   - Whitelist MIME (image/jpeg, image/png, image/webp, image/gif, application/pdf)
// =============================================================

const BUCKET = "bulletins-scannes";

// 0.57.32 : limites + whitelist defense-in-depth
const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB
const ALLOWED_MIMES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Nettoie un nom de fichier pour le rendre safe en path Storage. */
function sanitizeFilename(name) {
  return (name || "bulletin.jpg")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/**
 * 0.57.32 : valide qu'un ID est un UUID strict.
 * Empêche path traversal via structure_id = "../other-structure" etc.
 */
function isValidUuid(id) {
  return typeof id === "string" && UUID_RE.test(id);
}

/** Construit le path Storage pour un patient donné. */
export function buildPath(structureId, patientId, originalFilename) {
  // 0.57.32 : validation stricte UUID
  if (!isValidUuid(structureId)) {
    throw new Error("structureId invalide (UUID requis)");
  }
  if (!isValidUuid(patientId)) {
    throw new Error("patientId invalide (UUID requis)");
  }
  const ts = Date.now();
  const safe = sanitizeFilename(originalFilename);
  return `${structureId}/${patientId}/${ts}-${safe}`;
}

/**
 * Upload un fichier dans le bucket bulletins-scannes.
 * Retourne { path, error, size_kb, mime }.
 */
export async function uploadBulletin(supabase, file, { structureId, patientId }) {
  if (!file) return { error: "Fichier manquant" };
  if (!structureId || !patientId) return { error: "structureId et patientId requis" };

  // 0.57.32 : validation UUID stricte (defense-in-depth)
  if (!isValidUuid(structureId)) return { error: "structureId invalide (UUID requis)" };
  if (!isValidUuid(patientId)) return { error: "patientId invalide (UUID requis)" };

  // 0.57.32 : limite taille (anti-DoS + protection facturation Supabase)
  if (file.size > MAX_FILE_SIZE) {
    return { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` };
  }

  // 0.57.32 : whitelist MIME (empêche upload HTML/JS/exécutables)
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIMES.includes(mime)) {
    return { error: `Type de fichier non supporté : ${mime}. Autorisés : ${ALLOWED_MIMES.join(", ")}` };
  }

  const path = buildPath(structureId, patientId, file.name);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: mime,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) return { error: error.message || "Upload échoué" };

  return {
    path,
    size_kb: Math.round(file.size / 1024),
    mime,
  };
}

/**
 * Génère une URL signée pour afficher un bulletin (expire en N secondes).
 * Privé : on ne distribue pas d'URL publique.
 */
export async function getSignedUrl(supabase, path, expiresIn = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl || null;
}

/**
 * Supprime un fichier du bucket (admin patient seulement).
 */
export async function deleteBulletin(supabase, path) {
  if (!path) return { error: "Path requis" };
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return { error: error.message };
  return { ok: true };
}
