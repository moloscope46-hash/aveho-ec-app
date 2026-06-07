"use client";
// =============================================================
//  TopBar — Bandeau de navigation principal
//  Alpha 0.16.0 : refonte desktop + mobile
//  - Bloc utilisateur visible (UserMenu sous-volet)
//  - Sélecteur établissement responsive
//  - Drawer mobile inchangé mais réorganisé
//  Alpha 0.49.0 : + badge version cliquable dans le header
// =============================================================
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
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
// 0.58.35 : sélecteurs bâtiment + service dans la TopBar (desktop only)
import BatimentServiceSwitcher from "./components/BatimentServiceSwitcher";
// 0.58.87 : mini-panier dropdown style Amazon
import CartDropdown from "./components/CartDropdown";
// 0.61.4 : adapter TopBar selon mode magasin (catalogue, panier, etc.)
import { useViewMode } from "../lib/useViewMode";

// 0.56.15 : réorganisation par 5 sections métier dans l'ordre du workflow :
// 1. COLLECTIVITÉ (vue globale, hiérarchie, équipes, patients, matériel)
// 2. SCAN (tous les outils scan)
// 3. COMMANDE (panier, commandes, achats)
// 4. LIVRAISON (interventions, transferts, maintenance, calendrier, mode TV)
// 5. ADMINISTRATIF (RGPD, statistiques, journal, signalements, paramètres)
// 6. ADMIN (admin tech : utilisateurs, audit, logs, référentiels santé)
const MENU = [
  { section: "Mon espace", sectionIcon: "ti-home-2", items: [
    { p: "/accueil", ic: "ti-home", lbl: "Accueil", col: "#7CC8C8" },
    { p: "/vue-globale", ic: "ti-layout-dashboard", lbl: "Vue globale", col: "#185FA5" },
    { p: "/profil", ic: "ti-user-circle", lbl: "Mon profil", col: "#7a6fb0" },
    { p: "/magasins", ic: "ti-building-store", lbl: "Magasins Aveho", col: "#5a8f8f" },
    { p: "/promotions", ic: "ti-discount-2", lbl: "Promotions", col: "#e35d5b" },
  ] },
  // 0.58.53 : refonte de la section Collectivité avec hiérarchie claire
  // 1. GROUPEMENT (entité morale)
  { section: "Groupement", sectionIcon: "ti-building-community", items: [
    { p: "/collaborateurs", ic: "ti-users", lbl: "Collaborateurs", col: "#7CC8C8" },
    { p: "/collaborateurs-fournisseurs", ic: "ti-users-group", lbl: "Collaborateurs fournisseurs", col: "#5a8f8f" },
    { p: "/collectivite", ic: "ti-building-community", lbl: "Fiche groupement", col: "#185FA5" },
    { p: "/direction", ic: "ti-building-skyscraper", lbl: "Dashboard direction", col: "#7a6fb0" },
    // 2. ÉTABLISSEMENTS, BÂTIMENTS, SERVICES, ÉQUIPES (organisationnel)
    { p: "/etablissement", ic: "ti-building-hospital", lbl: "Établissements", col: "#185FA5" },
    { p: "/etablissement/fiche", ic: "ti-id-badge-2", lbl: "Fiche étab.", col: "#1c5454" },
    { p: "/etablissement/edition", ic: "ti-edit", lbl: "Bâtiments / Services", col: "#7a6fb0" },
    { p: "/equipes", ic: "ti-users-group", lbl: "Équipes", col: "#5a4a90" },
    { p: "/carte", ic: "ti-map", lbl: "Carte logistique", col: "#5aa05a" },
    // 3. CONTENU MÉTIER
    { p: "/patients", ic: "ti-users", lbl: "Patients", col: "#7a6fb0" },
    { p: "/materiels", ic: "ti-armchair-2", lbl: "Matériel", col: "#142131" },
    { p: "/articles", ic: "ti-package", lbl: "Articles catalogue", col: "#5aa05a" },
    { p: "/depots", ic: "ti-building-warehouse", lbl: "Dépôts", col: "#5a8f8f" },
    { p: "/magasins/nouveau", ic: "ti-building-warehouse", lbl: "Magasins fournisseurs", col: "#5a8f8f" },
    { p: "/stock", ic: "ti-stack-2", lbl: "Stock", col: "#c97a2a" },
  ] },
  // 0.58.53 : nouvelle section "Mes partenaires" avec sous-types + raccourcis vers les annuaires officiels
  { section: "Mes partenaires", sectionIcon: "ti-users-group", items: [
    { p: "/partenaires-rpps?type=prescripteur", ic: "ti-stethoscope", lbl: "Prescripteurs (médecins)", col: "#5a4a90" },
    { p: "/partenaires-rpps?type=infirmiere", ic: "ti-heart-rate-monitor", lbl: "Infirmières", col: "#C9867F" },
    // 0.58.57 : page dédiée pharmacies (table séparée avec horaires + garde)
    { p: "/pharmacies", ic: "ti-prescription", lbl: "Pharmacies", col: "#5aa05a" },
    { p: "/etablissements-partenaires", ic: "ti-building-community", lbl: "Établissements partenaires", col: "#7a6fb0" },
    // Raccourcis vers les annuaires officiels (déplacés de "Collectivité")
    { p: "/annuaire-rpps?metier=medecin", ic: "ti-list-search", lbl: "🔍 Annuaire RPPS (médecins)", col: "#8a98a8" },
    { p: "/annuaire-rpps?metier=infirmiere", ic: "ti-list-search", lbl: "🔍 Annuaire RPPS (infirmières)", col: "#8a98a8" },
    { p: "/etablissements", ic: "ti-list-search", lbl: "🔍 Annuaire étabs (FINESS)", col: "#8a98a8" },
  ] },
  // 2. SCAN
  { section: "Scan", sectionIcon: "ti-scan", items: [
    { p: "/scan/bulletin-situation", ic: "ti-file-scan", lbl: "Créer patient depuis bulletin", col: "#5aa05a" },
    { p: "/scan/prescription", ic: "ti-prescription", lbl: "OCR Ordonnance", col: "#5a4a90" },
    { p: "/scan/qr", ic: "ti-qrcode", lbl: "Scan QR code", col: "#185FA5" },
    { p: "/scan/codebarre", ic: "ti-barcode", lbl: "Scan code-barre", col: "#7a6fb0" },
    { p: "/scan/ocr", ic: "ti-text-recognition", lbl: "OCR générique", col: "#EF9F27" },
  ] },
  // 3. COMMANDE
  { section: "Commande", sectionIcon: "ti-shopping-bag", items: [
    { p: "/panier", ic: "ti-shopping-cart", lbl: "Panier", col: "#e35d5b", count: "cart" },
    { p: "/commandes", ic: "ti-truck-delivery", lbl: "Mes commandes", col: "#5a8f8f" },
    { p: "/achats", ic: "ti-cash", lbl: "Achats", col: "#EF9F27" },
  ] },
  // 4. LIVRAISON (= interventions / DI / transferts / planning)
  { section: "Livraison", sectionIcon: "ti-truck-delivery", items: [
    { p: "/mes-demandes", ic: "ti-truck-loading", lbl: "Mes demandes (DI)", col: "#EF9F27" },
    { p: "/sav/nouvelle", ic: "ti-tool", lbl: "Demande SAV", col: "#e35d5b" },
    { p: "/transferts/nouvelle", ic: "ti-transfer", lbl: "Demande transfert", col: "#7a6fb0" },
    { p: "/interventions", ic: "ti-tools", lbl: "Interventions / DI", col: "#c0392b" },
    { p: "/transferts", ic: "ti-transfer", lbl: "Transferts", col: "#7a6fb0" },
    { p: "/maintenance", ic: "ti-tool", lbl: "Maintenance", col: "#5a8f8f" },
    { p: "/calendrier", ic: "ti-calendar", lbl: "Calendrier DI", col: "#EF9F27" },
    { p: "/presentation/interventions", ic: "ti-device-tv", lbl: "Mode TV de service", col: "#7CC8C8" },
  ] },
  // 5. ADMINISTRATIF (RGPD, statistiques métier, signalements, paramètres usuels)
  { section: "Administratif", sectionIcon: "ti-clipboard-list", items: [
    { p: "/statistiques", ic: "ti-chart-bar", lbl: "Statistiques", col: "#7a6fb0" },
    { p: "/statistiques-activite", ic: "ti-users-group", lbl: "Statistiques activité", col: "#185FA5" },
    { p: "/statistiques-interventions", ic: "ti-tools", lbl: "Statistiques DI", col: "#e35d5b" },
    { p: "/journal", ic: "ti-timeline-event", lbl: "Journal", col: "#185FA5" },
    { p: "/signalements", ic: "ti-message", lbl: "Signalements", col: "#7CC8C8" },
    { p: "/templates-signalements", ic: "ti-template", lbl: "Templates signalements", col: "#7a6fb0" },
    { p: "/consentements", ic: "ti-shield-lock", lbl: "Consentements RGPD", col: "#185FA5" },
    { p: "/consent-verifications", ic: "ti-shield-search", lbl: "Audit vérif RGPD", col: "#5aa05a" },
    { p: "/parametres-rgpd", ic: "ti-shield-cog", lbl: "Modèles consentement", col: "#8c2a23" },
    { p: "/statistiques-rgpd", ic: "ti-chart-pie", lbl: "Statistiques RGPD", col: "#7a6fb0" },
    { p: "/rbeu", ic: "ti-shield-check", lbl: "RBEU - Bénéficiaires effectifs", col: "#7a6fb0" },
    { p: "/parametres/notifications", ic: "ti-bell-cog", lbl: "Préférences notifications", col: "#EF9F27" },
    { p: "/digest-dashboard", ic: "ti-mail-bolt", lbl: "Digests dashboard", col: "#7a6fb0" },
    { p: "/annonces", ic: "ti-speakerphone", lbl: "Annonces", col: "#EF9F27" },
    { p: "/etiquettes", ic: "ti-tags", lbl: "Étiquettes", col: "#C9867F" },
    { p: "/tags-materiel", ic: "ti-tag", lbl: "Tags matériel", col: "#5a8f8f" },
    { p: "/pathologies", ic: "ti-stethoscope", lbl: "Pathologies & protocoles", col: "#185FA5" },
    { p: "/parametres", ic: "ti-settings", lbl: "Paramètres", col: "#5a8f8f" },
    { p: "/parametres/integrations", ic: "ti-plug", lbl: "Intégrations API", col: "#4285F4" },
    { p: "/mentions-legales", ic: "ti-license", lbl: "Mentions légales", col: "#8a98a8" },
  ] },
  // 6. ADMIN (tech)
  { section: "Administration", sectionIcon: "ti-shield-lock", items: [
    { p: "/utilisateurs", ic: "ti-users-group", lbl: "Utilisateurs", col: "#185FA5" },
    { p: "/historique", ic: "ti-history", lbl: "Historique", col: "#7a6fb0" },
    { p: "/audit", ic: "ti-list-search", lbl: "Audit log", col: "#5e4a8c" },
    { p: "/statut", ic: "ti-activity-heartbeat", lbl: "Statut système", col: "#5aa05a" },
    { p: "/app-logs", ic: "ti-bug", lbl: "Logs applicatifs", col: "#c0392b" },
    { p: "/admin-perf", ic: "ti-bolt", lbl: "Performance SQL", col: "#EF9F27" },
    { p: "/webhooks", ic: "ti-webhook", lbl: "Webhooks", col: "#5a8f8f" },
    { p: "/admin/rpps-diagnostic", ic: "ti-stethoscope", lbl: "Diagnostic API RPPS", col: "#7a6fb0" },
    { p: "/admin/rpps-dump", ic: "ti-database-import", lbl: "Dump RPPS (Plan B)", col: "#5aa05a" },
    { p: "/admin/bulletins-archive", ic: "ti-archive", lbl: "Bulletins archivés", col: "#185FA5" },
    { p: "/admin/referentiels-sante", ic: "ti-shield-check", lbl: "Caisses & Mutuelles", col: "#7a6fb0" },
    { p: "/admin/medecins-prescripteurs", ic: "ti-stethoscope", lbl: "Médecins prescripteurs", col: "#5a4a90" },
    { p: "/admin/avis-google", ic: "ti-star", lbl: "Avis Google", col: "#EF9F27" },
    { p: "/admin/doublons-forces", ic: "ti-copy", lbl: "Doublons forces", col: "#c0392b" },
    { p: "/admin/prescriptions-archive", ic: "ti-archive", lbl: "Prescriptions archive", col: "#5a4a90" },
    { p: "/admin/mail-diagnostic", ic: "ti-mail-cog", lbl: "Diagnostic envoi mail", col: "#e35d5b" },
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
  // 0.61.4 : mode magasin pour adapter l'UI
  const viewMode = useViewMode();
  const isMagasin = viewMode.ready && viewMode.isMagasin;
  const [open, setOpen] = useState(false);
  // Alpha 0.55.34 : popup info version (remplace la bulle visible)
  const [versionOpen, setVersionOpen] = useState(false);
  // Alpha 0.55.1 : guard contre l'hydratation mismatch sur le badge NEW
  // (isPageNew lit localStorage → résultat différent serveur/client)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // 0.58.87 : mini-panier dropdown style Amazon
  const [cartOpen, setCartOpen] = useState(false);
  const cartBtnRef = useRef(null);
  // Alpha 0.48.0 : swipe-to-close gesture pour drawer mobile
  const [touchStart, setTouchStart] = useState(null);
  // 0.58.56 : état de collapse par section du menu (sticky en localStorage)
  const [collapsedSections, setCollapsedSections] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("av-menu-collapsed-sections") || "{}");
    } catch { return {}; }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem("av-menu-collapsed-sections", JSON.stringify(collapsedSections)); } catch {}
  }, [collapsedSections]);
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
        {/* 0.62.10 : Sélecteur établissement + filtres bât/svc en MODE MAGASIN AUSSI
            (Cédric veut voir uniquement les étabs/bât/svc où son magasin est rattaché — TODO filtrage v_etabs_du_magasin) */}
        {mounted && auth && auth.etablissements && auth.etablissements.length > 0 && (
          <div className="etab-switch">
            <i className="ti ti-building-hospital" />
            <select value={auth.etabId || ""} onChange={(e) => auth.setEtab(e.target.value)}>
              {auth.etablissements.map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </select>
          </div>
        )}
        {/* 0.58.35 : sélecteurs bâtiment + service (desktop only) */}
        {mounted && auth && <BatimentServiceSwitcher auth={auth} />}
        {mounted && auth && <NotifBell structureId={auth.structureId} userId={auth.user?.id} />}
        {mounted && (
          <div style={{ position: "relative" }}>
            {isMagasin ? (
              // 0.61.4 : Mode magasin → icône "Commandes reçues" (read-only), redirige vers /magasin?tab=di
              <button className="tb-icon" onClick={() => router.push("/magasin?tab=di")} aria-label="Commandes reçues" title="Commandes reçues des EC">
                <i className="ti ti-package" />{cartCount > 0 && <span className="tb-badge" style={{ background: "#5a8f8f" }}>{cartCount}</span>}
              </button>
            ) : (
              <>
                <button ref={cartBtnRef} className="tb-icon" onClick={() => setCartOpen(o => !o)} aria-label="Panier" aria-expanded={cartOpen}>
                  <i className="ti ti-shopping-cart" />{cartCount > 0 && <span className="tb-badge">{cartCount}</span>}
                </button>
                <CartDropdown open={cartOpen} onClose={() => setCartOpen(false)} anchorRef={cartBtnRef} />
              </>
            )}
          </div>
        )}
        {/* 0.55.19 : icônes de statut (réseau, perm, bio…) */}
        {mounted && auth && <StatusIcons auth={auth} />}
        {mounted && auth && <UserMenu auth={auth} />}
      </div>

      {/* 0.58.19 : menu-overlay + menu-drawer rendus dans <body> via Portal pour
          échapper à tout containing block créé par un ancêtre (will-change,
          transform, filter, etc.). Garantit position: fixed correct sur mobile,
          même quand l'user est en bas de page. */}
      {mounted && createPortal(
        <>
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
          {MENU.map((sec, secIdx) => {
            // 0.58.56 : couleur sobre par section (rotation parmi 7 teintes)
            const SECTION_HUES = [
              { bg: "rgba(124,200,200,.06)", barCol: "#7CC8C8", txtCol: "#7CC8C8" }, // teal - Mon espace
              { bg: "rgba(24,95,165,.07)",   barCol: "#185FA5", txtCol: "#185FA5" }, // bleu - Groupement
              { bg: "rgba(122,111,176,.06)", barCol: "#7a6fb0", txtCol: "#7a6fb0" }, // violet - Mes partenaires
              { bg: "rgba(90,160,90,.06)",   barCol: "#5aa05a", txtCol: "#5aa05a" }, // vert - Scan
              { bg: "rgba(239,159,39,.06)",  barCol: "#EF9F27", txtCol: "#c97a2a" }, // ambre - Commande
              { bg: "rgba(201,134,127,.06)", barCol: "#C9867F", txtCol: "#a04a2a" }, // terra - Livraison
              { bg: "rgba(20,33,49,.06)",    barCol: "#142131", txtCol: "#142131" }, // navy - Administratif
              { bg: "rgba(192,57,43,.05)",   barCol: "#c0392b", txtCol: "#c0392b" }, // rouge - Admin
            ];
            const hue = SECTION_HUES[secIdx % SECTION_HUES.length];
            const isCollapsed = collapsedSections[sec.section];
            return (
              <div
                className={`menu-section${isCollapsed ? " collapsed" : ""}`}
                key={sec.section}
                style={{
                  background: hue.bg,
                  borderRadius: 12,
                  marginBottom: 8,
                  padding: "8px 10px",
                  transition: "background 200ms",
                }}
              >
                {/* 0.58.56 : titre cliquable pour collapse + plus visible */}
                <button
                  className="menu-section-h"
                  onClick={() => setCollapsedSections({ ...collapsedSections, [sec.section]: !isCollapsed })}
                  style={{
                    color: hue.txtCol,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 4px",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                    fontFamily: "inherit",
                  }}
                  aria-expanded={!isCollapsed}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {/* 0.59.0 : icône de section */}
                    {sec.sectionIcon && (
                      <i className={`ti ${sec.sectionIcon}`} style={{ fontSize: 18, color: hue.barCol }} />
                    )}
                    <span className="menu-section-label">{sec.section}</span>
                    <span style={{
                      display: "inline-block",
                      width: 28,
                      height: 2,
                      background: hue.barCol,
                      borderRadius: 1,
                      verticalAlign: "middle",
                    }} className="menu-section-bar" />
                  </span>
                  <i className={`ti ti-chevron-${isCollapsed ? "down" : "up"}`} style={{ fontSize: 14, opacity: 0.6, transition: "transform 200ms" }} />
                </button>
                {!isCollapsed && (
                  <div className="menu-tiles" style={{ marginTop: 4 }}>
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
                )}
              </div>
            );
          })}
        </div>
      </nav>
        </>,
        document.body
      )}

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
