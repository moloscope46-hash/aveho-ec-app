"use client";
// =============================================================
//  /collectivite — Fiche Groupement (anciennement "Collectivité")
//  Alpha 0.55.6
//
//  - Renommé "Groupement" partout dans l'UI
//  - Recherche SIRENE intégrée pour pré-remplir tous les champs
//  - Cards d'établissements cliquables → popup arborescence bâtiments
//  - Tous les champs SIRENE enrichis (NAF, effectifs, nature juridique…)
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn } from "../ui";
// 0.58.49 : migration UI premium
import { EmptyState, SkeletonRow } from "../components/ui-premium";
import { dialogs } from "../dialogs";
import SireneSearch from "../SireneSearch";
import { safeUpdate } from "../../lib/safeWrite";
import { logEvent } from "../../lib/events";

export default function GroupementPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [fiche, setFiche] = useState(null);
  const [form, setForm] = useState({});
  const [etabs, setEtabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // Modal popup "Bâtiments de [étab]"
  const [popupEtab, setPopupEtab] = useState(null);
  const [popupTree, setPopupTree] = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);
  // 0.58.35 : onglet actif du popup établissement (bats | equipes)
  const [popupTab, setPopupTab] = useState("bats");
  // 0.58.36 : onglets de la page /collectivite (identite | activite | localisation | etablissements)
  const [activeTab, setActiveTab] = useState("identite");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("av-collectivite-tab");
      if (saved && ["identite", "activite", "localisation", "etablissements"].includes(saved)) {
        setActiveTab(saved);
      }
    } catch {}
  }, []);
  function switchTab(t) {
    setActiveTab(t);
    try { localStorage.setItem("av-collectivite-tab", t); } catch {}
  }

  const isAdmin = auth.role?.nom === "Administrateur" || (auth.can && auth.can("gerer_roles"));

  async function load() {
    const [{ data: st }, { data: es }] = await Promise.all([
      supabase.from("structures").select("*").eq("id", auth.structureId).maybeSingle(),
      supabase.from("etablissements").select("*").eq("structure_id", auth.structureId).order("nom"),
    ]);
    // 0.58.31 : EXCLURE les partenaires du listing groupement (les partenaires
    //  ne font pas partie du groupement, ils sont gérés dans /etablissements-partenaires)
    const etabsNonPartenaires = (es || []).filter(e => !e.est_partenaire);
    setFiche(st); setForm(st || {}); setEtabs(etabsNonPartenaires);
    setLoading(false);
  }
  useEffect(() => { if (auth.ready && auth.structureId) load(); }, [auth.ready, auth.structureId]);

  function handleSireneImport(data) {
    setForm({
      ...form,
      nom: data.nom || form.nom,
      nom_complet: data.nom || form.nom_complet,
      sigle: data.sigle || form.sigle,
      siret: data.siret || form.siret,
      siren: data.siren || form.siren,
      adresse: data.adresse || form.adresse,
      code_postal: data.code_postal || form.code_postal,
      ville: data.ville || form.ville,
      latitude: data.latitude || form.latitude,
      longitude: data.longitude || form.longitude,
      // Ces champs SireneSearch les renvoie en raw, on les retrouve via le state cidessous
    });
    // On stocke aussi les méta SIRENE dans un state séparé (depuis le raw r)
  }

  function handleSireneRaw(r) {
    // Appelé par SireneSearch onSelect - on récupère TOUS les champs
    setForm(prev => ({
      ...prev,
      nom: r.nom_complet || prev.nom,
      nom_complet: r.nom_complet,
      sigle: r.sigle || "",
      siret: r.siret || "",
      siren: r.siren || "",
      activite_principale: r.activite_principale || "",
      libelle_activite: r.libelle_activite || "",
      categorie_entreprise: r.categorie_entreprise || "",
      tranche_effectifs: r.effectifs || "",
      nature_juridique: r.nature_juridique || "",
      date_creation: r.date_creation || null,
      nombre_etablissements: r.nombre_etablissements || null,
      adresse: r.adresse || prev.adresse,
      code_postal: r.code_postal || prev.code_postal,
      ville: r.ville || prev.ville,
      latitude: r.latitude || prev.latitude,
      longitude: r.longitude || prev.longitude,
    }));
  }

  async function saveFiche() {
    if (!isAdmin) return;
    setBusy(true);
    try {
      const payload = {
        nom: form.nom?.trim(),
        nom_complet: form.nom_complet || null,
        sigle: form.sigle || null,
        siret: form.siret || null,
        siren: form.siren || null,
        activite_principale: form.activite_principale || null,
        libelle_activite: form.libelle_activite || null,
        categorie_entreprise: form.categorie_entreprise || null,
        tranche_effectifs: form.tranche_effectifs || null,
        nature_juridique: form.nature_juridique || null,
        date_creation: form.date_creation || null,
        nombre_etablissements: form.nombre_etablissements || null,
        adresse: form.adresse || null,
        code_postal: form.code_postal || null,
        ville: form.ville || null,
        telephone: form.telephone || null,
        email: form.email || null,
        site_web: form.site_web || null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        notes: form.notes || null,
      };
      await safeUpdate(supabase, "structures", payload, { id: auth.structureId }, { userId: auth.user?.id });
      await logEvent(supabase, auth, { 
        action: "modifier", entite: "groupement", entite_id: auth.structureId,
        details: { nom: payload.nom, source: form.siret ? "sirene" : "manuel" },
      });
      setSavedMsg("Fiche groupement enregistrée.");
      setTimeout(() => setSavedMsg(""), 2500);
      await load();
    } catch (e) {
      await dialogs.alert({ title: "Erreur", message: e.message });
    } finally {
      setBusy(false);
    }
  }

  // Click sur un étab → ouvre popup avec sa hiérarchie bâtiments/étages/services
  async function openEtabPopup(etab) {
    setPopupEtab(etab);
    setPopupLoading(true);
    setPopupTree(null);
    try {
      // On charge les bâtiments rattachés à cet étab (via etablissement_id ajouté en 0.55.6)
      const { data: bats } = await supabase
        .from("batiments")
        .select("id, nom")
        .eq("etablissement_id", etab.id)
        .order("nom");
      
      // Charger les étages, services, chambres pour ces bâtiments
      const batIds = (bats || []).map(b => b.id);
      let etages = [], services = [], chambres = [], lits = [], equipes = [];
      if (batIds.length > 0) {
        const r1 = await supabase.from("etages").select("id, nom, batiment_id").in("batiment_id", batIds).order("nom");
        etages = r1.data || [];
        const etagIds = etages.map(e => e.id);
        if (etagIds.length > 0) {
          const r2 = await supabase.from("services").select("id, nom, etage_id").in("etage_id", etagIds).order("nom");
          services = r2.data || [];
          const svcIds = services.map(s => s.id);
          if (svcIds.length > 0) {
            const r3 = await supabase.from("chambres").select("id, nom, service_id").in("service_id", svcIds).order("nom");
            chambres = r3.data || [];
            const chIds = chambres.map(c => c.id);
            if (chIds.length > 0) {
              const r4 = await supabase.from("lits").select("id, nom, chambre_id, patient_id").in("chambre_id", chIds).order("nom");
              lits = r4.data || [];
            }
          }
        }
        // 0.58.35 : charge aussi les équipes liées à ces bâtiments
        const r5 = await supabase
          .from("equipes")
          .select("id, nom, description, couleur, batiment_id, archive")
          .in("batiment_id", batIds)
          .or("archive.is.null,archive.eq.false")
          .order("nom");
        equipes = r5.data || [];
      }
      setPopupTree({ bats: bats || [], etages, services, chambres, lits, equipes });
    } catch (e) {
      await dialogs.alert({ title: "Erreur", message: e.message });
    } finally {
      setPopupLoading(false);
    }
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead 
          eyebrow="STRUCTURE ORGANISATIONNELLE" 
          icon="ti-building-community"
          title="Groupement" 
          accent={auth.structureNom}
          sub="Personne morale qui regroupe vos établissements"
        />

        {loading ? (
          <Panel>
            <SkeletonRow count={5} />
          </Panel>
        ) : (
          <>
            {/* 0.58.36 : barre d'onglets premium */}
            <div style={{
              display: "flex",
              gap: 4,
              marginBottom: 18,
              borderBottom: "2px solid #e3e9ee",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              flexWrap: "nowrap",
            }} className="av-collectivite-tabs" role="tablist">
              {[
                { id: "identite",      label: "Identité",      icon: "ti-id-badge-2", color: "#185FA5" },
                { id: "activite",      label: "Activité",      icon: "ti-briefcase",  color: "#7a6fb0" },
                { id: "localisation",  label: "Localisation",  icon: "ti-map-pin",    color: "#5aa05a" },
                { id: "etablissements", label: `Établissements (${etabs.length})`, icon: "ti-buildings", color: "#EF9F27" },
              ].map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => switchTab(t.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === t.id ? `3px solid ${t.color}` : "3px solid transparent",
                    marginBottom: -2,
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: activeTab === t.id ? 700 : 500,
                    color: activeTab === t.id ? t.color : "#6c7a89",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 150ms",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  <i className={`ti ${t.icon}`} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Onglet IDENTITÉ : SIRENE + Identité */}
            {activeTab === "identite" && (<>
              {/* Bloc Import SIRENE */}
              {isAdmin && (
              <Panel style={{ marginBottom: 18, background: "linear-gradient(135deg, #fff8ec 0%, #fff 100%)", borderColor: "#f0d59f", position: "relative", zIndex: 50 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>
                  <i className="ti ti-building-store" style={{ color: "#EF9F27", marginRight: 6 }} /> 
                  Import depuis l'Annuaire des Entreprises (SIRENE)
                </h3>
                <p style={{ fontSize: 12, color: "#7a4f15", margin: "0 0 12px", lineHeight: 1.5 }}>
                  Cherche ton groupement par <b>raison sociale</b>, <b>SIRET</b> ou <b>SIREN</b> dans l'Annuaire INSEE officiel pour pré-remplir automatiquement tous les champs.
                </p>
                <SireneSearch
                  onSelect={handleSireneRaw}
                  placeholder="Ex : ASSOCIATION HOSPITALIÈRE…, 65201405100013, 652014051"
                />
              </Panel>
            )}

            {/* Bloc Identité */}
            <Panel style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
                <i className="ti ti-id-badge-2" style={{ color: "#185FA5", marginRight: 6 }} /> Identité
              </h3>
              {savedMsg && (
                <div style={{ padding: "8px 12px", marginBottom: 12, background: "#eef9ef", border: "1px solid #bfe2bf", borderRadius: 8, fontSize: 12.5, color: "#2e6f33" }}>
                  <i className="ti ti-check" /> {savedMsg}
                </div>
              )}
              <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <Fld label="Nom usuel *">
                  <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} style={inputStyle} disabled={!isAdmin} />
                </Fld>
                <Fld label="Sigle">
                  <input value={form.sigle || ""} onChange={(e) => setForm({ ...form, sigle: e.target.value })} placeholder="Ex : APHP" style={inputStyle} disabled={!isAdmin} />
                </Fld>
              </div>
              <Fld label="Raison sociale officielle">
                <input value={form.nom_complet || ""} onChange={(e) => setForm({ ...form, nom_complet: e.target.value })} style={inputStyle} disabled={!isAdmin} />
              </Fld>
              <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Fld label="SIRET (siège, 14 chiffres)">
                  <input value={form.siret || ""} onChange={(e) => setForm({ ...form, siret: e.target.value })} placeholder="14 chiffres" style={inputStyle} disabled={!isAdmin} />
                </Fld>
                <Fld label="SIREN (entité, 9 chiffres)">
                  <input value={form.siren || ""} onChange={(e) => setForm({ ...form, siren: e.target.value })} placeholder="9 chiffres" style={inputStyle} disabled={!isAdmin} />
                </Fld>
              </div>
            </Panel>
            </>)}

            {/* Onglet ACTIVITÉ */}
            {activeTab === "activite" && (
            <Panel style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
                <i className="ti ti-briefcase" style={{ color: "#7a6fb0", marginRight: 6 }} /> Activité & structure
              </h3>
              <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <Fld label="Code APE / NAF">
                  <input value={form.activite_principale || ""} onChange={(e) => setForm({ ...form, activite_principale: e.target.value })} placeholder="Ex : 87.10A" style={inputStyle} disabled={!isAdmin} />
                </Fld>
                <Fld label="Libellé activité principale">
                  <input value={form.libelle_activite || ""} onChange={(e) => setForm({ ...form, libelle_activite: e.target.value })} style={inputStyle} disabled={!isAdmin} />
                </Fld>
              </div>
              <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <Fld label="Catégorie">
                  <select value={form.categorie_entreprise || ""} onChange={(e) => setForm({ ...form, categorie_entreprise: e.target.value })} style={inputStyle} disabled={!isAdmin}>
                    <option value="">—</option>
                    <option value="TPE">TPE</option>
                    <option value="PME">PME</option>
                    <option value="ETI">ETI</option>
                    <option value="GE">GE (Grande Entreprise)</option>
                  </select>
                </Fld>
                <Fld label="Tranche effectif">
                  <input value={form.tranche_effectifs || ""} onChange={(e) => setForm({ ...form, tranche_effectifs: e.target.value })} placeholder="Ex : 200-249" style={inputStyle} disabled={!isAdmin} />
                </Fld>
                <Fld label="Nature juridique">
                  <input value={form.nature_juridique || ""} onChange={(e) => setForm({ ...form, nature_juridique: e.target.value })} placeholder="Code" style={inputStyle} disabled={!isAdmin} />
                </Fld>
              </div>
              <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Fld label="Date de création">
                  <input type="date" value={form.date_creation || ""} onChange={(e) => setForm({ ...form, date_creation: e.target.value })} style={inputStyle} disabled={!isAdmin} />
                </Fld>
                <Fld label="Nombre d'établissements (Sirene)">
                  <input type="number" value={form.nombre_etablissements || ""} onChange={(e) => setForm({ ...form, nombre_etablissements: e.target.value })} style={inputStyle} disabled={!isAdmin} />
                </Fld>
              </div>
            </Panel>
            )}

            {/* Onglet LOCALISATION : Adresse + Contact */}
            {activeTab === "localisation" && (<>
            <Panel style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
                <i className="ti ti-map-pin" style={{ color: "#5aa05a", marginRight: 6 }} /> Adresse du siège
              </h3>
              <Fld label="Adresse complète">
                <input value={form.adresse || ""} onChange={(e) => setForm({ ...form, adresse: e.target.value })} style={inputStyle} disabled={!isAdmin} />
              </Fld>
              <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <Fld label="Code postal">
                  <input value={form.code_postal || ""} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} style={inputStyle} disabled={!isAdmin} />
                </Fld>
                <Fld label="Ville">
                  <input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} style={inputStyle} disabled={!isAdmin} />
                </Fld>
              </div>
              <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Fld label="Latitude">
                  <input value={form.latitude || ""} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="Ex : 48.8534" style={inputStyle} disabled={!isAdmin} />
                </Fld>
                <Fld label="Longitude">
                  <input value={form.longitude || ""} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="Ex : 2.3488" style={inputStyle} disabled={!isAdmin} />
                </Fld>
              </div>
            </Panel>

            <Panel style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
                <i className="ti ti-phone" style={{ color: "#EF9F27", marginRight: 6 }} /> Contact
              </h3>
              <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Fld label="Téléphone">
                  <input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} style={inputStyle} disabled={!isAdmin} />
                </Fld>
                <Fld label="Email">
                  <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} disabled={!isAdmin} />
                </Fld>
              </div>
              <Fld label="Site web">
                <input type="url" value={form.site_web || ""} onChange={(e) => setForm({ ...form, site_web: e.target.value })} placeholder="https://…" style={inputStyle} disabled={!isAdmin} />
              </Fld>
              <Fld label="Notes internes">
                <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }} disabled={!isAdmin} />
              </Fld>
            </Panel>
            </>)}

            {/* Bouton Save : visible sur tous les onglets de fiche groupement (sauf etablissements) */}
            {isAdmin && activeTab !== "etablissements" && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
                <Btn variant="primary" icon="ti-device-floppy" onClick={saveFiche} disabled={busy}>
                  {busy ? "Enregistrement…" : "Enregistrer la fiche groupement"}
                </Btn>
              </div>
            )}

            {/* Onglet ÉTABLISSEMENTS : en dernier (0.58.36) */}
            {activeTab === "etablissements" && (<>
            {/* Liste des établissements en cards */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <PageHead
                small
                icon="ti-buildings"
                title="Établissements du groupement"
                sub={`${etabs.length} établissement${etabs.length > 1 ? "s" : ""} rattaché${etabs.length > 1 ? "s" : ""}. Clique sur une carte pour voir sa hiérarchie de bâtiments.`}
              />
              {/* 0.58.31 : Bouton créer un établissement (redirige vers /etablissements pour FINESS lookup) */}
              {isAdmin && (
                <button
                  onClick={() => router.push("/etablissements?create=1")}
                  style={{
                    background: "linear-gradient(135deg, #2a7ed1, #185FA5)",
                    color: "#fff",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 4px 12px rgba(24,95,165,.35)",
                    transition: "all .15s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(24,95,165,.45)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(24,95,165,.35)"; }}
                >
                  <i className="ti ti-plus" /> Créer un établissement
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginTop: 14 }}>
              {etabs.map(etab => (
                <button
                  key={etab.id}
                  onClick={() => openEtabPopup(etab)}
                  style={{
                    background: "#fff",
                    border: "1px solid #e3e9ee",
                    borderRadius: 12,
                    padding: 14,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    transition: "all .15s",
                    boxShadow: "0 1px 3px rgba(0,0,0,.03)",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#185FA5"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(20,33,49,.10)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e3e9ee"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.03)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: "#eef5fc",
                      color: "#185FA5",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <i className="ti ti-building-hospital" style={{ fontSize: 20 }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#142131", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{etab.nom}</div>
                      <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 1 }}>
                        {etab.type || "—"} · {etab.ville || "—"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {etab.finess && (
                      <span style={{ background: "#eef5fc", color: "#185FA5", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 6 }}>FINESS {etab.finess}</span>
                    )}
                    {etab.capacite && (
                      <span style={{ background: "#fff3da", color: "#7a4f15", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 6 }}>🛏 {etab.capacite} lits</span>
                    )}
                  </div>
                  {/* 0.58.31 : 2 actions footer — Bâtiments + Équipe & Services */}
                  <div style={{ marginTop: 10, display: "flex", gap: 6, fontSize: 11 }}>
                    <div style={{
                      flex: 1,
                      color: "#185FA5",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "5px 8px",
                      background: "#eef5fc",
                      borderRadius: 6,
                      fontWeight: 600,
                    }}>
                      <i className="ti ti-stack-2" />
                      <span>Bâtiments</span>
                    </div>
                    <span
                      onClick={(e) => { e.stopPropagation(); router.push(`/etablissement?etab=${etab.id}`); }}
                      style={{
                        color: "#7a6fb0",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 10px",
                        background: "#f4f0fa",
                        borderRadius: 6,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "background 150ms",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#e8e0f3"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#f4f0fa"; }}
                      title="Voir équipes & services de cet établissement"
                    >
                      <i className="ti ti-sitemap" />
                      <span>Équipe</span>
                    </span>
                  </div>
                </button>
              ))}
              {etabs.length === 0 && (
                <Panel>
                  <EmptyState
                    icon="ti-building-skyscraper"
                    title="Aucun établissement"
                    description="Aucun établissement n'est rattaché au groupement pour le moment. Utilisez le bouton ci-dessus pour en créer un."
                  />
                </Panel>
              )}
            </div>
            </>)}
          </>
        )}

        {/* Popup établissement : Bâtiments + Équipes & Services (0.58.35 : onglets) */}
        {popupEtab && (
          <Modal
            open={true}
            onClose={() => { setPopupEtab(null); setPopupTree(null); setPopupTab("bats"); }}
            title={`${popupEtab.nom}`}
            footer={<>
              <Btn variant="ghost" onClick={() => { setPopupEtab(null); setPopupTree(null); setPopupTab("bats"); }}>Fermer</Btn>
              <Btn variant="primary" icon="ti-edit" onClick={() => { window.location.href = "/etablissement/edition"; }}>
                Éditer la hiérarchie
              </Btn>
            </>}
          >
            {popupLoading ? (
              <StateMsg>Chargement de la hiérarchie…</StateMsg>
            ) : popupTree ? (
              <>
                {/* 0.58.35 : onglets Bâtiments / Équipes */}
                <div style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 16,
                  borderBottom: "2px solid #f0f4f7",
                  paddingBottom: 0,
                }}>
                  <button
                    onClick={() => setPopupTab("bats")}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: popupTab === "bats" ? "3px solid #185FA5" : "3px solid transparent",
                      marginBottom: -2,
                      padding: "10px 16px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: popupTab === "bats" ? 700 : 500,
                      color: popupTab === "bats" ? "#185FA5" : "#6c7a89",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 150ms",
                    }}
                  >
                    <i className="ti ti-stack-2" />
                    Bâtiments
                    <span style={{
                      background: popupTab === "bats" ? "#185FA5" : "#cfd8e0",
                      color: "#fff",
                      borderRadius: 10,
                      padding: "1px 7px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      marginLeft: 4,
                    }}>{popupTree.bats.length}</span>
                  </button>
                  <button
                    onClick={() => setPopupTab("equipes")}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: popupTab === "equipes" ? "3px solid #7a6fb0" : "3px solid transparent",
                      marginBottom: -2,
                      padding: "10px 16px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: popupTab === "equipes" ? 700 : 500,
                      color: popupTab === "equipes" ? "#7a6fb0" : "#6c7a89",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 150ms",
                    }}
                  >
                    <i className="ti ti-sitemap" />
                    Équipes &amp; Services
                    <span style={{
                      background: popupTab === "equipes" ? "#7a6fb0" : "#cfd8e0",
                      color: "#fff",
                      borderRadius: 10,
                      padding: "1px 7px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      marginLeft: 4,
                    }}>{(popupTree.equipes?.length || 0) + (popupTree.services?.length || 0)}</span>
                  </button>
                </div>

                {/* Contenu de l'onglet actif */}
                {popupTab === "bats" && <TreeView tree={popupTree} />}
                {popupTab === "equipes" && (
                  <EquipesServicesView tree={popupTree} onOpenEquipe={(id) => { window.location.href = `/equipe/${id}`; }} />
                )}
              </>
            ) : (
              <StateMsg>Aucune donnée.</StateMsg>
            )}
          </Modal>
        )}
      </div>
    </div>
  );
}

function Fld({ label, children }) {
  return (
    <div className="fld" style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 12px",
  border: "1px solid #e3e9ee", borderRadius: 8,
  fontFamily: "inherit", fontSize: 13.5,
};

// Vue arborescente bâtiments > étages > services > chambres > lits
function TreeView({ tree }) {
  const { bats, etages, services, chambres, lits } = tree;
  
  if (bats.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <i className="ti ti-stack-2" style={{ fontSize: 32, color: "#c0c8d2" }} />
        <div style={{ marginTop: 8, fontSize: 13, color: "#6c7a89" }}>
          Aucun bâtiment rattaché à cet établissement.
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: "#8a98a8" }}>
          Va dans <a href="/etablissement/edition" style={{ color: "#185FA5", fontWeight: 600 }}>Édition hiérarchie</a> pour en créer.
        </div>
      </div>
    );
  }

  // Stats
  const totalLitsOccupes = lits.filter(l => l.patient_id).length;
  
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Stat icon="ti-building-warehouse" color="#185FA5" value={bats.length} label="Bâtiments" />
        <Stat icon="ti-stairs" color="#7a6fb0" value={etages.length} label="Étages" />
        <Stat icon="ti-door" color="#5aa05a" value={services.length} label="Services" />
        <Stat icon="ti-door-enter" color="#7CC8C8" value={chambres.length} label="Chambres" />
        <Stat icon="ti-bed" color="#EF9F27" value={`${totalLitsOccupes}/${lits.length}`} label="Lits occupés" />
      </div>

      <div style={{ background: "#f4f7fa", borderRadius: 8, padding: 12 }}>
        {bats.map(bat => {
          const etagesOfBat = etages.filter(e => e.batiment_id === bat.id);
          return (
            <div key={bat.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#185FA5", fontSize: 13 }}>
                <i className="ti ti-building-warehouse" /> {bat.nom}
                <span style={{ fontSize: 10, fontWeight: 500, color: "#8a98a8" }}>({etagesOfBat.length} étage{etagesOfBat.length > 1 ? "s" : ""})</span>
              </div>
              {etagesOfBat.map(etage => {
                const svcsOfEtage = services.filter(s => s.etage_id === etage.id);
                return (
                  <div key={etage.id} style={{ marginLeft: 18, marginTop: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7a6fb0", fontSize: 12.5, fontWeight: 600 }}>
                      <i className="ti ti-stairs" /> {etage.nom}
                      <span style={{ fontSize: 10, fontWeight: 500, color: "#8a98a8" }}>({svcsOfEtage.length} service{svcsOfEtage.length > 1 ? "s" : ""})</span>
                    </div>
                    {svcsOfEtage.map(svc => {
                      const chOfSvc = chambres.filter(c => c.service_id === svc.id);
                      const litsOfSvc = lits.filter(l => chOfSvc.find(c => c.id === l.chambre_id));
                      const occupes = litsOfSvc.filter(l => l.patient_id).length;
                      return (
                        <div key={svc.id} style={{ marginLeft: 18, marginTop: 4, padding: "4px 10px", background: "#fff", borderRadius: 6, fontSize: 12, color: "#2a3a48", display: "flex", alignItems: "center", gap: 6 }}>
                          <i className="ti ti-door" style={{ color: "#5aa05a" }} /> 
                          <b>{svc.nom}</b>
                          <span style={{ fontSize: 10.5, color: "#8a98a8", marginLeft: "auto" }}>
                            {chOfSvc.length} ch. · {litsOfSvc.length} lit{litsOfSvc.length > 1 ? "s" : ""} 
                            {litsOfSvc.length > 0 && <> · <span style={{ color: occupes > 0 ? "#EF9F27" : "#5aa05a" }}>{occupes} occupé{occupes > 1 ? "s" : ""}</span></>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon, color, value, label }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, flex: "1 1 100px", minWidth: 0 }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 18, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#142131", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".3px", fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

// =============================================================
//  0.58.35 : Vue Équipes & Services dans le popup établissement
//
//  Affiche les équipes de l'établissement (groupées par bâtiment),
//  ainsi que la liste des services. Permet d'accéder rapidement à
//  la page de détail d'une équipe (/equipe/{id}).
// =============================================================
function EquipesServicesView({ tree, onOpenEquipe }) {
  if (!tree) return null;
  const equipesParBat = {};
  (tree.equipes || []).forEach(eq => {
    const key = eq.batiment_id || "_sans_bat";
    if (!equipesParBat[key]) equipesParBat[key] = [];
    equipesParBat[key].push(eq);
  });

  const batsAvecEquipes = (tree.bats || []).filter(b => (equipesParBat[b.id] || []).length > 0);
  const equipesTransversales = equipesParBat._sans_bat || [];

  // Services groupés par bâtiment (via étage)
  const etageBatMap = {};
  (tree.etages || []).forEach(e => { etageBatMap[e.id] = e.batiment_id; });
  const servicesParBat = {};
  (tree.services || []).forEach(s => {
    const batId = etageBatMap[s.etage_id] || "_sans_bat";
    if (!servicesParBat[batId]) servicesParBat[batId] = [];
    servicesParBat[batId].push(s);
  });

  return (
    <div>
      {/* Équipes par bâtiment */}
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#7a6fb0", display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-users" /> Équipes ({tree.equipes?.length || 0})
        </h3>
        {(tree.equipes?.length || 0) === 0 ? (
          <div style={{
            padding: "16px",
            background: "#f4f0fa",
            borderRadius: 10,
            border: "1px dashed #d7c9eb",
            color: "#5a4a90",
            fontSize: 13,
            textAlign: "center",
          }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
            Aucune équipe constituée pour cet établissement. Va dans <a href="/equipes" style={{ color: "#7a6fb0", fontWeight: 600 }}>/equipes</a> pour en créer.
          </div>
        ) : (
          <>
            {batsAvecEquipes.map(b => (
              <div key={b.id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#185FA5", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="ti ti-building" /> {b.nom}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                  {equipesParBat[b.id].map(eq => (
                    <EquipeCard key={eq.id} equipe={eq} onClick={() => onOpenEquipe?.(eq.id)} />
                  ))}
                </div>
              </div>
            ))}
            {equipesTransversales.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#7CC8C8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="ti ti-arrows-shuffle" /> Équipes transversales (sans bâtiment)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                  {equipesTransversales.map(eq => (
                    <EquipeCard key={eq.id} equipe={eq} onClick={() => onOpenEquipe?.(eq.id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Services par bâtiment */}
      <div>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#EF9F27", display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-stethoscope" /> Services ({tree.services?.length || 0})
        </h3>
        {(tree.services?.length || 0) === 0 ? (
          <div style={{
            padding: "16px",
            background: "#fff8ec",
            borderRadius: 10,
            border: "1px dashed #f0d59f",
            color: "#7a4f15",
            fontSize: 13,
            textAlign: "center",
          }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
            Aucun service défini pour cet établissement.
          </div>
        ) : (
          <>
            {(tree.bats || []).filter(b => (servicesParBat[b.id] || []).length > 0).map(b => (
              <div key={b.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#185FA5", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="ti ti-building" /> {b.nom}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {servicesParBat[b.id].map(s => (
                    <span key={s.id} style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      background: "#fff",
                      border: "1px solid #f0d59f",
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#7a4f15",
                    }}>
                      <i className="ti ti-stethoscope" style={{ color: "#EF9F27" }} />
                      {s.nom}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function EquipeCard({ equipe, onClick }) {
  const couleur = equipe.couleur || "#7a6fb0";
  return (
    <button
      onClick={onClick}
      style={{
        background: "#fff",
        border: `1px solid ${couleur}40`,
        borderLeft: `4px solid ${couleur}`,
        borderRadius: 10,
        padding: "10px 12px",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        transition: "all 150ms",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = `0 4px 12px ${couleur}33`;
        e.currentTarget.style.background = `${couleur}08`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.background = "#fff";
      }}
      title={equipe.description || equipe.nom}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${couleur}22`,
        color: couleur,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        fontSize: 15,
      }}>
        <i className="ti ti-users" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#142131", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {equipe.nom}
        </div>
        {equipe.description && (
          <div style={{ fontSize: 11, color: "#6c7a89", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {equipe.description}
          </div>
        )}
      </div>
      <i className="ti ti-chevron-right" style={{ color: couleur, opacity: 0.6 }} />
    </button>
  );
}
