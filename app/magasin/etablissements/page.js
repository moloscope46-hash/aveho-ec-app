"use client";
// =============================================================
//  /magasin/etablissements — Liste des EC clients d'un magasin (0.62.42)
//  Vue tuiles + liste · click → ouvre la fiche EC
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import BackButton from "../../components/BackButton";
import { MagasinSidebar } from "../../components/MagasinSidebar";

const TYPES_COULEUR = {
  "EHPAD":              "#7a6fb0",
  "EHPA":               "#7a6fb0",
  "Hôpital":            "#e35d5b",
  "Clinique":           "#e35d5b",
  "USLD":               "#7CC8C8",
  "MAS":                "#5aa05a",
  "FAM":                "#5aa05a",
  "IME":                "#EF9F27",
  "Foyer":              "#5a8f8f",
  "Résidence autonomie":"#185FA5",
  "Autre":              "#8a98a8",
};

export default function MagasinEtablissementsPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magCtx = useMagasinContext();
  const [etabs, setEtabs] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("tuiles");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!auth.ready) return;
    if (!magCtx.magasinId) { setLoading(false); return; }
    reload();
    const saved = typeof window !== "undefined" && localStorage.getItem("mag_etabs_view");
    if (saved === "tuiles" || saved === "liste") setView(saved);
  }, [auth.ready, magCtx.magasinId]);

  async function reload() {
    setLoading(true);
    try {
      // Stratégie : on prend tous les étabs du structure_id du magasin
      // En vrai prod : filtrer par contrat / rattachement magasin↔étab
      // Mais pour la v0 on liste tout ce qui est rattaché à la structure du magasin
      let q = supabase.from("etablissements").select("id, nom, type, ville, code_postal, finess, telephone, capacite, photo_url, est_partenaire");
      if (auth.structureId) q = q.eq("structure_id", auth.structureId);
      const { data } = await q.order("nom");
      setEtabs(data || []);
      // Stats
      if (data?.length) {
        const ids = data.map(e => e.id);
        const tryList = async (table) => {
          try {
            const r = await supabase.from(table).select("etablissement_id").in("etablissement_id", ids);
            return r.data || [];
          } catch { return []; }
        };
        const tryListBy = async (table, field, etabIds) => {
          try {
            const r = await supabase.from(table).select(field).in(field, etabIds);
            return r.data || [];
          } catch { return []; }
        };
        const [p, di, t] = await Promise.all([
          tryList("patients"),
          (async () => {
            try {
              const r = await supabase.from("interventions").select("etablissement_id").in("etablissement_id", ids).in("statut", ["en_cours", "planifiee", "a_faire", "ouverte"]);
              return r.data || [];
            } catch { return []; }
          })(),
          (async () => {
            try {
              const r = await supabase.from("tournees_etapes").select("etablissement_id").in("etablissement_id", ids).is("completed_at", null);
              return r.data || [];
            } catch { return []; }
          })(),
        ]);
        const c = {};
        data.forEach(e => { c[e.id] = { patients: 0, di_ouvertes: 0, livraisons: 0 }; });
        p.forEach(x => { if (c[x.etablissement_id]) c[x.etablissement_id].patients++; });
        di.forEach(x => { if (c[x.etablissement_id]) c[x.etablissement_id].di_ouvertes++; });
        t.forEach(x => { if (c[x.etablissement_id]) c[x.etablissement_id].livraisons++; });
        setCounts(c);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function switchView(v) {
    setView(v);
    if (typeof window !== "undefined") localStorage.setItem("mag_etabs_view", v);
  }

  function ouvrir(etab) {
    router.push(`/etablissement/fiche?id=${etab.id}`);
  }

  const filtered = useMemo(() => {
    if (!search) return etabs;
    const s = search.toLowerCase();
    return etabs.filter(e => e.nom?.toLowerCase().includes(s) || e.ville?.toLowerCase().includes(s) || e.finess?.includes(s));
  }, [etabs, search]);

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ padding: "20px 24px", flex: 1 }}>
          <BackButton />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <PageHead icon="ti-building-hospital" title={`Mes EC clients (${etabs.length})`} subtitle="Établissements rattachés au magasin · click pour ouvrir la fiche" />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="primary" icon="ti-plus" onClick={() => router.push("/magasin/etablissements/nouveau")}>Nouvel EC client</Btn>
              <Btn variant="ghost" icon="ti-shield-lock" onClick={() => router.push("/magasin/droits")}>Droits</Btn>
            </div>
          </div>

          {/* Toolbar */}
          <Panel style={{ marginTop: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <input
                type="search"
                placeholder="🔍 Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: "1 1 240px", minWidth: 220, padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}
              />
              <div style={{ marginLeft: "auto", display: "flex", border: "1px solid #cfd8e0", borderRadius: 6, overflow: "hidden" }}>
                <button onClick={() => switchView("tuiles")} style={{
                  padding: "8px 14px",
                  background: view === "tuiles" ? "#5a8f8f" : "#fff",
                  color: view === "tuiles" ? "#fff" : "#5a6878",
                  border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}><i className="ti ti-layout-grid" /> Tuiles</button>
                <button onClick={() => switchView("liste")} style={{
                  padding: "8px 14px",
                  background: view === "liste" ? "#5a8f8f" : "#fff",
                  color: view === "liste" ? "#fff" : "#5a6878",
                  border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}><i className="ti ti-list" /> Liste</button>
              </div>
            </div>
          </Panel>

          {loading ? (
            <Panel style={{ marginTop: 12 }}><div style={{ padding: 30, textAlign: "center" }}>Chargement…</div></Panel>
          ) : filtered.length === 0 ? (
            <Panel style={{ marginTop: 12 }}>
              <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-building-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                Aucun EC client.
              </div>
            </Panel>
          ) : view === "tuiles" ? (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
              {filtered.map(e => {
                const col = TYPES_COULEUR[e.type] || "#5a8f8f";
                const c = counts[e.id] || {};
                return (
                  <div key={e.id} onClick={() => ouvrir(e)} style={{
                    background: "#fff", border: `2px solid ${col}25`,
                    borderRadius: 14, overflow: "hidden", cursor: "pointer",
                    transition: "transform 150ms, box-shadow 150ms, border-color 150ms",
                    boxShadow: "0 2px 6px rgba(0,0,0,.04)",
                  }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.transform = "translateY(-3px)"; ev.currentTarget.style.boxShadow = `0 10px 20px ${col}30`; ev.currentTarget.style.borderColor = col; }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.transform = "translateY(0)"; ev.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,.04)"; ev.currentTarget.style.borderColor = `${col}25`; }}>
                    {/* Header */}
                    <div style={{
                      position: "relative", height: 120,
                      background: e.photo_url ? `linear-gradient(180deg, transparent 30%, rgba(0,0,0,.6)), url(${e.photo_url}) center/cover` : `linear-gradient(135deg, ${col}, ${col}dd)`,
                    }}>
                      <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,.95)", color: col, padding: "3px 9px", borderRadius: 14, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{e.type || "—"}</div>
                      {e.est_partenaire && <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(28,84,84,.95)", color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 9, fontWeight: 700 }}><i className="ti ti-route" /> Partenaire</div>}
                      {!e.photo_url && <div style={{ position: "absolute", top: 20, left: 0, right: 0, textAlign: "center", fontSize: 48, color: "rgba(255,255,255,.4)" }}><i className="ti ti-building-hospital" /></div>}
                      <div style={{ position: "absolute", bottom: 10, left: 14, right: 14, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,.4)" }}>
                        <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{e.nom}</div>
                        {e.ville && <div style={{ fontSize: 11, marginTop: 2, opacity: 0.95 }}><i className="ti ti-map-pin" /> {e.code_postal ? `${e.code_postal} ` : ""}{e.ville}</div>}
                      </div>
                    </div>
                    {/* Stats */}
                    <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      <Mini icon="ti-users" label="Patients" value={c.patients} color="#7a6fb0" />
                      <Mini icon="ti-tools" label="DI" value={c.di_ouvertes} color="#e35d5b" alert />
                      <Mini icon="ti-truck-delivery" label="Livraisons" value={c.livraisons} color="#EF9F27" alert />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Panel style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f4f7fa" }}>
                    <th style={th}>Nom</th>
                    <th style={th}>Type</th>
                    <th style={th}>Ville</th>
                    <th style={{ ...th, textAlign: "right" }}>Patients</th>
                    <th style={{ ...th, textAlign: "right" }}>DI</th>
                    <th style={{ ...th, textAlign: "right" }}>Livraisons</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const col = TYPES_COULEUR[e.type] || "#5a8f8f";
                    const c = counts[e.id] || {};
                    return (
                      <tr key={e.id} onClick={() => ouvrir(e)} style={{ borderTop: "1px solid #f0f3f6", cursor: "pointer" }}
                        onMouseEnter={(ev) => ev.currentTarget.style.background = "#fafbfc"}
                        onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}>
                        <td style={td}><strong>{e.nom}</strong></td>
                        <td style={td}><span style={{ background: `${col}1A`, color: col, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{e.type || "—"}</span></td>
                        <td style={{ ...td, color: "#5a6878" }}>{e.code_postal ? `${e.code_postal} ` : ""}{e.ville || "—"}</td>
                        <td style={{ ...td, textAlign: "right" }}><b style={{ color: "#7a6fb0" }}>{c.patients || 0}</b></td>
                        <td style={{ ...td, textAlign: "right" }}><b style={{ color: c.di_ouvertes > 0 ? "#e35d5b" : "#cfd8e0" }}>{c.di_ouvertes || 0}</b></td>
                        <td style={{ ...td, textAlign: "right" }}><b style={{ color: c.livraisons > 0 ? "#EF9F27" : "#cfd8e0" }}>{c.livraisons || 0}</b></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Mini({ icon, label, value, color, alert }) {
  const has = value > 0;
  const c = (alert && !has) ? "#cfd8e0" : color;
  return (
    <div style={{ background: has ? `${c}10` : "#fafbfc", border: `1px solid ${has ? `${c}30` : "#eef1f4"}`, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
      <i className={`ti ${icon}`} style={{ fontSize: 14, color: c }} />
      <div style={{ fontSize: 15, fontWeight: 800, color: c, lineHeight: 1, marginTop: 2 }}>{value || 0}</div>
      <div style={{ fontSize: 9, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 1, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

const th = { padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#5a6878", borderBottom: "1px solid #e3e9ee", textAlign: "left" };
const td = { padding: "10px 12px", fontSize: 13 };
