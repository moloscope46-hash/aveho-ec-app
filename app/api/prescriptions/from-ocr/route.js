// =============================================================
//  app/api/prescriptions/from-ocr/route.js (Alpha 0.56.3)
//
//  Crée une prescription + ses lignes médicaments à partir
//  des données OCR (déjà extraites par /api/ocr/prescription).
//
//  Body :
//    {
//      patient_id, structure_id, etablissement_id,
//      data: { prescripteur:{}, date_prescription, medicaments:[...], ... },
//      ocr_text_brut, ocr_confiance, ocr_tokens_in, ocr_tokens_out
//    }
//  Réponse : { ok, prescription_id, nb_lignes }
// =============================================================

import { createClient } from "@supabase/supabase-js";
import { requireAuth, checkRateLimit } from "../../../../lib/apiAuth";
import { validate } from "../../../../lib/validateInput";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function POST(req) {
  // 0.57.17 : auth standardisée via requireAuth (avant : code dupliqué inline)
  const authCheck = await requireAuth(req);
  if (!authCheck.ok) return authCheck.response;
  const { user, supabase } = authCheck;

  const rate = checkRateLimit(user.id, { maxRequests: 10, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  let body;
  try { body = await req.json(); }
  catch (e) { return Response.json({ ok: false, error: "Body JSON invalide" }, { status: 400 }); }

  // 0.57.25 : validation schema des inputs (anti-DoS + anti-IDOR + anti-type-confusion)
  const validationErrors = validate(body, {
    patient_id: { type: "uuid", required: true },
    structure_id: { type: "uuid", required: true },
    etablissement_id: { type: "uuid" },
    data: { type: "object", required: true },
    ocr_text_brut: { type: "string", maxLen: 50_000 },
    ocr_confiance: { type: "number", min: 0, max: 100 },
    ocr_tokens_in: { type: "number", min: 0, max: 1_000_000, integer: true },
    ocr_tokens_out: { type: "number", min: 0, max: 1_000_000, integer: true },
  });
  if (validationErrors.length > 0) {
    return Response.json(
      { ok: false, error: "Body invalide", details: validationErrors },
      { status: 400 }
    );
  }

  const {
    patient_id, structure_id, etablissement_id,
    data, ocr_text_brut, ocr_confiance, ocr_tokens_in, ocr_tokens_out,
  } = body;

  // 0.57.25 : valider la structure data (prescripteur + medicaments)
  if (data.prescripteur && typeof data.prescripteur === "object") {
    const presErrors = validate(data.prescripteur, {
      nom: { type: "string", maxLen: 100 },
      prenom: { type: "string", maxLen: 100 },
      rpps: { type: "string", maxLen: 20 },          // pas strict RPPS car OCR pas sûr
      adeli: { type: "string", maxLen: 20 },
      specialite: { type: "string", maxLen: 200 },
    });
    if (presErrors.length > 0) {
      return Response.json(
        { ok: false, error: "Prescripteur invalide", details: presErrors },
        { status: 400 }
      );
    }
  }
  if (Array.isArray(data.medicaments) && data.medicaments.length > 100) {
    return Response.json(
      { ok: false, error: "Trop de médicaments (max 100 par prescription)" },
      { status: 400 }
    );
  }

  // 0.57.25 : IDOR check — vérifier que le user a accès à cette structure_id
  // (avant : le RLS Supabase faisait le contrôle au moment de l'INSERT, mais
  //  c'est plus défensif d'échouer tôt avec un message clair)
  const { data: membership } = await supabase
    .from("membres_structure")
    .select("structure_id")
    .eq("user_id", user.id)
    .eq("structure_id", structure_id)
    .maybeSingle();
  if (!membership) {
    return Response.json(
      { ok: false, error: "Accès refusé à cette structure" },
      { status: 403 }
    );
  }

  const p = data.prescripteur || {};
  const meds = Array.isArray(data.medicaments) ? data.medicaments : [];

  // 0.56.5 : avant d'insérer la prescription, on upsert le médecin prescripteur
  // dans la table medecins_prescripteurs (cache local). Si on a un RPPS, on lookup
  // contre l'API ANS / dump pour enrichir les données.
  let medecin_id = null;
  let rpps_verifie = false;
  let rpps_source_verification = null;

  if (p.nom) {
    let medecinPayload = {
      p_structure_id: structure_id,
      p_rpps: p.rpps || null,
      p_nom: p.nom,
      p_prenom: p.prenom || null,
      p_civilite: p.civilite || null,
      p_profession_libelle: p.profession || null,
      p_specialite_libelle: p.specialite || null,
      p_raison_sociale_lieu: p.raison_sociale || null,
      p_finess: p.finess || null,
      p_adresse: p.adresse || null,
      p_code_postal: p.code_postal || null,
      p_ville: p.ville || null,
      p_telephone: p.telephone || null,
      p_email: p.email || null,
      p_source_verification: null,
      p_est_verifie: false,
    };

    // Si RPPS fourni, on tente la vérification via l'API interne
    if (p.rpps && /^\d{11}$/.test(p.rpps.replace(/\s/g, ""))) {
      try {
        // 0.57.25 : utilise internalFetch qui whitelist les hosts autorisés
        // (avant : Host header injection possible → SSRF + leak token)
        const { internalFetch } = await import("../../../../lib/internalFetch");
        const verifRes = await internalFetch(req, `/api/rpps?rpps=${encodeURIComponent(p.rpps.replace(/\s/g, ""))}`);
        const verifData = await verifRes.json();
        if (verifData.ok && verifData.results?.length > 0) {
          const found = verifData.results[0];
          // Enrichir le payload avec les données ANS/dump
          medecinPayload.p_civilite = medecinPayload.p_civilite || found.civilite;
          medecinPayload.p_profession_libelle = medecinPayload.p_profession_libelle || found.profession || found.profession_libelle;
          medecinPayload.p_specialite_libelle = medecinPayload.p_specialite_libelle || found.specialite || found.specialite_libelle;
          medecinPayload.p_raison_sociale_lieu = medecinPayload.p_raison_sociale_lieu || found.raison_sociale || found.raison_sociale_lieu;
          medecinPayload.p_finess = medecinPayload.p_finess || found.finess;
          medecinPayload.p_code_insee_commune = found.code_insee_commune || null;
          medecinPayload.p_latitude = found.latitude || null;
          medecinPayload.p_longitude = found.longitude || null;
          medecinPayload.p_source_verification = verifData.source || found.source_record || "ANS FHIR";
          medecinPayload.p_est_verifie = true;
          rpps_verifie = true;
          rpps_source_verification = medecinPayload.p_source_verification;
        }
      } catch (_) {
        // Vérification échouée, on continue sans bloquer
      }
    }

    const { data: medecinIdData, error: errMedecin } = await supabase.rpc("upsert_medecin_from_ocr", medecinPayload);
    if (!errMedecin) medecin_id = medecinIdData;
  }

  const prescriptionPayload = {
    patient_id,
    structure_id,
    etablissement_id: etablissement_id || null,
    medecin_prescripteur_id: medecin_id,
    rpps_verifie,
    rpps_source_verification,
    prescripteur_nom: p.nom || null,
    prescripteur_prenom: p.prenom || null,
    prescripteur_rpps: p.rpps || null,
    prescripteur_specialite: p.specialite || null,
    prescripteur_adresse: p.adresse || null,
    prescripteur_telephone: p.telephone || null,
    prescripteur_email: p.email || null,
    prescripteur_finess: p.finess || null,
    date_prescription: data.date_prescription || null,
    type_prescription: data.type_prescription || "ordonnance",
    duree_traitement: data.duree_traitement || null,
    est_renouvelable: data.est_renouvelable || false,
    nb_renouvellements: data.nb_renouvellements || 0,
    notes_libres: data.notes_libres || null,
    ocr_brut: ocr_text_brut || null,
    ocr_date: new Date().toISOString(),
    ocr_confiance: ocr_confiance || null,
    ocr_tokens_in: ocr_tokens_in || null,
    ocr_tokens_out: ocr_tokens_out || null,
    statut: "active",
    source_creation: "ocr",
  };

  // 1) Insert prescription
  const { data: prescription, error: errInsert } = await supabase
    .from("prescriptions")
    .insert(prescriptionPayload)
    .select()
    .single();

  if (errInsert) {
    return Response.json({
      ok: false,
      error: `Erreur création prescription : ${errInsert.message}`,
    }, { status: 500 });
  }

  // 2) Insert lignes (batch)
  let nb_lignes = 0;
  if (meds.length > 0) {
    const lignesPayload = meds.map((m, i) => ({
      prescription_id: prescription.id,
      ordre: i,
      medicament_nom: m.medicament_nom || "Médicament non identifié",
      medicament_dci: m.medicament_dci || null,
      forme: m.forme || null,
      dosage: m.dosage || null,
      voie_administration: m.voie_administration || null,
      posologie_libre: m.posologie_libre || null,
      qte_par_prise: m.qte_par_prise || null,
      unite_prise: m.unite_prise || null,
      prises_par_jour: m.prises_par_jour || null,
      duree_jours: m.duree_jours || null,
      quantite_a_delivrer: m.quantite_a_delivrer || null,
      est_renouvelable: m.est_renouvelable || false,
      commentaire: m.commentaire || null,
    }));

    const { error: errLignes } = await supabase
      .from("prescriptions_lignes")
      .insert(lignesPayload);

    if (errLignes) {
      // Prescription créée mais lignes en erreur — on retourne quand même OK avec warning
      return Response.json({
        ok: true,
        prescription_id: prescription.id,
        nb_lignes: 0,
        warning: `Prescription créée mais erreur sur les lignes médicaments : ${errLignes.message}`,
      });
    }
    nb_lignes = lignesPayload.length;
  }

  return Response.json({
    ok: true,
    prescription_id: prescription.id,
    nb_lignes,
    medecin_id,
    rpps_verifie,
    rpps_source_verification,
  });
}
