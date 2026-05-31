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
import { PageHead, Panel, StateMsg, Btn } from "../../../ui";
import { safeUpdate, safeInsert, safeDelete } from "../../../../lib/safeWrite";
import { logEvent } from "../../../../lib/events";
import CaisseSearch from "../../../CaisseSearch";
import MutuelleSearch from "../../../MutuelleSearch";

const TABS = [
  { id: "identite", lbl: "Identité", icon: "ti-user-circle", color: "#185FA5" },
  { id: "secu", lbl: "Sécu & Mutuelle", icon: "ti-shield-check", color: "#7a6fb0" },
  { id: "adresses", lbl: "Adresses livraison", icon: "ti-map-pin", color: "#5aa05a" },
  { id: "contacts", lbl: "Contacts urgence", icon: "ti-phone", color: "#EF9F27" },
  { id: "medecin", lbl: "Médecin traitant", icon: "ti-stethoscope", color: "#c0392b" },
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

function TabIdentite({ pat, set }) {
  return (
    <Panel>
      <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
        <i className="ti ti-user-circle" style={{ color: "#185FA5", marginRight: 6 }} /> Identité du patient
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <Field label="Nom *" value={pat.nom} onChange={v => set("nom", v)} required />
        <Field label="Prénom" value={pat.prenom} onChange={v => set("prenom", v)} />
        <Field label="Nom de naissance" value={pat.nom_naissance} onChange={v => set("nom_naissance", v)} />
        <FieldSelect label="Sexe" value={pat.sexe} onChange={v => set("sexe", v)} options={[
          { v: "", lbl: "—" }, { v: "M", lbl: "Masculin" }, { v: "F", lbl: "Féminin" }, { v: "X", lbl: "Non précisé" },
        ]} />
        <Field label="Date de naissance" type="date" value={pat.date_naissance} onChange={v => set("date_naissance", v)} />
        <Field label="Lieu de naissance (ville)" value={pat.lieu_naissance_ville} onChange={v => set("lieu_naissance_ville", v)} />
        <Field label="Code INSEE commune naissance" value={pat.lieu_naissance_code_insee} onChange={v => set("lieu_naissance_code_insee", v)} />
        <Field label="Pays de naissance" value={pat.lieu_naissance_pays || "France"} onChange={v => set("lieu_naissance_pays", v)} />
        <Field label="Nationalité" value={pat.nationalite || "Française"} onChange={v => set("nationalite", v)} />
        <Field label="N° dossier interne" value={pat.numero_dossier} onChange={v => set("numero_dossier", v)} />
      </div>
    </Panel>
  );
}

function TabSecu({ pat, set, caisseInfo, onCaisseSelect, mutuelleInfo, onMutuelleSelect }) {
  return (
    <>
      <Panel style={{ marginBottom: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-shield-check" style={{ color: "#185FA5", marginRight: 6 }} /> Sécurité sociale (AMO)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 12 }}>
          <Field label="N° de Sécurité Sociale (NIR — 15 chiffres)" value={pat.numero_secu} onChange={v => set("numero_secu", v)} placeholder="1 85 03 75 116 001 23" mono />
          <FieldSelect label="Régime" value={pat.regime_secu} onChange={v => set("regime_secu", v)} options={[
            { v: "", lbl: "—" },
            { v: "general", lbl: "Général" },
            { v: "agricole", lbl: "Agricole (MSA)" },
            { v: "militaire", lbl: "Militaire (CNMSS)" },
            { v: "fonctionnaire", lbl: "Fonctionnaire (LMG)" },
            { v: "special", lbl: "Spécial" },
          ]} />
          <FieldSelect label="Qualité" value={pat.qualite_assure} onChange={v => set("qualite_assure", v)} options={[
            { v: "", lbl: "—" }, { v: "assure", lbl: "Assuré" }, { v: "ayant_droit", lbl: "Ayant droit" },
          ]} />
          <Field label="Rang naissance" type="number" value={pat.rang_naissance} onChange={v => set("rang_naissance", parseInt(v) || null)} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <Lbl>Caisse d'affiliation</Lbl>
          {caisseInfo ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, background: "#dbe7f5", borderRadius: 6, marginBottom: 4 }}>
              <i className="ti ti-shield-check" style={{ color: "#185FA5" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{caisseInfo.nom}</div>
                <div style={{ fontSize: 11, color: "#6c7a89" }}>
                  Code {caisseInfo.code_organisme} · {caisseInfo.type_caisse}
                  {caisseInfo.departement ? ` · Dept ${caisseInfo.departement}` : ""}
                </div>
              </div>
              <button onClick={() => onCaisseSelect(null)} style={{ background: "transparent", border: "none", color: "#c0392b", fontSize: 18, cursor: "pointer" }}>×</button>
            </div>
          ) : (
            <CaisseSearch onSelect={onCaisseSelect} />
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 12 }}>
          <Field label="Centre de paiement" value={pat.centre_paiement} onChange={v => set("centre_paiement", v)} />
          <Field label="Date début droits" type="date" value={pat.date_debut_droits} onChange={v => set("date_debut_droits", v)} />
          <Field label="Date fin droits" type="date" value={pat.date_fin_droits} onChange={v => set("date_fin_droits", v)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <Toggle label="ALD" value={pat.ald} onChange={v => set("ald", v)} color="#c0392b" />
          <Toggle label="C2S (ex CMU-C)" value={pat.c2s} onChange={v => set("c2s", v)} color="#EF9F27" />
          <Toggle label="AME" value={pat.ame} onChange={v => set("ame", v)} color="#7a6fb0" />
        </div>
        {pat.ald && (
          <div style={{ marginTop: 8 }}>
            <Field label="Commentaire ALD" value={pat.ald_commentaire} onChange={v => set("ald_commentaire", v)} placeholder="Diagnostic, n° d'exonération…" />
          </div>
        )}
      </Panel>

      <Panel style={{ background: "#f3effa", borderColor: "#d6c9ec" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-heart-handshake" style={{ color: "#7a6fb0", marginRight: 6 }} /> Complémentaire santé (AMC)
        </h3>

        <div style={{ marginBottom: 10 }}>
          <Lbl>Organisme complémentaire (mutuelle / assurance)</Lbl>
          {mutuelleInfo ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, background: "#e9defc", borderRadius: 6, marginBottom: 4 }}>
              <i className="ti ti-heart-handshake" style={{ color: "#7a6fb0" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{mutuelleInfo.raison_sociale}</div>
                <div style={{ fontSize: 11, color: "#6c7a89" }}>
                  AMC {mutuelleInfo.numero_amc} · {mutuelleInfo.type_organisme}
                  {mutuelleInfo.gere_c2s ? " · Gère C2S" : ""}
                </div>
              </div>
              <button onClick={() => onMutuelleSelect(null)} style={{ background: "transparent", border: "none", color: "#c0392b", fontSize: 18, cursor: "pointer" }}>×</button>
            </div>
          ) : (
            <MutuelleSearch onSelect={onMutuelleSelect} />
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <Field label="N° AMC (8 chiffres)" value={pat.mutuelle_numero_amc} onChange={v => set("mutuelle_numero_amc", v)} mono />
          <Field label="N° adhérent" value={pat.mutuelle_numero_adherent} onChange={v => set("mutuelle_numero_adherent", v)} />
          <Field label="Date début droits mutuelle" type="date" value={pat.mutuelle_date_debut_droits} onChange={v => set("mutuelle_date_debut_droits", v)} />
          <Field label="Date fin droits mutuelle" type="date" value={pat.mutuelle_date_fin_droits} onChange={v => set("mutuelle_date_fin_droits", v)} />
        </div>

        <div style={{ marginTop: 10 }}>
          <Toggle label="Tiers payant actif" value={pat.tiers_payant_actif !== false} onChange={v => set("tiers_payant_actif", v)} color="#5aa05a" />
        </div>
      </Panel>
    </>
  );
}

function TabAdresses({ pat, set, adresses, onAdd, onUpdate, onSave, onRemove }) {
  return (
    <>
      <Panel style={{ marginBottom: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-home" style={{ color: "#185FA5", marginRight: 6 }} /> Adresse principale (sociale)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Adresse" value={pat.adresse} onChange={v => set("adresse", v)} placeholder="N° et nom de la voie" />
          </div>
          <Field label="Complément (résidence, étage)" value={pat.complement_adresse} onChange={v => set("complement_adresse", v)} />
          <Field label="Code postal" value={pat.code_postal} onChange={v => set("code_postal", v)} mono />
          <Field label="Ville" value={pat.ville} onChange={v => set("ville", v)} />
          <Field label="Pays" value={pat.pays || "France"} onChange={v => set("pays", v)} />
        </div>
      </Panel>

      <Panel style={{ background: "linear-gradient(135deg, #eef9ef 0%, #fff 100%)", borderColor: "#bfe2bf" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 15, flex: 1 }}>
            <i className="ti ti-truck-delivery" style={{ color: "#5aa05a", marginRight: 6 }} /> Adresses de livraison
            <span style={{ marginLeft: 8, fontSize: 11, color: "#2e6f33", fontWeight: 700, background: "#dff5e0", padding: "2px 8px", borderRadius: 8 }}>
              {adresses.length}
            </span>
          </h3>
          <button onClick={onAdd} style={{ background: "#5aa05a", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            <i className="ti ti-plus" /> Ajouter
          </button>
        </div>

        {adresses.length === 0 && (
          <div style={{ padding: 14, background: "#fff", borderRadius: 8, fontSize: 12.5, color: "#6c7a89", textAlign: "center" }}>
            Aucune adresse de livraison. <button onClick={onAdd} style={{ background: "transparent", border: "none", color: "#5aa05a", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>+ Ajouter une première adresse</button>
            <div style={{ marginTop: 6, fontSize: 11 }}>(par défaut, on livre à l'adresse principale ci-dessus)</div>
          </div>
        )}

        {adresses.map((a, i) => (
          <div key={a.id} style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <input
                value={a.libelle || ""}
                onChange={(e) => onUpdate(a.id, "libelle", e.target.value)}
                placeholder="Libellé (ex Domicile, Maison campagne…)"
                style={{ flex: 1, minWidth: 160, padding: "6px 10px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13, fontWeight: 700, color: "#142131", fontFamily: "inherit" }}
              />
              <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#5aa05a", fontWeight: 600, cursor: "pointer" }}>
                <input type="checkbox" checked={a.est_principale || false} onChange={(e) => onUpdate(a.id, "est_principale", e.target.checked)} />
                Principale
              </label>
              <button onClick={() => onSave(a.id)} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-device-floppy" /> Sauv.
              </button>
              <button onClick={() => onRemove(a.id)} style={{ background: "transparent", border: "none", color: "#c0392b", fontSize: 18, cursor: "pointer", padding: 0 }} title="Supprimer">×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              <Field label="Destinataire (si différent)" value={a.destinataire} onChange={v => onUpdate(a.id, "destinataire", v)} placeholder="Mme Dupont (sa fille)" compact />
              <Field label="Téléphone contact" value={a.telephone_contact} onChange={v => onUpdate(a.id, "telephone_contact", v)} compact />
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Adresse" value={a.adresse} onChange={v => onUpdate(a.id, "adresse", v)} compact />
              </div>
              <Field label="Complément" value={a.complement} onChange={v => onUpdate(a.id, "complement", v)} compact />
              <Field label="Code postal" value={a.cp} onChange={v => onUpdate(a.id, "cp", v)} mono compact />
              <Field label="Ville" value={a.ville} onChange={v => onUpdate(a.id, "ville", v)} compact />
              <Field label="Code porte / digicode" value={a.code_porte} onChange={v => onUpdate(a.id, "code_porte", v)} mono compact />
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Instructions livraison" value={a.instructions} onChange={v => onUpdate(a.id, "instructions", v)} placeholder='Sonner 2×, au fond de la cour…' compact />
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </>
  );
}

function TabContacts({ pat, set }) {
  return (
    <>
      <Panel style={{ marginBottom: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-phone" style={{ color: "#185FA5", marginRight: 6 }} /> Contact patient
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <Field label="Téléphone fixe" value={pat.telephone_fixe} onChange={v => set("telephone_fixe", v)} mono />
          <Field label="Téléphone portable" value={pat.telephone_portable} onChange={v => set("telephone_portable", v)} mono />
          <Field label="Email" type="email" value={pat.email} onChange={v => set("email", v)} />
        </div>
      </Panel>

      <Panel style={{ marginBottom: 12, background: "linear-gradient(135deg, #fff8ec 0%, #fff 100%)", borderColor: "#f0d59f" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-emergency-bed" style={{ color: "#c0392b", marginRight: 6 }} /> Personne à prévenir (urgence)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Field label="Nom" value={pat.contact_urgence_nom} onChange={v => set("contact_urgence_nom", v)} />
          <Field label="Prénom" value={pat.contact_urgence_prenom} onChange={v => set("contact_urgence_prenom", v)} />
          <Field label="Lien de parenté" value={pat.contact_urgence_lien} onChange={v => set("contact_urgence_lien", v)} placeholder="Conjoint, enfant, aidant…" />
          <Field label="Téléphone" value={pat.contact_urgence_telephone} onChange={v => set("contact_urgence_telephone", v)} mono />
        </div>
      </Panel>

      <Panel style={{ background: "#f3effa", borderColor: "#d6c9ec" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-shield-heart" style={{ color: "#7a6fb0", marginRight: 6 }} /> Personne de confiance
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Field label="Nom" value={pat.personne_confiance_nom} onChange={v => set("personne_confiance_nom", v)} />
          <Field label="Prénom" value={pat.personne_confiance_prenom} onChange={v => set("personne_confiance_prenom", v)} />
          <Field label="Téléphone" value={pat.personne_confiance_telephone} onChange={v => set("personne_confiance_telephone", v)} mono />
        </div>
        <div style={{ marginTop: 8, padding: 8, background: "rgba(255,255,255,.6)", borderRadius: 6, fontSize: 11, color: "#5a4a90" }}>
          <i className="ti ti-info-circle" /> La personne de confiance est désignée par le patient (loi du 4 mars 2002). Elle peut l'accompagner dans ses démarches et être consultée en cas d'incapacité de s'exprimer.
        </div>
      </Panel>
    </>
  );
}

function TabMedecin({ pat, set }) {
  return (
    <Panel>
      <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
        <i className="ti ti-stethoscope" style={{ color: "#c0392b", marginRight: 6 }} /> Médecin traitant
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <Field label="Nom du médecin" value={pat.medecin_traitant} onChange={v => set("medecin_traitant", v)} />
        <Field label="Prénom" value={pat.medecin_traitant_prenom} onChange={v => set("medecin_traitant_prenom", v)} />
        <Field label="Téléphone" value={pat.medecin_traitant_telephone} onChange={v => set("medecin_traitant_telephone", v)} mono />
        <Field label="N° RPPS (11 chiffres)" value={pat.medecin_traitant_rpps} onChange={v => set("medecin_traitant_rpps", v)} mono placeholder="10000000001" />
        <Field label="FINESS établissement" value={pat.medecin_traitant_finess} onChange={v => set("medecin_traitant_finess", v)} mono />
      </div>
      <div style={{ marginTop: 14, padding: 10, background: "#f4f7fa", borderRadius: 8, fontSize: 11.5, color: "#6c7a89" }}>
        <i className="ti ti-info-circle" /> Le médecin traitant est déclaré à la CPAM par le patient. Sa désignation est obligatoire pour bénéficier du parcours de soins coordonné et du remboursement à 100% sur la base de remboursement.
      </div>
    </Panel>
  );
}

function TabAudit({ pat }) {
  return (
    <>
      <Panel style={{ marginBottom: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-file-scan" style={{ color: "#5a8f8f", marginRight: 6 }} /> Source de création
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <KvBlock label="Source" value={
            pat.source_creation === "ocr_bs" ? "📄 OCR bulletin de situation"
            : pat.source_creation === "import_csv" ? "📊 Import CSV"
            : "✍️ Saisie manuelle"
          } />
          <KvBlock label="Créé le" value={pat.created_at ? new Date(pat.created_at).toLocaleString() : "—"} />
          <KvBlock label="Mis à jour" value={pat.updated_at ? new Date(pat.updated_at).toLocaleString() : "—"} />
        </div>
      </Panel>

      {pat.bs_file_url ? (
        <Panel style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
            <i className="ti ti-file" style={{ color: "#185FA5", marginRight: 6 }} /> Bulletin de situation scanné
          </h3>
          <div style={{ background: "#dbe7f5", padding: 10, borderRadius: 6 }}>
            <a href={pat.bs_file_url} target="_blank" rel="noopener noreferrer" style={{ color: "#185FA5", fontWeight: 700, textDecoration: "none" }}>
              <i className="ti ti-external-link" /> Ouvrir le document scanné
            </a>
            {pat.bs_ocr_date && (
              <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 4 }}>
                OCR effectué le {new Date(pat.bs_ocr_date).toLocaleString()}
              </div>
            )}
          </div>
        </Panel>
      ) : (
        <Panel style={{ marginBottom: 12, background: "#f4f7fa" }}>
          <p style={{ fontSize: 12.5, color: "#6c7a89", margin: 0 }}>
            <i className="ti ti-info-circle" /> Pas de bulletin scanné. Pour créer un patient depuis un bulletin de situation, utilise le menu <b>Outils scan → Créer patient depuis bulletin</b>.
          </p>
        </Panel>
      )}

      {pat.bs_ocr_brut && (
        <Panel>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>
            <i className="ti ti-clipboard-text" style={{ color: "#7a6fb0", marginRight: 6 }} /> Texte OCR brut
          </h3>
          <details>
            <summary style={{ fontSize: 11.5, color: "#6c7a89", cursor: "pointer" }}>Voir ({pat.bs_ocr_brut.length} caractères)</summary>
            <pre style={{ background: "#142131", color: "#e8edf2", padding: 10, borderRadius: 6, fontSize: 11, overflowX: "auto", marginTop: 6, maxHeight: 200, whiteSpace: "pre-wrap" }}>
              {pat.bs_ocr_brut}
            </pre>
          </details>
        </Panel>
      )}
    </>
  );
}

// =================== Composants utilitaires ===================

function Lbl({ children }) {
  return <div style={{ fontSize: 10.5, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginBottom: 4 }}>{children}</div>;
}

function Field({ label, value, onChange, type = "text", placeholder, required, mono, compact }) {
  return (
    <div>
      <Lbl>{label}{required && <span style={{ color: "#c0392b" }}> *</span>}</Lbl>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: compact ? "6px 8px" : "8px 10px",
          border: "1px solid #d3d9e0", borderRadius: 6,
          fontSize: compact ? 12 : 13, fontFamily: mono ? "Consolas, monospace" : "inherit",
          background: "#fff",
        }}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.lbl}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, value, onChange, color }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px",
      background: value ? `${color}15` : "#f4f7fa",
      border: `1px solid ${value ? color + "40" : "#e3e9ee"}`,
      borderRadius: 6, cursor: "pointer",
      transition: "all .15s",
    }}>
      <input type="checkbox" checked={value || false} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: color }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: value ? color : "#6c7a89" }}>{label}</span>
    </label>
  );
}

function KvBlock({ label, value }) {
  return (
    <div style={{ background: "#f4f7fa", borderRadius: 6, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: "#142131" }}>{value}</div>
    </div>
  );
}
