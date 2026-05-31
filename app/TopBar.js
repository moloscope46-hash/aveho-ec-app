"use client";
// =============================================================
//  TopBar — Bandeau de navigation principal
//  Alpha 0.16.0 : refonte desktop + mobile
//  - Bloc utilisateur visible (UserMenu sous-volet)
//  - Sélecteur établissement responsive
//  - Drawer mobile inchangé mais réorganisé
//  Alpha 0.49.0 : + badge version cliquable dans le header
// =============================================================
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import pkg from "../package.json";
import NotifBell from "./NotifBell";
// Alpha 0.35.0 : GlobalSearch est monté uniquement dans layout.js (palette Ctrl+K).
// L'instance dupliquée dans TopBar a été retirée (causait un doublon d'event listeners
// et disparaissait quand etabId était null). Bouton visible ci-dessous qui déclenche
// la palette via event custom "aveho:open-search".
import UserMenu from "./UserMenu";
import StatusIcons from "./StatusIcons";
import Modal from "./components/Modal";

const MENU = [
  { section: "Mon espace", items: [
    { p: "/accueil", ic: "ti-home", lbl: "Accueil", col: "#7CC8C8" },
    { p: "/magasins", ic: "ti-building-store", lbl: "Magasins", col: "#5a8f8f" },
    { p: "/promotions", ic: "ti-discount-2", lbl: "Promotions", col: "#e35d5b" },
  ] },
  { section: "Établissement", items: [
    { p: "/etablissements", ic: "ti-buildings", lbl: "Annuaire étabs", col: "#185FA5" },
    { p: "/etablissements-partenaires", ic: "ti-building-community", lbl: "Étabs partenaires", col: "#7a6fb0" },
    { p: "/annuaire-rpps", ic: "ti-stethoscope", lbl: "Annuaire RPPS (libéraux)", col: "#7a6fb0" },
    { p: "/partenaires-rpps", ic: "ti-user-circle", lbl: "Mes partenaires RPPS", col: "#7a6fb0" },
    { p: "/carte", ic: "ti-map", lbl: "Carte logistique", col: "#5aa05a" },
    { p: "/etablissement", ic: "ti-building-hospital", lbl: "Mon établissement", col: "#185FA5" },
    { p: "/etablissement/fiche", ic: "ti-id-badge-2", lbl: "Fiche étab.", col: "#1c5454" },
    { p: "/etablissement/edition", ic: "ti-edit", lbl: "Édition hiérarchie", col: "#7a6fb0" },
    { p: "/patients", ic: "ti-users", lbl: "Patients", col: "#7a6fb0" },
    { p: "/materiels", ic: "ti-armchair-2", lbl: "Matériel", col: "#142131" },
    { p: "/articles", ic: "ti-package", lbl: "Articles", col: "#5aa05a" },
    { p: "/interventions", ic: "ti-tools", lbl: "Interventions", col: "#c0392b" },
  ] },
  { section: "Stock", items: [
    { p: "/depots", ic: "ti-building-warehouse", lbl: "Dépôts", col: "#5a8f8f" },
    { p: "/stock", ic: "ti-stack-2", lbl: "Stock", col: "#c97a2a" },
    { p: "/transferts", ic: "ti-transfer", lbl: "Transferts", col: "#7a6fb0" },
  ] },
  { section: "Commandes", items: [
    { p: "/panier", ic: "ti-shopping-cart", lbl: "Panier", col: "#e35d5b", count: "cart" },
    { p: "/commandes", ic: "ti-truck-delivery", lbl: "Mes commandes", col: "#5a8f8f" },
  ] },
  { section: "Groupement", items: [
    { p: "/vue-globale", ic: "ti-layout-dashboard", lbl: "Vue globale", col: "#185FA5" },
    { p: "/statistiques", ic: "ti-chart-bar", lbl: "Statistiques", col: "#7a6fb0" },
    { p: "/calendrier", ic: "ti-calendar", lbl: "Calendrier DI", col: "#EF9F27" },
    { p: "/maintenance", ic: "ti-tool", lbl: "Maintenance", col: "#5a8f8f" },
    { p: "/presentation/interventions", ic: "ti-device-tv", lbl: "Mode TV de service", col: "#7CC8C8" },
    { p: "/collectivite", ic: "ti-building-community", lbl: "Fiche groupement", col: "#5a8f8f" },
  ] },
  { section: "Administration", items: [
    { p: "/utilisateurs", ic: "ti-users-group", lbl: "Utilisateurs", col: "#185FA5" },
    { p: "/historique", ic: "ti-history", lbl: "Historique", col: "#7a6fb0" },
    { p: "/audit", ic: "ti-list-search", lbl: "Audit log", col: "#5e4a8c" },
    { p: "/admin-perf", ic: "ti-bolt", lbl: "Performance SQL", col: "#EF9F27" },
    { p: "/statut", ic: "ti-activity-heartbeat", lbl: "Statut système", col: "#5aa05a" },
    { p: "/app-logs", ic: "ti-bug", lbl: "Logs applicatifs", col: "#c0392b" },
    { p: "/digest-dashboard", ic: "ti-mail-bolt", lbl: "Digests dashboard", col: "#7a6fb0" },
    { p: "/direction", ic: "ti-building-skyscraper", lbl: "Dashboard direction", col: "#7a6fb0" },
    { p: "/webhooks", ic: "ti-webhook", lbl: "Webhooks", col: "#5a8f8f" },
    { p: "/annonces", ic: "ti-speakerphone", lbl: "Annonces", col: "#EF9F27" },
    { p: "/journal", ic: "ti-timeline-event", lbl: "Journal", col: "#185FA5" },
    { p: "/achats", ic: "ti-shopping-cart", lbl: "Achats", col: "#EF9F27" },
    { p: "/signalements", ic: "ti-message", lbl: "Signalements", col: "#7CC8C8" },
    { p: "/templates-signalements", ic: "ti-template", lbl: "Templates signalements", col: "#7a6fb0" },
    { p: "/consentements", ic: "ti-shield-lock", lbl: "Consentements RGPD", col: "#185FA5" },
    { p: "/consent-verifications", ic: "ti-shield-search", lbl: "Audit vérifications RGPD", col: "#5aa05a" },
    { p: "/parametres-rgpd", ic: "ti-shield-cog", lbl: "Modèles consentement", col: "#8c2a23" },
    { p: "/statistiques-rgpd", ic: "ti-chart-pie", lbl: "Statistiques RGPD", col: "#7a6fb0" },
    { p: "/statistiques-activite", ic: "ti-users-group", lbl: "Statistiques activité", col: "#185FA5" },
    { p: "/statistiques-interventions", ic: "ti-tools", lbl: "Statistiques DI", col: "#e35d5b" },
    { p: "/etiquettes", ic: "ti-tags", lbl: "Étiquettes", col: "#C9867F" },
    { p: "/tags-materiel", ic: "ti-tag", lbl: "Tags matériel", col: "#5a8f8f" },
    { p: "/parametres", ic: "ti-settings", lbl: "Paramètres", col: "#5a8f8f" },
    { p: "/parametres/integrations", ic: "ti-plug", lbl: "Intégrations API", col: "#4285F4" },
    { p: "/mentions-legales", ic: "ti-license", lbl: "Mentions légales", col: "#8a98a8" },
    { p: "/profil", ic: "ti-user-circle", lbl: "Mon profil", col: "#7a6fb0" },
  ] },
];

// Alpha 0.53.0 (BO) : badges "NEW" pour les pages récemment ajoutées
// Une page reste flaggée pendant 14 jours après son ajout au menu.
// Le badge disparaît dès que l'user a visité la page (tracé en localStorage).
const NEW_PAGES = [
  { p: "/etablissements", since: "2026-05-31" },
  { p: "/carte", since: "2026-05-31" },
  { p: "/etablissement/fiche", since: "2026-05-31" },
  { p: "/templates-signalements", since: "2026-05-31" },
  { p: "/mentions-legales", since: "2026-05-31" },
  { p: "/changelog", since: "2026-05-30" },
  { p: "/digest-dashboard", since: "2026-05-30" },
  { p: "/statut", since: "2026-05-30" },
  { p: "/app-logs", since: "2026-05-30" },
];
const NEW_DURATION_DAYS = 14;
const NEW_VISITED_KEY = "aveho_visited_pages";

function getVisitedPages() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(NEW_VISITED_KEY) || "{}"); }
  catch { return {}; }
}
function markPageVisited(p) {
  const v = getVisitedPages();
  v[p] = Date.now();
  localStorage.setItem(NEW_VISITED_KEY, JSON.stringify(v));
}
function isPageNew(p) {
  const np = NEW_PAGES.find(x => x.p === p);
  if (!np) return false;
  const since = new Date(np.since).getTime();
  const ageDays = (Date.now() - since) / 86400000;
  if (ageDays > NEW_DURATION_DAYS) return false;
  const visited = getVisitedPages();
  if (visited[p]) return false;
  return true;
}
const TITLES = Object.fromEntries(MENU.flatMap((s) => s.items).map((i) => [i.p, i.lbl]));

export default function TopBar({ cartCount = 0, auth }) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // Alpha 0.55.34 : popup info version (remplace la bulle visible)
  const [versionOpen, setVersionOpen] = useState(false);
  // Alpha 0.55.1 : guard contre l'hydratation mismatch sur le badge NEW
  // (isPageNew lit localStorage → résultat différent serveur/client)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // Alpha 0.48.0 : swipe-to-close gesture pour drawer mobile
  const [touchStart, setTouchStart] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);

  function onTouchStart(e) {
    setTouchStart(e.touches[0].clientX);
    setTouchDelta(0);
  }
  function onTouchMove(e) {
    if (touchStart === null) return;
    const dx = e.touches[0].clientX - touchStart;
    // Ne tracker que les swipes vers la gauche (fermeture)
    if (dx < 0) setTouchDelta(dx);
  }
  function onTouchEnd() {
    if (touchDelta < -80) {
      // Swipe assez large → ferme
      setOpen(false);
    }
    setTouchStart(null);
    setTouchDelta(0);
  }

  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  function go(p) { 
    setOpen(false); 
    // Alpha 0.53.0 (BO) : marque la page visitée pour faire disparaître le badge NEW
    if (typeof window !== "undefined") markPageVisited(p);
    router.push(p); 
  }

  return (
    <>
      <div className="topbar">
        <button className="burger" onClick={() => setOpen(true)} aria-label="Menu"><i className="ti ti-menu-2" /></button>
        <span className="logo" onClick={() => router.push("/accueil")}>a<span className="v">v</span>eho</span>
        {/* Alpha 0.55.34 : bouton info compact (i) qui ouvre un popup version */}
        <button
          onClick={() => setVersionOpen(true)}
          title="À propos de cette version"
          aria-label="À propos de cette version"
          style={{
            background: "rgba(255,255,255,.08)",
            border: "1px solid rgba(255,255,255,.15)",
            color: "#cfd5dd",
            width: 26,
            height: 26,
            borderRadius: "50%",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            marginLeft: 6,
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          <i className="ti ti-info-circle" style={{ fontSize: 16 }} />
        </button>
        <span className="tb-page">{TITLES[path] || ""}</span>
        <div className="spacer" />
        {/* Alpha 0.55.2 : tout ce qui dépend de auth (async) ou du panier (client) 
            doit attendre `mounted` pour éviter mismatch hydratation */}
        {mounted && auth && (
          <button
            className="tb-icon"
            onClick={() => window.dispatchEvent(new CustomEvent("aveho:open-search"))}
            aria-label="Recherche globale (Ctrl+K)"
            title="Recherche globale (Ctrl+K)"
            style={{ position: "relative" }}
          >
            <i className="ti ti-search" />
            <kbd style={{
              position: "absolute", right: -6, bottom: -6,
              background: "#142131", color: "#fff", fontSize: 8.5, fontWeight: 700,
              padding: "2px 4px", borderRadius: 3, lineHeight: 1, letterSpacing: ".5px",
              pointerEvents: "none",
            }}>⌘K</kbd>
          </button>
        )}
        {mounted && auth && auth.etablissements && auth.etablissements.length > 0 && (
          <div className="etab-switch">
            <i className="ti ti-building-hospital" />
            <select value={auth.etabId || ""} onChange={(e) => auth.setEtab(e.target.value)}>
              {auth.etablissements.map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </select>
          </div>
        )}
        {mounted && auth && <NotifBell structureId={auth.structureId} userId={auth.user?.id} />}
        {mounted && (
          <button className="tb-icon" onClick={() => router.push("/panier")} aria-label="Panier">
            <i className="ti ti-shopping-cart" />{cartCount > 0 && <span className="tb-badge">{cartCount}</span>}
          </button>
        )}
        {/* 0.55.19 : icônes de statut (réseau, perm, bio…) */}
        {mounted && auth && <StatusIcons auth={auth} />}
        {mounted && auth && <UserMenu auth={auth} />}
      </div>

      <div className={`menu-overlay${open ? " open" : ""}`} onClick={() => setOpen(false)} />
      <nav 
        className={`menu-drawer${open ? " open" : ""}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          // Suivi visuel du swipe en cours
          transform: touchDelta < 0 ? `translateX(${touchDelta}px)` : undefined,
          transition: touchDelta < 0 ? "none" : undefined,
        }}
      >
        <div className="menu-head">
          <span className="logo">a<span className="v">v</span>eho</span>
          {/* Alpha 0.48.0 : indicateur swipe sur mobile */}
          <span 
            style={{ 
              position: "absolute", 
              left: "50%", transform: "translateX(-50%)",
              top: 10,
              fontSize: 9, 
              letterSpacing: 1, 
              color: "#8a98a8",
              opacity: 0.6,
              pointerEvents: "none",
            }}
            className="swipe-hint"
            aria-hidden="true"
          >
            ← Glissez pour fermer
          </span>
          <button className="menu-close" onClick={() => setOpen(false)} aria-label="Fermer"><i className="ti ti-x" /></button>
        </div>
        <div className="menu-scroll">
          {MENU.map((sec) => (
            <div className="menu-section" key={sec.section}>
              <div className="menu-section-h">{sec.section}<span className="bar" /></div>
              <div className="menu-tiles">
                {sec.items.map((it) => {
                  // 0.55.2 : cartCount vient de localStorage → guard mounted
                  const cnt = mounted && it.count === "cart" ? cartCount : 0;
                  // Alpha 0.53.0 (BO) : badge NEW si page récente non visitée
                  // 0.55.1 : ne calcule qu'après mount (sinon mismatch hydratation)
                  const showNew = mounted && isPageNew(it.p);
                  return (
                    <button key={it.p} className={`menu-tile${path === it.p ? " on" : ""}`} onClick={() => go(it.p)}>
                      {cnt > 0 && <span className="mt-count teal">{cnt}</span>}
                      {showNew && (
                        <span className="mt-count" style={{ background: "#c0392b", color: "#fff", fontWeight: 700, fontSize: 9, letterSpacing: ".5px", padding: "1px 6px" }}>
                          NEW
                        </span>
                      )}
                      <span className="mt-ic" style={{ background: it.col + "22", color: it.col }}><i className={`ti ${it.ic}`} /></span>
                      <span className="mt-lbl">{it.lbl}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* 0.55.34 : popup info version (remplace la bulle ALPHA visible) */}
      <Modal
        open={versionOpen}
        onClose={() => setVersionOpen(false)}
        title="À propos d'Aveho EC"
        subtitle="Espace Collectivité"
        icon="ti-info-circle"
        color="#185FA5"
        maxWidth={420}
        footer={
          <>
            <button
              onClick={() => { setVersionOpen(false); router.push("/changelog"); }}
              style={{
                background: "linear-gradient(135deg, #142131, #185FA5)",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <i className="ti ti-history" /> Voir le changelog
            </button>
            <button
              onClick={() => setVersionOpen(false)}
              style={{
                background: "transparent",
                color: "#142131",
                border: "1px solid #d3d9e0",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Fermer
            </button>
          </>
        }
      >
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: 2, marginBottom: 8 }}>
            a<span style={{ color: "#7CC8C8" }}>v</span>eho
          </div>
          <div style={{ fontSize: 12, color: "#6c7a89", letterSpacing: 1, marginBottom: 16 }}>
            ESPACE COLLECTIVITÉ
          </div>
          <div style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #142131, #185FA5)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 10,
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "Consolas, monospace",
            letterSpacing: 1,
          }}>
            v{pkg.version}
          </div>
          <div style={{ fontSize: 12, color: "#8a98a8", marginTop: 14, lineHeight: 1.6 }}>
            Plateforme de gestion de matériel médical<br />
            et de patients pour les collectivités
          </div>
        </div>
      </Modal>
    </>
  );
}
