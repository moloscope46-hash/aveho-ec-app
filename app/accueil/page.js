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
import AnimationsToggle from "../components/AnimationsToggle";  /* 0.62.73 */
// 0.58.27 : tour produit premium "Découvrir les nouveautés" (en plus du legacy)
import PremiumOnboardingTour from "../components/OnboardingTour";
import MultiEtabSummary from "../MultiEtabSummary";
import MesValidationsEnAttente from "../MesValidationsEnAttente";
// 0.58.0 : refonte UI premium
import HeroDashboard from "./HeroDashboard";
// 0.58.20 : particules teal flottantes en arrière-plan
import { ParticlesBackground } from "../components/ui-premium";
import GalaxyBackground from "../components/GalaxyBackground";
// 0.58.33 : dashboard widgets configurables drag & drop
import DashboardEditorToolbar from "../components/DashboardEditorToolbar";
// 0.58.38 : 3 nouveaux widgets opt-in (citation, mini-calendrier, liens-favoris)
// 0.58.39 : + widget météo (Open-Meteo + géolocalisation)
// 0.58.40 : + widget Notes personnelles (markdown léger)
// 0.58.43 : + widget Mes objectifs (progress bars + milestones)
import { CitationWidget, MiniCalendrierWidget, LiensFavorisWidget, WeatherWidget, NotesWidget, ObjectifsWidget, TeamGoalsWidget } from "../components/DashboardWidgets";
import {
  getDashboardLayout, setDashboardLayout, resetDashboardLayout,
  DEFAULT_ACTIVE, DEFAULT_ORDER, ALL_WIDGETS,
} from "../../lib/dashboardLayout";
import { dialogs } from "../dialogs";

// 0.58.27 : steps du tour produit premium "Découvrir les nouveautés"
const PREMIUM_TOUR_STEPS = [
  {
    target: ".av-cmdk-trigger, [data-tour='cmdk'], .topbar input[type='search'], .topbar input",
    title: "🔍 Recherche universelle Cmd+K",
    content: "Appuyez sur Ctrl+K (ou ⌘K) partout dans l'app pour ouvrir la palette de recherche. Vous pouvez chercher patients/DI/matériels, et taper > pour accéder aux actions rapides (créer patient, vider cache, etc.).",
    position: "bottom",
  },
  {
    target: ".kpi-tile, .av-conic-card",
    title: "💫 Vos KPIs en mode mission control",
    content: "Vos indicateurs clés (DI à traiter, Achats à valider, Signalements urgents, RGPD) apparaissent en cards avec scan-line conic permanent quand ils nécessitent votre attention. Le scan rapide signale les urgences.",
    position: "bottom",
  },
  {
    target: ".notif-btn, .notif-wrap",
    title: "🔔 Notifications avec preview",
    content: "Survolez la cloche pour voir les 3 dernières notifications sans ouvrir le panneau complet. Cliquez sur une notif pour ouvrir le détail.",
    position: "bottom",
  },
  {
    target: "body",
    title: "🎥 Mode présentation pour vos démos",
    content: "Appuyez sur Ctrl+Shift+P pour activer le mode présentation : zoom léger + animations ralenties + ombres renforcées. Parfait pour des démos clients fluides. Toggle aussi disponible dans /profil → Sécurité.",
    position: "bottom",
  },
  {
    target: "body",
    title: "🧘 Mode focus zen pour la saisie",
    content: "Appuyez sur Ctrl+Shift+F pour cacher la topbar, les notifs et les distractions pendant que vous saisissez. Idéal pour les longs formulaires.",
    position: "bottom",
  },
];

export default function Accueil() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [loading, setLoading] = useState(true);

  // 0.58.82 → 0.58.90 : DÉSACTIVÉ — la redirection est faite par /login → /choix-mode
  // Si /accueil redirige auto vers /choix-mode, on contourne le popup à chaque login.
  // Maintenant /login redirige directement vers /choix-mode, donc on n'a plus besoin de ce useEffect.
  // Si quelqu'un arrive sur /accueil directement (URL tapée), on le laisse là.

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
  // 0.58.44 : state pour la bannière d'invitation widgets (dismissable, persiste en localStorage)
  const [bannerDismissed, setBannerDismissed] = useState(true);  // true par défaut = caché en SSR
  useEffect(() => {
    try {
      setBannerDismissed(localStorage.getItem("av-widgets-banner-dismissed") === "true");
    } catch { setBannerDismissed(false); }
  }, []);
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

  // 0.58.33 : Charger les widgets actifs depuis lib/dashboardLayout (drag & drop)
  useEffect(() => {
    const { active, order } = getDashboardLayout();
    setWidgets(active);
    setWidgetOrder(order);
    // Listen events for sync
    function onLayoutChange(e) {
      if (e?.detail?.active) setWidgets(e.detail.active);
      if (e?.detail?.order) setWidgetOrder(e.detail.order);
    }
    window.addEventListener("av-dashboard-layout-change", onLayoutChange);
    return () => window.removeEventListener("av-dashboard-layout-change", onLayoutChange);
  }, []);

  function toggleWidget(k) {
    const next = { ...widgets, [k]: !widgets[k] };
    setWidgets(next);
    setDashboardLayout({ active: next, order: widgetOrder });
  }

  // 0.58.33 : drag & drop natif HTML5
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [dragOverWidget, setDragOverWidget] = useState(null);

  function handleDragStart(e, k) {
    if (!editLayout) return;
    setDraggedWidget(k);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", k); } catch {}
  }

  function handleDragOver(e, k) {
    if (!editLayout || !draggedWidget) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverWidget !== k && k !== draggedWidget) setDragOverWidget(k);
  }

  function handleDragLeave() {
    setDragOverWidget(null);
  }

  function handleDrop(e, targetK) {
    if (!editLayout || !draggedWidget) return;
    e.preventDefault();
    if (targetK === draggedWidget) {
      setDraggedWidget(null);
      setDragOverWidget(null);
      return;
    }
    const sourceIdx = widgetOrder.indexOf(draggedWidget);
    const targetIdx = widgetOrder.indexOf(targetK);
    if (sourceIdx < 0 || targetIdx < 0) return;
    const next = [...widgetOrder];
    // Retire le source et insère à la position du target
    next.splice(sourceIdx, 1);
    next.splice(targetIdx, 0, draggedWidget);
    setWidgetOrder(next);
    setDashboardLayout({ active: widgets, order: next });
    setDraggedWidget(null);
    setDragOverWidget(null);
  }

  function handleDragEnd() {
    setDraggedWidget(null);
    setDragOverWidget(null);
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
    // 0.56.0 : tuile de découverte vers le récap de version majeure
    { lbl: "Aveho EC 0.56", ic: "ti-stars", col: "#185FA5", to: "/v056", isNew: true },
  ];

  return (
    <div className="bg-dark" style={{ position: "relative", isolation: "isolate" }}>
      {/* 0.58.20 : Particules teal en arrière-plan (canvas) — derrière le contenu */}
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}>
        {/* 0.58.60 : galaxies + planètes + étoiles filantes en plus des particules */}
        <GalaxyBackground density="normal" showShootingStars={true} />
        {/* 0.58.26 : mode multicolor (palette Aveho cyclant) pour effet 'cosmic' sur /accueil */}
        <ParticlesBackground count={40} speed={0.25} linkDistance={150} mode="multicolor" />
      </div>
      <OnboardingTour />
      {/* 0.58.27 : tour produit premium "Découvrir les nouveautés"
          - storageKey différente du legacy (av-tour-premium-058)
          - se déclenche après le legacy (autoStart=false par défaut, on l'active si flag URL ?tour=premium) */}
      <PremiumTourTrigger />
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <PageHead eyebrow="ESPACE COLLECTIVITÉ" title="Bonjour, bienvenue sur votre" accent="espace"
            sub={auth.structureNom ? `Vous êtes connecté pour ${auth.structureNom}` : "Rattachez votre compte à une structure pour commander."} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* 0.62.73 : toggle animations */}
            <AnimationsToggle compact />
          {/* 0.58.44 : badge sur le bouton si des widgets bonus sont dispos */}
          {(() => {
            const hiddenOptIn = ALL_WIDGETS.filter(w => !widgets[w.id]).length;
            return (
              <button className="btn-ghost" onClick={() => setEditLayout(!editLayout)} style={{ position: "relative" }}>
                <i className={`ti ${editLayout ? "ti-check" : "ti-layout-dashboard"}`} /> {editLayout ? "Terminer" : "Personnaliser"}
                {!editLayout && hiddenOptIn > 0 && (
                  <span style={{
                    position: "absolute", top: -6, right: -6,
                    background: "linear-gradient(135deg, #EF9F27, #d28818)",
                    color: "#fff", fontSize: 10, fontWeight: 700,
                    minWidth: 18, height: 18, borderRadius: 9, padding: "0 5px",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(239,159,39,.40)",
                    border: "2px solid #fff",
                  }} title={`${hiddenOptIn} widget${hiddenOptIn > 1 ? "s" : ""} bonus disponible${hiddenOptIn > 1 ? "s" : ""}`}>
                    {hiddenOptIn}
                  </span>
                )}
              </button>
            );
          })()}
          </div>{/* fin wrap toggle+button 0.62.73 */}
        </div>

        {/* 0.58.44 : bannière d'invitation à découvrir les widgets opt-in (dismissable) */}
        {(() => {
          const hiddenOptIn = ALL_WIDGETS.filter(w => !widgets[w.id]);
          if (editLayout || bannerDismissed || hiddenOptIn.length === 0) return null;
          return (
            <div style={{
              background: "linear-gradient(135deg, rgba(239,159,39,.10), rgba(124,200,200,.08))",
              border: "1px solid rgba(239,159,39,.30)",
              borderRadius: 12,
              padding: "10px 14px",
              margin: "14px 0 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 18 }}>🎁</span>
              <span style={{ flex: 1, color: "#142131" }}>
                <b>{hiddenOptIn.length} widget{hiddenOptIn.length > 1 ? "s" : ""} bonus disponible{hiddenOptIn.length > 1 ? "s" : ""}</b> :{" "}
                <span style={{ color: "#5a6878", fontSize: 12 }}>
                  {hiddenOptIn.slice(0, 6).map((w, i) => (
                    <span key={w.id} style={{ display: "inline-flex", alignItems: "center", gap: 3, marginRight: 8 }}>
                      <i className={`ti ${w.icon}`} style={{ color: w.color }} />
                      {w.label}{i < Math.min(hiddenOptIn.length, 6) - 1 ? "," : ""}
                    </span>
                  ))}
                </span>
              </span>
              <button
                onClick={() => setEditLayout(true)}
                style={{
                  background: "linear-gradient(135deg, #EF9F27, #d28818)",
                  color: "#fff", border: "none", padding: "5px 12px",
                  borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
                  boxShadow: "0 2px 6px rgba(239,159,39,.30)",
                }}
              >
                <i className="ti ti-sparkles" /> Découvrir
              </button>
              <button
                onClick={() => {
                  try { localStorage.setItem("av-widgets-banner-dismissed", "true"); } catch {}
                  setBannerDismissed(true);
                }}
                aria-label="Masquer cette invitation"
                style={{
                  background: "transparent", border: "none", color: "#8a98a8",
                  cursor: "pointer", padding: 4, fontSize: 14,
                  display: "inline-flex", alignItems: "center",
                }}
                title="Masquer cette invitation"
              >
                <i className="ti ti-x" />
              </button>
            </div>
          );
        })()}

        {/* Alpha 0.49.0 : vue multi-établissements si user en a > 1 */}
        <MultiEtabSummary auth={auth} onSwitchEtab={(id) => auth.setEtab?.(id)} />

        {/* Alpha 0.51.0 : achats à valider par l'user */}
        <MesValidationsEnAttente auth={auth} />

        {/* Panneau de personnalisation (visible si editLayout) */}
        {editLayout && (
          <DashboardEditorToolbar
            active={widgets}
            order={widgetOrder}
            onToggleWidget={toggleWidget}
            onClose={() => setEditLayout(false)}
            onResetConfirm={async () => {
              const ok = await dialogs.confirm({
                title: "Réinitialiser le dashboard ?",
                message: "Cela rétablit l'ordre et l'affichage par défaut de tous les widgets.",
                confirmLabel: "Réinitialiser",
                cancelLabel: "Annuler",
                variant: "warning",
              });
              if (ok) {
                setWidgets(DEFAULT_ACTIVE);
                setWidgetOrder(DEFAULT_ORDER);
                resetDashboardLayout();
              }
            }}
          />
        )}

        {/* 0.58.52 : HeroDashboard rendu IMMÉDIATEMENT (pas attendu de fin de load).
            Les KpiCards utilisent kpis avec valeurs par défaut 0 — pas de masquage. */}
        <HeroDashboard
          auth={auth}
          kpis={kpis}
          atraiter={widgets.atraiter ? atraiter : { di: 0, achats: 0, signalements: 0, renouv: 0, maint: 0 }}
          loading={loading}
          onNavigate={(p) => router.push(p)}
        />

        {loading ? null : (
          <>
            {widgetOrder.map((k) => {
              if (!widgets[k]) return null;
              // 0.58.0 : ces 2 widgets sont déjà dans HeroDashboard
              if (k === "kpis" || k === "atraiter") return null;

              // 0.58.33 : wrapper drag & drop applique sur chaque widget rendu
              const meta = ALL_WIDGETS.find(w => w.id === k) || { color: "#185FA5", label: k };
              const isDragged = draggedWidget === k;
              const isDragOver = dragOverWidget === k && draggedWidget !== k;
              const wrapWithDrag = (content) => (
                <div
                  key={k}
                  data-widget-id={k}
                  draggable={editLayout}
                  onDragStart={(e) => handleDragStart(e, k)}
                  onDragOver={(e) => handleDragOver(e, k)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, k)}
                  onDragEnd={handleDragEnd}
                  style={{
                    position: "relative",
                    marginTop: 18,
                    opacity: isDragged ? 0.35 : 1,
                    // 0.58.61 : transitions plus fluides + élévation au survol drag
                    transform: isDragOver
                      ? "translateY(8px) scale(1.01)"
                      : isDragged
                      ? "scale(0.98)"
                      : "translateY(0) scale(1)",
                    transition: "transform 280ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease-out, box-shadow 220ms",
                    outline: editLayout
                      ? isDragOver
                        ? `3px solid ${meta.color}`
                        : isDragged
                        ? `2px dashed ${meta.color}88`
                        : `2px dashed ${meta.color}55`
                      : "none",
                    outlineOffset: editLayout ? 4 : 0,
                    borderRadius: 14,
                    cursor: editLayout ? (isDragged ? "grabbing" : "grab") : "default",
                    // 0.58.61 : box-shadow accent quand draggé / drop target
                    boxShadow: isDragged
                      ? `0 14px 30px ${meta.color}44, 0 0 0 2px ${meta.color}33`
                      : isDragOver
                      ? `0 8px 22px ${meta.color}55`
                      : "none",
                  }}
                >
                  {/* 0.58.61 : ligne d'insertion teal au-dessus du drop target */}
                  {editLayout && isDragOver && (
                    <div style={{
                      position: "absolute",
                      top: -8,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
                      borderRadius: 2,
                      animation: "av-drop-line-pulse 1.2s ease-in-out infinite",
                      pointerEvents: "none",
                    }} />
                  )}
                  {/* 0.58.33 : drag label + close button en mode édition */}
                  {editLayout && (
                    <>
                      <div style={{
                        position: "absolute", top: -14, left: 16,
                        background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`,
                        color: "#fff",
                        padding: "4px 11px", borderRadius: 6,
                        fontSize: 10.5, fontWeight: 700,
                        letterSpacing: 0.6, textTransform: "uppercase",
                        display: "inline-flex", alignItems: "center", gap: 5,
                        boxShadow: `0 4px 12px ${meta.color}55, 0 0 0 2px #fff`,
                        zIndex: 2,
                        pointerEvents: "none",
                        fontFamily: "inherit",
                      }}>
                        <i className={`ti ${meta.icon}`} />
                        <i className="ti ti-grip-vertical" style={{ fontSize: 13, opacity: 0.8 }} />
                        {meta.label}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleWidget(k); }}
                        aria-label={`Masquer ${meta.label}`}
                        title={`Masquer ${meta.label}`}
                        style={{
                          position: "absolute", top: -10, right: 8,
                          background: "linear-gradient(135deg, #e35d5b, #c0392b)",
                          color: "#fff",
                          border: "2px solid #fff",
                          width: 28, height: 28, borderRadius: "50%",
                          cursor: "pointer", padding: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontFamily: "inherit",
                          boxShadow: "0 4px 10px rgba(192,57,43,0.40)",
                          zIndex: 2,
                          transition: "transform 150ms",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                      >
                        <i className="ti ti-x" />
                      </button>
                    </>
                  )}
                  {content}
                </div>
              );

              if (k === "raccourcis") return wrapWithDrag(
                <Panel style={{ marginTop: 0 }}>
                  <h2 style={{ margin: "0 0 14px", fontSize: 17 }}>Accès rapide</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
                    {raccourcis.map((r) => (
                      <button key={r.lbl} onClick={() => router.push(r.to)} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                        border: "1px solid #e3e9ee", borderRadius: 12, background: "#fff",
                        cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600,
                        color: "#142131", transition: "background .15s",
                        position: "relative",
                      }} onMouseOver={(e) => e.currentTarget.style.background = "#f4f7fa"}
                         onMouseOut={(e) => e.currentTarget.style.background = "#fff"}>
                        <span style={{ background: r.col + "22", color: r.col, width: 32, height: 32, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
                          <i className={`ti ${r.ic}`} />
                        </span>
                        {r.lbl}
                        {r.isNew && (
                          <span style={{
                            position: "absolute", top: 6, right: 6,
                            background: "linear-gradient(135deg,#5aa05a,#2e6f33)", color: "#fff",
                            fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                            padding: "1px 5px", borderRadius: 4,
                          }}>NEW</span>
                        )}
                      </button>
                    ))}
                  </div>
                </Panel>
              );
              if (k === "dernieres") return wrapWithDrag(
                <Panel style={{ marginTop: 0 }}>
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
              if (k === "notifs" && recentNotifs.length > 0) return wrapWithDrag(
                <Panel style={{ marginTop: 0 }}>
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
              // 0.58.38 : 3 nouveaux widgets
              if (k === "citation") return wrapWithDrag(<CitationWidget />);
              if (k === "mini-calendrier") return wrapWithDrag(<MiniCalendrierWidget />);
              if (k === "liens-favoris") return wrapWithDrag(<LiensFavorisWidget />);
              if (k === "meteo") return wrapWithDrag(<WeatherWidget />);
              if (k === "notes") return wrapWithDrag(<NotesWidget />);
              if (k === "objectifs") return wrapWithDrag(<ObjectifsWidget />);
              if (k === "objectifs-equipe") return wrapWithDrag(<TeamGoalsWidget />);
              return null;
            })}
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================
//  0.58.27 : Trigger du tour premium "Découvrir les nouveautés"
//
//  Lance automatiquement si URL contient ?tour=premium (depuis profil)
//  ou si le legacy onboarding est terminé ET le premium pas encore vu
//  (pour ne pas spammer un nouvel utilisateur déjà en plein tour legacy).
// =============================================================
function PremiumTourTrigger() {
  const [shouldStart, setShouldStart] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const forceStart = params.get("tour") === "premium";
    if (forceStart) {
      // Reset le storage pour permettre de re-jouer
      try { localStorage.removeItem("av-tour-premium-058"); } catch {}
      // Nettoie l'URL
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("tour");
        window.history.replaceState({}, "", url);
      } catch {}
      setShouldStart(true);
    }
  }, []);

  if (!shouldStart) return null;

  return (
    <PremiumOnboardingTour
      steps={PREMIUM_TOUR_STEPS}
      storageKey="av-tour-premium-058"
      autoStart={true}
    />
  );
}
