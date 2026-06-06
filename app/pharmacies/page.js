"use client";
// =============================================================
//  app/pharmacies/page.js (0.58.57)
//
//  Page dédiée à la gestion des pharmacies partenaires.
//  Différent de /partenaires-rpps : ici on gère les pharmacies en
//  tant qu'établissements (avec horaires + garde + FINESS officiel),
//  pas les pharmaciens individuels (qui restent dans partenaires_rpps).
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import EquipeSelector from "../components/EquipeSelector";  // 0.58.63
import { PageHead, Panel } from "../ui";
import { EmptyState, SkeletonRow } from "../components/ui-premium";
import { KpiRow } from "../kpis";
import Modal from "../components/Modal";
import FinessSearch from "../FinessSearch";
import ContactActions from "../components/ContactActions";
import { dialogs } from "../dialogs";
import { logger } from "../../lib/logger";

const JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const JOURS_LABELS = { lundi: "Lun", mardi: "Mar", mercredi: "Mer", jeudi: "Jeu", vendredi: "Ven", samedi: "Sam", dimanche: "Dim" };

const DEFAULT_HORAIRES = {
  lundi: [{ open: "08:30", close: "12:30" }, { open: "14:00", close: "19:30" }],
  mardi: [{ open: "08:30", close: "12:30" }, { open: "14:00", close: "19:30" }],
  mercredi: [{ open: "08:30", close: "12:30" }, { open: "14:00", close: "19:30" }],
  jeudi: [{ open: "08:30", close: "12:30" }, { open: "14:00", close: "19:30" }],
  vendredi: [{ open: "08:30", close: "12:30" }, { open: "14:00", close: "19:30" }],
  samedi: [{ open: "08:30", close: "12:30" }],
  dimanche: [],
};

const SPECIALITES = [
  { k: "lpp", l: "LPP / Matériel médical", c: "#185FA5" },
  { k: "vph", l: "VPH (Fauteuils roulants)", c: "#7CC8C8" },
  { k: "oxygenotherapie", l: "Oxygénothérapie", c: "#5aa05a" },
  { k: "orthopedie", l: "Orthopédie", c: "#EF9F27" },
  { k: "perfusion", l: "Perfusion / NPAD", c: "#7a6fb0" },
  { k: "nutrition", l: "Nutrition entérale", c: "#C9867F" },
  { k: "stomie", l: "Stomathérapie", c: "#a04a2a" },
  { k: "cicatrisation", l: "Plaies & cicatrisation", c: "#c0392b" },
];

export default function PharmaciesPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");  // all | officine | PUI | LPP | garde
  const [finessSearchOpen, setFinessSearchOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(null);  // pharmacie en édition
  const [form, setForm] = useState({});
  // 0.58.63 : batiments + services pour rattachement
  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);

  // 0.58.63 : charge batiments + services au mount
  useEffect(() => {
    if (!auth.ready || !auth.etabId) return;
    let alive = true;
    (async () => {
      try {
        const { data: bats } = await supabase.from("batiments").select("id, nom").eq("etablissement_id", auth.etabId).order("nom");
        if (!alive) return;
        setBatiments(bats || []);
        // Services via etages (chaque service appartient à un etage qui appartient à un bâtiment)
        const batIds = (bats || []).map(b => b.id);
        if (batIds.length > 0) {
          const etages = []; // 0.58.85 etages dropped
          const etageIds = (etages || []).map(e => e.id);
          if (etageIds.length > 0) {
            const { data: svcs } = await supabase.from("services").select("id, nom, etage_id").in("etage_id", etageIds).order("nom");
            if (!alive) return;
            // Enrichit avec batiment_id en passant par etage
            const etageToBat = Object.fromEntries((etages || []).map(e => [e.id, e.batiment_id]));
            setServices((svcs || []).map(s => ({ ...s, batiment_id: etageToBat[s.etage_id] })));
          }
        }
      } catch {
        if (alive) { setBatiments([]); setServices([]); }
      }
    })();
    return () => { alive = false; };
  }, [auth.ready, auth.etabId]);

  async function loadAll() {
    if (!auth.ready || !auth.structureId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("pharmacies")
      .select("*")
      .eq("structure_id", auth.structureId)
      .eq("archive", false)
      .order("nom");
    if (error) {
      logger.warn("[pharmacies] load:", error.message);
      if (error.code === "PGRST205" || error.code === "42P01" || /not found/i.test(error.message || "")) {
        await dialogs.alert({
          title: "Table pharmacies absente",
          message: "La table 'pharmacies' n'existe pas encore en base. Exécute le SQL migration-0.58.57-pharmacies-depots-batiment.sql dans Supabase.",
          variant: "danger",
        });
      }
    }
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [auth.ready, auth.structureId]);

  function newPharmacie() {
    setForm({
      nom: "",
      type: "officine",
      finess: "",
      adresse: "",
      code_postal: "",
      ville: "",
      telephone: "",
      email: "",
      pharmacien_titulaire: "",
      horaires: { ...DEFAULT_HORAIRES },
      garde_disponible: false,
      garde_24h: false,
      garde_notes: "",
      specialites: [],
      notes: "",
      // 0.58.63 : rattachement par défaut vide
      batiment_id: null,
      service_id: null,
      equipe_id: null,
    });
    setEditOpen({ id: null });
  }

  function editPharmacie(p) {
    setForm({
      ...p,
      horaires: p.horaires || DEFAULT_HORAIRES,
      specialites: p.specialites || [],
    });
    setEditOpen(p);
  }

  async function savePharmacie() {
    if (!form.nom?.trim()) {
      await dialogs.alert({ title: "Nom requis", message: "Le nom de la pharmacie est obligatoire." });
      return;
    }
    try {
      const payload = {
        structure_id: auth.structureId,
        nom: form.nom.trim(),
        type: form.type || "officine",
        finess: form.finess || null,
        siret: form.siret || null,
        raison_sociale: form.raison_sociale || null,
        adresse: form.adresse || null,
        code_postal: form.code_postal || null,
        ville: form.ville || null,
        telephone: form.telephone || null,
        email: form.email || null,
        site_web: form.site_web || null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        horaires: form.horaires || {},
        garde_disponible: !!form.garde_disponible,
        garde_24h: !!form.garde_24h,
        garde_notes: form.garde_notes || null,
        specialites: form.specialites || [],
        pharmacien_titulaire: form.pharmacien_titulaire || null,
        pharmacien_rpps: form.pharmacien_rpps || null,
        notes: form.notes || null,
        // 0.58.63 : rattachement bât/svc/équipe
        batiment_id: form.batiment_id || null,
        service_id: form.service_id || null,
        equipe_id: form.equipe_id || null,
      };
      if (editOpen?.id) {
        await supabase.from("pharmacies").update(payload).eq("id", editOpen.id);
      } else {
        payload.created_by = auth.user?.id;
        await supabase.from("pharmacies").insert(payload);
      }
      setEditOpen(null);
      await loadAll();
    } catch (e) {
      await dialogs.alert({ title: "Erreur", message: e.message, variant: "danger" });
    }
  }

  async function archivePharmacie(p) {
    if (!await dialogs.confirm({
      title: `Archiver ${p.nom} ?`,
      message: "Cette pharmacie ne sera plus visible dans la liste, mais ses données restent disponibles.",
      variant: "danger",
    })) return;
    await supabase.from("pharmacies").update({ archive: true }).eq("id", p.id);
    setEditOpen(null);
    await loadAll();
  }

  function addFromFiness(f) {
    setForm({
      nom: f.nom || "",
      type: (f.type || "").toLowerCase().includes("pui") ? "PUI" : "officine",
      finess: f.finess || "",
      siret: f.siret || "",
      adresse: f.adresse || "",
      code_postal: f.code_postal || "",
      ville: f.ville || "",
      telephone: f.telephone || "",
      latitude: f.latitude || null,
      longitude: f.longitude || null,
      horaires: { ...DEFAULT_HORAIRES },
      garde_disponible: false,
      specialites: [],
    });
    setFinessSearchOpen(false);
    setEditOpen({ id: null });
  }

  // Filtres
  const filtered = rows.filter((p) => {
    if (filterType === "officine" && p.type !== "officine") return false;
    if (filterType === "PUI" && p.type !== "PUI") return false;
    if (filterType === "LPP" && !(p.specialites || []).includes("lpp")) return false;
    if (filterType === "garde" && !p.garde_disponible) return false;
    if (search) {
      const s = search.toLowerCase();
      return (p.nom || "").toLowerCase().includes(s)
          || (p.ville || "").toLowerCase().includes(s)
          || (p.finess || "").includes(s);
    }
    return true;
  });

  // Helpers horaires
  function getDayStatus(horaires, day) {
    const plages = horaires?.[day];
    if (!plages || plages.length === 0) return { status: "fermé", text: "Fermé" };
    return { status: "ouvert", text: plages.map(p => `${p.open}-${p.close}`).join(" / ") };
  }

  function isOpenNow(horaires) {
    if (!horaires) return false;
    const now = new Date();
    const jour = JOURS_SEMAINE[(now.getDay() + 6) % 7];  // dimanche=0 → 6
    const plages = horaires[jour] || [];
    const h = now.getHours();
    const m = now.getMinutes();
    const nowMins = h * 60 + m;
    return plages.some(p => {
      const [oh, om] = (p.open || "00:00").split(":").map(Number);
      const [ch, cm] = (p.close || "00:00").split(":").map(Number);
      return nowMins >= (oh * 60 + om) && nowMins <= (ch * 60 + cm);
    });
  }

  const countGarde = rows.filter(p => p.garde_disponible).length;
  const countOuvertes = rows.filter(p => isOpenNow(p.horaires)).length;

  if (!auth.ready) return null;

  return (
    <div className="bg-dark" style={{ minHeight: "100vh" }}>
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <PageHead
            eyebrow="PARTENAIRES SANTÉ"
            title="Pharmacies"
            accent="(officines & PUI)"
            sub="Annuaire des pharmacies partenaires avec horaires d'ouverture, garde et spécialités"
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "center" }}>
            <button
              onClick={newPharmacie}
              style={{
                background: "linear-gradient(135deg, #5aa05a, #4a8a4a)",
                color: "#fff", border: "none", padding: "10px 16px", borderRadius: 10,
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <i className="ti ti-plus" /> Nouvelle pharmacie
            </button>
            <button
              onClick={() => setFinessSearchOpen(true)}
              style={{
                background: "linear-gradient(135deg, #185FA5, #134e87)",
                color: "#fff", border: "none", padding: "10px 16px", borderRadius: 10,
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <i className="ti ti-building-hospital" /> Importer depuis FINESS
            </button>
          </div>
        </div>

        <KpiRow tiles={[
          { label: "Pharmacies actives", value: rows.length, icon: "ti-prescription", color: "#5aa05a" },
          { label: "Ouvertes maintenant", value: countOuvertes, icon: "ti-door-enter", color: "#185FA5" },
          { label: "Avec garde", value: countGarde, icon: "ti-moon", color: "#7a6fb0" },
          { label: "Avec LPP", value: rows.filter(p => (p.specialites || []).includes("lpp")).length, icon: "ti-armchair-2", color: "#EF9F27" },
        ]} />

        {/* Filtres */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, ville, FINESS…"
              style={{
                flex: 1, minWidth: 200, padding: "8px 12px",
                border: "1px solid #d3d9e0", borderRadius: 8, fontSize: 13, fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { k: "all", l: `Toutes (${rows.length})` },
                { k: "officine", l: `Officines (${rows.filter(p => p.type === "officine").length})` },
                { k: "PUI", l: `PUI (${rows.filter(p => p.type === "PUI").length})` },
                { k: "LPP", l: `LPP (${rows.filter(p => (p.specialites || []).includes("lpp")).length})` },
                { k: "garde", l: `🌙 Garde (${countGarde})` },
              ].map((opt) => (
                <button
                  key={opt.k}
                  onClick={() => setFilterType(opt.k)}
                  style={{
                    background: filterType === opt.k ? "#5aa05a" : "transparent",
                    color: filterType === opt.k ? "#fff" : "#142131",
                    border: `1px solid ${filterType === opt.k ? "#5aa05a" : "#d3d9e0"}`,
                    padding: "6px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        {/* Liste */}
        {loading ? (
          <Panel><SkeletonRow count={4} /></Panel>
        ) : filtered.length === 0 ? (
          <Panel>
            {rows.length === 0 ? (
              <EmptyState
                icon="ti-prescription"
                title="Aucune pharmacie enregistrée"
                description="Ajoute une pharmacie partenaire manuellement ou importe-la depuis l'annuaire officiel FINESS."
                actionLabel="Importer depuis FINESS"
                onAction={() => setFinessSearchOpen(true)}
              />
            ) : (
              <EmptyState
                icon="ti-search-off"
                title="Aucune pharmacie ne correspond"
                description="Aucune pharmacie ne correspond aux filtres actuels."
              />
            )}
          </Panel>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, marginTop: 12 }}>
            {filtered.map((p) => {
              const isOpen = isOpenNow(p.horaires);
              return (
                <div
                  key={p.id}
                  onClick={() => editPharmacie(p)}
                  style={{
                    background: "#fff", borderRadius: 12, padding: 14, cursor: "pointer",
                    border: "1px solid #e3e9ee",
                    borderLeft: p.garde_disponible ? "4px solid #7a6fb0" : "1px solid #e3e9ee",
                    transition: "all 150ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#5aa05a"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e3e9ee"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: "linear-gradient(135deg, #5aa05a, #4a8a4a)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <i className="ti ti-prescription" style={{ fontSize: 24, color: "#fff" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>{p.nom}</div>
                      <div style={{ fontSize: 11.5, color: "#5aa05a", fontWeight: 600, marginTop: 2 }}>
                        {p.type === "PUI" ? "Pharmacie à Usage Intérieur" : "Pharmacie d'Officine"}
                        {p.pharmacien_titulaire && ` · ${p.pharmacien_titulaire}`}
                      </div>
                    </div>
                    {/* Badge ouvert/fermé temps réel */}
                    <span style={{
                      background: isOpen ? "#dff5e0" : "#fde4e1",
                      color: isOpen ? "#2e6f33" : "#c0392b",
                      fontSize: 10, fontWeight: 700, padding: "3px 8px",
                      borderRadius: 8, letterSpacing: 0.3, flexShrink: 0,
                      display: "inline-flex", alignItems: "center", gap: 3,
                    }}>
                      <i className={`ti ${isOpen ? "ti-door-enter" : "ti-door-exit"}`} />
                      {isOpen ? "OUVERTE" : "FERMÉE"}
                    </span>
                  </div>
                  {/* Adresse */}
                  {p.ville && (
                    <div style={{ fontSize: 11.5, color: "#8a98a8", marginBottom: 6 }}>
                      <i className="ti ti-map-pin" /> {p.code_postal} {p.ville}
                    </div>
                  )}
                  {/* Mini-planning hebdo */}
                  <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                    {JOURS_SEMAINE.map(j => {
                      const { status } = getDayStatus(p.horaires, j);
                      return (
                        <div
                          key={j}
                          title={`${JOURS_LABELS[j]} : ${getDayStatus(p.horaires, j).text}`}
                          style={{
                            flex: 1, padding: "3px 4px", textAlign: "center",
                            fontSize: 9.5, fontWeight: 700, letterSpacing: 0.2,
                            background: status === "ouvert" ? "#dff5e0" : "#f5f5f5",
                            color: status === "ouvert" ? "#2e6f33" : "#a0aeb9",
                            borderRadius: 4,
                          }}
                        >
                          {JOURS_LABELS[j]}
                        </div>
                      );
                    })}
                  </div>
                  {/* Badges */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {p.garde_disponible && (
                      <span style={{ background: "#f3effa", color: "#5a4a90", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8 }}>
                        <i className="ti ti-moon" /> GARDE
                      </span>
                    )}
                    {p.garde_24h && (
                      <span style={{ background: "#fde4e1", color: "#c0392b", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8 }}>
                        24H/24
                      </span>
                    )}
                    {(p.specialites || []).slice(0, 3).map(s => {
                      const sp = SPECIALITES.find(x => x.k === s);
                      if (!sp) return null;
                      return (
                        <span key={s} style={{ background: sp.c + "20", color: sp.c, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8 }}>
                          {sp.l}
                        </span>
                      );
                    })}
                    {p.finess && (
                      <span style={{ background: "#f3effa", color: "#5a4a90", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, fontFamily: "Consolas, monospace" }}>
                        FINESS {p.finess}
                      </span>
                    )}
                  </div>
                  {/* Actions de contact */}
                  <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                    <ContactActions
                      telephone={p.telephone}
                      email={p.email}
                      adresse={p.adresse}
                      cp={p.code_postal}
                      commune={p.ville}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal recherche FINESS */}
      <Modal
        open={finessSearchOpen}
        onClose={() => setFinessSearchOpen(false)}
        title="Importer depuis FINESS"
        subtitle="Recherche dans l'annuaire officiel des établissements de santé"
        icon="ti-building-hospital"
        color="#185FA5"
        maxWidth={720}
      >
        <div style={{ minHeight: 380 }}>
          <FinessSearch
            placeholder="Nom, ville ou n° FINESS (ex : 'pharmacie centrale paris')…"
            onSelect={addFromFiness}
            defaultCategories={["pharma_lpp"]}
          />
        </div>
      </Modal>

      {/* Modal édition pharmacie */}
      <Modal
        open={!!editOpen}
        onClose={() => setEditOpen(null)}
        title={editOpen?.id ? `Éditer ${editOpen.nom}` : "Nouvelle pharmacie"}
        icon="ti-prescription"
        color="#5aa05a"
        maxWidth={720}
        footer={
          <>
            {editOpen?.id && (
              <button onClick={() => archivePharmacie(editOpen)}
                style={{ background: "transparent", color: "#c0392b", border: "1px solid #c0392b", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginRight: "auto" }}>
                <i className="ti ti-archive" /> Archiver
              </button>
            )}
            <button onClick={() => setEditOpen(null)}
              style={{ background: "#f4f7fa", color: "#5a6878", border: "1px solid #d3d9e0", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={savePharmacie}
              style={{ background: "linear-gradient(135deg, #5aa05a, #4a8a4a)", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              <i className="ti ti-device-floppy" /> Enregistrer
            </button>
          </>
        }
      >
        {editOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Identification */}
            <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Nom de la pharmacie *</label>
                <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Pharmacie Centrale" />
              </div>
              <div className="fld">
                <label>Type</label>
                <select value={form.type || "officine"} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d3d9e0", borderRadius: 8, fontSize: 13 }}>
                  <option value="officine">Officine</option>
                  <option value="PUI">PUI (Pharmacie à Usage Intérieur)</option>
                  <option value="LPP">Loueur LPP</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>

            <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>N° FINESS</label>
                <input value={form.finess || ""} onChange={(e) => setForm({ ...form, finess: e.target.value })}
                  style={{ fontFamily: "Consolas, monospace" }} placeholder="460001234" />
              </div>
              <div className="fld">
                <label>Pharmacien titulaire</label>
                <input value={form.pharmacien_titulaire || ""} onChange={(e) => setForm({ ...form, pharmacien_titulaire: e.target.value })} placeholder="Dr. Jean Dupont" />
              </div>
            </div>

            {/* 0.58.63 : rattachement bâtiment / service / équipe */}
            <div style={{
              background: "linear-gradient(135deg, rgba(124,200,200,.08), rgba(122,111,176,.08))",
              border: "1px solid rgba(124,200,200,.25)",
              borderRadius: 10,
              padding: "10px 12px",
              margin: "10px 0",
            }}>
              <div style={{ fontSize: 11.5, color: "#185FA5", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="ti ti-link" /> Rattachement (filtre TopBar)
              </div>
              <div className="grid-3-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="fld">
                  <label><i className="ti ti-building" style={{ color: "#7CC8C8" }} /> Bâtiment</label>
                  <select value={form.batiment_id || ""} onChange={(e) => setForm({ ...form, batiment_id: e.target.value || null, service_id: null })}>
                    <option value="">— Aucun —</option>
                    {(batiments || []).map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </div>
                <div className="fld">
                  <label><i className="ti ti-stethoscope" style={{ color: "#EF9F27" }} /> Service</label>
                  <select value={form.service_id || ""} onChange={(e) => setForm({ ...form, service_id: e.target.value || null })} disabled={!form.batiment_id}>
                    <option value="">— Aucun —</option>
                    {(services || []).filter(s => !form.batiment_id || s.batiment_id === form.batiment_id).map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </div>
                <EquipeSelector
                  value={form.equipe_id}
                  onChange={(eqId) => setForm({ ...form, equipe_id: eqId })}
                  structureId={auth.structureId}
                  batimentId={form.batiment_id}
                  label="Équipe"
                />
              </div>
            </div>

            {/* Coordonnées */}
            <div className="fld">
              <label>Adresse</label>
              <input value={form.adresse || ""} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="12 rue de la Paix" />
            </div>
            <div className="grid-3-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr", gap: 10 }}>
              <div className="fld">
                <label>CP</label>
                <input value={form.code_postal || ""} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} />
              </div>
              <div className="fld">
                <label>Ville</label>
                <input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
              </div>
              <div className="fld">
                <label>Téléphone</label>
                <input type="tel" value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
            </div>

            {/* Horaires */}
            <div style={{ background: "#f0fafa", border: "1px solid #d8e9e9", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2e6f6f", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                <i className="ti ti-clock" /> Horaires d'ouverture
              </div>
              {JOURS_SEMAINE.map(jour => (
                <div key={jour} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 80, fontSize: 12, fontWeight: 600, color: "#142131" }}>
                    {JOURS_LABELS[jour]}
                  </div>
                  <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(form.horaires?.[jour] || []).map((plage, idx) => (
                      <div key={idx} style={{ display: "inline-flex", gap: 4, alignItems: "center", background: "#fff", padding: "3px 6px", borderRadius: 6, border: "1px solid #d8e2ea" }}>
                        <input type="time" value={plage.open || ""}
                          onChange={(e) => {
                            const newHor = { ...form.horaires };
                            newHor[jour] = [...newHor[jour]];
                            newHor[jour][idx] = { ...plage, open: e.target.value };
                            setForm({ ...form, horaires: newHor });
                          }}
                          style={{ border: "none", fontSize: 12, padding: 0, fontFamily: "inherit", width: 70 }} />
                        <span style={{ color: "#8a98a8" }}>—</span>
                        <input type="time" value={plage.close || ""}
                          onChange={(e) => {
                            const newHor = { ...form.horaires };
                            newHor[jour] = [...newHor[jour]];
                            newHor[jour][idx] = { ...plage, close: e.target.value };
                            setForm({ ...form, horaires: newHor });
                          }}
                          style={{ border: "none", fontSize: 12, padding: 0, fontFamily: "inherit", width: 70 }} />
                        <button onClick={() => {
                          const newHor = { ...form.horaires };
                          newHor[jour] = newHor[jour].filter((_, i) => i !== idx);
                          setForm({ ...form, horaires: newHor });
                        }} style={{ background: "transparent", border: "none", color: "#c0392b", cursor: "pointer", padding: 0, fontSize: 11 }}>
                          <i className="ti ti-x" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const newHor = { ...form.horaires };
                      newHor[jour] = [...(newHor[jour] || []), { open: "09:00", close: "12:00" }];
                      setForm({ ...form, horaires: newHor });
                    }} style={{ background: "transparent", color: "#5aa05a", border: "1px dashed #5aa05a", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                      <i className="ti ti-plus" /> Ajouter plage
                    </button>
                    {(form.horaires?.[jour] || []).length === 0 && (
                      <span style={{ fontSize: 11.5, color: "#a0aeb9", fontStyle: "italic" }}>Fermé</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Garde */}
            <div style={{ background: "#f3effa", border: "1px solid #d8c9eb", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#5a4a90", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                <i className="ti ti-moon" /> Garde / urgences
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 6 }}>
                <input type="checkbox" checked={!!form.garde_disponible} onChange={(e) => setForm({ ...form, garde_disponible: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: "#7a6fb0" }} />
                <span style={{ fontSize: 12.5, color: "#142131" }}>Cette pharmacie est de garde occasionnellement</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }}>
                <input type="checkbox" checked={!!form.garde_24h} onChange={(e) => setForm({ ...form, garde_24h: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: "#c0392b" }} />
                <span style={{ fontSize: 12.5, color: "#142131" }}>Pharmacie ouverte 24h/24</span>
              </label>
              {form.garde_disponible && (
                <textarea value={form.garde_notes || ""} onChange={(e) => setForm({ ...form, garde_notes: e.target.value })}
                  placeholder="Ex : Garde le 1er dimanche du mois, contact 06 12 34 56 78"
                  style={{ width: "100%", minHeight: 50, padding: 8, border: "1px solid #d8c9eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", marginTop: 4 }} />
              )}
            </div>

            {/* Spécialités */}
            <div className="fld">
              <label>Spécialités proposées</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SPECIALITES.map(s => {
                  const active = (form.specialites || []).includes(s.k);
                  return (
                    <button
                      key={s.k}
                      type="button"
                      onClick={() => {
                        const cur = form.specialites || [];
                        setForm({ ...form, specialites: active ? cur.filter(x => x !== s.k) : [...cur, s.k] });
                      }}
                      style={{
                        background: active ? s.c : "#fff",
                        color: active ? "#fff" : s.c,
                        border: `1px solid ${s.c}`,
                        padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {active && <i className="ti ti-check" style={{ marginRight: 4 }} />}
                      {s.l}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="fld">
              <label>Notes internes</label>
              <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Remarques, contact privilégié, conditions particulières…"
                style={{ width: "100%", minHeight: 60, padding: 8, border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12, fontFamily: "inherit" }} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
