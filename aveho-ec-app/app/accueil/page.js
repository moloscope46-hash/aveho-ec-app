"use client";
// Page Accueil — Accueil de l'établissement courant : KPIs et raccourcis
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { fmtEur, fmtDate } from "../../lib/format";
import { useRealtimeTable, showRealtimeToast } from "../../lib/useRealtimeTable";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Statut, StateMsg } from "../ui";
import OnboardingTour from "../OnboardingTour";
import MultiEtabSummary from "../MultiEtabSummary";
import MesValidationsEnAttente from "../MesValidationsEnAttente";

export default function Accueil() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ promos: 0, commandes: 0, enCours: 0, aRegler: 0 });
  const [dernieres, setDernieres] = useState([]);
  // Alpha 0.6 : widgets personnalisables (mémoire localStorage)
  // Alpha 0.7 : ordre des widgets aussi mémorisé
  // Alpha 0.41 : nouveau widget "atraiter" (DI ouvertes, achats à valider, signalements, renouvellements RGPD)
  const [widgets, setWidgets] = useState({
    kpis: true, dernieres: true, notifs: true, raccourcis: true, atraiter: true,
  });
  const [widgetOrder, setWidgetOrder] = useState(["atraiter", "kpis", "raccourcis", "dernieres", "notifs"]);
  const [editLayout, setEditLayout] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState([]);
  // Alpha 0.41.0 : compteurs opérationnels pour le widget "À traiter"
  const [atraiter, setAtraiter] = useState({ di: 0, achats: 0, signalements: 0, renouv: 0, maint: 0 });

  // Alpha 0.44.0 : Realtime sur les tables critiques (DI, signalements, achats)
  // Affiche un toast in-app à chaque création
  useRealtimeTable({
    table: "interventions",
    structureId: auth.structureId,
    event: "INSERT",
    onInsert: (row) => {
      showRealtimeToast({
        title: "Nouvelle DI",
        message: row.numero ? `${row.numero} — ${row.type || "Demande"}` : row.type || "Nouvelle intervention",
        color: row.urgence === "Urgent" ? "#c0392b" : "#e35d5b",
        icon: row.urgence === "Urgent" ? "ti-alert-triangle" : "ti-tools",
        duration: row.urgence === "Urgent" ? 8000 : 5000,
      });
    },
  });
  useRealtimeTable({
    table: "signalements",
    structureId: auth.structureId,
    event: "INSERT",
    onInsert: (row) => {
      showRealtimeToast({
        title: "Nouveau signalement",
        message: row.objet || "Un utilisateur a remonté une remarque",
        color: "#7CC8C8",
        icon: "ti-message",
      });
    },
  });
  useRealtimeTable({
    table: "achats",
    structureId: auth.structureId,
    event: "INSERT",
    onInsert: (row) => {
      showRealtimeToast({
        title: "Achat à valider",
        message: row.libelle || `Demande d'achat #${row.id?.slice(0, 8) || ""}`,
        color: "#EF9F27",
        icon: "ti-shopping-bag",
      });
    },
  });
  // Alpha 0.45.0 : Realtime étendu (maintenances, transferts, commandes)
  useRealtimeTable({
    table: "maintenances",
    structureId: auth.structureId,
    event: "INSERT",
    onInsert: (row) => {
      showRealtimeToast({
        title: "Maintenance planifiée",
        message: `${row.type || "Maintenance"} prévue le ${row.date_prevue ? new Date(row.date_prevue).toLocaleDateString("fr-FR") : "?"}`,
        color: "#5a8f8f",
        icon: "ti-tool",
      });
    },
  });
  useRealtimeTable({
    table: "transferts",
    structureId: auth.structureId,
    event: "INSERT",
    onInsert: (row) => {
      showRealtimeToast({
        title: "Nouveau transfert",
        message: row.libelle || `Transfert #${row.id?.slice(0, 8) || ""}`,
        color: "#185FA5",
        icon: "ti-truck-delivery",
      });
    },
  });
  useRealtimeTable({
    table: "commandes",
    structureId: auth.structureId,
    event: "INSERT",
    onInsert: (row) => {
      showRealtimeToast({
        title: "Nouvelle commande",
        message: row.numero ? `${row.numero}` : `Commande #${row.id?.slice(0, 8) || ""}`,
        color: "#5a8f8f",
        icon: "ti-shopping-cart",
      });
    },
  });

  // Charger les widgets actifs depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aveho_dashboard");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.active) setWidgets({ ...widgets, ...data.active });
        if (Array.isArray(data.order)) setWidgetOrder(data.order);
        // Rétrocompat ancien format (0.6) : juste les actives
        if (!data.active && !data.order) setWidgets({ ...widgets, ...data });
      }
    } catch (_) {}
  }, []);
  function saveWidgets(active, order) {
    try { localStorage.setItem("aveho_dashboard", JSON.stringify({ active, order })); } catch (_) {}
  }
  function toggleWidget(k) {
    const next = { ...widgets, [k]: !widgets[k] };
    setWidgets(next); saveWidgets(next, widgetOrder);
  }
  function moveWidget(k, direction) {
    // direction = -1 (haut) ou +1 (bas)
    const i = widgetOrder.indexOf(k);
    if (i < 0) return;
    const j = i + direction;
    if (j < 0 || j >= widgetOrder.length) return;
    const next = [...widgetOrder];
    [next[i], next[j]] = [next[j], next[i]];
    setWidgetOrder(next); saveWidgets(widgets, next);
  }

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      const [{ data: promos }, { data: cmds }, { data: notifs }] = await Promise.all([
        supabase.from("promotions").select("id").eq("actif", true),
        supabase.from("commandes").select("*, magasins(nom)").order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      const list = cmds || [];
      setKpis({
        promos: (promos || []).length,
        commandes: list.length,
        enCours: list.filter((c) => c.statut === "En cours").length,
        aRegler: list.filter((c) => c.statut !== "Livrée").reduce((s, c) => s + Number(c.total || 0), 0),
      });
      setDernieres(list.slice(0, 5));
      setRecentNotifs(notifs || []);

      // Alpha 0.41.0 : charger compteurs opérationnels (silencieux, fallback 0)
      try {
        const [diR, achR, sigR, renR, mainR] = await Promise.all([
          supabase.from("interventions").select("id", { count: "exact", head: true })
            .not("statut", "in", "(\"Clôturée\",\"Refusée\")"),
          supabase.from("achats").select("id", { count: "exact", head: true })
            .eq("statut", "À valider"),
          supabase.from("signalements").select("id", { count: "exact", head: true })
            .eq("statut", "Nouveau"),
          supabase.from("v_stats_rgpd_renouvellements").select("expire_dans_30j").maybeSingle(),
          supabase.from("maintenances").select("id", { count: "exact", head: true })
            .in("statut", ["À faire", "En retard"]),
        ]);
        setAtraiter({
          di: diR.count || 0,
          achats: achR.count || 0,
          signalements: sigR.count || 0,
          renouv: renR.data?.expire_dans_30j || 0,
          maint: mainR.count || 0,
        });
      } catch (e) {
        // silencieux
      }

      setLoading(false);
    })();
  }, [auth.ready]);

  if (!auth.ready) return null;

  const tiles = [
    { label: "Promotions en cours", value: kpis.promos, icon: "ti-discount-2", color: "#e35d5b", to: "/promotions" },
    { label: "Commandes passées", value: kpis.commandes, icon: "ti-truck-delivery", color: "#7CC8C8", to: "/commandes" },
    { label: "Commandes en cours", value: kpis.enCours, icon: "ti-clock", color: "#EF9F27", to: "/commandes" },
    { label: "Montant à régler", value: fmtEur(kpis.aRegler), icon: "ti-file-invoice", color: "#7a6fb0", to: "/commandes" },
  ];

  const raccourcis = [
    { lbl: "Mes patients", ic: "ti-user", col: "#7a6fb0", to: "/patients" },
    { lbl: "Matériel", ic: "ti-armchair-2", col: "#142131", to: "/materiels" },
    { lbl: "Stock", ic: "ti-boxes", col: "#5aa05a", to: "/stock" },
    { lbl: "DI / Interventions", ic: "ti-tools", col: "#e35d5b", to: "/interventions" },
  ];

  return (
    <div className="bg-dark">
      <OnboardingTour />
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <PageHead eyebrow="ESPACE COLLECTIVITÉ" title="Bonjour, bienvenue sur votre" accent="espace"
            sub={auth.structureNom ? `Vous êtes connecté pour ${auth.structureNom}` : "Rattachez votre compte à une structure pour commander."} />
          <button className="btn-ghost" onClick={() => setEditLayout(!editLayout)}>
            <i className={`ti ${editLayout ? "ti-check" : "ti-layout-dashboard"}`} /> {editLayout ? "Terminer" : "Personnaliser"}
          </button>
        </div>

        {/* Alpha 0.49.0 : vue multi-établissements si user en a > 1 */}
        <MultiEtabSummary auth={auth} onSwitchEtab={(id) => auth.setEtab?.(id)} />

        {/* Alpha 0.51.0 : achats à valider par l'user */}
        <MesValidationsEnAttente auth={auth} />

        {/* Panneau de personnalisation (visible si editLayout) */}
        {editLayout && (
          <Panel style={{ background: "#eaf7f7", borderColor: "#bfe6e6", marginBottom: 18 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Widgets affichés sur l'accueil</h3>
            <p style={{ fontSize: 12, color: "#6c7a89", margin: "0 0 12px" }}>Cochez les widgets à afficher et utilisez les flèches pour les réorganiser.</p>
            {widgetOrder.map((k, idx) => {
              const labels = {
                kpis: "Indicateurs clés (promotions, commandes, montant à régler)",
                raccourcis: "Raccourcis vers les modules",
                dernieres: "Dernières commandes",
                notifs: "Notifications récentes",
                atraiter: "À traiter (DI, achats, signalements, renouvellements RGPD, maintenances)",
              };
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fff", border: "1px solid #cfe0e0", borderRadius: 8, marginBottom: 6 }}>
                  <label style={{ flex: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={widgets[k]} onChange={() => toggleWidget(k)} />
                    {labels[k]}
                  </label>
                  <button onClick={() => moveWidget(k, -1)} disabled={idx === 0} title="Monter" style={{ background: "transparent", border: "1px solid #cfe0e0", borderRadius: 6, width: 28, height: 28, cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.4 : 1 }}>
                    <i className="ti ti-chevron-up" />
                  </button>
                  <button onClick={() => moveWidget(k, +1)} disabled={idx === widgetOrder.length - 1} title="Descendre" style={{ background: "transparent", border: "1px solid #cfe0e0", borderRadius: 6, width: 28, height: 28, cursor: idx === widgetOrder.length - 1 ? "not-allowed" : "pointer", opacity: idx === widgetOrder.length - 1 ? 0.4 : 1 }}>
                    <i className="ti ti-chevron-down" />
                  </button>
                </div>
              );
            })}
          </Panel>
        )}

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel> : (
          <>
            {widgetOrder.map((k) => {
              if (!widgets[k]) return null;
              if (k === "kpis") return (
                <div key="kpis" className="kpi-grid">
                  {tiles.map((t) => (
                    <button key={t.label} className="kpi-tile" onClick={() => router.push(t.to)}>
                      <span className="kpi-ic" style={{ background: t.color + "22", color: t.color }}><i className={`ti ${t.icon}`} /></span>
                      <span className="kpi-val">{t.value}</span>
                      <span className="kpi-lbl">{t.label}</span>
                    </button>
                  ))}
                </div>
              );
              if (k === "raccourcis") return (
                <Panel key="raccourcis" style={{ marginTop: 18 }}>
                  <h2 style={{ margin: "0 0 14px", fontSize: 17 }}>Accès rapide</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
                    {raccourcis.map((r) => (
                      <button key={r.lbl} onClick={() => router.push(r.to)} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                        border: "1px solid #e3e9ee", borderRadius: 12, background: "#fff",
                        cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600,
                        color: "#142131", transition: "background .15s",
                      }} onMouseOver={(e) => e.currentTarget.style.background = "#f4f7fa"}
                         onMouseOut={(e) => e.currentTarget.style.background = "#fff"}>
                        <span style={{ background: r.col + "22", color: r.col, width: 32, height: 32, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
                          <i className={`ti ${r.ic}`} />
                        </span>
                        {r.lbl}
                      </button>
                    ))}
                  </div>
                </Panel>
              );
              if (k === "dernieres") return (
                <Panel key="dernieres" style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>Dernières commandes</h2>
                    <a style={{ color: "#2a5a5a", fontWeight: 600, fontSize: 13 }} onClick={() => router.push("/commandes")}>Tout voir →</a>
                  </div>
                  {dernieres.length === 0 ? <StateMsg>Aucune commande pour l'instant. <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={() => router.push("/promotions")}>Voir les promotions</a></StateMsg> : (
                    <table>
                      <thead><tr><th>N°</th><th>Date</th><th>Magasin</th><th style={{ textAlign: "right" }}>Total</th><th>Statut</th></tr></thead>
                      <tbody>
                        {dernieres.map((c) => (
                          <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => router.push("/commandes")}>
                            <td style={{ fontWeight: 600 }}>{c.numero}</td>
                            <td>{fmtDate(c.created_at)}</td>
                            <td>{c.magasins?.nom || "—"}</td>
                            <td style={{ textAlign: "right" }}>{fmtEur(c.total)}</td>
                            <td><Statut value={c.statut} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Panel>
              );
              if (k === "notifs" && recentNotifs.length > 0) return (
                <Panel key="notifs" style={{ marginTop: 18 }}>
                  <h2 style={{ margin: "0 0 12px", fontSize: 17 }}>Notifications récentes</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {recentNotifs.map((n) => (
                      <div key={n.id} style={{
                        padding: "10px 14px", border: "1px solid #e3e9ee", borderRadius: 10,
                        background: n.lue ? "#fff" : "#eaf7f7", cursor: n.lien ? "pointer" : "default",
                      }} onClick={() => n.lien && router.push(n.lien)}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{n.titre}</div>
                        {n.message && <div style={{ color: "#6c7a89", fontSize: 12.5, marginTop: 2 }}>{n.message}</div>}
                      </div>
                    ))}
                  </div>
                </Panel>
              );
              if (k === "atraiter") {
                const items = [
                  { lbl: "DI ouvertes", value: atraiter.di, icon: "ti-tools", color: "#185FA5", to: "/interventions" },
                  { lbl: "Achats à valider", value: atraiter.achats, icon: "ti-shopping-cart", color: "#EF9F27", to: "/achats" },
                  { lbl: "Maintenances à faire", value: atraiter.maint, icon: "ti-tool", color: "#1c5454", to: "/maintenance" },
                  { lbl: "Signalements nouveaux", value: atraiter.signalements, icon: "ti-message", color: "#7a6fb0", to: "/signalements" },
                  { lbl: "Renouvellements RGPD (30j)", value: atraiter.renouv, icon: "ti-shield-check", color: "#c0392b", to: "/statistiques-rgpd" },
                ].filter(x => x.value > 0);
                if (items.length === 0) return null;
                return (
                  <Panel key="atraiter" style={{ marginTop: 18, borderLeft: "4px solid #EF9F27" }}>
                    <h2 style={{ margin: "0 0 14px", fontSize: 17 }}>
                      <i className="ti ti-bell" style={{ color: "#EF9F27", marginRight: 6 }} /> À traiter
                    </h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                      {items.map((it) => (
                        <button key={it.lbl} onClick={() => router.push(it.to)} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                          border: "1px solid #e3e9ee", borderRadius: 12, background: "#fff", cursor: "pointer",
                          fontFamily: "inherit", textAlign: "left", transition: "background .15s",
                        }} onMouseOver={(e) => e.currentTarget.style.background = "#f4f7fa"}
                           onMouseOut={(e) => e.currentTarget.style.background = "#fff"}>
                          <span style={{ background: it.color + "22", color: it.color, width: 36, height: 36, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                            <i className={`ti ${it.icon}`} />
                          </span>
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#142131", lineHeight: 1 }}>{it.value}</div>
                            <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2 }}>{it.lbl}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </Panel>
                );
              }
              return null;
            })}
          </>
        )}
      </div>
    </div>
  );
}
