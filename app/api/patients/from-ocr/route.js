// =============================================================
//  app/api/patients/from-ocr/route.js (Alpha 0.55.50)
//
//  Crée un patient à partir des données OCR du bulletin de situation.
//  Mappe les champs OCR → schema patients + auto-link caisse/mutuelle
//  via code_organisme et numero_amc si possibles.
// =============================================================

import { createClient } from "@supabase/supabase-js";
import { requireAuth, checkRateLimit } from "../../../../lib/apiAuth";
import { validate } from "../../../../lib/validateInput";

export const dynamic = "force-dynamic";

export async function POST(req) {
  // 0.57.17 : auth standardisée via requireAuth (avant : code dupliqué inline)
  const authCheck = await requireAuth(req);
  if (!authCheck.ok) return authCheck.response;
  const { user, supabase } = authCheck;

  // Rate limit (10 patients OCR / minute par user)
  const rate = checkRateLimit(user.id, { maxRequests: 10, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ ok: false, error: "Body JSON invalide" }, { status: 400 });
  }

  // 0.57.25 : validation schema des inputs (anti-DoS + anti-IDOR + anti-type-confusion)
  const validationErrors = validate(body, {
    etablissement_id: { type: "uuid" },          // optionnel mais si présent doit être UUID valide
    ocr_text_brut: { type: "string", maxLen: 50_000 },
    bs_file_url: { type: "string", maxLen: 2_000 },
    ocr_confiance: { type: "number", min: 0, max: 100 },
    ocr_tokens_in: { type: "number", min: 0, max: 1_000_000, integer: true },
    ocr_tokens_out: { type: "number", min: 0, max: 1_000_000, integer: true },
    data: { type: "object", required: true },    // payload OCR (validé en détail ci-dessous)
  });
  if (validationErrors.length > 0) {
    return Response.json(
      { ok: false, error: "Body invalide", details: validationErrors },
      { status: 400 }
    );
  }

  const { data: ocr, etablissement_id, ocr_text_brut, bs_file_url,
          ocr_confiance, ocr_tokens_in, ocr_tokens_out } = body;

  // 0.57.25 : valider en plus l'objet OCR (champs critiques patient)
  const ocrErrors = validate(ocr, {
    nom: { type: "string", required: true, minLen: 1, maxLen: 100 },
    prenom: { type: "string", maxLen: 100 },
    date_naissance: { type: "string", maxLen: 30 },
    cp: { type: "string", maxLen: 10 },
    ville: { type: "string", maxLen: 100 },
    code_organisme: { type: "string", maxLen: 20 },
    numero_amc: { type: "string", maxLen: 50 },
  });
  if (ocrErrors.length > 0) {
    return Response.json(
      { ok: false, error: "Données OCR invalides", details: ocrErrors },
      { status: 400 }
    );
  }

  const { data: membre } = await supabase
    .from("membres_structure").select("structure_id").eq("user_id", user.id).maybeSingle();
  if (!membre?.structure_id) {
    return Response.json({ ok: false, error: "Pas de structure pour cet utilisateur" }, { status: 400 });
  }

  // Auto-link caisse via code_organisme (essai exact puis startsWith)
  let caisse_id = null;
  if (ocr.code_organisme_rattachement) {
    const codeShort = String(ocr.code_organisme_rattachement).slice(0, 3);
    const { data: caisses } = await supabase
      .from("caisses_assurance_maladie").select("id, code_organisme")
      .eq("code_organisme", codeShort).limit(1);
    if (caisses?.length) caisse_id = caisses[0].id;
  }
  // Si pas trouvé via code, essai via nom_caisse
  if (!caisse_id && ocr.nom_caisse) {
    // 0.57.27 : escape wildcards SQL
    const { escapeIlike } = await import("../../../../lib/validateInput");
    const { data: caisses } = await supabase
      .from("caisses_assurance_maladie").select("id")
      .ilike("nom", `%${escapeIlike(ocr.nom_caisse)}%`).limit(1);
    if (caisses?.length) caisse_id = caisses[0].id;
  }

  // Auto-link mutuelle via numero_amc
  let mutuelle_id = null;
  if (ocr.mutuelle_numero_amc) {
    const { data: muts } = await supabase
      .from("mutuelles").select("id").eq("numero_amc", ocr.mutuelle_numero_amc).limit(1);
    if (muts?.length) mutuelle_id = muts[0].id;
  }
  if (!mutuelle_id && ocr.mutuelle_nom) {
    // 0.57.27 : escape wildcards SQL
    const { escapeIlike } = await import("../../../../lib/validateInput");
    const { data: muts } = await supabase
      .from("mutuelles").select("id").ilike("raison_sociale", `%${escapeIlike(ocr.mutuelle_nom)}%`).limit(1);
    if (muts?.length) mutuelle_id = muts[0].id;
  }

  // Construction du patient à insérer
  const numeroSecuClean = ocr.numero_secu ? String(ocr.numero_secu).replace(/\s/g, "") : null;
  const fullSecu = numeroSecuClean && ocr.cle_nir
    ? numeroSecuClean + String(ocr.cle_nir).replace(/\s/g, "")
    : numeroSecuClean;

  const patientData = {
    structure_id: membre.structure_id,
    etablissement_id: etablissement_id || null,
    nom: (ocr.nom || "").toUpperCase().trim(),
    prenom: ocr.prenom || null,
    nom_naissance: ocr.nom_naissance || null,
    sexe: ocr.sexe || null,
    date_naissance: ocr.date_naissance || null,
    lieu_naissance_ville: ocr.lieu_naissance_ville || null,
    lieu_naissance_code_insee: ocr.lieu_naissance_code_insee || null,
    lieu_naissance_pays: ocr.lieu_naissance_pays || "France",
    nationalite: ocr.nationalite || "Française",
    numero_secu: fullSecu,
    caisse_id,
    code_organisme_rattachement: ocr.code_organisme_rattachement || null,
    centre_paiement: ocr.centre_paiement || null,
    regime_secu: ocr.regime_secu || "general",
    qualite_assure: ocr.qualite_assure || null,
    rang_naissance: ocr.rang_naissance || null,
    date_debut_droits: ocr.date_debut_droits || null,
    date_fin_droits: ocr.date_fin_droits || null,
    ald: ocr.ald === true,
    ald_commentaire: ocr.ald_commentaire || null,
    cmu_c: ocr.cmu_c === true,
    c2s: ocr.c2s === true,
    ame: ocr.ame === true,
    mutuelle_id,
    mutuelle_numero_amc: ocr.mutuelle_numero_amc || null,
    mutuelle_numero_adherent: ocr.mutuelle_numero_adherent || null,
    adresse: ocr.adresse || null,
    complement_adresse: ocr.complement_adresse || null,
    code_postal: ocr.code_postal || null,
    ville: ocr.ville || null,
    pays: ocr.pays || "France",
    telephone_fixe: ocr.telephone_fixe || null,
    telephone_portable: ocr.telephone_portable || null,
    email: ocr.email || null,
    medecin_traitant: ocr.medecin_traitant_nom || null,
    medecin_traitant_prenom: ocr.medecin_traitant_prenom || null,
    medecin_traitant_rpps: ocr.medecin_traitant_rpps || null,
    // Audit OCR
    source_creation: "ocr_bs",
    bs_file_url: bs_file_url || null,
    bs_ocr_brut: ocr_text_brut || ocr.ocr_text_brut || null,
    bs_ocr_date: new Date().toISOString(),
    // 0.56.1 : méta-données OCR pour audit (coût + confiance)
    bs_ocr_confiance: ocr_confiance || ocr.confiance || null,
    bs_ocr_tokens_in: ocr_tokens_in || null,
    bs_ocr_tokens_out: ocr_tokens_out || null,
    etat: "Présent",
  };

  const { data: patient, error } = await supabase
    .from("patients").insert(patientData).select().single();
  if (error) {
    return Response.json({ ok: false, error: error.message, details: error.details }, { status: 200 });
  }

  return Response.json({
    ok: true,
    patient,
    auto_linked: { caisse_id, mutuelle_id },
  });
}
