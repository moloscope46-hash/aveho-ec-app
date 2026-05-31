"use client";
// =============================================================
//  ConsentementRGPD — Modale de recueil de consentement
//  Alpha 0.21.0
//
//  Flow :
//   1. Affiche le document de consentement avec les infos du patient
//      et de l'établissement
//   2. L'utilisateur coche les finalités acceptées
//   3. Pavé de signature (SignaturePad)
//   4. Validation : génère hash SHA-256, upload PNG dans Storage,
//      enregistre la ligne dans consentements_rgpd
// =============================================================
import { useEffect, useRef, useState } from "react";
import { createClient } from "../lib/supabase";
import SignaturePad from "./SignaturePad";
import { 
  FINALITES, TEMPLATE_CONSENTEMENT, VERSION_TEMPLATE,
  renderConsentement, consentementToHtml, hashBlob, detectDeviceType,
  loadActiveTemplate, loadCustomVariables,
} from "../lib/rgpd";
import { safeInsert } from "../lib/safeWrite";

import { dialogs } from "./dialogs";
export default function ConsentementRGPD({ patient, auth, onClose, onSaved }) {
  const supabase = createClient();
  const padRef = useRef(null);
  
  // Finalités obligatoires (toujours cochées si signe)
  const FINALITES_OBLIGATOIRES = ["soins", "materiel", "facturation"];
  const [finalites, setFinalites] = useState(FINALITES_OBLIGATOIRES);
  const [signataireRole, setSignataireRole] = useState("patient"); // 'patient' | 'representant_legal'
  const [signataireNom, setSignataireNom] = useState("");
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [etabNom, setEtabNom] = useState("");
  // Alpha 0.23.0 : durée de validité configurable par collectivité (en jours)
  const [validiteJours, setValiditeJours] = useState(1095); // défaut 3 ans
  // Alpha 0.34.0 : template chargé depuis BDD (avec fallback hardcode)
  const [activeTemplate, setActiveTemplate] = useState({
    id: null, version: VERSION_TEMPLATE, contenu_md: TEMPLATE_CONSENTEMENT, nom: null,
  });
  // Alpha 0.40.0 : variables custom de la structure
  const [customVars, setCustomVars] = useState([]);

  // Charger le nom de l'établissement (au cas où il n'est pas dans auth)
  // + la durée de validité configurée dans structures.parametres
  // + le template actif de la collectivité (Alpha 0.34.0)
  useEffect(() => {
    // Établissement
    if (auth.etabNom) { setEtabNom(auth.etabNom); }
    else if (patient?.etablissement_id) {
      supabase.from("etablissements")
        .select("nom")
        .eq("id", patient.etablissement_id)
        .single()
        .then(({ data }) => setEtabNom(data?.nom || ""));
    }
    // Durée de validité
    if (auth.structureId) {
      supabase.from("structures")
        .select("parametres")
        .eq("id", auth.structureId)
        .single()
        .then(({ data }) => {
          const j = data?.parametres?.consent_validite_jours;
          if (j && Number.isFinite(j) && j > 0) setValiditeJours(j);
        });
      // Charger le template actif (fallback hardcode si pas custom)
      // Charger le template actif (priorité etab patient > structure > hardcode — Alpha 0.42.0)
      loadActiveTemplate(supabase, auth.structureId, patient?.etablissement_id).then(setActiveTemplate);
      // Alpha 0.40.0 : charger les variables custom
      loadCustomVariables(supabase, auth.structureId).then(setCustomVars);
    }
  }, [auth.etabNom, auth.structureId, patient?.etablissement_id]);

  // Variables pour le rendu du template
  const patientNomPrenom = `${patient?.nom || ""} ${patient?.prenom || ""}`.trim();
  const vars = {
    patient_nom_prenom: patientNomPrenom,
    patient_date_naissance: patient?.date_naissance,
    patient_numero_dossier: patient?.numero_dossier,
    collectivite_nom: auth.structureNom || "—",
    etablissement_nom: etabNom,
    date_signature: new Date().toLocaleDateString("fr-FR"),
    finalites_acceptees: finalites,
    custom_vars: customVars, // Alpha 0.40.0 : passées à renderConsentement
  };
  const texteRendu = renderConsentement(activeTemplate.contenu_md, vars);
  const htmlRendu = consentementToHtml(texteRendu);

  function toggleFinalite(k) {
    if (FINALITES_OBLIGATOIRES.includes(k)) return; // ne peut pas décocher les obligatoires
    setFinalites(finalites.includes(k) ? finalites.filter((x) => x !== k) : [...finalites, k]);
  }

  function clearSig() {
    padRef.current?.clear();
    setSignatureEmpty(true);
  }

  async function refuser() {
    if (!await dialogs.confirm({ title: "Confirmer le REFUS du consentement ? Cela sera tracé.", variant: "danger" })) return;
    setSaving(true);
    setError("");
    try {
      const userId = auth.user?.id;
      const { error: e } = await safeInsert(supabase, "consentements_rgpd", {
        structure_id: auth.structureId,
        etablissement_id: patient.etablissement_id || auth.etabId || null,
        patient_id: patient.id,
        patient_nom_prenom: patientNomPrenom,
        patient_date_naissance: patient.date_naissance || null,
        patient_numero_dossier: patient.numero_dossier || null,
        etablissement_nom: etabNom,
        collectivite_nom: auth.structureNom,
        finalites_acceptees: [],
        statut: "refuse",
        signe_par_role: signataireRole,
        signe_par_nom: signataireNom || patientNomPrenom,
        recueilli_par_user_id: auth.user?.id,
        recueilli_par_email: auth.user?.email,
        recueilli_par_nom: auth.user?.user_metadata?.nom_affiche || auth.role?.nom_affiche || auth.user?.email,
        user_agent: navigator.userAgent.slice(0, 300),
        device_type: detectDeviceType(),
        texte_consentement: texteRendu,
        version_template: activeTemplate.version,
        template_id: activeTemplate.id, // Alpha 0.34.0 : null si fallback hardcode
      }, { userId });
      if (e) throw e;
      onSaved?.({ statut: "refuse" });
      onClose?.();
    } catch (e) {
      setError("Erreur : " + (e.message || "inconnue"));
    } finally {
      setSaving(false);
    }
  }

  async function signer() {
    if (padRef.current?.isEmpty()) {
      setError("Veuillez signer dans le pavé avant de valider.");
      return;
    }
    if (signataireRole === "representant_legal" && !signataireNom.trim()) {
      setError("Indiquez le nom du représentant légal signataire.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // 1. Récupérer le blob PNG de la signature
      const blob = await padRef.current.toBlob("image/png");
      if (!blob) throw new Error("Capture de la signature impossible.");

      // 2. Calculer le hash SHA-256
      const hash = await hashBlob(blob);

      // 3. Upload dans Supabase Storage
      // Chemin : structure_id/patient_id/{timestamp}-{hash8}.png
      const timestamp = Date.now();
      const path = `${auth.structureId}/${patient.id}/${timestamp}-${hash.slice(0, 8)}.png`;
      const { error: upErr } = await supabase.storage
        .from("signatures-rgpd")
        .upload(path, blob, { contentType: "image/png", upsert: false });
      if (upErr) throw upErr;

      // Alpha 0.22.0 : date d'expiration calculée selon la durée configurée par la collectivité
      // (par défaut 3 ans = 1095 jours, configurable dans /parametres)
      const dateExpiration = new Date();
      dateExpiration.setDate(dateExpiration.getDate() + validiteJours);

      // 4. Enregistrer la ligne consentement
      const { error: insErr } = await safeInsert(supabase, "consentements_rgpd", {
        structure_id: auth.structureId,
        etablissement_id: patient.etablissement_id || auth.etabId || null,
        patient_id: patient.id,
        patient_nom_prenom: patientNomPrenom,
        patient_date_naissance: patient.date_naissance || null,
        patient_numero_dossier: patient.numero_dossier || null,
        etablissement_nom: etabNom,
        collectivite_nom: auth.structureNom,
        finalites_acceptees: finalites,
        statut: "signe",
        signe_par_role: signataireRole,
        signe_par_nom: signataireNom || patientNomPrenom,
        signature_hash: hash,
        signature_storage_path: path,
        date_expiration: dateExpiration.toISOString().slice(0, 10),
        recueilli_par_user_id: auth.user?.id,
        recueilli_par_email: auth.user?.email,
        recueilli_par_nom: auth.user?.user_metadata?.nom_affiche || auth.role?.nom_affiche || auth.user?.email,
        user_agent: navigator.userAgent.slice(0, 300),
        device_type: detectDeviceType(),
        texte_consentement: texteRendu,
        version_template: activeTemplate.version,
        template_id: activeTemplate.id, // Alpha 0.34.0 : null si fallback hardcode
      }, { userId: auth.user?.id });
      if (insErr) throw insErr;

      onSaved?.({ statut: "signe", hash, path });
      onClose?.();
    } catch (e) {
      setError("Erreur : " + (e.message || "inconnue"));
    } finally {
      setSaving(false);
    }
  }

  const deviceType = detectDeviceType();
  const padWidth = deviceType === "desktop" ? 500 : Math.min(window.innerWidth - 80, 400);
  const padHeight = 180;

  return (
    <div className="modal-bg consent-modal-bg" onClick={(e) => e.target.classList.contains("consent-modal-bg") && onClose?.()}>
      <div className="modal consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <div className="modal-head consent-head">
          <i className="ti ti-shield-lock" aria-hidden="true" style={{ marginRight: 6 }} />
          <span id="consent-title">Consentement RGPD — {patientNomPrenom || "Nouveau patient"}</span>
          <i className="ti ti-x" style={{ cursor: "pointer", marginLeft: "auto" }} onClick={onClose} aria-label="Fermer" role="button" tabIndex={0} />
        </div>
        <div className="modal-body consent-body">
          {/* Document de consentement */}
          <div className="consent-doc" dangerouslySetInnerHTML={{ __html: htmlRendu }} />

          {/* Finalités à cocher */}
          <div className="consent-section">
            <h3 style={{ fontSize: 14, color: "#142131", marginBottom: 10 }}>
              <i className="ti ti-checklist" /> Finalités acceptées
            </h3>
            <div className="consent-finalites">
              {FINALITES.map((f) => {
                const checked = finalites.includes(f.k);
                const required = FINALITES_OBLIGATOIRES.includes(f.k);
                return (
                  <label key={f.k} className={`consent-fin ${checked ? "checked" : ""} ${required ? "required" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={required}
                      onChange={() => toggleFinalite(f.k)}
                      aria-label={f.l}
                    />
                    <div>
                      <b>{f.l}</b>
                      {required && <span className="consent-req-tag"> (obligatoire)</span>}
                      <small style={{ display: "block", color: "#6c7a89", fontSize: 11.5, marginTop: 2 }}>{f.d}</small>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Identité du signataire */}
          <div className="consent-section">
            <h3 style={{ fontSize: 14, color: "#142131", marginBottom: 10 }}>
              <i className="ti ti-user-check" /> Identité du signataire
            </h3>
            <div className="consent-signataire">
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="radio" checked={signataireRole === "patient"} onChange={() => setSignataireRole("patient")} />
                Le patient lui-même
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="radio" checked={signataireRole === "representant_legal"} onChange={() => setSignataireRole("representant_legal")} />
                Représentant légal / tuteur / famille
              </label>
              {signataireRole === "representant_legal" && (
                <input
                  type="text"
                  value={signataireNom}
                  onChange={(e) => setSignataireNom(e.target.value)}
                  placeholder="Nom + prénom + lien (ex. Marie Dupont, fille)"
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e1e6eb", fontFamily: "inherit", fontSize: 13, width: "100%", marginTop: 6 }}
                  aria-label="Nom du représentant légal"
                />
              )}
            </div>
          </div>

          {/* Pavé de signature */}
          <div className="consent-section">
            <h3 style={{ fontSize: 14, color: "#142131", marginBottom: 10 }}>
              <i className="ti ti-signature" /> Signature
            </h3>
            <div className="consent-sigbox">
              <SignaturePad
                ref={padRef}
                width={padWidth}
                height={padHeight}
                onChange={() => setSignatureEmpty(padRef.current?.isEmpty() ?? true)}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={clearSig} className="btn-ghost" style={{ fontSize: 12 }}>
                  <i className="ti ti-eraser" /> Effacer
                </button>
                <span style={{ fontSize: 11, color: "#8a98a8", alignSelf: "center" }}>
                  Signez dans la zone ci-dessus avec votre doigt, votre souris, votre stylet ou un pavé externe.
                </span>
              </div>
            </div>
          </div>

          {error && <div className="err" role="alert">{error}</div>}
        </div>

        <div className="modal-foot consent-foot">
          <button className="btn-ghost" onClick={onClose} disabled={saving} type="button">
            Annuler
          </button>
          <button className="btn-refuse" onClick={refuser} disabled={saving} type="button" style={{ background: "#fff", border: "1px solid #e35d5b", color: "#c0392b", padding: "9px 16px", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", marginRight: "auto" }}>
            <i className="ti ti-x" /> Refuser
          </button>
          <button className="btn-save" onClick={signer} disabled={saving || signatureEmpty} type="button">
            {saving ? "Enregistrement…" : <><i className="ti ti-shield-check" /> Valider le consentement</>}
          </button>
        </div>
      </div>
    </div>
  );
}
