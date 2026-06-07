"use client";
// =============================================================
//  /etablissements — Liste des établissements
//  Alpha 0.55.1
//
//  - Vue liste filtrable/triable par type, ville, domaine
//  - Stats compteurs en haut
//  - Modal de création FINESS : import direct depuis la base nationale
//  - Tri par n'importe quelle colonne (nom, type, ville, capacité)
// =============================================================
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, StateMsg, Modal } from "../ui";
import { dialogs } from "../dialogs";
import FinessSearch from "../FinessSearch";
import SireneSearch from "../SireneSearch";
import DoublonAlert from "../components/DoublonAlert";
import { checkEtabDoublon } from "../lib/checkEtabDoublon";
import GPSProviderModal from "../GPSProviderModal";
import { openItinerary} from "../../lib/gpsProvider";
import { logEvent } from "../../lib/events";
import { safeInsert } from "../../lib/safeWrite";
import { useRouter } from "next/navigation";

const TYPE_COULEURS = {
  "EHPAD": "#7a6fb0",
  "EHPA": "#9088c0",
  "Hôpital": "#185FA5",
  "Clinique": "#7CC8C8",
  "Foyer": "#5aa05a",
  "USLD": "#1c5454",
  "MAS": "#EF9F27",
  "FAM": "#C9867F",
  "IME": "#e35d5b",
  "Résidence autonomie": "#5a8f8f",
  "Autre": "#8a98a8",
};

// 0.58.34 : wrapper Suspense pour useSearchParams() (requis Next 15 SSG bail-out)
export default function EtablissementsListPage() {
  return (
    <Suspense fallback={null}>
      <EtablissementsListPageInner />
    </Suspense>
  );
}

function EtablissementsListPageInner() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const router = useRouter();
  // 0.58.31 : auto-open create modal si ?create=1 (depuis /collectivite)
  const searchParams = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortBy, setSortBy] = useState("nom");
  // 0.62.37 : toggle vue tuiles/liste (persisté dans localStorage)
  const [view, setView] = useState("liste");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("etabs_view");
    if (saved === "tuiles" || saved === "liste") setView(saved);
  }, []);
  function switchView(v) {
    setView(v);
    if (typeof window !== "undefined") localStorage.setItem("etabs_view", v);
  }
  const [sortDir, setSortDir] = useState("asc");
  const [modal, setModal] = useState(null);
  const [pickedFiness, setPickedFiness] = useState(null);
  // 0.55.43 : détection doublons
  const [doublons, setDoublons] = useState(null);
  const [doublonForceCommentaire, setDoublonForceCommentaire] = useState(null);
  const [importMode, setImportMode] = useState("collectivite");  // 0.55.3 : "collectivite" ou "partenaire"
  const [importSource, setImportSource] = useState("finess");  // 0.55.4 : "finess" ou "sirene"
  const [busy, setBusy] = useState(false);
  const [filterPartenaire, setFilterPartenaire] = useState("all");  // "all" | "mine" | "partners"
  // 0.55.4 : modal GPS pour itinéraires
  const [gpsModal, setGpsModal] = useState(null);  // { lat, lng, label }
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isAdmin = auth.role?.nom === "Administrateur" || (auth.can && auth.can("gerer_roles"));

  async function load() {
    if (!auth.structureId) { setLoading(false); return; }
    const { data } = await supabase
      .from("etablissements")
      .select("*")
      .eq("structure_id", auth.structureId);
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.structureId]);

  // Filtrage + tri
  const filtered = useMemo(() => {
    let r = rows;
    // 0.55.3 : filtre partenaire/collectivité
    if (filterPartenaire === "mine") {
      r = r.filter(e => !e.est_partenaire);
    } else if (filterPartenaire === "partners") {
      r = r.filter(e => e.est_partenaire);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(e =>
        (e.nom || "").toLowerCase().includes(q) ||
        (e.ville || "").toLowerCase().includes(q) ||
        (e.finess || "").includes(q) ||
        (e.code_postal || "").includes(q)
      );
    }
    if (filterType) {
      r = r.filter(e => (e.type || "Autre") === filterType);
    }
    r = [...r].sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (va == null) va = "";
      if (vb == null) vb = "";
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      return sortDir === "asc" ? sa.localeCompare(sb, "fr") : sb.localeCompare(sa, "fr");
    });
    return r;
  }, [rows, search, filterType, filterPartenaire, sortBy, sortDir]);

  // Stats
  const stats = useMemo(() => {
    const mine = rows.filter(r => !r.est_partenaire);
    const partners = rows.filter(r => r.est_partenaire);
    const total = rows.length;
    const geoloc = rows.filter(r => r.latitude && r.longitude).length;
    const avecFiness = rows.filter(r => r.finess).length;
    const capaciteTotale = mine.reduce((s, r) => s + (parseInt(r.capacite) || 0), 0);
    const byType = {};
    rows.forEach(r => {
      const t = r.type || "Autre";
      byType[t] = (byType[t] || 0) + 1;
    });
    return { total, mine: mine.length, partners: partners.length, geoloc, avecFiness, capaciteTotale, byType };
  }, [rows]);

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  function openCreateFiness() {
    setPickedFiness(null);
    setImportMode("collectivite");
    setImportSource("finess");
    setModal("create-finess");
  }

  // 0.58.31 : si ?create=1 dans l'URL, ouvre direct la modal de création
  useEffect(() => {
    if (searchParams?.get("create") === "1") {
      openCreateFiness();
      // Nettoie l'URL pour ne pas réouvrir sur reload
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("create");
        window.history.replaceState({}, "", url);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 0.55.4 : action GPS — ouvre direct si provider déjà choisi, sinon affiche modal
  function handleGPSClick(e, etab) {
    if (!etab.latitude || !etab.longitude) return;
    // Si Ctrl/Cmd → forcer le modal de choix (changer de provider)
    const forceModal = e?.ctrlKey || e?.metaKey;
    if (!forceModal && mounted && typeof window !== "undefined" && localStorage.getItem("aveho_gps_provider")) {
      // Provider déjà choisi → ouvre direct
      openItinerary(Number(etab.latitude), Number(etab.longitude), etab.nom);
    } else {
      // Premier passage ou Ctrl → modal de choix
      setGpsModal({ lat: Number(etab.latitude), lng: Number(etab.longitude), label: etab.nom });
    }
  }

  async function confirmCreate() {
    if (!pickedFiness) {
      await dialogs.alert({ title: "Sélectionne d'abord un établissement dans la liste FINESS" });
      return;
    }
    // 0.55.43 : check doublon centralisé via RPC (mine + partner, finess/siret/siren/nom)
    if (!doublonForceCommentaire) {
      const check = await checkEtabDoublon(supabase, {
        finess: pickedFiness.finess,
        siret: pickedFiness.siret,
        siren: pickedFiness.siren,
        nom: pickedFiness.nom,
      });
      if (check.found) {
        setDoublons(check);
        return;
      }
    }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        nom: pickedFiness.nom,
        type: pickedFiness.type || "Autre",
        finess: pickedFiness.finess || null,
        siret: pickedFiness.siret || null,
        adresse: pickedFiness.adresse || null,
        code_postal: pickedFiness.code_postal || null,
        ville: pickedFiness.ville || null,
        telephone: pickedFiness.telephone || null,
        capacite: pickedFiness.capacite || null,
        latitude: pickedFiness.latitude || null,
        longitude: pickedFiness.longitude || null,
        est_partenaire: importMode === "partenaire",
      };
      // 0.55.43 : si on force un doublon → traçabilité
      if (doublonForceCommentaire) {
        payload.doublon_force_commentaire = doublonForceCommentaire;
        payload.doublon_force_par = auth.user?.id;
        payload.doublon_force_at = new Date().toISOString();
      }
      await safeInsert(supabase, "etablissements", payload, { userId: auth.user?.id });
      await logEvent(supabase, auth, {
        action: "creer", entite: "etablissement",
        details: { nom: payload.nom, source: "finess", finess: payload.finess, mode: importMode, doublon_force: !!doublonForceCommentaire },
      });
      setModal(null);
      setPickedFiness(null);
      setDoublons(null);
      setDoublonForceCommentaire(null);
      await load();
    } catch (e) {
      await dialogs.alert({ title: "Erreur création", message: e.message });
    } finally {
      setBusy(false);
    }
  }

  if (!auth.structureId) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg>Sélectionne une collectivité.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ANNUAIRE"
          icon="ti-building-hospital"
          title="Établissements"
          accent={`${stats.total}`}
          sub="Liste de tous les établissements de la collectivité, avec filtres et tri"
        />

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }} className="stats-grid">
          <StatCard icon="ti-building-hospital" color="#185FA5" value={stats.mine} label="Mes étabs" />
          <StatCard icon="ti-route" color="#7CC8C8" value={stats.partners} label="Partenaires" />
          <StatCard icon="ti-map-pin-check" color="#5aa05a" value={stats.geoloc} label="Géolocalisés" />
          <StatCard icon="ti-bed" color="#EF9F27" value={stats.capaciteTotale} label="Lits cumulés" />
        </div>

        {/* Onglets Mes / Partenaires / Tous */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid #e3e9ee", overflowX: "auto" }}>
          {[
            { v: "all", lbl: "Tous", n: stats.total, color: "#142131" },
            { v: "mine", lbl: "Mes étabs", n: stats.mine, color: "#185FA5" },
            { v: "partners", lbl: "Partenaires", n: stats.partners, color: "#7CC8C8" },
          ].map(t => (
            <button
              key={t.v}
              onClick={() => setFilterPartenaire(t.v)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: filterPartenaire === t.v ? `3px solid ${t.color}` : "3px solid transparent",
                padding: "10px 18px",
                fontSize: 13.5,
                fontWeight: filterPartenaire === t.v ? 700 : 500,
                color: filterPartenaire === t.v ? t.color : "#6c7a89",
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: -1,
                whiteSpace: "nowrap",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              {t.lbl}
              <span style={{
                background: filterPartenaire === t.v ? t.color : "#e3e9ee",
                color: filterPartenaire === t.v ? "#fff" : "#6c7a89",
                fontSize: 11, fontWeight: 700, 
                padding: "1px 8px", borderRadius: 10,
              }}>{t.n}</span>
            </button>
          ))}
        </div>

        {/* Filtres + actions */}
        <Panel style={{ marginBottom: 14, padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px", minWidth: 0, position: "relative" }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#8a98a8", fontSize: 15 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher nom, ville, code postal, FINESS…"
                style={{
                  width: "100%", padding: "8px 12px 8px 32px",
                  border: "1px solid #e3e9ee", borderRadius: 8,
                  fontFamily: "inherit", fontSize: 13.5,
                }}
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: "8px 12px", border: "1px solid #e3e9ee", borderRadius: 8,
                fontFamily: "inherit", fontSize: 13.5, background: "#fff",
                flex: "0 0 auto",
              }}
            >
              <option value="">Tous types</option>
              {Object.entries(stats.byType).sort((a,b) => b[1] - a[1]).map(([t, n]) => (
                <option key={t} value={t}>{t} ({n})</option>
              ))}
            </select>
            <button
              onClick={() => setGpsModal({ lat: 0, lng: 0, label: "", configOnly: true })}
              title="Choisir l'appli GPS pour les itinéraires (Google Maps / Waze / Apple Maps / OSM)"
              style={{
                background: "#fff",
                border: "1px solid #e3e9ee",
                color: "#185FA5",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <i className="ti ti-navigation" /> 
              <span className="col-hide-xs">Appli GPS</span>
            </button>
            {isAdmin && (
              <Btn variant="primary" icon="ti-plus" onClick={openCreateFiness}>
                Importer (FINESS/SIRENE)
              </Btn>
            )}
            {/* 0.55.11 (AI) : Export CSV */}
            <button
              onClick={async () => {
                const { exportRows } = await import("../../lib/exportExcel");
                await exportRows(filtered, {
                  filename: `etablissements_${new Date().toISOString().slice(0,10)}`,
                  sheetName: "Établissements",
                  columns: {
                    "Nom": "nom",
                    "Type": (r) => r.type || "",
                    "FINESS": (r) => r.finess_et || "",
                    "Adresse": (r) => r.adresse || "",
                    "Code postal": (r) => r.code_postal || "",
                    "Ville": (r) => r.ville || "",
                    "Téléphone": (r) => r.telephone || "",
                    "Email": (r) => r.email || "",
                    "Capacité": (r) => r.capacite ?? "",
                    "Partenaire": (r) => r.est_partenaire ? "Oui" : "Non",
                    "Latitude": (r) => r.latitude ?? "",
                    "Longitude": (r) => r.longitude ?? "",
                  },
                });
              }}
              title="Exporter la liste filtrée en CSV (ouvrable dans Excel/Calc)"
              style={{
                background: "#fff", color: "#1c5454",
                border: "1px solid #1c5454",
                padding: "6px 12px", borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <i className="ti ti-file-spreadsheet" /> 
              <span className="col-hide-xs">Export CSV</span>
            </button>
          </div>
        </Panel>

        {/* 0.62.37 : Toggle vue tuiles / liste */}
        <Panel style={{ marginTop: 10, padding: "8px 12px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#5a6878", letterSpacing: 1 }}>Affichage</span>
          <div style={{ display: "flex", border: "1px solid #cfd8e0", borderRadius: 6, overflow: "hidden" }}>
            <button onClick={() => switchView("tuiles")} title="Vue tuiles" style={{
              padding: "6px 14px",
              background: view === "tuiles" ? "#185FA5" : "#fff",
              color: view === "tuiles" ? "#fff" : "#5a6878",
              border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}><i className="ti ti-layout-grid" /> Tuiles</button>
            <button onClick={() => switchView("liste")} title="Vue liste" style={{
              padding: "6px 14px",
              background: view === "liste" ? "#185FA5" : "#fff",
              color: view === "liste" ? "#fff" : "#5a6878",
              border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}><i className="ti ti-list" /> Liste</button>
          </div>
        </Panel>

        {/* Liste */}
        {loading ? (
          <Panel><StateMsg>Chargement…</StateMsg></Panel>
        ) : filtered.length === 0 ? (
          <Panel>
            <StateMsg>
              {rows.length === 0 
                ? <>Aucun établissement enregistré. {isAdmin && <>Clique sur <b>Ajouter (FINESS)</b> pour en importer un depuis la base nationale.</>}</>
                : "Aucun résultat pour ces filtres."}
            </StateMsg>
          </Panel>
        ) : view === "tuiles" ? (
          // 0.62.37 : Vue TUILES
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {filtered.map(e => {
              const couleur = TYPE_COULEURS[e.type] || "#185FA5";
              return (
                <div key={e.id} onClick={() => router.push(`/etablissement/fiche?id=${e.id}`)} style={{
                  background: "#fff", border: `1px solid ${couleur}30`,
                  borderTop: `4px solid ${couleur}`,
                  borderRadius: 12, overflow: "hidden", cursor: "pointer",
                  transition: "transform 150ms, box-shadow 150ms",
                }}
                onMouseEnter={(ev) => { ev.currentTarget.style.transform = "translateY(-3px)"; ev.currentTarget.style.boxShadow = `0 8px 16px ${couleur}25`; }}
                onMouseLeave={(ev) => { ev.currentTarget.style.transform = "translateY(0)"; ev.currentTarget.style.boxShadow = "none"; }}>
                  {e.photo_url ? (
                    <div style={{ width: "100%", height: 110, background: `url(${e.photo_url}) center/cover`, backgroundColor: `${couleur}10` }} />
                  ) : (
                    <div style={{ width: "100%", height: 110, background: `linear-gradient(135deg, ${couleur}15, ${couleur}30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, color: couleur }}>
                      <i className="ti ti-building-hospital" />
                    </div>
                  )}
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#142131", lineHeight: 1.2 }}>{e.nom}</div>
                        {e.est_partenaire && <span style={{ display: "inline-block", marginTop: 4, padding: "1px 8px", background: "#e6f7f7", color: "#1c5454", borderRadius: 10, fontSize: 10, fontWeight: 700 }}><i className="ti ti-route" /> Partenaire</span>}
                      </div>
                      <span style={{ background: `${couleur}1A`, color: couleur, padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>{e.type || "—"}</span>
                    </div>
                    {e.ville && <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 6 }}>📍 {e.code_postal ? `${e.code_postal} ` : ""}{e.ville}</div>}
                    {e.finess && <div style={{ fontSize: 10.5, color: "#8a98a8", fontFamily: "Consolas,monospace", marginTop: 2 }}>FINESS : {e.finess}</div>}
                    {e.capacite && <div style={{ fontSize: 11, color: "#5a6878", marginTop: 4 }}>🛏 <b>{e.capacite}</b> lits</div>}
                    <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                      <button onClick={(ev) => { ev.stopPropagation(); router.push(`/etablissement/fiche?id=${e.id}`); }} style={{
                        flex: 1, background: couleur, color: "#fff", border: "none",
                        borderRadius: 6, padding: "6px 10px",
                        fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                      }}>
                        <i className="ti ti-arrow-right" /> Ouvrir la fiche
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Panel style={{ padding: 0, overflow: "hidden" }}>
            <div className="panel-table" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f4f7fa", borderBottom: "2px solid #e3e9ee" }}>
                    <SortableTh field="nom" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Nom</SortableTh>
                    <SortableTh field="est_partenaire" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Statut</SortableTh>
                    <SortableTh field="type" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Type</SortableTh>
                    <SortableTh field="ville" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>Ville</SortableTh>
                    <SortableTh field="finess" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort}>FINESS</SortableTh>
                    <SortableTh field="capacite" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right">Lits</SortableTh>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#142131", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".5px" }}>GPS</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#142131", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".5px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, idx) => {
                    const couleur = TYPE_COULEURS[e.type] || TYPE_COULEURS["Autre"];
                    return (
                      <tr 
                        key={e.id} 
                        onClick={() => router.push(`/etablissement/fiche?id=${e.id}`)}
                        style={{ 
                          borderBottom: idx < filtered.length - 1 ? "1px solid #f0f0f0" : "none",
                          cursor: "pointer",
                          background: "transparent",
                          transition: "background .15s",
                        }}
                        onMouseEnter={(ev) => ev.currentTarget.style.background = "#f9fafb"}
                        onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 600, color: "#142131" }}>{e.nom}</div>
                          {e.adresse && <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 2 }}>{e.adresse}</div>}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {e.est_partenaire ? (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              background: "#e6f7f7", color: "#1c5454",
                              padding: "2px 10px", borderRadius: 10,
                              fontSize: 11, fontWeight: 600,
                            }}>
                              <i className="ti ti-route" /> Partenaire
                            </span>
                          ) : (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              background: "#eef5fc", color: "#185FA5",
                              padding: "2px 10px", borderRadius: 10,
                              fontSize: 11, fontWeight: 600,
                            }}>
                              <i className="ti ti-home" /> Géré
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            display: "inline-block",
                            background: couleur + "22",
                            color: couleur,
                            padding: "2px 10px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                          }}>
                            {e.type || "Autre"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#2a3a48" }}>
                          {e.code_postal && <span style={{ color: "#8a98a8", marginRight: 6 }}>{e.code_postal}</span>}
                          {e.ville || <span style={{ color: "#c0c8d2" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "Consolas, monospace", fontSize: 12, color: "#5a8f8f" }}>
                          {e.finess || <span style={{ color: "#c0c8d2" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                          {e.capacite || <span style={{ color: "#c0c8d2", fontWeight: 400 }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          {e.latitude && e.longitude ? (
                            <i className="ti ti-map-pin-check" style={{ color: "#5aa05a", fontSize: 18 }} title="Géolocalisé" />
                          ) : (
                            <i className="ti ti-map-pin-off" style={{ color: "#c0c8d2", fontSize: 16 }} title="Sans GPS" />
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
                            {/* Plugin Téléphone */}
                            {e.telephone && (
                              <a
                                href={`tel:${e.telephone.replace(/\s+/g, '')}`}
                                title={`Appeler ${e.telephone}`}
                                onClick={(ev) => ev.stopPropagation()}
                                style={iconBtnStyle("#5aa05a")}
                              >
                                <i className="ti ti-phone" />
                              </a>
                            )}
                            {/* Plugin Email */}
                            {e.email && (
                              <a
                                href={`mailto:${e.email}`}
                                title={`Email ${e.email}`}
                                onClick={(ev) => ev.stopPropagation()}
                                style={iconBtnStyle("#7a6fb0")}
                              >
                                <i className="ti ti-mail" />
                              </a>
                            )}
                            {/* Plugin GPS — clic ouvre itinéraire avec provider défaut, Ctrl+clic ouvre modal de choix */}
                            {e.latitude && e.longitude && (
                              <button
                                onClick={(ev) => { ev.stopPropagation(); handleGPSClick(ev, e); }}
                                title="Itinéraire GPS (Ctrl+clic : changer d'appli)"
                                style={iconBtnStyle("#185FA5")}
                              >
                                <i className="ti ti-navigation" />
                              </button>
                            )}
                            {/* Plugin Fiche - 0.62.37 : passe l'id pour ouvrir CET établissement */}
                            <button
                              onClick={(ev) => { ev.stopPropagation(); router.push(`/etablissement/fiche?id=${e.id}`); }}
                              style={{
                                background: "transparent",
                                border: "1px solid #e3e9ee",
                                color: "#142131",
                                padding: "4px 10px",
                                borderRadius: 6,
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                marginLeft: 4,
                              }}
                              title="Ouvrir la fiche détaillée"
                            >
                              Fiche <i className="ti ti-chevron-right" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      {/* Modal création depuis FINESS */}
      {modal === "create-finess" && (
        <Modal
          open={true}
          onClose={() => { setModal(null); setPickedFiness(null); }}
          title="Importer un établissement depuis la base FINESS"
          footer={<>
            <Btn variant="ghost" onClick={() => { setModal(null); setPickedFiness(null); }}>Annuler</Btn>
            <Btn variant="primary" icon="ti-download" onClick={confirmCreate} disabled={busy || !pickedFiness}>
              {busy ? "Création…" : "Importer cet établissement"}
            </Btn>
          </>}
        >
          {/* 0.55.4 : tabs FINESS / SIRENE */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: "1px solid #e3e9ee" }}>
            <button
              type="button"
              onClick={() => { setImportSource("finess"); setPickedFiness(null); }}
              style={tabBtnStyle(importSource === "finess", "#5aa05a")}
            >
              <i className="ti ti-building-hospital" /> FINESS (établissements santé)
            </button>
            <button
              type="button"
              onClick={() => { setImportSource("sirene"); setPickedFiness(null); }}
              style={tabBtnStyle(importSource === "sirene", "#EF9F27")}
            >
              <i className="ti ti-building-store" /> SIRENE (entreprises)
            </button>
          </div>

          <div style={{ 
            marginBottom: 14, padding: "10px 12px", 
            background: importSource === "finess" ? "#eef9ef" : "#fff8ec", 
            border: `1px solid ${importSource === "finess" ? "#bfe2bf" : "#f0d59f"}`, 
            borderRadius: 8, fontSize: 12.5, 
            color: importSource === "finess" ? "#2e6f33" : "#7a4f15", 
            lineHeight: 1.5 
          }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
            {importSource === "finess" ? (
              <>Cherche dans la base <b>FINESS officielle</b> (~340 000 étabs santé : hôpitaux, EHPAD, MAS, IFSI…). Par <b>nom</b>, <b>ville</b> ou <b>n° FINESS</b>.</>
            ) : (
              <>Cherche dans la base <b>SIRENE INSEE</b> (~40 millions d'entreprises). Idéal pour <b>fournisseurs, sociétés tierces, partenaires commerciaux</b>. Par <b>nom</b>, <b>SIRET</b> ou <b>SIREN</b>.</>
            )}
          </div>

          {/* 0.55.3 : choix collectivité vs partenaire */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 700, marginBottom: 8 }}>
              Type d'import
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="modal-grid-2">
              <button
                type="button"
                onClick={() => setImportMode("collectivite")}
                style={{
                  background: importMode === "collectivite" ? "linear-gradient(135deg, #185FA5, #1c5454)" : "#fff",
                  color: importMode === "collectivite" ? "#fff" : "#142131",
                  border: `2px solid ${importMode === "collectivite" ? "#185FA5" : "#e3e9ee"}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  transition: "all .15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <i className="ti ti-home" style={{ fontSize: 18 }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Établissement de ma collectivité</span>
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.85, lineHeight: 1.4 }}>
                  Étab que je gère activement (patients, matériel, interventions). Apparaîtra dans le switcher en haut.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setImportMode("partenaire")}
                style={{
                  background: importMode === "partenaire" ? "linear-gradient(135deg, #7CC8C8, #1c5454)" : "#fff",
                  color: importMode === "partenaire" ? "#fff" : "#142131",
                  border: `2px solid ${importMode === "partenaire" ? "#7CC8C8" : "#e3e9ee"}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  transition: "all .15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <i className="ti ti-route" style={{ fontSize: 18 }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Établissement partenaire</span>
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.85, lineHeight: 1.4 }}>
                  Hôpital prescripteur, structure tiers, fournisseur… Visible sur la carte mais hors gestion patients/matériel.
                </div>
              </button>
            </div>
          </div>
          
          {importSource === "finess" ? (
            <FinessSearch
              onSelect={(etab) => setPickedFiness(etab)}
              placeholder="Ex : CHU Bordeaux, EHPAD Mimosas, 750100026…"
            />
          ) : (
            <SireneSearch
              onSelect={(etab) => setPickedFiness(etab)}
              placeholder="Ex : Carrefour, Domidep, 65201405100013…"
            />
          )}

          {/* 0.55.43 — Alerte doublon */}
          {doublons && doublons.found && (
            <div style={{ marginTop: 12 }}>
              <DoublonAlert
                doublons={doublons}
                itemLabel="cet établissement"
                canForce={auth.can("force_doublon_etab")}
                onCancel={() => { setDoublons(null); }}
                onForce={(commentaire) => {
                  setDoublonForceCommentaire(commentaire);
                  setDoublons(null);
                  setTimeout(() => confirmCreate(), 100);
                }}
              />
            </div>
          )}

          {pickedFiness && (
            <div style={{ marginTop: 16, padding: 14, background: "#fff", border: "2px solid #5aa05a", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <i className="ti ti-check" style={{ color: "#5aa05a", fontSize: 22 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>Établissement sélectionné</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 12.5 }}>
                <span style={{ color: "#8a98a8" }}>Nom :</span>
                <b>{pickedFiness.nom}</b>
                <span style={{ color: "#8a98a8" }}>Type :</span>
                <span>{pickedFiness.type}</span>
                {pickedFiness.finess && (<>
                  <span style={{ color: "#8a98a8" }}>FINESS :</span>
                  <code style={{ fontFamily: "Consolas, monospace", color: "#5a8f8f" }}>{pickedFiness.finess}</code>
                </>)}
                {pickedFiness.siret && (<>
                  <span style={{ color: "#8a98a8" }}>SIRET :</span>
                  <code style={{ fontFamily: "Consolas, monospace", color: "#5a8f8f" }}>{pickedFiness.siret}</code>
                </>)}
                {pickedFiness.siren && !pickedFiness.siret && (<>
                  <span style={{ color: "#8a98a8" }}>SIREN :</span>
                  <code style={{ fontFamily: "Consolas, monospace", color: "#5a8f8f" }}>{pickedFiness.siren}</code>
                </>)}
                <span style={{ color: "#8a98a8" }}>Adresse :</span>
                <span>{pickedFiness.adresse || "—"}{pickedFiness.code_postal ? `, ${pickedFiness.code_postal} ${pickedFiness.ville || ""}` : ""}</span>
                {pickedFiness.telephone && (<>
                  <span style={{ color: "#8a98a8" }}>Tél :</span>
                  <span>{pickedFiness.telephone}</span>
                </>)}
                {pickedFiness.capacite && (<>
                  <span style={{ color: "#8a98a8" }}>Capacité :</span>
                  <span><b>{pickedFiness.capacite}</b> lits</span>
                </>)}
                {pickedFiness.latitude && (<>
                  <span style={{ color: "#8a98a8" }}>GPS :</span>
                  <span>
                    <i className="ti ti-map-pin-check" style={{ color: "#5aa05a", marginRight: 4 }} />
                    <code style={{ fontFamily: "Consolas, monospace", fontSize: 11.5 }}>
                      {pickedFiness.latitude.toFixed(5)}, {pickedFiness.longitude.toFixed(5)}
                    </code>
                  </span>
                </>)}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* 0.55.4 : modal de choix GPS provider */}
      {gpsModal && (
        <GPSProviderModal
          open={true}
          onClose={() => setGpsModal(null)}
          lat={gpsModal.lat}
          lng={gpsModal.lng}
          label={gpsModal.label}
          configOnly={gpsModal.configOnly}
        />
      )}

      <style jsx global>{`
        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

function iconBtnStyle(color) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    background: color + "15",
    border: `1px solid ${color}33`,
    color,
    borderRadius: 6,
    cursor: "pointer",
    textDecoration: "none",
    fontFamily: "inherit",
    fontSize: 14,
    padding: 0,
  };
}

function tabBtnStyle(active, color) {
  return {
    background: "transparent",
    border: "none",
    borderBottom: active ? `3px solid ${color}` : "3px solid transparent",
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? color : "#6c7a89",
    cursor: "pointer",
    fontFamily: "inherit",
    marginBottom: -1,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  };
}

function StatCard({ icon, color, value, label }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e3e9ee",
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{
        background: color + "22",
        color,
        width: 38, height: 38, borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 18 }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#142131", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

function SortableTh({ field, sortBy, sortDir, onSort, children, align }) {
  const active = sortBy === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        padding: "10px 12px",
        textAlign: align || "left",
        fontWeight: 700,
        color: active ? "#185FA5" : "#142131",
        fontSize: 11.5,
        textTransform: "uppercase",
        letterSpacing: ".5px",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
      <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3 }}>
        {active && sortDir === "asc" ? "▲" : active && sortDir === "desc" ? "▼" : "▼"}
      </span>
    </th>
  );
}
