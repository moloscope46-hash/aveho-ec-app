// =============================================================
//  lib/prescriptionsStorage.js (Alpha 0.56.3)
//
//  Helpers pour le bucket Supabase "prescriptions-scannees".
//  Convention path : {structure_id}/{patient_id}/{prescription_id}/{ts}-{filename}
// =============================================================

const BUCKET = "prescriptions-scannees";

function sanitizeFilename(name) {
  return (name || "ordonnance.jpg")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function buildPath(structureId, patientId, prescriptionId, originalFilename) {
  const ts = Date.now();
  const safe = sanitizeFilename(originalFilename);
  return `${structureId}/${patientId}/${prescriptionId}/${ts}-${safe}`;
}

export async function uploadPrescription(supabase, file, { structureId, patientId, prescriptionId }) {
  if (!file) return { error: "Fichier manquant" };
  if (!structureId || !patientId || !prescriptionId) return { error: "structureId, patientId et prescriptionId requis" };

  const path = buildPath(structureId, patientId, prescriptionId, file.name);
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
