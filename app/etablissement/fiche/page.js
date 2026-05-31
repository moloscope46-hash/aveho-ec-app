"use client";
// =============================================================
//  /etablissement/fiche — Édition fiche établissement
//  Alpha 0.54.0 (AX) — Avec autocomplete adresse + géoloc auto
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, StateMsg } from "../../ui";
import { dialogs } from "../../dialogs";
import AddressAutocomplete from "../../AddressAutocomplete";
import FinessSearch from "../../FinessSearch";
import SireneSearch from "../../SireneSearch";
import { logEvent } from "../../../lib/events";
import { safeUpdate } from "../../../lib/safeWrite";
import EtabPhoto from "../../components/EtabPhoto";

const TYPES_ETAB = [
  "EHPAD", "EHPA", "Hôpital", "Clinique", "Foyer", 
  "USLD", "MAS", "FAM", "IME", "Résidence autonomie", "Autre"
];

export default function FicheEtablissementPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [etab, setEtab] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  // 0.55.6 : tabs FINESS/SIRENE
  const [importSource, setImportSource] = useState("finess");

  const isAdmin = auth.role?.nom === "Administrateur" || (auth.can && auth.can("gerer_roles"));

  async function load() {
    if (!auth.etabId) { setLoading(false); return; }
    const { data } = await supabase
      .from("etablissements")
      .select("*")
      .eq("id", auth.etabId)
      .maybeSingle();
    setEtab(data);
    setForm(data || {});
    setLoading(false);
  }

  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.etabId]);

  function handleAddressSelect(addr) {
    setForm({
      ...form,
      adresse: addr.label,
      code_postal: addr.cp,
      ville: addr.ville,
      latitude: addr.lat,
      longitude: addr.lng,
    });
  }

  // Alpha 0.55.0 : import depuis FINESS data.gouv.fr
  function handleFinessImport(etab) {
    setForm({
      ...form,
      nom: etab.nom || form.nom,
      type: etab.type || form.type,
      finess: etab.finess || form.finess,
      siret: etab.siret || form.siret,
      adresse: etab.adresse || form.adresse,
      code_postal: etab.code_postal || form.code_postal,
      ville: etab.ville || form.ville,
      telephone: etab.telephone || form.telephone,
      capacite: etab.capacite || form.capacite,
      latitude: etab.latitude || form.latitude,
      longitude: etab.longitude || form.longitude,
    });
  }

  // 0.55.6 : import depuis SIRENE (Annuaire des Entreprises)
  function handleSireneImport(etab) {
    setForm({
      ...form,
      nom: etab.nom || form.nom,
      type: etab.type || form.type,
      siret: etab.siret || form.siret,
      // siren n'a pas de champ dédié sur etablissements, on l'ignore (c'est le groupement qui le porte)
      adresse: etab.adresse || form.adresse,
      code_postal: etab.code_postal || form.code_postal,
      ville: etab.ville || form.ville,
      latitude: etab.latitude || form.latitude,
      longitude: etab.longitude || form.longitude,
    });
  }

  async function save() {
    if (!form.nom?.trim()) {
      await dialogs.alert({ title: "Le nom est obligatoire" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        nom: form.nom?.trim(),
        type: form.type || null,
        finess: form.finess?.trim() || null,
        siret: form.siret?.trim() || null,
        adresse: form.adresse?.trim() || null,
        code_postal: form.code_postal?.trim() || null,
        ville: form.ville?.trim() || null,
        telephone: form.telephone?.trim() || null,
        email: form.email?.trim() || null,
        capacite: form.capacite ? parseInt(form.capacite) : null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        // 0.55.47 : est_partenaire RETIRÉ du payload — verrouillé après création
        // pour éviter qu'un étab passe accidentellement de mine à partner ou vice versa
      };
      
      await safeUpdate(supabase, "etablissements", payload, { id: auth.etabId }, { userId: auth.user?.id });
      
      await logEvent(supabase, auth, {
        action: "modifier", entite: "etablissement", entite_id: auth.etabId,
        details: { nom: payload.nom, ville: payload.ville },
      });
      
      setSavedAt(new Date());
      await load();
    } catch (e) {
      await dialogs.alert({ title: "Erreur", message: e.message });
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg>Accès réservé aux administrateurs.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  if (!auth.etabId) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg>Sélectionne un établissement dans le menu pour éditer sa fiche.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        {/* 0.55.36 — Bannière photo de l'établissement */}
        {etab?.nom && (
          <div style={{ position: "relative", marginBottom: 14, borderRadius: 12, overflow: "hidden" }}>
            <EtabPhoto
              nom={etab.nom}
              ville={etab.ville}
              type={etab.type}
              height={180}
              borderRadius={12}
            />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(to top, rgba(20,33,49,0.88), rgba(20,33,49,0.2) 60%, transparent)",
              color: "#fff",
              padding: "30px 22px 16px",
            }}>
              <div style={{ fontSize: 11, letterSpacing: 2, fontWeight: 700, color: "#cfe4f5", marginBottom: 4 }}>
                ÉTABLISSEMENT
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{etab.nom}</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
                {etab.type || "—"}{etab.ville ? ` · ${etab.ville}` : ""}
                {etab.finess && <span style={{ marginLeft: 8, background: "rgba(255,255,255,0.18)", padding: "1px 8px", borderRadius: 6, fontSize: 11, fontFamily: "Consolas, monospace" }}>FINESS {etab.finess}</span>}
              </div>
            </div>
          </div>
        )}

        <PageHead
          eyebrow="ADMIN · ÉTABLISSEMENT"
          icon="ti-building-hospital"
          title="Fiche"
          accent={etab?.nom || "établissement"}
          sub="Coordonnées, géolocalisation et informations administratives"
        />

        {loading ? (
          <Panel><StateMsg>Chargement…</StateMsg></Panel>
        ) : (
          <>
            {/* Alpha 0.55.0 — Import FINESS / 0.55.6 — Import SIRENE */}
            <Panel style={{ marginBottom: 14, background: importSource === "finess" 
              ? "linear-gradient(135deg, #eef9ef 0%, #fff 100%)" 
              : "linear-gradient(135deg, #fff8ec 0%, #fff 100%)", 
              borderColor: importSource === "finess" ? "#bfe2bf" : "#f0d59f",
              // 0.55.7 : z-index élevé pour que le dropdown FINESS/SIRENE passe au-dessus des Panels suivants
              position: "relative", zIndex: 50,
            }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>
                <i className="ti ti-database-search" style={{ color: importSource === "finess" ? "#5aa05a" : "#EF9F27", marginRight: 6 }} /> 
                Import depuis une base officielle
              </h3>
              
              {/* Tabs FINESS / SIRENE */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10, borderBottom: "1px solid #e3e9ee" }}>
                <button
                  type="button"
                  onClick={() => setImportSource("finess")}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: importSource === "finess" ? "3px solid #5aa05a" : "3px solid transparent",
                    padding: "8px 14px",
                    fontSize: 12.5,
                    fontWeight: importSource === "finess" ? 700 : 500,
                    color: importSource === "finess" ? "#2e6f33" : "#6c7a89",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    marginBottom: -1,
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  <i className="ti ti-building-hospital" /> FINESS (établissements santé)
                </button>
                <button
                  type="button"
                  onClick={() => setImportSource("sirene")}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: importSource === "sirene" ? "3px solid #EF9F27" : "3px solid transparent",
                    padding: "8px 14px",
                    fontSize: 12.5,
                    fontWeight: importSource === "sirene" ? 700 : 500,
                    color: importSource === "sirene" ? "#7a4f15" : "#6c7a89",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    marginBottom: -1,
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  <i className="ti ti-building-store" /> SIRENE (entreprises)
                </button>
              </div>

              <p style={{ fontSize: 12, color: importSource === "finess" ? "#2e6f33" : "#7a4f15", margin: "0 0 12px", lineHeight: 1.5 }}>
                {importSource === "finess" ? (
                  <>Cherchez votre établissement par nom, ville ou n° FINESS dans le <b>Fichier National des Établissements Sanitaires et Sociaux</b>.</>
                ) : (
                  <>Cherchez votre établissement par nom, SIRET ou SIREN dans la base <b>SIRENE de l'INSEE</b> (Annuaire des Entreprises).</>
                )}
              </p>
              {importSource === "finess" ? (
                <FinessSearch
                  onSelect={handleFinessImport}
                  placeholder="Ex : CHU Bordeaux, EHPAD Les Mimosas, 750712184…"
                />
              ) : (
                <SireneSearch
                  onSelect={handleSireneImport}
                  placeholder="Ex : Domidep, Korian, 65201405100013…"
                />
              )}
            </Panel>

            <Panel style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
                <i className="ti ti-info-circle" style={{ color: "#185FA5", marginRight: 6 }} /> 
                Identité
              </h3>

              {/* 0.55.7 : sélecteur type établissement (collectivité vs partenaire)
                  0.55.47 : DÉSACTIVÉ en édition — le type est défini à la création */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  Type d'établissement
                  <span style={{
                    background: "#fff8ec", color: "#7a4f15",
                    fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 8,
                    textTransform: "none", letterSpacing: 0,
                  }}>
                    <i className="ti ti-lock" style={{ fontSize: 10 }} /> Verrouillé après création
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="modal-grid-2">
                  <div
                    style={{
                      background: !form.est_partenaire ? "linear-gradient(135deg, #185FA5, #1c5454)" : "#f4f7fa",
                      color: !form.est_partenaire ? "#fff" : "#a0aeb9",
                      border: `2px solid ${!form.est_partenaire ? "#185FA5" : "#e3e9ee"}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      fontFamily: "inherit",
                      textAlign: "left",
                      opacity: !form.est_partenaire ? 1 : 0.55,
                      cursor: "not-allowed",
                    }}
                    title="Le type d'établissement ne peut pas être modifié après création"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <i className="ti ti-home" style={{ fontSize: 16 }} />
                      <span style={{ fontWeight: 700, fontSize: 13 }}>Établissement de ma collectivité</span>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.35 }}>
                      Étab géré : patients, matériel, interventions. Disponible dans le switcher.
                    </div>
                  </div>
                  <div
                    style={{
                      background: form.est_partenaire ? "linear-gradient(135deg, #7CC8C8, #1c5454)" : "#f4f7fa",
                      color: form.est_partenaire ? "#fff" : "#a0aeb9",
                      border: `2px solid ${form.est_partenaire ? "#7CC8C8" : "#e3e9ee"}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      fontFamily: "inherit",
                      textAlign: "left",
                      opacity: form.est_partenaire ? 1 : 0.55,
                      cursor: "not-allowed",
                    }}
                    title="Le type d'établissement ne peut pas être modifié après création"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <i className="ti ti-route" style={{ fontSize: 16 }} />
                      <span style={{ fontWeight: 700, fontSize: 13 }}>Partenaire</span>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.35 }}>
                      Hôpital prescripteur, structure tierce. Référencé sans gestion patients/matériel.
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 6, padding: "6px 10px", background: "#fff8ec", border: "1px solid #f0d59f", borderRadius: 6, fontSize: 11, color: "#7a4f15" }}>
                  <i className="ti ti-info-circle" /> Pour changer un partenaire en étab géré (ou vice-versa), il faut <b>supprimer puis recréer</b> la fiche.
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                  <div>
                    <label style={fldLabel}>Nom *</label>
                    <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} style={fldInput} />
                  </div>
                  <div>
                    <label style={fldLabel}>Type</label>
                    <select value={form.type || ""} onChange={(e) => setForm({ ...form, type: e.target.value })} style={fldInput}>
                      <option value="">—</option>
                      {TYPES_ETAB.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={fldLabel}>N° FINESS</label>
                    <input value={form.finess || ""} onChange={(e) => setForm({ ...form, finess: e.target.value })} placeholder="9 chiffres" style={fldInput} />
                  </div>
                  <div>
                    <label style={fldLabel}>SIRET</label>
                    <input value={form.siret || ""} onChange={(e) => setForm({ ...form, siret: e.target.value })} placeholder="14 chiffres" style={fldInput} />
                  </div>
                </div>
                <div>
                  <label style={fldLabel}>Capacité (nombre de lits)</label>
                  <input type="number" value={form.capacite || ""} onChange={(e) => setForm({ ...form, capacite: e.target.value })} style={fldInput} />
                </div>
              </div>
            </Panel>

            <Panel style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
                <i className="ti ti-map-pin" style={{ color: "#5aa05a", marginRight: 6 }} /> 
                Adresse & géolocalisation
              </h3>
              <p style={{ fontSize: 12, color: "#6c7a89", margin: "0 0 12px" }}>
                Tape une adresse française — l'API de la Base Adresse Nationale propose des résultats. Sélectionne une suggestion et la latitude/longitude se remplissent automatiquement.
              </p>
              
              <div className="fld" style={{ marginBottom: 12 }}>
                <label style={fldLabel}>Adresse complète</label>
                <AddressAutocomplete
                  value={form.adresse || ""}
                  onSelect={handleAddressSelect}
                  placeholder="Commence à taper l'adresse…"
                />
              </div>
              
              <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={fldLabel}>Code postal</label>
                  <input value={form.code_postal || ""} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} style={fldInput} />
                </div>
                <div>
                  <label style={fldLabel}>Ville</label>
                  <input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} style={fldInput} />
                </div>
              </div>

              <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={fldLabel}>
                    <i className="ti ti-map-2" style={{ marginRight: 4 }} /> Latitude
                  </label>
                  <input 
                    value={form.latitude || ""} 
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })} 
                    placeholder="Ex : 48.8534" 
                    style={fldInput} 
                  />
                </div>
                <div>
                  <label style={fldLabel}>
                    <i className="ti ti-map-2" style={{ marginRight: 4 }} /> Longitude
                  </label>
                  <input 
                    value={form.longitude || ""} 
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })} 
                    placeholder="Ex : 2.3488" 
                    style={fldInput} 
                  />
                </div>
              </div>
              
              {form.latitude && form.longitude && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#eef9ef", borderRadius: 8, fontSize: 12, color: "#2e6f33" }}>
                  <i className="ti ti-check" /> Coordonnées GPS valides — l'établissement apparaîtra sur la <a href="/carte" style={{ color: "#185FA5", fontWeight: 600 }}>carte</a>
                </div>
              )}
            </Panel>

            <Panel style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
                <i className="ti ti-phone" style={{ color: "#7a6fb0", marginRight: 6 }} /> 
                Contact
              </h3>
              <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={fldLabel}>Téléphone</label>
                  <input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="01 23 45 67 89" style={fldInput} />
                </div>
                <div>
                  <label style={fldLabel}>Email</label>
                  <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@etab.fr" style={fldInput} />
                </div>
              </div>
            </Panel>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: "#6c7a89" }}>
                {savedAt && (
                  <span style={{ color: "#2e6f33" }}>
                    <i className="ti ti-check" /> Enregistré à {savedAt.toLocaleTimeString("fr-FR")}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" onClick={() => { setForm(etab || {}); }}>Annuler</Btn>
                <Btn variant="primary" icon="ti-device-floppy" onClick={save} disabled={busy}>
                  {busy ? "Enregistrement…" : "Enregistrer"}
                </Btn>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const fldLabel = { 
  display: "block", fontSize: 11, color: "#6c7a89", 
  fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px",
};
const fldInput = {
  width: "100%", padding: "8px 12px",
  border: "1px solid #e3e9ee", borderRadius: 8,
  fontFamily: "inherit", fontSize: 13.5,
};
