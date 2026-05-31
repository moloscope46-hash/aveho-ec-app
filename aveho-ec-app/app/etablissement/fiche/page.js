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
import { logEvent } from "../../../lib/events";
import { safeUpdate } from "../../../lib/safeWrite";

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
            {/* Alpha 0.55.0 — Import FINESS */}
            <Panel style={{ marginBottom: 14, background: "linear-gradient(135deg, #eef9ef 0%, #fff 100%)", borderColor: "#bfe2bf" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>
                <i className="ti ti-database-search" style={{ color: "#5aa05a", marginRight: 6 }} /> 
                Import depuis la base FINESS officielle
              </h3>
              <p style={{ fontSize: 12, color: "#2e6f33", margin: "0 0 12px", lineHeight: 1.5 }}>
                Cherchez votre établissement par nom, ville ou n° FINESS dans le <b>Fichier National des Établissements Sanitaires et Sociaux</b> (data.gouv.fr / Atlasanté). 
                Toutes les infos (adresse, géolocalisation, FINESS, SIRET, catégorie) seront pré-remplies automatiquement.
              </p>
              <FinessSearch
                onSelect={handleFinessImport}
                placeholder="Ex : CHU Bordeaux, EHPAD Les Mimosas, 750712184…"
              />
            </Panel>

            <Panel style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
                <i className="ti ti-info-circle" style={{ color: "#185FA5", marginRight: 6 }} /> 
                Identité
              </h3>
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
