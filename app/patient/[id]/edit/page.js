"use client";
// =============================================================
//  app/patient/[id]/edit/page.js (Alpha 0.55.49)
//
//  Nouvelle page d'édition COMPLÈTE de la fiche patient.
//  Niveau bulletin de situation — tous les champs ajoutés en 0.55.46.
//
//  Onglets :
//   1. 🪪 Identité
//   2. 🛡 Sécu & Mutuelle
//   3. 📍 Adresses (1-N livraison)
//   4. 📞 Contacts (urgence, personne confiance)
//   5. 🩺 Médecin traitant
//   6. 📄 OCR & audit (bulletin scanné)
// =============================================================

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import TopBar from "../../../TopBar";
import { useCart } from "../../../useCart";
import { PageHead, StateMsg} from "../../../ui";
import { safeUpdate, safeDelete} from "../../../../lib/safeWrite";
import { logEvent } from "../../../../lib/events";

// 0.57.1 : tabs extraits dans des fichiers séparés (refacto < 1000 lignes)
import TabIdentite from "./tabs/TabIdentite";
import TabSecu from "./tabs/TabSecu";
import TabAdresses from "./tabs/TabAdresses";
import TabContacts from "./tabs/TabContacts";
import TabMedecin from "./tabs/TabMedecin";
import TabPrescriptions from "./tabs/TabPrescriptions";
import TabAudit from "./tabs/TabAudit";
// 0.57.10 : imports retirés (Field, FieldSelect, Lbl non utilisés)

const TABS = [
  { id: "identite", lbl: "Identité", icon: "ti-user-circle", color: "#185FA5" },
  { id: "secu", lbl: "Sécu & Mutuelle", icon: "ti-shield-check", color: "#7a6fb0" },
  { id: "adresses", lbl: "Adresses livraison", icon: "ti-map-pin", color: "#5aa05a" },
  { id: "contacts", lbl: "Contacts urgence", icon: "ti-phone", color: "#EF9F27" },
  { id: "medecin", lbl: "Médecin traitant", icon: "ti-stethoscope", color: "#c0392b" },
  { id: "prescriptions", lbl: "Prescriptions", icon: "ti-prescription", color: "#5a4a90" },
  { id: "audit", lbl: "OCR & audit", icon: "ti-file-scan", color: "#5a8f8f" },
];

export default function FichePatientEdit() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const auth = useAuth();
  const cart = useCart();
  const patId = params?.id;
  const [pat, setPat] = useState(null);
  const [adresses, setAdresses] = useState([]);
  const [tab, setTab] = useState("identite");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  // Référentiels sélectionnés (pour affichage badges)
  const [caisseInfo, setCaisseInfo] = useState(null);
  const [mutuelleInfo, setMutuelleInfo] = useState(null);

  useEffect(() => {
    if (!auth.ready || !patId) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: ads }] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patId).single(),
        supabase.from("patients_adresses_livraison").select("*").eq("patient_id", patId).eq("active", true).order("est_principale", { ascending: false }),
      ]);
      setPat(p || null);
      setAdresses(ads || []);

      // Hydrate caisse/mutuelle si déjà liées
      if (p?.caisse_id) {
        const { data: c } = await supabase.from("caisses_assurance_maladie").select("*").eq("id", p.caisse_id).single();
        setCaisseInfo(c || null);
      }
      if (p?.mutuelle_id) {
        const { data: m } = await supabase.from("mutuelles").select("*").eq("id", p.mutuelle_id).single();
        setMutuelleInfo(m || null);
      }
      setLoading(false);
    })();
  }, [auth.ready, patId]);

  function set(field, value) {
    setPat({ ...pat, [field]: value });
  }

  async function save() {
    if (!pat) return;
    setSaving(true);
    setError(null);
    try {
      // Construction du payload : tous les champs éditables
      const payload = {
        nom: pat.nom,
        prenom: pat.prenom,
        nom_naissance: pat.nom_naissance,
        sexe: pat.sexe,
        date_naissance: pat.date_naissance,
        lieu_naissance_ville: pat.lieu_naissance_ville,
        lieu_naissance_code_insee: pat.lieu_naissance_code_insee,
        lieu_naissance_pays: pat.lieu_naissance_pays,
        nationalite: pat.nationalite,
        // Sécu
        numero_secu: pat.numero_secu,
        caisse_id: pat.caisse_id,
        code_organisme_rattachement: pat.code_organisme_rattachement,
        centre_paiement: pat.centre_paiement,
        regime_secu: pat.regime_secu,
        qualite_assure: pat.qualite_assure,
        rang_naissance: pat.rang_naissance,
        date_debut_droits: pat.date_debut_droits,
        date_fin_droits: pat.date_fin_droits,
        ald: pat.ald,
        ald_commentaire: pat.ald_commentaire,
        cmu_c: pat.cmu_c,
        c2s: pat.c2s,
        ame: pat.ame,
        // Mutuelle
        mutuelle_id: pat.mutuelle_id,
        mutuelle_numero_amc: pat.mutuelle_numero_amc,
        mutuelle_numero_adherent: pat.mutuelle_numero_adherent,
        mutuelle_date_debut_droits: pat.mutuelle_date_debut_droits,
        mutuelle_date_fin_droits: pat.mutuelle_date_fin_droits,
        tiers_payant_actif: pat.tiers_payant_actif,
        // Adresse principale
        adresse: pat.adresse,
        complement_adresse: pat.complement_adresse,
        code_postal: pat.code_postal,
        ville: pat.ville,
        pays: pat.pays,
        // Contact
        telephone_fixe: pat.telephone_fixe,
        telephone_portable: pat.telephone_portable,
        email: pat.email,
        // Urgence
        contact_urgence_nom: pat.contact_urgence_nom,
        contact_urgence_prenom: pat.contact_urgence_prenom,
        contact_urgence_lien: pat.contact_urgence_lien,
        contact_urgence_telephone: pat.contact_urgence_telephone,
        personne_confiance_nom: pat.personne_confiance_nom,
        personne_confiance_prenom: pat.personne_confiance_prenom,
        personne_confiance_telephone: pat.personne_confiance_telephone,
        // Médecin
        medecin_traitant: pat.medecin_traitant,
        medecin_traitant_prenom: pat.medecin_traitant_prenom,
        medecin_traitant_telephone: pat.medecin_traitant_telephone,
        medecin_traitant_rpps: pat.medecin_traitant_rpps,
        medecin_traitant_finess: pat.medecin_traitant_finess,
        // Notes
        notes: pat.notes,
      };

      // Nettoyer les champs undefined (laisser null Supabase)
      Object.keys(payload).forEach(k => payload[k] === undefined && (payload[k] = null));

      await safeUpdate(supabase, "patients", payload, { id: patId }, { userId: auth.user?.id });
      await logEvent(supabase, auth, {
        action: "modifier", entite: "patient", entite_id: patId,
        details: { nom: pat.nom, prenom: pat.prenom },
      });
      setSavedAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // === Helpers pour les adresses livraison (1-N) ===
  async function addAdresse() {
    const { data, error: e } = await supabase.from("patients_adresses_livraison").insert({
      patient_id: patId,
      libelle: "Nouvelle adresse",
      est_principale: adresses.length === 0,
    }).select().single();
    if (e) { setError(e.message); return; }
    setAdresses([...adresses, data]);
  }

  async function updateAdresse(id, field, value) {
    const a = adresses.find(x => x.id === id);
    if (!a) return;
    const next = { ...a, [field]: value };
    setAdresses(adresses.map(x => x.id === id ? next : x));
  }

  async function saveAdresse(id) {
    const a = adresses.find(x => x.id === id);
    if (!a) return;
    try {
      await safeUpdate(supabase, "patients_adresses_livraison", {
        libelle: a.libelle, destinataire: a.destinataire,
        adresse: a.adresse, complement: a.complement,
        cp: a.cp, ville: a.ville, pays: a.pays,
        telephone_contact: a.telephone_contact,
        code_porte: a.code_porte, instructions: a.instructions,
        est_principale: a.est_principale,
      }, { id }, { userId: auth.user?.id });
      setSavedAt(new Date());
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeAdresse(id) {
    if (!confirm("Supprimer cette adresse de livraison ?")) return;
    await safeDelete(supabase, "patients_adresses_livraison", { id }, { userId: auth.user?.id });
    setAdresses(adresses.filter(x => x.id !== id));
  }

  if (!auth.ready || loading) return null;
  if (!pat) return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <StateMsg type="error" icon="ti-x">Patient introuvable</StateMsg>
      </div>
    </div>
  );

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        {/* 0.55.54 : fil d'Ariane retour vers la liste et la fiche 360° */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#6c7a89", marginBottom: 8, marginTop: 6 }}>
          <button onClick={() => router.push("/patients")} style={{ background: "transparent", border: "none", color: "#185FA5", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 11.5, fontWeight: 600 }}>
            <i className="ti ti-arrow-left" /> Tous les patients
          </button>
          <span style={{ color: "#d3d9e0" }}>/</span>
          <button onClick={() => router.push(`/patient/${patId}`)} style={{ background: "transparent", border: "none", color: "#185FA5", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 11.5, fontWeight: 600 }}>
            Fiche {pat.prenom} {pat.nom}
          </button>
          <span style={{ color: "#d3d9e0" }}>/</span>
          <b style={{ color: "#142131" }}>Édition</b>
        </div>
        <PageHead
          eyebrow="PATIENT · ÉDITION"
          icon="ti-user-edit"
          title={`${pat.prenom || ""} ${pat.nom || ""}`.trim() || "Patient"}
          accent={pat.numero_dossier ? `· N°${pat.numero_dossier}` : ""}
          sub="Fiche patient complète — identité, sécu, mutuelle, adresses, contacts, médecin traitant"
        />

        {/* Onglets */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 14, overflowX: "auto",
          padding: "4px 0", borderBottom: "1px solid #e3e9ee",
        }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: active ? t.color : "transparent",
                  color: active ? "#fff" : t.color,
                  border: `1.5px solid ${t.color}`,
                  padding: "8px 12px", borderRadius: 8,
                  fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                <i className={`ti ${t.icon}`} /> {t.lbl}
              </button>
            );
          })}
        </div>

        {error && <StateMsg type="error" icon="ti-alert-circle">{error}</StateMsg>}

        {tab === "identite" && <TabIdentite pat={pat} set={set} />}
        {tab === "secu" && (
          <TabSecu
            pat={pat} set={set}
            caisseInfo={caisseInfo}
            onCaisseSelect={(c) => { setCaisseInfo(c); set("caisse_id", c?.id || null); set("code_organisme_rattachement", c?.code_organisme || null); }}
            mutuelleInfo={mutuelleInfo}
            onMutuelleSelect={(m) => { setMutuelleInfo(m); set("mutuelle_id", m?.id || null); set("mutuelle_numero_amc", m?.numero_amc || null); }}
          />
        )}
        {tab === "adresses" && (
          <TabAdresses
            pat={pat} set={set}
            adresses={adresses}
            onAdd={addAdresse}
            onUpdate={updateAdresse}
            onSave={saveAdresse}
            onRemove={removeAdresse}
          />
        )}
        {tab === "contacts" && <TabContacts pat={pat} set={set} />}
        {tab === "medecin" && <TabMedecin pat={pat} set={set} />}
        {tab === "prescriptions" && <TabPrescriptions pat={pat} />}
        {tab === "audit" && <TabAudit pat={pat} />}

        {/* Footer save */}
        <div style={{
          position: "sticky", bottom: 14, marginTop: 16, padding: 12,
          background: "linear-gradient(135deg, #142131, #1c5454)",
          color: "#fff", borderRadius: 12,
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          boxShadow: "0 10px 24px rgba(20,33,49,.35)",
        }}>
          <i className="ti ti-device-floppy" style={{ fontSize: 18 }} />
          <div style={{ flex: 1, minWidth: 140, fontSize: 12 }}>
            {savedAt
              ? <>Sauvegardé à <b>{savedAt.toLocaleTimeString()}</b></>
              : "Modifications non sauvegardées"}
          </div>
          <button
            onClick={() => router.push(`/patient/${patId}`)}
            style={{
              background: "transparent", border: "1px solid #fff4",
              color: "#fff", padding: "8px 14px", borderRadius: 8,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
            }}
          >
            <i className="ti ti-arrow-left" /> Retour fiche
          </button>
          <button
            onClick={save} disabled={saving}
            style={{
              background: "#5aa05a", color: "#fff", border: "none",
              padding: "9px 18px", borderRadius: 8,
              fontWeight: 700, cursor: saving ? "wait" : "pointer", fontFamily: "inherit", fontSize: 13,
            }}
          >
            {saving ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-check" />}
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =================== Onglets ===================

// =================== Composants utilitaires ===================
