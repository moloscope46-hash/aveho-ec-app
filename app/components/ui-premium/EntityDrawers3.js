"use client";
// =============================================================
//  EntityDrawers3 — 6 drawers supplémentaires
//  Véhicule, Fournisseur, RPPS, Service, Chambre, Bâtiment
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import EntityDrawer, { EntitySection, InfoField, InfoGrid, MiniKpi } from "./EntityDrawer";

// =============================================================
// VEHICULE DRAWER
// =============================================================
export function VehiculeDrawer({ open, vehiculeId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#5a8f8f";
  const [v, setV] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !vehiculeId) return;
    (async () => {
      setLoading(true);
      const r = await supabase.from("vehicules").select("*").eq("id", vehiculeId).maybeSingle();
      setV(r.data);
      setLoading(false);
    })();
  }, [open, vehiculeId]);

  if (!v && !loading) return null;

  return (
    <EntityDrawer
      open={open} onClose={onClose}
      color={COLOR} icon="ti-truck"
      title={loading ? "Chargement..." : (v?.immatriculation || "Véhicule")}
      subtitle={v ? `${v.marque || ""} ${v.modele || ""}`.trim() : null}
      badge={v?.actif === false ? "Hors service" : null}
      headerActions={onEdit && <button onClick={() => onEdit(v)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !v ? <Empty msg="Véhicule introuvable" /> : (
        <>
          <EntitySection title="Identification" icon="ti-truck" color={COLOR} defaultOpen>
            <InfoGrid>
              <InfoField label="Immatriculation" value={v.immatriculation} icon="ti-license" copy color={COLOR} />
              <InfoField label="Marque" value={v.marque} icon="ti-bookmark" />
              <InfoField label="Modèle" value={v.modele} icon="ti-info-circle" />
              <InfoField label="Type" value={v.type_vehicule} icon="ti-category" />
              <InfoField label="Énergie" value={v.energie} icon="ti-gas-station" />
              <InfoField label="Année" value={v.annee} icon="ti-calendar" />
            </InfoGrid>
          </EntitySection>
          <EntitySection title="Affectation" icon="ti-user" color="#7a6fb0">
            <InfoGrid>
              <InfoField label="Affecté à" value={v.affecte_a} icon="ti-user-check" />
              <InfoField label="Magasin" value={v.magasin_id} icon="ti-building-store" />
              <InfoField fullWidth label="Notes" value={v.notes} icon="ti-notes" />
            </InfoGrid>
          </EntitySection>
        </>
      )}
    </EntityDrawer>
  );
}

// =============================================================
// FOURNISSEUR DRAWER
// =============================================================
export function FournisseurDrawer({ open, fournisseurId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#5e4a8c";
  const [f, setF] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commandes, setCommandes] = useState([]);

  useEffect(() => {
    if (!open || !fournisseurId) return;
    (async () => {
      setLoading(true);
      const [r, c] = await Promise.all([
        supabase.from("fournisseurs").select("*").eq("id", fournisseurId).maybeSingle(),
        supabase.from("commandes_fournisseurs").select("id, numero, statut, montant_ht, created_at").eq("fournisseur_id", fournisseurId).order("created_at", { ascending: false }).limit(10),
      ]);
      setF(r.data);
      setCommandes(c.data || []);
      setLoading(false);
    })();
  }, [open, fournisseurId]);

  if (!f && !loading) return null;

  return (
    <EntityDrawer
      open={open} onClose={onClose}
      color={COLOR} icon="ti-building-store"
      title={loading ? "Chargement..." : f?.nom || "Fournisseur"}
      subtitle={f?.code || f?.siret}
      headerActions={onEdit && <button onClick={() => onEdit(f)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !f ? <Empty msg="Fournisseur introuvable" /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            <MiniKpi icon="ti-shopping-bag" color={COLOR} value={commandes.length} label="Cmd récentes" />
            <MiniKpi icon="ti-currency-euro" color="#5aa05a" value={commandes.reduce((a, c) => a + (c.montant_ht || 0), 0).toFixed(0) + "€"} label="Total HT" />
            <MiniKpi icon="ti-check" color="#7CC8C8" value={commandes.filter(c => c.statut === "livree").length} label="Livrées" />
          </div>
          <EntitySection title="Identification" icon="ti-building-store" color={COLOR}>
            <InfoGrid>
              <InfoField label="Nom" value={f.nom} icon="ti-bookmark" fullWidth />
              <InfoField label="SIRET" value={f.siret} icon="ti-id-badge" copy />
              <InfoField label="N° TVA" value={f.numero_tva} icon="ti-receipt" copy />
              <InfoField label="Code" value={f.code} icon="ti-hash" />
              <InfoField label="Type" value={f.type} icon="ti-category" />
            </InfoGrid>
          </EntitySection>
          <EntitySection title="Coordonnées" icon="ti-map-pin" color="#7CC8C8">
            <InfoGrid>
              <InfoField fullWidth label="Adresse" value={f.adresse} icon="ti-home" copy />
              <InfoField label="CP" value={f.code_postal} icon="ti-map-pin" />
              <InfoField label="Ville" value={f.ville} icon="ti-map-pin" />
              <InfoField label="Téléphone" value={f.telephone} icon="ti-phone" copy color="#5aa05a" />
              <InfoField label="Email" value={f.email} icon="ti-mail" copy />
              <InfoField fullWidth label="Site web" value={f.site_web} icon="ti-world" />
            </InfoGrid>
          </EntitySection>
          {f.contact_nom && (
            <EntitySection title="Contact" icon="ti-user" color="#7a6fb0">
              <InfoGrid>
                <InfoField label="Nom" value={f.contact_nom} icon="ti-user" />
                <InfoField label="Téléphone" value={f.contact_telephone} icon="ti-phone" copy />
                <InfoField fullWidth label="Email" value={f.contact_email} icon="ti-mail" copy />
              </InfoGrid>
            </EntitySection>
          )}
        </>
      )}
    </EntityDrawer>
  );
}

// =============================================================
// PARTENAIRE RPPS DRAWER (infirmières/médecins libéraux)
// =============================================================
export function PartenaireRPPSDrawer({ open, partenaireId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#C9867F";
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !partenaireId) return;
    (async () => {
      setLoading(true);
      const r = await supabase.from("partenaires_rpps").select("*").eq("id", partenaireId).maybeSingle();
      setP(r.data);
      setLoading(false);
    })();
  }, [open, partenaireId]);

  if (!p && !loading) return null;
  const initials = p ? `${(p.prenom || "?")[0]}${(p.nom || "?")[0]}`.toUpperCase() : "?";

  return (
    <EntityDrawer
      open={open} onClose={onClose}
      color={COLOR} icon="ti-medical-cross"
      title={loading ? "Chargement..." : `${p?.prenom || ""} ${p?.nom || ""}`.trim() || "Partenaire"}
      subtitle={p?.profession}
      avatarText={initials}
      badge={p?.type}
      headerActions={onEdit && <button onClick={() => onEdit(p)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !p ? <Empty msg="Partenaire introuvable" /> : (
        <>
          <EntitySection title="Identité professionnelle" icon="ti-id-badge" color={COLOR} defaultOpen>
            <InfoGrid>
              <InfoField label="Nom" value={p.nom} icon="ti-user" />
              <InfoField label="Prénom" value={p.prenom} icon="ti-user" />
              <InfoField label="Profession" value={p.profession} icon="ti-stethoscope" />
              <InfoField label="Spécialité" value={p.specialite} icon="ti-medical-cross" />
              <InfoField label="N° RPPS" value={p.numero_rpps} icon="ti-id-badge" copy color={COLOR} />
              <InfoField label="N° ADELI" value={p.numero_adeli} icon="ti-id-badge" copy />
              <InfoField label="N° AM/FINESS" value={p.numero_am} icon="ti-id-badge" />
              <InfoField label="Convention" value={p.convention} icon="ti-clipboard" />
            </InfoGrid>
          </EntitySection>
          <EntitySection title="Coordonnées" icon="ti-map-pin" color="#7CC8C8">
            <InfoGrid>
              <InfoField fullWidth label="Cabinet" value={p.cabinet_nom} icon="ti-building" />
              <InfoField fullWidth label="Adresse" value={p.adresse} icon="ti-home" copy />
              <InfoField label="CP" value={p.code_postal} icon="ti-map-pin" />
              <InfoField label="Ville" value={p.ville} icon="ti-map-pin" />
              <InfoField label="Téléphone" value={p.telephone} icon="ti-phone" copy color="#5aa05a" />
              <InfoField label="Mobile" value={p.mobile} icon="ti-device-mobile" copy color="#5aa05a" />
              <InfoField fullWidth label="Email" value={p.email} icon="ti-mail" copy />
            </InfoGrid>
          </EntitySection>
        </>
      )}
    </EntityDrawer>
  );
}

// =============================================================
// SERVICE DRAWER
// =============================================================
export function ServiceDrawer({ open, serviceId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#5aa05a";
  const [s, setS] = useState(null);
  const [chambres, setChambres] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !serviceId) return;
    (async () => {
      setLoading(true);
      const [r, c] = await Promise.all([
        supabase.from("services").select("*").eq("id", serviceId).maybeSingle(),
        supabase.from("chambres").select("id, numero, capacite").eq("service_id", serviceId).order("numero"),
      ]);
      setS(r.data);
      setChambres(c.data || []);
      setLoading(false);
    })();
  }, [open, serviceId]);

  if (!s && !loading) return null;

  return (
    <EntityDrawer
      open={open} onClose={onClose}
      color={COLOR} icon="ti-stethoscope"
      title={loading ? "Chargement..." : s?.nom || "Service"}
      subtitle={s?.type}
      headerActions={onEdit && <button onClick={() => onEdit(s)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !s ? <Empty msg="Service introuvable" /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 18 }}>
            <MiniKpi icon="ti-door" color={COLOR} value={chambres.length} label="Chambres" />
            <MiniKpi icon="ti-bed" color="#7a6fb0" value={chambres.reduce((a, c) => a + (c.capacite || 0), 0)} label="Lits totaux" />
          </div>
          <EntitySection title="Informations" icon="ti-stethoscope" color={COLOR} defaultOpen>
            <InfoGrid>
              <InfoField label="Nom" value={s.nom} icon="ti-bookmark" />
              <InfoField label="Type" value={s.type} icon="ti-category" />
              <InfoField label="Code" value={s.code} icon="ti-hash" />
              <InfoField label="Responsable" value={s.responsable_nom} icon="ti-user" />
              <InfoField label="Téléphone" value={s.telephone} icon="ti-phone" copy color="#5aa05a" />
              <InfoField label="Bâtiment" value={s.batiment_id} icon="ti-building" />
              <InfoField fullWidth label="Notes" value={s.notes} icon="ti-notes" />
            </InfoGrid>
          </EntitySection>
          {chambres.length > 0 && (
            <EntitySection title={`Chambres (${chambres.length})`} icon="ti-door" color="#7a6fb0">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {chambres.map(c => (
                  <div key={c.id} style={{ padding: 8, background: "rgba(255,255,255,.04)", borderRadius: 8, textAlign: "center", border: "1px solid rgba(255,255,255,.06)" }}>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{c.numero}</div>
                    <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>{c.capacite || 1} lit{(c.capacite || 1) > 1 ? "s" : ""}</div>
                  </div>
                ))}
              </div>
            </EntitySection>
          )}
        </>
      )}
    </EntityDrawer>
  );
}

// =============================================================
// CHAMBRE DRAWER
// =============================================================
export function ChambreDrawer({ open, chambreId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#5e4a8c";
  const [c, setC] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !chambreId) return;
    (async () => {
      setLoading(true);
      const [r, p] = await Promise.all([
        supabase.from("chambres").select("*").eq("id", chambreId).maybeSingle(),
        supabase.from("patients").select("id, nom, prenom").eq("chambre_id", chambreId),
      ]);
      setC(r.data);
      setPatients(p.data || []);
      setLoading(false);
    })();
  }, [open, chambreId]);

  if (!c && !loading) return null;
  const taux = c?.capacite ? Math.round((patients.length / c.capacite) * 100) : 0;

  return (
    <EntityDrawer
      open={open} onClose={onClose}
      color={COLOR} icon="ti-door"
      title={loading ? "Chargement..." : `Chambre ${c?.numero || ""}`}
      subtitle={c?.type}
      badge={`${patients.length}/${c?.capacite || 1}`}
      badgeColor={taux >= 100 ? "#D45E5E" : taux >= 80 ? "#EF9F27" : "#5aa05a"}
      headerActions={onEdit && <button onClick={() => onEdit(c)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !c ? <Empty msg="Chambre introuvable" /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            <MiniKpi icon="ti-users" color="#7a6fb0" value={patients.length} label="Occupants" />
            <MiniKpi icon="ti-bed" color={COLOR} value={c.capacite || 1} label="Capacité" />
            <MiniKpi icon="ti-percentage" color={taux >= 80 ? "#EF9F27" : "#5aa05a"} value={`${taux}%`} label="Taux" />
          </div>
          <EntitySection title="Informations" icon="ti-door" color={COLOR} defaultOpen>
            <InfoGrid>
              <InfoField label="Numéro" value={c.numero} icon="ti-hash" />
              <InfoField label="Type" value={c.type} icon="ti-category" />
              <InfoField label="Capacité" value={c.capacite} icon="ti-bed" />
              <InfoField label="Surface (m²)" value={c.surface_m2} icon="ti-ruler" />
              <InfoField fullWidth label="Notes" value={c.notes} icon="ti-notes" />
            </InfoGrid>
          </EntitySection>
          {patients.length > 0 && (
            <EntitySection title={`Patients (${patients.length})`} icon="ti-users" color="#7a6fb0">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {patients.map(p => (
                  <div key={p.id} style={{ padding: "8px 12px", background: "rgba(255,255,255,.04)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <i className="ti ti-user" style={{ color: "#7a6fb0" }} />
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{p.prenom} {p.nom}</div>
                  </div>
                ))}
              </div>
            </EntitySection>
          )}
        </>
      )}
    </EntityDrawer>
  );
}

// =============================================================
// BATIMENT DRAWER
// =============================================================
export function BatimentDrawer({ open, batimentId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#185FA5";
  const [b, setB] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !batimentId) return;
    (async () => {
      setLoading(true);
      const [r, s] = await Promise.all([
        supabase.from("batiments").select("*").eq("id", batimentId).maybeSingle(),
        supabase.from("services").select("id, nom, type").eq("batiment_id", batimentId),
      ]);
      setB(r.data);
      setServices(s.data || []);
      setLoading(false);
    })();
  }, [open, batimentId]);

  if (!b && !loading) return null;

  return (
    <EntityDrawer
      open={open} onClose={onClose}
      color={COLOR} icon="ti-building"
      title={loading ? "Chargement..." : b?.nom || "Bâtiment"}
      subtitle={b?.code}
      headerActions={onEdit && <button onClick={() => onEdit(b)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !b ? <Empty msg="Bâtiment introuvable" /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 18 }}>
            <MiniKpi icon="ti-stethoscope" color="#5aa05a" value={services.length} label="Services" />
            <MiniKpi icon="ti-stairs" color={COLOR} value={b.nb_etages || 1} label="Étages" />
          </div>
          <EntitySection title="Informations" icon="ti-building" color={COLOR} defaultOpen>
            <InfoGrid>
              <InfoField label="Nom" value={b.nom} icon="ti-bookmark" />
              <InfoField label="Code" value={b.code} icon="ti-hash" />
              <InfoField label="Type" value={b.type} icon="ti-category" />
              <InfoField label="Étages" value={b.nb_etages} icon="ti-stairs" />
              <InfoField fullWidth label="Adresse" value={b.adresse} icon="ti-map-pin" copy />
              <InfoField fullWidth label="Notes" value={b.notes} icon="ti-notes" />
            </InfoGrid>
          </EntitySection>
          {services.length > 0 && (
            <EntitySection title={`Services (${services.length})`} icon="ti-stethoscope" color="#5aa05a">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {services.map(s => (
                  <div key={s.id} style={{ padding: "8px 12px", background: "rgba(255,255,255,.04)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <i className="ti ti-stethoscope" style={{ color: "#5aa05a" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{s.nom}</div>
                      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>{s.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </EntitySection>
          )}
        </>
      )}
    </EntityDrawer>
  );
}

// Helpers internes
function hBtn(color) {
  return { width: 34, height: 34, borderRadius: 10, background: `${color}25`, border: `1px solid ${color}50`, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 };
}
function Loader() {
  return <div style={{ color: "rgba(255,255,255,.6)", textAlign: "center", padding: 40 }}><i className="ti ti-loader-2 av-spinning" style={{ fontSize: 32 }} /><div style={{ marginTop: 10 }}>Chargement...</div></div>;
}
function Empty({ msg }) {
  return <div style={{ color: "rgba(255,255,255,.6)", textAlign: "center", padding: 40 }}>{msg}</div>;
}
