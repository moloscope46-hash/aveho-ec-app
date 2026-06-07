"use client";
// =============================================================
//  /had/[id] — Fiche détail HAD avec 7 onglets (0.62.69)
//  Infos / Collaborateurs / Véhicules / Garages / Étabs partenaires / Patients / Carte
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import { EmptyState } from "../../components/PremiumKpi";
import BackButton from "../../components/BackButton";
import LogoUploader from "../../components/LogoUploader";
import { Tabs } from "../../components/ui-premium";

const TYPES = [
  { v: "had_generaliste", l: "Généraliste",    c: "#185FA5", ic: "ti-stethoscope" },
  { v: "had_pediatrique", l: "Pédiatrique",    c: "#7CC8C8", ic: "ti-baby-bottle" },
  { v: "had_perinatale",  l: "Périnatale",     c: "#EF9F27", ic: "ti-mood-kid" },
  { v: "had_oncologie",   l: "Oncologie",      c: "#7a6fb0", ic: "ti-medical-cross" },
];

const ROLES_HAD = [
  { v: "medecin_coordo", l: "Médecin coordonnateur",  c: "#7a6fb0" },
  { v: "cadre_ide",      l: "Cadre IDE",              c: "#185FA5" },
  { v: "ide",            l: "IDE",                    c: "#7CC8C8" },
  { v: "aide_soignant",  l: "Aide-soignant",          c: "#5aa05a" },
  { v: "kine",           l: "Kinésithérapeute",       c: "#EF9F27" },
  { v: "secretaire",     l: "Secrétaire",             c: "#C9867F" },
  { v: "chauffeur",      l: "Chauffeur",              c: "#5e4a8c" },
];

export default function HadDetailPage() {
  const params = useParams();
  const hadId = params?.id;
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [had, setHad] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("infos");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  // Données onglets
  const [collabs, setCollabs] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);  /* 0.62.70 : pour picker visuel */
  const [vehicules, setVehicules] = useState([]);
  const [allVehicules, setAllVehicules] = useState([]);
  const [garages, setGarages] = useState([]);
  const [allGarages, setAllGarages] = useState([]);
  const [etabs, setEtabs] = useState([]);
  const [allEtabs, setAllEtabs] = useState([]);
  const [patients, setPatients] = useState([]);

  // Modals
  const [modalCollab, setModalCollab] = useState(false);
  const [modalVehic, setModalVehic] = useState(false);
  const [modalGarage, setModalGarage] = useState(false);
  const [modalEtab, setModalEtab] = useState(false);
  const [pickerForm, setPickerForm] = useState({});

  useEffect(() => { if (auth.ready && hadId) reload(); }, [auth.ready, hadId]);

  async function reload() {
    setLoading(true);
    try {
      const r = await supabase.from("had").select("*").eq("id", hadId).maybeSingle();
      setHad(r.data);
      setForm(r.data || {});

      const sR = await supabase.from("v_had_stats").select("*").eq("id", hadId).maybeSingle();
      setStats(sR.data || {});

      // Collaborateurs (membres_had + users via fetch séparé)
      const mR = await supabase.from("membres_had").select("*").eq("had_id", hadId).eq("actif", true);
      const userIds = (mR.data || []).map(m => m.user_id);
      let usersData = [];
      if (userIds.length > 0) {
        const uR = await supabase.from("membres_structure").select("user_id, nom, prenom, email, role")
          .in("user_id", userIds);
        usersData = uR.data || [];
      }
      setCollabs(mR.data || []);
      setUsers(usersData);

      // Tous les users de la structure pour le picker
      const allUsersR = await supabase.from("membres_structure")
        .select("user_id, nom, prenom, email, role")
        .eq("structure_id", auth.structureId);
      setAllUsers(allUsersR.data || []);
      // Filtrer ceux pas encore dans HAD
      const inHadIds = new Set((mR.data || []).map(m => m.user_id));
      // (gardé tel quel; on filtrera dans le picker)

      // Véhicules
      const vR = await supabase.from("had_vehicules").select("*").eq("had_id", hadId);
      const vIds = (vR.data || []).map(v => v.vehicule_id);
      let vData = [];
      if (vIds.length > 0) {
        const fR = await supabase.from("vehicules").select("*").in("id", vIds);
        vData = fR.data || [];
      }
      setVehicules(vData);

      const allVR = await supabase.from("vehicules").select("id, immatriculation, marque, modele, type").eq("structure_id", auth.structureId);
      setAllVehicules(allVR.data || []);

      // Garages
      const gR = await supabase.from("had_garages").select("*").eq("had_id", hadId);
      const gIds = (gR.data || []).map(g => g.garage_id);
      let gData = [];
      if (gIds.length > 0) {
        const fR = await supabase.from("garages").select("*").in("id", gIds);
        gData = fR.data || [];
      }
      setGarages(gData);

      const allGR = await supabase.from("garages").select("id, nom, adresse, ville").eq("structure_id", auth.structureId);
      setAllGarages(allGR.data || []);

      // Établissements partenaires
      const eR = await supabase.from("had_etablissements").select("*").eq("had_id", hadId);
      const eIds = (eR.data || []).map(e => e.etablissement_id);
      let eData = [];
      if (eIds.length > 0) {
        const fR = await supabase.from("etablissements").select("*").in("id", eIds);
        eData = (fR.data || []).map(et => ({
          ...et,
          type_relation: eR.data.find(rel => rel.etablissement_id === et.id)?.type_relation || "partenaire",
        }));
      }
      setEtabs(eData);

      const allER = await supabase.from("etablissements").select("id, nom, type, ville").eq("structure_id", auth.structureId);
      setAllEtabs(allER.data || []);

      // Patients HAD
      const pR = await supabase.from("patients").select("id, nom, prenom, date_naissance, adresse_domicile, cp_domicile, ville_domicile, latitude, longitude, telephone")
        .eq("had_id", hadId).limit(200);
      setPatients(pR.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function saveInfos() {
    setBusy(true);
    try {
      const payload = { ...form };
      delete payload.id; delete payload.cree_le; delete payload.modifie_le;
      payload.capacite_lits = parseInt(payload.capacite_lits) || null;
      payload.rayon_intervention_km = parseInt(payload.rayon_intervention_km) || 30;
      payload.latitude = payload.latitude ? parseFloat(payload.latitude) : null;
      payload.longitude = payload.longitude ? parseFloat(payload.longitude) : null;
      await supabase.from("had").update(payload).eq("id", hadId);
      setEditMode(false);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    setBusy(false);
  }

  async function addCollab() {
    if (!pickerForm.user_id || !pickerForm.role) { alert("Utilisateur et rôle requis"); return; }
    await supabase.from("membres_had").insert({
      had_id: hadId,
      user_id: pickerForm.user_id,
      role: pickerForm.role,
      actif: true,
    });
    setModalCollab(false);
    setPickerForm({});
    await reload();
  }

  async function removeCollab(m) {
    if (!confirm("Retirer ce collaborateur du HAD ?")) return;
    await supabase.from("membres_had").update({ actif: false, date_fin: new Date().toISOString() }).eq("id", m.id);
    await reload();
  }

  async function addVehic() {
    if (!pickerForm.vehicule_id) { alert("Véhicule requis"); return; }
    await supabase.from("had_vehicules").insert({ had_id: hadId, vehicule_id: pickerForm.vehicule_id });
    setModalVehic(false); setPickerForm({}); await reload();
  }

  async function removeVehic(v) {
    await supabase.from("had_vehicules").delete().eq("had_id", hadId).eq("vehicule_id", v.id);
    await reload();
  }

  async function addGarage() {
    if (!pickerForm.garage_id) { alert("Garage requis"); return; }
    await supabase.from("had_garages").insert({ had_id: hadId, garage_id: pickerForm.garage_id, est_principal: !!pickerForm.est_principal });
    setModalGarage(false); setPickerForm({}); await reload();
  }

  async function removeGarage(g) {
    await supabase.from("had_garages").delete().eq("had_id", hadId).eq("garage_id", g.id);
    await reload();
  }

  async function addEtab() {
    if (!pickerForm.etablissement_id) { alert("Étab requis"); return; }
    await supabase.from("had_etablissements").insert({
      had_id: hadId, etablissement_id: pickerForm.etablissement_id,
      type_relation: pickerForm.type_relation || "partenaire",
    });
    setModalEtab(false); setPickerForm({}); await reload();
  }

  async function removeEtab(e) {
    await supabase.from("had_etablissements").delete().eq("had_id", hadId).eq("etablissement_id", e.id);
    await reload();
  }

  if (!auth.ready) return null;
  if (loading) return <div className="bg-dark"><TopBar cartCount={cart.count} auth={auth} /><div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Chargement…</div></div>;
  if (!had) return <div className="bg-dark"><TopBar cartCount={cart.count} auth={auth} /><div className="page-content"><BackButton /><Panel><div style={{ padding: 20, color: "#e35d5b" }}>HAD introuvable</div></Panel></div></div>;

  const type = TYPES.find(t => t.v === had.type) || TYPES[0];
  const usersById = Object.fromEntries(users.map(u => [u.user_id, u]));

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 1300 }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon={type.ic} title={had.nom} subtitle={`${type.l} · ${had.code || ""}${had.finess ? ` · FINESS ${had.finess}` : ""}`} color={type.c} />
          <Btn variant={editMode ? "primary" : "ghost"} icon={editMode ? "ti-x" : "ti-edit"} onClick={() => { if (editMode) { setForm(had); setEditMode(false); } else setEditMode(true); }}>
            {editMode ? "Annuler" : "Modifier"}
          </Btn>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 12, marginBottom: 12 }}>
          <KpiSmall label="Lits" value={had.capacite_lits || 0} color={type.c} icon="ti-bed-flat" />
          <KpiSmall label="Collaborateurs" value={stats.nb_collaborateurs || 0} color="#7CC8C8" icon="ti-users" />
          <KpiSmall label="Véhicules" value={stats.nb_vehicules || 0} color="#5aa05a" icon="ti-car" />
          <KpiSmall label="Garages" value={stats.nb_garages || 0} color="#EF9F27" icon="ti-parking" />
          <KpiSmall label="Étabs partenaires" value={stats.nb_etablissements || 0} color="#7a6fb0" icon="ti-building" />
          <KpiSmall label="Patients HAD" value={patients.length} color="#C9867F" icon="ti-user-heart" />
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: 14 }}>
          <Tabs active={activeTab} onChange={setActiveTab} style="pills" reorderable storageKey="av-had-detail-tabs"
            tabs={[
              { id: "infos",    label: "Infos",                 icon: "ti-info-circle" },
              { id: "collabs",  label: "Collaborateurs",        icon: "ti-users",            count: stats.nb_collaborateurs || 0 },
              { id: "vehicules",label: "Véhicules",             icon: "ti-car",              count: stats.nb_vehicules || 0 },
              { id: "garages",  label: "Garages",               icon: "ti-parking",          count: stats.nb_garages || 0 },
              { id: "etabs",    label: "Étabs partenaires",     icon: "ti-building",         count: stats.nb_etablissements || 0 },
              { id: "patients", label: "Patients HAD",          icon: "ti-user-heart",       count: patients.length },
              { id: "carte",    label: "Carte",                 icon: "ti-map" },
            ]} />
        </div>

        {/* ===== ONGLET INFOS ===== */}
        {activeTab === "infos" && (
          <Panel>
            <div style={{ marginBottom: 14 }}>
              <LogoUploader
                value={editMode ? form.logo_url : had.logo_url}
                onChange={(url) => setForm({ ...form, logo_url: url })}
                pathPrefix={`had/${hadId}`}
                label="Logo HAD"
                size={90}
              />
            </div>

            {!editMode ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <Section title="Identité">
                    <InfoLine label="Nom" value={had.nom} />
                    <InfoLine label="Code" value={had.code || "—"} mono />
                    <InfoLine label="FINESS" value={had.finess || "—"} mono />
                    <InfoLine label="Type" value={type.l} color={type.c} />
                    <InfoLine label="Capacité" value={`${had.capacite_lits || 0} lits`} bold />
                  </Section>
                  <Section title="Coordonnées">
                    <InfoLine label="Adresse" value={had.adresse || "—"} />
                    <InfoLine label="CP/Ville" value={[had.cp, had.ville].filter(Boolean).join(" ") || "—"} />
                    <InfoLine label="Téléphone" value={had.telephone || "—"} mono />
                    <InfoLine label="Email" value={had.email || "—"} />
                  </Section>
                </div>
                <div>
                  <Section title="Responsable HAD">
                    <InfoLine label="Nom" value={had.responsable_nom || "—"} bold />
                    <InfoLine label="Téléphone" value={had.responsable_telephone || "—"} mono />
                    <InfoLine label="Email" value={had.responsable_email || "—"} />
                  </Section>
                  <Section title="Zone d'intervention">
                    <InfoLine label="Zone" value={had.zone_intervention || "—"} />
                    <InfoLine label="Rayon" value={`${had.rayon_intervention_km || 30} km`} />
                    <InfoLine label="GPS" value={had.latitude && had.longitude ? `${had.latitude}, ${had.longitude}` : "—"} mono />
                  </Section>
                  {had.notes && (
                    <Section title="Notes">
                      <div style={{ fontSize: 13, color: "#5a6878", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{had.notes}</div>
                    </Section>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                  <label>Nom * <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} style={inp()} /></label>
                  <label>Code <input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} style={inp()} /></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label>FINESS <input value={form.finess || ""} onChange={(e) => setForm({ ...form, finess: e.target.value })} style={inp()} /></label>
                  <label>Type <select value={form.type || "had_generaliste"} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inp()}>{TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></label>
                </div>
                <label>Adresse <input value={form.adresse || ""} onChange={(e) => setForm({ ...form, adresse: e.target.value })} style={inp()} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 10 }}>
                  <label>CP <input value={form.cp || ""} onChange={(e) => setForm({ ...form, cp: e.target.value })} style={inp()} /></label>
                  <label>Ville <input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} style={inp()} /></label>
                  <label>Téléphone <input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} style={inp()} /></label>
                  <label>Email <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inp()} /></label>
                </div>
                <fieldset style={fs()}>
                  <legend style={lg()}>Responsable</legend>
                  <label>Nom <input value={form.responsable_nom || ""} onChange={(e) => setForm({ ...form, responsable_nom: e.target.value })} style={inp()} /></label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                    <label>Téléphone <input value={form.responsable_telephone || ""} onChange={(e) => setForm({ ...form, responsable_telephone: e.target.value })} style={inp()} /></label>
                    <label>Email <input type="email" value={form.responsable_email || ""} onChange={(e) => setForm({ ...form, responsable_email: e.target.value })} style={inp()} /></label>
                  </div>
                </fieldset>
                <fieldset style={fs()}>
                  <legend style={lg()}>Capacité & Zone</legend>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <label>Lits <input type="number" value={form.capacite_lits || ""} onChange={(e) => setForm({ ...form, capacite_lits: e.target.value })} style={inp()} /></label>
                    <label>Rayon (km) <input type="number" value={form.rayon_intervention_km || ""} onChange={(e) => setForm({ ...form, rayon_intervention_km: e.target.value })} style={inp()} /></label>
                  </div>
                  <label>Zone <input value={form.zone_intervention || ""} onChange={(e) => setForm({ ...form, zone_intervention: e.target.value })} style={inp()} /></label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                    <label>Latitude <input type="number" step="0.000001" value={form.latitude || ""} onChange={(e) => setForm({ ...form, latitude: e.target.value })} style={inp()} /></label>
                    <label>Longitude <input type="number" step="0.000001" value={form.longitude || ""} onChange={(e) => setForm({ ...form, longitude: e.target.value })} style={inp()} /></label>
                  </div>
                </fieldset>
                <label>Notes <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={inp()} /></label>
                <div style={{ textAlign: "right" }}>
                  <Btn variant="primary" onClick={saveInfos} disabled={busy} icon="ti-device-floppy">{busy ? "..." : "Enregistrer"}</Btn>
                </div>
              </div>
            )}
          </Panel>
        )}

        {/* ===== COLLABORATEURS ===== */}
        {activeTab === "collabs" && (
          <Panel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Équipe HAD ({collabs.length})</h3>
              <Btn variant="primary" icon="ti-plus" onClick={() => { setPickerForm({ role: "ide" }); setModalCollab(true); }}>Ajouter collaborateur</Btn>
            </div>
            {collabs.length === 0 ? (
              <EmptyState icon="ti-users-off" title="Aucun collaborateur" desc="Ajoute des collaborateurs à cette HAD." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {collabs.map(m => {
                  const u = usersById[m.user_id];
                  const role = ROLES_HAD.find(r => r.v === m.role) || ROLES_HAD[2];
                  return (
                    <div key={m.id} style={{ background: "#fff", border: `1px solid ${role.c}30`, borderLeft: `4px solid ${role.c}`, borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>{u?.prenom || ""} {u?.nom || "—"}</div>
                          <span style={{ background: `${role.c}1A`, color: role.c, padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", marginTop: 4, display: "inline-block" }}>{role.l}</span>
                          {u?.email && <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 4 }}>{u.email}</div>}
                        </div>
                        <button onClick={() => removeCollab(m)} style={iconBtn("#e35d5b")}><i className="ti ti-x" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {/* ===== VÉHICULES ===== */}
        {activeTab === "vehicules" && (
          <Panel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Véhicules rattachés ({vehicules.length})</h3>
              <Btn variant="primary" icon="ti-plus" onClick={() => { setPickerForm({}); setModalVehic(true); }}>Rattacher véhicule</Btn>
            </div>
            {vehicules.length === 0 ? (
              <EmptyState icon="ti-car-off" title="Aucun véhicule" desc="Rattache des véhicules à cette HAD." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                {vehicules.map(v => (
                  <div key={v.id} style={{ background: "#fff", border: "1px solid #5aa05a30", borderLeft: "4px solid #5aa05a", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}><i className="ti ti-car" /> {v.immatriculation || "—"}</div>
                      <div style={{ fontSize: 11.5, color: "#5a6878" }}>{v.marque} {v.modele}</div>
                      {v.type && <div style={{ fontSize: 10.5, color: "#8a98a8" }}>{v.type}</div>}
                    </div>
                    <button onClick={() => removeVehic(v)} style={iconBtn("#e35d5b")}><i className="ti ti-x" /></button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* ===== GARAGES ===== */}
        {activeTab === "garages" && (
          <Panel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Garages associés ({garages.length})</h3>
              <Btn variant="primary" icon="ti-plus" onClick={() => { setPickerForm({}); setModalGarage(true); }}>Rattacher garage</Btn>
            </div>
            {garages.length === 0 ? (
              <EmptyState icon="ti-parking-off" title="Aucun garage" desc="Rattache des garages à cette HAD." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {garages.map(g => (
                  <div key={g.id} style={{ background: "#fff", border: "1px solid #EF9F2730", borderLeft: "4px solid #EF9F27", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}><i className="ti ti-parking" /> {g.nom}</div>
                      {g.adresse && <div style={{ fontSize: 11.5, color: "#5a6878" }}>{g.adresse}</div>}
                      {g.ville && <div style={{ fontSize: 10.5, color: "#8a98a8" }}>{g.ville}</div>}
                    </div>
                    <button onClick={() => removeGarage(g)} style={iconBtn("#e35d5b")}><i className="ti ti-x" /></button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* ===== ÉTABS PARTENAIRES ===== */}
        {activeTab === "etabs" && (
          <Panel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Établissements partenaires ({etabs.length})</h3>
              <Btn variant="primary" icon="ti-plus" onClick={() => { setPickerForm({ type_relation: "partenaire" }); setModalEtab(true); }}>Rattacher étab</Btn>
            </div>
            {etabs.length === 0 ? (
              <EmptyState icon="ti-building-off" title="Aucun étab partenaire" desc="Rattache des étabs à cette HAD." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {etabs.map(e => (
                  <div key={e.id} style={{ background: "#fff", border: "1px solid #7a6fb030", borderLeft: "4px solid #7a6fb0", borderRadius: 10, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}><i className="ti ti-building" /> {e.nom}</div>
                        {e.ville && <div style={{ fontSize: 10.5, color: "#8a98a8" }}>{e.ville}</div>}
                        <span style={{ background: "rgba(122,111,176,.15)", color: "#7a6fb0", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, marginTop: 4, display: "inline-block" }}>{e.type_relation}</span>
                      </div>
                      <button onClick={() => removeEtab(e)} style={iconBtn("#e35d5b")}><i className="ti ti-x" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* ===== PATIENTS HAD ===== */}
        {activeTab === "patients" && (
          <Panel>
            <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Patients suivis par cette HAD ({patients.length})</h3>
            {patients.length === 0 ? (
              <EmptyState icon="ti-user-off" title="Aucun patient HAD" desc="Les patients seront rattachés en base via had_id." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {patients.map(p => (
                  <div key={p.id} onClick={() => router.push(`/patient/${p.id}`)}
                    style={{ background: "#fff", border: "1px solid #C9867F30", borderLeft: "4px solid #C9867F", borderRadius: 10, padding: 12, cursor: "pointer" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>
                      <i className="ti ti-user-heart" /> {p.nom} {p.prenom || ""}
                    </div>
                    {p.date_naissance && <div style={{ fontSize: 11.5, color: "#5a6878" }}>{new Date(p.date_naissance).toLocaleDateString("fr-FR")}</div>}
                    {p.adresse_domicile && (
                      <div style={{ fontSize: 11, color: "#5a6878", marginTop: 4 }}>
                        <i className="ti ti-home" /> {p.adresse_domicile}, {p.cp_domicile} {p.ville_domicile}
                      </div>
                    )}
                    {p.telephone && <div style={{ fontSize: 10.5, color: "#8a98a8", fontFamily: "Consolas, monospace" }}><i className="ti ti-phone" /> {p.telephone}</div>}
                    {p.latitude && p.longitude && <div style={{ fontSize: 10, color: "#5aa05a", marginTop: 2 }}>📍 Géolocalisé</div>}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* ===== CARTE ===== */}
        {activeTab === "carte" && (
          <Panel>
            <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><i className="ti ti-map" /> Carte HAD + patients</h3>
            {!had.latitude || !had.longitude ? (
              <div style={{ padding: 20, background: "rgba(239,159,39,.1)", border: "1px solid rgba(239,159,39,.3)", borderRadius: 8, color: "#a06d11", fontSize: 13 }}>
                ⚠ Renseigne les coordonnées GPS de la HAD (onglet Infos) pour afficher la carte.
              </div>
            ) : (
              <>
                <div style={{ position: "relative", width: "100%", height: 500, borderRadius: 12, overflow: "hidden", border: "1px solid #e3e9ee" }}>
                  {/* Carte iframe OpenStreetMap embed avec markers via bbox */}
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${had.longitude - 0.3},${had.latitude - 0.2},${had.longitude + 0.3},${had.latitude + 0.2}&layer=mapnik&marker=${had.latitude},${had.longitude}`}
                    style={{ width: "100%", height: "100%", border: "none" }}
                    title="Carte HAD"
                  />
                </div>
                <div style={{ marginTop: 12, padding: 10, background: "#f4f7fa", borderRadius: 8, fontSize: 12, color: "#5a6878" }}>
                  📍 Centre HAD : <b>{had.latitude}, {had.longitude}</b> · Zone {had.zone_intervention || "—"} · Rayon {had.rayon_intervention_km || 30}km
                  <br />🏠 {patients.filter(p => p.latitude && p.longitude).length} / {patients.length} patients géolocalisés
                </div>
                {patients.filter(p => p.latitude && p.longitude).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.4 }}>Patients géolocalisés</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
                      {patients.filter(p => p.latitude && p.longitude).map(p => (
                        <a key={p.id} href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}&zoom=15`} target="_blank" rel="noreferrer"
                          style={{ padding: "6px 8px", background: "#fff", border: "1px solid #C9867F30", borderRadius: 6, fontSize: 11.5, color: "#142131", textDecoration: "none", display: "block" }}>
                          <i className="ti ti-map-pin" style={{ color: "#C9867F" }} /> {p.nom} {p.prenom || ""}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Panel>
        )}

        {/* MODALS PICKERS */}
        <Modal open={modalCollab} onClose={() => setModalCollab(false)} title="Ajouter un collaborateur" size="md"
          footer={<><Btn variant="ghost" onClick={() => setModalCollab(false)}>Annuler</Btn><Btn variant="primary" onClick={addCollab} disabled={!pickerForm.user_id}>Ajouter</Btn></>}>
          <div style={{ display: "grid", gap: 12 }}>
            <label>Rôle dans la HAD
              <select value={pickerForm.role || ""} onChange={(e) => setPickerForm({ ...pickerForm, role: e.target.value })} style={inp()}>
                {ROLES_HAD.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </label>
            {/* 0.62.70 : Sélecteur visuel auto-complete avec search + cards */}
            <div>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.4 }}>Sélectionner un utilisateur</span>
              <input
                value={pickerForm.search || ""}
                onChange={(e) => setPickerForm({ ...pickerForm, search: e.target.value })}
                placeholder="🔍 Rechercher par nom, prénom ou email..."
                style={{ ...inp(), marginTop: 4, padding: "10px 12px" }}
              />
              <div style={{ marginTop: 10, maxHeight: 280, overflowY: "auto", display: "grid", gap: 6 }}>
                {(() => {
                  const inHadIds = new Set(collabs.map(c => c.user_id));
                  const filtered = allUsers.filter(u => {
                    if (inHadIds.has(u.user_id)) return false;
                    if (!pickerForm.search?.trim()) return true;
                    const q = pickerForm.search.toLowerCase();
                    return `${u.nom || ""} ${u.prenom || ""} ${u.email || ""}`.toLowerCase().includes(q);
                  });
                  if (filtered.length === 0) {
                    return <div style={{ padding: 14, textAlign: "center", color: "#8a98a8", fontSize: 12, background: "#fafbfc", borderRadius: 8 }}>
                      <i className="ti ti-user-off" /> Aucun utilisateur disponible
                    </div>;
                  }
                  return filtered.slice(0, 20).map(u => {
                    const selected = pickerForm.user_id === u.user_id;
                    return (
                      <button key={u.user_id} type="button" onClick={() => setPickerForm({ ...pickerForm, user_id: u.user_id })}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 12px",
                          background: selected ? "linear-gradient(135deg, rgba(24,95,165,.12), rgba(24,95,165,.06))" : "#fff",
                          border: `1px solid ${selected ? "#185FA5" : "#e3e9ee"}`,
                          borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                          textAlign: "left",
                          transition: "all 150ms",
                          boxShadow: selected ? "0 2px 8px rgba(24,95,165,.15)" : "none",
                        }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: selected ? "linear-gradient(135deg, #185FA5, #134e87)" : "#f4f7fa",
                          color: selected ? "#fff" : "#5a6878",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 700, flexShrink: 0,
                        }}>
                          {(u.prenom?.[0] || "?")}{(u.nom?.[0] || "")}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#142131" }}>{u.prenom || ""} {u.nom || "—"}</div>
                          <div style={{ fontSize: 11, color: "#8a98a8" }}>{u.email}</div>
                          {u.role && <span style={{ fontSize: 10, color: "#7a6fb0", background: "rgba(122,111,176,.1)", padding: "1px 5px", borderRadius: 3, marginTop: 2, display: "inline-block" }}>{u.role}</span>}
                        </div>
                        {selected && <i className="ti ti-check" style={{ color: "#185FA5", fontSize: 18 }} />}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </Modal>

        <Modal open={modalVehic} onClose={() => setModalVehic(false)} title="Rattacher un véhicule" size="sm"
          footer={<><Btn variant="ghost" onClick={() => setModalVehic(false)}>Annuler</Btn><Btn variant="primary" onClick={addVehic}>Rattacher</Btn></>}>
          <label>Véhicule
            <select value={pickerForm.vehicule_id || ""} onChange={(e) => setPickerForm({ ...pickerForm, vehicule_id: e.target.value })} style={inp()}>
              <option value="">— Sélectionner —</option>
              {allVehicules.filter(v => !vehicules.find(rv => rv.id === v.id)).map(v => (
                <option key={v.id} value={v.id}>{v.immatriculation} — {v.marque} {v.modele}</option>
              ))}
            </select>
          </label>
        </Modal>

        <Modal open={modalGarage} onClose={() => setModalGarage(false)} title="Rattacher un garage" size="sm"
          footer={<><Btn variant="ghost" onClick={() => setModalGarage(false)}>Annuler</Btn><Btn variant="primary" onClick={addGarage}>Rattacher</Btn></>}>
          <div style={{ display: "grid", gap: 10 }}>
            <label>Garage
              <select value={pickerForm.garage_id || ""} onChange={(e) => setPickerForm({ ...pickerForm, garage_id: e.target.value })} style={inp()}>
                <option value="">— Sélectionner —</option>
                {allGarages.filter(g => !garages.find(rg => rg.id === g.id)).map(g => (
                  <option key={g.id} value={g.id}>{g.nom} — {g.ville || ""}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={!!pickerForm.est_principal} onChange={(e) => setPickerForm({ ...pickerForm, est_principal: e.target.checked })} />
              <span>Garage principal de cette HAD</span>
            </label>
          </div>
        </Modal>

        <Modal open={modalEtab} onClose={() => setModalEtab(false)} title="Rattacher un établissement" size="sm"
          footer={<><Btn variant="ghost" onClick={() => setModalEtab(false)}>Annuler</Btn><Btn variant="primary" onClick={addEtab}>Rattacher</Btn></>}>
          <div style={{ display: "grid", gap: 10 }}>
            <label>Établissement
              <select value={pickerForm.etablissement_id || ""} onChange={(e) => setPickerForm({ ...pickerForm, etablissement_id: e.target.value })} style={inp()}>
                <option value="">— Sélectionner —</option>
                {allEtabs.filter(e => !etabs.find(re => re.id === e.id)).map(e => (
                  <option key={e.id} value={e.id}>{e.nom} — {e.ville || ""}</option>
                ))}
              </select>
            </label>
            <label>Type de relation
              <select value={pickerForm.type_relation || "partenaire"} onChange={(e) => setPickerForm({ ...pickerForm, type_relation: e.target.value })} style={inp()}>
                <option value="partenaire">Partenaire</option>
                <option value="prescripteur">Prescripteur</option>
                <option value="support">Support</option>
              </select>
            </label>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, color: "#185FA5", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #eef1f4" }}>{title}</div>
      {children}
    </div>
  );
}
function InfoLine({ label, value, mono, bold, color }) {
  return (
    <div style={{ display: "flex", padding: "4px 0", fontSize: 13 }}>
      <div style={{ minWidth: 110, color: "#8a98a8", fontSize: 11 }}>{label}</div>
      <div style={{ flex: 1, color: color || "#142131", fontFamily: mono ? "Consolas, monospace" : "inherit", fontWeight: bold ? 700 : 500 }}>{value}</div>
    </div>
  );
}
function KpiSmall({ label, value, color, icon }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 20 }} />
      <div>
        <div style={{ fontSize: 10, color: "#8a98a8", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}
function iconBtn(color) { return { padding: 6, background: `${color}12`, color, border: `1px solid ${color}30`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }; }
function inp() { return { width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }; }
function fs() { return { border: "1px solid #e3e9ee", borderRadius: 8, padding: 10 }; }
function lg() { return { padding: "0 6px", fontSize: 12, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }; }
