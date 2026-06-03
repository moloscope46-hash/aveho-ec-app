// =============================================================
//  lib/prescriptionsStorage.js (Alpha 0.56.3 → 0.57.32)
//
//  Helpers pour le bucket Supabase "prescriptions-scannees".
//  Convention path : {structure_id}/{patient_id}/{prescription_id}/{ts}-{filename}
//
//  0.57.32 : durcissement sécurité
//   - Validation UUID stricte structure_id / patient_id / prescription_id
//   - MAX_FILE_SIZE 10 MB (anti-DoS)
//   - Whitelist MIME stricte
// =============================================================

const BUCKET = "prescriptions-scannees";

// 0.57.32 : limites + whitelist defense-in-depth
const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB
const ALLOWED_MIMES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeFilename(name) {
  return (name || "ordonnance.jpg")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function isValidUuid(id) {
  return typeof id === "string" && UUID_RE.test(id);
}

export function buildPath(structureId, patientId, prescriptionId, originalFilename) {
  // 0.57.32 : validation stricte UUID (anti path-traversal)
  if (!isValidUuid(structureId)) throw new Error("structureId invalide (UUID requis)");
  if (!isValidUuid(patientId)) throw new Error("patientId invalide (UUID requis)");
  if (!isValidUuid(prescriptionId)) throw new Error("prescriptionId invalide (UUID requis)");
  const ts = Date.now();
  const safe = sanitizeFilename(originalFilename);
  return `${structureId}/${patientId}/${prescriptionId}/${ts}-${safe}`;
}

export async function uploadPrescription(supabase, file, { structureId, patientId, prescriptionId }) {
  if (!file) return { error: "Fichier manquant" };
  if (!structureId || !patientId || !prescriptionId) {
    return { error: "structureId, patientId et prescriptionId requis" };
  }

  // 0.57.32 : validation UUID stricte
  if (!isValidUuid(structureId)) return { error: "structureId invalide (UUID requis)" };
  if (!isValidUuid(patientId)) return { error: "patientId invalide (UUID requis)" };
  if (!isValidUuid(prescriptionId)) return { error: "prescriptionId invalide (UUID requis)" };

  // 0.57.32 : limite taille
  if (file.size > MAX_FILE_SIZE) {
    return { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` };
  }

  // 0.57.32 : whitelist MIME
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIMES.includes(mime)) {
    return { error: `Type de fichier non supporté : ${mime}. Autorisés : ${ALLOWED_MIMES.join(", ")}` };
  }

  const path = buildPath(structureId, patientId, prescriptionId, file.name);
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

export async function getSignedUrl(supabase, path, expiresIn = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl || null;
}

export async function deletePrescription(supabase, path) {
  if (!path) return { error: "Path requis" };
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return { error: error.message };
  return { ok: true };
}
