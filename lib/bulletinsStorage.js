// =============================================================
//  lib/bulletinsStorage.js (Alpha 0.56.1)
//
//  Helpers pour le bucket Supabase "bulletins-scannes".
//  Chemin convention : {structure_id}/{patient_id}/{timestamp}-{filename}
// =============================================================

const BUCKET = "bulletins-scannes";

/** Nettoie un nom de fichier pour le rendre safe en path Storage. */
function sanitizeFilename(name) {
  return (name || "bulletin.jpg")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** Construit le path Storage pour un patient donné. */
export function buildPath(structureId, patientId, originalFilename) {
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

  const path = buildPath(structureId, patientId, file.name);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) return { error: error.message || "Upload échoué" };

  return {
    path,
    size_kb: Math.round(file.size / 1024),
    mime: file.type,
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
