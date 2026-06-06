"use client";
// =============================================================
//  /stock — Refonte complète (0.58.85) avec onglets + tuiles + vues
//  Onglets : Vue globale, Articles, Matériels, Mouvements, Cuves, Véhicules
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn } from "../ui";
import { EmptyState, SkeletonRow, toast, NeonButton } from "../components/ui-premium";
import BackButton from "../components/BackButton";
import { fmtDate } from "../../lib/format";

const TABS = [
  { key: "global",      label: "Vue globale",  icon: "ti-layout-dashboard", color: "#185FA5" },
  { key: "articles",    label: "Articles",     icon: "ti-package",          color: "#7CC8C8" },
  { key: "materiels",   label: "Matériels",    icon: "ti-tools-kitchen-2",  color: "#5aa05a" },
  { key: "mouvements",  label: "Mouvements",   icon: "ti-transfer",         color: "#7a6fb0" },
  { key: "cuves",       label: "Cuves O₂",     icon: "ti-flame",            color: "#EF9F27" },
  { key: "vehicules",   label: "Véhicules",    icon: "ti-ambulance",        color: "#e35d5b" },
  { key: "chiffrage",   label: "Chiffrage",    icon: "ti-coin-euro",        color: "#C9867F" },
];

export default function StockPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [tab, setTab] = useState("global");

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <BackButton />
        <PageHead
          eyebrow="LOGISTIQUE · STOCK"
          icon="ti-building-warehouse"
          title="Stock"
          accent="Vue complète"
          sub="Articles, matériels, mouvements, cuves O₂, véhicules sanitaires, chiffrage et historique"
        />

        {/* Onglets */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap",
          background: "rgba(20,33,49,.04)", padding: 6, borderRadius: 14,
          border: "1px solid #e3e9ee",
        }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                background: active ? "#fff" : "transparent",
                color: active ? t.color : "#5a6878",
                border: active ? `1px solid ${t.color}33` : "1px solid transparent",
                borderLeft: active ? `3px solid ${t.color}` : "1px solid transparent",
                padding: "9px 14px", borderRadius: 10,
                fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                transition: "all .15s",
                boxShadow: active ? `0 4px 10px ${t.color}22` : "none",
              }}>
                <i className={`ti ${t.icon}`} style={{ marginRight: 5 }} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "global" && <ViewGlobale supabase={supabase} auth={auth} router={router} />}
        {tab === "articles" && <ViewArticles supabase={supabase} auth={auth} router={router} />}
        {tab === "materiels" && <ViewMateriels supabase={supabase} auth={auth} router={router} />}
        {tab === "mouvements" && <ViewMouvements supabase={supabase} auth={auth} />}
        {tab === "cuves" && <ViewCuves supabase={supabase} auth={auth} router={router} />}
        {tab === "vehicules" && <ViewVehicules supabase={supabase} auth={auth} router={router} />}
        {tab === "chiffrage" && <ViewChiffrage supabase={supabase} auth={auth} />}
      </div>
    </div>
  );
}

// ============================================================
// VIEW GLOBALE — tuiles KPI + accès rapide
// ============================================================
function ViewGlobale({ supabase, auth, router }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    let mounted = true;
    (async () => {
      const tryFetch = async (q) => { try { const r = await q; return r; } catch { return { data: null, count: 0 }; } };
      try {
        const [a, m, d, c, v, mvts] = await Promise.all([
          tryFetch(supabase.from("articles").select("id", { count: "exact", head: true }).eq("structure_id", auth.structureId)),
          tryFetch(supabase.from("materiels").select("id, etat", { count: "exact" }).eq("structure_id", auth.structureId).limit(1000)),
          tryFetch(supabase.from("depots").select("id", { count: "exact", head: true }).eq("structure_id", auth.structureId)),
          tryFetch(supabase.from("cuves_oxygene").select("id, statut", { count: "exact" }).eq("structure_id", auth.structureId).limit(500)),
          tryFetch(supabase.from("vehicules").select("id, statut", { count: "exact" }).eq("structure_id", auth.structureId).limit(200)),
          tryFetch(supabase.from("stock_mouvements").select("id, created_at", { count: "exact" }).eq("structure_id", auth.structureId).order("created_at", { ascending: false }).limit(30)),
        ]);
        if (!mounted) return;
        const matsList = m.data || [];
        const cuvesList = c.data || [];
        const vehsList = v.data || [];
        const mvtsList = mvts.data || [];
        setStats({
          nbArticles: a.count || 0,
          nbMateriels: m.count || matsList.length,
          nbDispo: matsList.filter(x => x.etat === "Disponible").length,
          nbMaint: matsList.filter(x => ["Maintenance", "En désinfection"].includes(x.etat)).length,
          nbSortis: matsList.filter(x => ["Rebut", "Retour fournisseur"].includes(x.etat)).length,
          nbDepots: d.count || 0,
          nbCuves: c.count || cuvesList.length,
          nbCuvesPleines: cuvesList.filter(x => x.statut === "pleine").length,
          nbCuvesVides: cuvesList.filter(x => x.statut === "vide").length,
          nbVehicules: v.count || vehsList.length,
          nbVehDispo: vehsList.filter(x => x.statut === "disponible").length,
          nbMvtsRecents: mvtsList.length,
        });
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [auth.ready, auth.structureId]);

  if (loading) return <Panel><SkeletonRow count={4} /></Panel>;
  if (!stats) return <Panel><p style={{ color: "#5a6878" }}>Aucune donnée</p></Panel>;

  return (
    <>
      {/* Hero KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KpiTile color="#7CC8C8" icon="ti-package" label="Articles" value={stats.nbArticles} onClick={() => router.push("/articles")} subtitle="catalogue" />
        <KpiTile color="#5aa05a" icon="ti-tools-kitchen-2" label="Matériels" value={stats.nbMateriels} subtitle={`${stats.nbDispo} dispo`} onClick={() => router.push("/materiels")} />
        <KpiTile color="#EF9F27" icon="ti-tool" label="En maintenance" value={stats.nbMaint} subtitle="à traiter" warning={stats.nbMaint > 0} onClick={() => router.push("/interventions")} />
        <KpiTile color="#185FA5" icon="ti-building-warehouse" label="Dépôts" value={stats.nbDepots} subtitle="actifs" onClick={() => router.push("/depots")} />
        <KpiTile color="#e35d5b" icon="ti-flame" label="Cuves O₂" value={stats.nbCuves} subtitle={`${stats.nbCuvesPleines} pleines · ${stats.nbCuvesVides} vides`} warning={stats.nbCuvesVides > 0} onClick={() => router.push("/cuves")} />
        <KpiTile color="#7a6fb0" icon="ti-ambulance" label="Véhicules" value={stats.nbVehicules} subtitle={`${stats.nbVehDispo} dispo`} onClick={() => router.push("/vehicules")} />
      </div>

      {/* Actions rapides */}
      <Panel>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#142131" }}><i className="ti ti-zap" /> Actions rapides</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <NeonButton variant="teal" icon="ti-scan" onClick={() => router.push("/scan/quick")}>Scan rapide</NeonButton>
          <Btn variant="primary" icon="ti-arrows-right-left" onClick={() => router.push("/transferts")}>Transferts</Btn>
          <Btn variant="ghost" icon="ti-tools" onClick={() => router.push("/interventions")}>DI / Maintenance</Btn>
          <Btn variant="ghost" icon="ti-clipboard-check" onClick={() => router.push("/depots")}>Inventaire</Btn>
          <Btn variant="ghost" icon="ti-flame" onClick={() => router.push("/mobile/cuve/remplissage")}>Remplissage cuve</Btn>
        </div>
      </Panel>
    </>
  );
}

function KpiTile({ color, icon, label, value, subtitle, onClick, warning }) {
  return (
    <button onClick={onClick} style={{
      background: "#fff", border: `1px solid ${color}33`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 12, padding: "14px 16px", cursor: "pointer",
      fontFamily: "inherit", textAlign: "left", transition: "all .15s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 16px ${color}33`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 32, height: 32, background: `${color}1a`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={`ti ${icon}`} style={{ color, fontSize: 18 }} />
        </div>
        <div style={{ fontSize: 10.5, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{label}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: warning ? "#e35d5b" : color, fontFamily: "Consolas, monospace", lineHeight: 1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: "#5a6878", marginTop: 4 }}>{subtitle}</div>}
    </button>
  );
}

// ============================================================
// Vues spécifiques (placeholder — redirections vers pages dédiées)
// ============================================================
function ViewArticles({ router }) {
  useEffect(() => { router.push("/articles"); }, [router]);
  return <Panel>Redirection vers /articles...</Panel>;
}
function ViewMateriels({ router }) {
  useEffect(() => { router.push("/materiels"); }, [router]);
  return <Panel>Redirection vers /materiels...</Panel>;
}

// ============================================================
// VIEW MOUVEMENTS — historique récent
// ============================================================
function ViewMouvements({ supabase, auth }) {
  const [mvts, setMvts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("stock_mouvements")
          .select("*, articles(libelle), depots(nom)")
          .eq("structure_id", auth.structureId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (mounted) setMvts(data || []);
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [auth.ready, auth.structureId]);

  if (loading) return <Panel><SkeletonRow count={6} /></Panel>;

  return (
    <Panel>
      <h3 style={{ margin: "0 0 14px", fontSize: 15 }}><i className="ti ti-transfer" style={{ color: "#7a6fb0" }} /> 100 derniers mouvements</h3>
      {mvts.length === 0 ? (
        <p style={{ color: "#8a98a8", textAlign: "center", padding: 20 }}>Aucun mouvement enregistré</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {mvts.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#fafbfc", borderRadius: 8, borderLeft: `3px solid ${m.type === "entree" ? "#5aa05a" : m.type === "sortie" ? "#e35d5b" : "#7a6fb0"}` }}>
              <i className={`ti ${m.type === "entree" ? "ti-arrow-down" : m.type === "sortie" ? "ti-arrow-up" : "ti-transfer"}`} style={{ color: m.type === "entree" ? "#5aa05a" : m.type === "sortie" ? "#e35d5b" : "#7a6fb0", fontSize: 18 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#142131" }}>
                  {m.articles?.libelle || "Article"} <span style={{ color: "#8a98a8", fontWeight: 400 }}>· {m.depots?.nom || "—"}</span>
                </div>
                <div style={{ fontSize: 11, color: "#5a6878" }}>{fmtDate(m.created_at)} · {m.type} · qté {m.quantite || 0}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ============================================================
// VIEW CUVES — gestion cuves oxygène
// ============================================================
function ViewCuves({ supabase, auth, router }) {
  const [cuves, setCuves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("cuves_oxygene")
          .select("*, depots(nom), patients(nom, prenom)")
          .eq("structure_id", auth.structureId)
          .order("nom")
          .limit(500);
        if (mounted) setCuves(data || []);
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [auth.ready, auth.structureId]);

  if (loading) return <Panel><SkeletonRow count={4} /></Panel>;

  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, flex: 1, fontSize: 15 }}><i className="ti ti-flame" style={{ color: "#EF9F27" }} /> Cuves O₂ ({cuves.length})</h3>
        <NeonButton variant="teal" icon="ti-flame" onClick={() => router.push("/mobile/cuve/remplissage")}>Remplir une cuve</NeonButton>
        <Btn variant="primary" icon="ti-plus" onClick={() => router.push("/cuves?new=1")}>Nouvelle cuve</Btn>
      </div>
      {cuves.length === 0 ? (
        <EmptyState illustration="package" title="Aucune cuve" message="Crée ta première cuve depuis le bouton ci-dessus." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {cuves.map(c => {
            const niveau = c.niveau_actuel_pct || 0;
            const couleur = c.statut === "pleine" ? "#5aa05a" : c.statut === "vide" ? "#e35d5b" : c.statut === "partielle" ? "#EF9F27" : "#8a98a8";
            return (
              <div key={c.id} onClick={() => router.push(`/cuves/${c.id}`)} style={{
                background: "#fff", border: `1px solid ${couleur}33`, borderLeft: `4px solid ${couleur}`,
                borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all .15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <i className="ti ti-flame" style={{ color: couleur, fontSize: 22 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#142131" }}>{c.numero_serie || "Cuve sans n°"}</div>
                    <div style={{ fontSize: 11, color: "#5a6878" }}>{c.marque} {c.modele} · {c.type_gaz || "O₂"}</div>
                  </div>
                  <span style={{ background: `${couleur}22`, color: couleur, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{c.statut}</span>
                </div>
                {/* Jauge niveau */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5a6878", marginBottom: 2 }}>
                    <span>Niveau</span><span style={{ fontFamily: "Consolas, monospace", fontWeight: 700 }}>{niveau}%</span>
                  </div>
                  <div style={{ height: 8, background: "#e3e9ee", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${niveau}%`, height: "100%", background: `linear-gradient(90deg, ${couleur}, ${couleur}cc)`, transition: "width .25s" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 10.5, color: "#5a6878", flexWrap: "wrap" }}>
                  {c.capacite_litres && <span><i className="ti ti-droplet" /> {c.capacite_litres} L</span>}
                  {c.pression_actuelle_bar && <span><i className="ti ti-gauge" /> {c.pression_actuelle_bar} bar</span>}
                  {c.depots?.nom && <span><i className="ti ti-building-warehouse" /> {c.depots.nom}</span>}
                  {c.patients?.nom && <span><i className="ti ti-user" /> {c.patients.nom}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ============================================================
// VIEW VÉHICULES
// ============================================================
function ViewVehicules({ supabase, auth, router }) {
  const [vehs, setVehs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("vehicules")
          .select("*")
          .eq("structure_id", auth.structureId)
          .order("nom")
          .limit(500);
        if (mounted) setVehs(data || []);
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [auth.ready, auth.structureId]);

  const TYPES = {
    sanitaire:  { c: "#185FA5", i: "ti-ambulance",      lbl: "Sanitaire" },
    ambulance:  { c: "#e35d5b", i: "ti-ambulance",      lbl: "Ambulance" },
    vsl:        { c: "#7CC8C8", i: "ti-car",            lbl: "VSL" },
    taxi:       { c: "#EF9F27", i: "ti-cab",            lbl: "Taxi" },
    utilitaire: { c: "#5aa05a", i: "ti-truck",          lbl: "Utilitaire" },
    autre:      { c: "#8a98a8", i: "ti-car-suv",        lbl: "Autre" },
  };
  const STATUTS = {
    disponible:     { c: "#5aa05a", lbl: "Disponible" },
    en_mission:     { c: "#185FA5", lbl: "En mission" },
    en_maintenance: { c: "#EF9F27", lbl: "Maintenance" },
    hors_service:   { c: "#e35d5b", lbl: "Hors service" },
  };

  if (loading) return <Panel><SkeletonRow count={4} /></Panel>;

  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14, gap: 10 }}>
        <h3 style={{ margin: 0, flex: 1, fontSize: 15 }}><i className="ti ti-ambulance" style={{ color: "#e35d5b" }} /> Véhicules sanitaires ({vehs.length})</h3>
        <Btn variant="primary" icon="ti-plus" onClick={() => router.push("/vehicules?new=1")}>Nouveau véhicule</Btn>
      </div>
      {vehs.length === 0 ? (
        <EmptyState illustration="folder" title="Aucun véhicule" message="Crée ton premier véhicule sanitaire, taxi, ambulance ou utilitaire." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
          {vehs.map(v => {
            const t = TYPES[v.type] || TYPES.autre;
            const s = STATUTS[v.statut] || STATUTS.disponible;
            return (
              <div key={v.id} onClick={() => router.push(`/vehicules/${v.id}`)} style={{
                background: "#fff", border: `1px solid ${t.c}33`, borderLeft: `4px solid ${v.couleur || t.c}`,
                borderRadius: 12, padding: "14px 16px", cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 38, height: 38, background: `${v.couleur || t.c}22`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className={`ti ${v.icone || t.i}`} style={{ color: v.couleur || t.c, fontSize: 20 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>{v.nom}</div>
                    <div style={{ fontSize: 10.5, color: "#5a6878" }}>{t.lbl} {v.immatriculation && <>· <span style={{ fontFamily: "Consolas, monospace" }}>{v.immatriculation}</span></>}</div>
                  </div>
                  <span style={{ background: `${s.c}22`, color: s.c, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{s.lbl}</span>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#5a6878", flexWrap: "wrap" }}>
                  {v.marque && <span>{v.marque} {v.modele}</span>}
                  {v.kilometrage != null && <span><i className="ti ti-route" /> {v.kilometrage.toLocaleString()} km</span>}
                  {v.capacite_personnes && <span><i className="ti ti-users" /> {v.capacite_personnes} pers</span>}
                  {v.capacite_brancards > 0 && <span><i className="ti ti-bed" /> {v.capacite_brancards} branc.</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ============================================================
// VIEW CHIFFRAGE
// ============================================================
function ViewChiffrage({ supabase, auth }) {
  const [chiffrage, setChiffrage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    let mounted = true;
    (async () => {
      try {
        const { data: arts } = await supabase
          .from("articles")
          .select("id, libelle, prix_achat_ht, prix_vente_ht, stock_min, stock_max")
          .eq("structure_id", auth.structureId)
          .not("prix_achat_ht", "is", null);
        if (!mounted) return;
        const totalAchat = (arts || []).reduce((s, a) => s + (parseFloat(a.prix_achat_ht) || 0), 0);
        const totalVente = (arts || []).reduce((s, a) => s + (parseFloat(a.prix_vente_ht) || 0), 0);
        const marge = totalVente - totalAchat;
        const margePct = totalAchat > 0 ? (marge / totalAchat) * 100 : 0;
        setChiffrage({ nbArticlesValorises: (arts || []).length, totalAchat, totalVente, marge, margePct });
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [auth.ready, auth.structureId]);

  if (loading) return <Panel><SkeletonRow count={3} /></Panel>;
  if (!chiffrage) return <Panel><p style={{ color: "#5a6878" }}>Aucune donnée</p></Panel>;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KpiTile color="#7CC8C8" icon="ti-package" label="Articles valorisés" value={chiffrage.nbArticlesValorises} subtitle="avec prix" onClick={() => {}} />
        <KpiTile color="#5aa05a" icon="ti-coin-euro" label="Valeur achat HT" value={`${chiffrage.totalAchat.toFixed(2)} €`} subtitle="cumul catalogue" onClick={() => {}} />
        <KpiTile color="#185FA5" icon="ti-cash" label="Valeur vente HT" value={`${chiffrage.totalVente.toFixed(2)} €`} subtitle="cumul catalogue" onClick={() => {}} />
        <KpiTile color={chiffrage.marge > 0 ? "#5aa05a" : "#e35d5b"} icon="ti-trending-up" label="Marge brute" value={`${chiffrage.marge.toFixed(2)} €`} subtitle={`${chiffrage.margePct.toFixed(1)}%`} onClick={() => {}} />
      </div>
      <Panel>
        <p style={{ margin: 0, color: "#5a6878", fontSize: 13 }}>
          <i className="ti ti-info-circle" /> Le chiffrage est calculé à partir des prix renseignés sur les articles (prix_achat_ht et prix_vente_ht). Renseigne ces champs dans la fiche article pour faire apparaître les valeurs ici.
        </p>
      </Panel>
    </>
  );
}
