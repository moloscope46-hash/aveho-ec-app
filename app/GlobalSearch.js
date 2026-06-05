"use client";
// =============================================================
//  GlobalSearch (Alpha 0.14)
//  Palette unifiée Cmd+K / Ctrl+K. Recherche dans patients,
//  matériels, DI, signalements. Navigation clavier ↑↓ Enter Échap.
//
//  0.58.21 : REFONTE VISUELLE PREMIUM
//   - Glassmorphism backdrop (blur 30px saturate 180%)
//   - Animation scale-up + fade entrée (avec spring physics)
//   - Border conic-gradient scan permanent
//   - Header avec icon search avec glow teal
//   - Chips filtres avec hover lift + glow
//   - Rendu via Portal (échappe aux containing blocks)
//
//  0.58.25 : ACTIONS CONTEXTUELLES selon page courante
//   - usePathname() détecte la page active
//   - findActions() priorise les actions liées à la page
//   - Badge "Sur cette page" sur les actions matching la route
// =============================================================
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "../lib/supabase";

const TYPES = {
  patient: { icon: "ti-user", color: "#185FA5", lbl: "Patient" },
  materiel: { icon: "ti-armchair-2", color: "#7CC8C8", lbl: "Matériel" },
  intervention: { icon: "ti-tools", color: "#e35d5b", lbl: "DI" },
  signalement: { icon: "ti-message", color: "#7a6fb0", lbl: "Signalement" },
  achat: { icon: "ti-shopping-cart", color: "#EF9F27", lbl: "Achat" },
  // Alpha 0.35.0 : ajout transferts + maintenances
  transfert: { icon: "ti-arrows-exchange", color: "#5aa05a", lbl: "Transfert" },
  maintenance: { icon: "ti-tool", color: "#1c5454", lbl: "Maintenance" },
  // Alpha 0.52.0 (G) : ajout consents (c:) + fournisseurs (f:)
  consent: { icon: "ti-shield-check", color: "#5aa05a", lbl: "Consentement" },
  fournisseur: { icon: "ti-truck-loading", color: "#8c2a23", lbl: "Fournisseur" },
};

// 0.58.23 : Actions globales rapides (créer X, aller sur Y, etc.)
// Apparaissent dans la palette dès que la query commence par > ou matche un keyword
// 0.58.25 : ajout du champ `pageContext` (pattern d'URL où l'action est prioritaire)
const ACTIONS = [
  { id: "new-patient", lbl: "Créer un patient", icon: "ti-user-plus", color: "#185FA5", url: "/patients?new=1", keywords: ["créer", "patient", "nouveau", "ajouter"], pageContext: /^\/patients/ },
  { id: "new-intervention", lbl: "Créer une intervention", icon: "ti-tools", color: "#e35d5b", url: "/interventions?new=1", keywords: ["créer", "intervention", "di", "nouvelle"], pageContext: /^\/interventions/ },
  { id: "new-signalement", lbl: "Déposer un signalement", icon: "ti-message-plus", color: "#7a6fb0", url: "/signalements?new=1", keywords: ["signalement", "déposer", "déclarer", "incident"], pageContext: /^\/signalements/ },
  { id: "new-achat", lbl: "Nouvelle demande d'achat", icon: "ti-shopping-cart", color: "#EF9F27", url: "/achats?new=1", keywords: ["achat", "commande", "nouveau", "demande"], pageContext: /^\/(achats|commandes)/ },
  { id: "new-transfert", lbl: "Nouveau transfert de matériel", icon: "ti-arrows-exchange", color: "#5aa05a", url: "/transferts?new=1", keywords: ["transfert", "déplacement", "matériel"], pageContext: /^\/transferts/ },
  { id: "goto-accueil", lbl: "Aller à l'accueil", icon: "ti-home", color: "#142131", url: "/accueil", keywords: ["accueil", "home", "dashboard"] },
  { id: "goto-stats", lbl: "Voir les statistiques", icon: "ti-chart-bar", color: "#185FA5", url: "/statistiques", keywords: ["stats", "statistiques", "analyse", "tableau"], pageContext: /^\/statistiques/ },
  { id: "goto-calendrier", lbl: "Calendrier des interventions", icon: "ti-calendar", color: "#7a6fb0", url: "/calendrier", keywords: ["calendrier", "planning", "agenda"], pageContext: /^\/calendrier/ },
  { id: "goto-kanban", lbl: "Kanban des interventions", icon: "ti-layout-kanban", color: "#C9867F", url: "/interventions/kanban", keywords: ["kanban", "interventions", "vue"], pageContext: /^\/interventions/ },
  { id: "goto-profil", lbl: "Mon profil", icon: "ti-user-circle", color: "#5aa05a", url: "/profil", keywords: ["profil", "compte", "moi", "settings"], pageContext: /^\/profil/ },
  { id: "goto-params", lbl: "Paramètres collectivité", icon: "ti-settings", color: "#142131", url: "/parametres", keywords: ["paramètres", "config", "admin", "settings"], pageContext: /^\/parametres/ },
  { id: "goto-historique", lbl: "Voir l'historique d'activité", icon: "ti-history", color: "#7a6fb0", url: "/historique", keywords: ["historique", "audit", "log", "activité"], pageContext: /^\/historique/ },
  { id: "toggle-presentation", lbl: "Mode présentation (Ctrl+Shift+P)", icon: "ti-presentation", color: "#7a6fb0", url: "#toggle-presentation", keywords: ["présentation", "démo", "demo", "client", "zoom"] },
  { id: "toggle-focus", lbl: "Mode focus zen (Ctrl+Shift+F)", icon: "ti-target", color: "#5aa05a", url: "#toggle-focus", keywords: ["focus", "zen", "concentration", "saisie"] },
  { id: "clear-cache", lbl: "Vider le cache (problème d'affichage)", icon: "ti-refresh", color: "#EF9F27", url: "/profil?tab=securite", keywords: ["cache", "vider", "refresh", "bug", "affichage"] },
];

// Trouve les actions qui matchent la query
// 0.58.25 : prend en compte pageContext pour prioriser les actions de la page courante
function findActions(query, currentPath) {
  // Si pas de query et qu'on est sur une page connue : afficher les actions contextuelles
  if (!query && currentPath) {
    const contextual = ACTIONS.filter(a => a.pageContext && a.pageContext.test(currentPath));
    return contextual.slice(0, 4);
  }
  if (!query) return [];
  const q = query.toLowerCase().trim();
  // Format > ou bien matche un keyword
  const isExplicitCommand = q.startsWith(">");
  const cleanQ = isExplicitCommand ? q.slice(1).trim() : q;
  if (!cleanQ && !isExplicitCommand) return [];

  const matches = ACTIONS.filter(a =>
    a.lbl.toLowerCase().includes(cleanQ) ||
    a.keywords.some(k => k.includes(cleanQ) || cleanQ.includes(k))
  );

  // 0.58.25 : prioriser les actions matching la page courante
  if (currentPath) {
    matches.sort((a, b) => {
      const aMatch = a.pageContext && a.pageContext.test(currentPath) ? 1 : 0;
      const bMatch = b.pageContext && b.pageContext.test(currentPath) ? 1 : 0;
      return bMatch - aMatch;
    });
  }

  return matches.slice(0, 6);
}

export default function GlobalSearch() {
  const supabase = createClient();
  const router = useRouter();
  // 0.58.25 : pathname courant pour actions contextuelles
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]); // Alpha 0.35.0 : historique
  const [activeFilter, setActiveFilter] = useState(null);  // 0.55.11 : chip filtre visuel
  const inputRef = useRef(null);
  // 0.58.21 : guard hydratation pour Portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Alpha 0.35.0 : charger l'historique depuis localStorage à l'ouverture
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("aveho:search-history");
      const h = raw ? JSON.parse(raw) : [];
      setHistory(Array.isArray(h) ? h.slice(0, 6) : []);
    } catch { setHistory([]); }
  }, [open]);

  // Alpha 0.35.0 : sauve une entrée dans l'historique (max 6, dédoublonné)
  function pushHistory(entry) {
    try {
      const raw = localStorage.getItem("aveho:search-history");
      const h = raw ? JSON.parse(raw) : [];
      const filtered = (Array.isArray(h) ? h : []).filter(
        (x) => !(x.type === entry.type && x.id === entry.id)
      );
      // 0.58.39 : ajoute timestamp pour mini-timeline
      const updated = [{ ...entry, ts: Date.now() }, ...filtered].slice(0, 6);
      localStorage.setItem("aveho:search-history", JSON.stringify(updated));
    } catch {}
  }

  // 0.58.39 : formattage du temps relatif pour la timeline ("il y a 5min", "il y a 2h", "hier", "il y a 3j")
  function formatRelative(ts) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "à l'instant";
    const min = Math.floor(sec / 60);
    if (min < 60) return `il y a ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h}h`;
    const d = Math.floor(h / 24);
    if (d === 1) return "hier";
    if (d < 7) return `il y a ${d}j`;
    return `il y a +7j`;
  }

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
        setActiveFilter(null);  // 0.55.11 : reset filter en fermant
      }
    }
    // Alpha 0.35.0 : event custom déclenché par le bouton 🔍 dans la TopBar
    function onOpenSearch() { setOpen(true); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("aveho:open-search", onOpenSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("aveho:open-search", onOpenSearch);
    };
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQ(""); setResults([]); setSel(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        // Alpha 0.15 : préfixe pour filtrer sur un type
        // Alpha 0.35 : ajout t: (transferts) et x: (maintenances)
        // Alpha 0.52 (G) : ajout c: (consents RGPD) et f: (fournisseurs)
        // "p:dupont" → patients uniquement, "m:lit" → matériels, "d:di-2026" → DI,
        // "s:idée" → signalements, "a:cmd-2026" → achats/commandes,
        // "t:tr-2026" → transferts, "x:mnt-2026" → maintenances
        // "c:dupont" → consents RGPD, "f:Bastide" → fournisseurs
        let searchTerm = q;
        let filterType = null;
        const match = q.match(/^([pmdsatxcf]):(.*)$/i);
        if (match) {
          const prefix = match[1].toLowerCase();
          searchTerm = match[2].trim();
          if (searchTerm.length < 1) { setResults([]); setLoading(false); return; }
          filterType = { 
            p: "patient", m: "materiel", d: "intervention", s: "signalement", 
            a: "achat", t: "transfert", x: "maintenance",
            c: "consent", f: "fournisseur"  // Alpha 0.52.0 (G)
          }[prefix];
        }
        // 0.55.11 (AF) : si chip filter active, override
        if (activeFilter) filterType = activeFilter;
        // 0.58.11 HOTFIX : sanitize les caractères qui cassent la syntaxe PostgREST .or()
        //  Ex : un user qui tape "ced=" produisait `or=(numero.ilike.%ced=%25,...)` qui renvoyait
        //  400 Bad Request car le `=` est un séparateur PostgREST. On retire aussi `,`, `(`, `)`,
        //  `.` (utilisé comme séparateur d'opérateur), et `*` (wildcard interne ilike géré par les `%`).
        const safeSearch = searchTerm.replace(/[=,()*]/g, "").trim();
        if (!safeSearch) { setResults([]); setLoading(false); return; }
        const term = `%${safeSearch}%`;
        const list = [];

        if (!filterType || filterType === "patient") {
          // Alpha 0.20.0 : RPC full-text avec fallback ilike si RPC indisponible
          let data;
          const rpcRes = await supabase.rpc("search_patients", { q: searchTerm, lim: 5 });
          if (rpcRes.error) {
            // Fallback : ilike (compatible si patch SQL 0.20 pas encore appliqué)
            const fb = await supabase.from("patients").select("id, nom, prenom, chambre").or(`nom.ilike.${term},prenom.ilike.${term}`).limit(5);
            data = fb.data;
          } else {
            data = rpcRes.data;
          }
          (data || []).forEach((p) => list.push({
            type: "patient", id: p.id,
            titre: `${p.nom} ${p.prenom || ""}`,
            sub: p.chambre ? `Chambre ${p.chambre}` : "",
            href: `/patient/${p.id}`,
          }));
        }
        if (!filterType || filterType === "materiel") {
          // Alpha 0.20.0 : RPC full-text avec fallback ilike
          let data;
          const rpcRes = await supabase.rpc("search_materiels", { q: searchTerm, lim: 5 });
          if (rpcRes.error) {
            const fb = await supabase.from("materiels").select("id, libelle, num_serie, num_parc, num_lot").or(`libelle.ilike.${term},num_serie.ilike.${term},num_parc.ilike.${term},num_lot.ilike.${term}`).limit(5);
            data = fb.data;
          } else {
            data = rpcRes.data;
          }
          (data || []).forEach((m) => {
            const ids = [m.num_serie, m.num_parc, m.num_lot].filter(Boolean).join(" · ");
            list.push({
              type: "materiel", id: m.id,
              titre: m.libelle,
              sub: ids || "",
              href: `/materiel/${m.id}`,
            });
          });
        }
        if (!filterType || filterType === "intervention") {
          const { data } = await supabase.from("interventions").select("id, numero, type, statut").or(`numero.ilike.${term},type.ilike.${term}`).limit(5);
          (data || []).forEach((d) => list.push({
            type: "intervention", id: d.id,
            titre: d.numero,
            sub: `${d.type || ""} · ${d.statut}`,
            href: "/interventions",
          }));
        }
        if (!filterType || filterType === "signalement") {
          const { data } = await supabase.from("signalements").select("id, titre, type, statut").ilike("titre", term).limit(5);
          (data || []).forEach((s) => list.push({
            type: "signalement", id: s.id,
            titre: s.titre,
            sub: `${s.type} · ${s.statut}`,
            href: "/signalements",
          }));
        }
        if (!filterType || filterType === "achat") {
          const { data } = await supabase.from("achats").select("id, numero, motif, statut, fournisseur").or(`numero.ilike.${term},motif.ilike.${term},fournisseur.ilike.${term}`).limit(5);
          (data || []).forEach((a) => list.push({
            type: "achat", id: a.id,
            titre: a.numero,
            sub: `${a.fournisseur || "—"} · ${a.statut}`,
            href: "/achats",
          }));
        }
        // Alpha 0.35.0 : transferts
        if (!filterType || filterType === "transfert") {
          const { data } = await supabase.from("transferts").select("id, numero, statut, motif").or(`numero.ilike.${term},motif.ilike.${term}`).limit(5);
          (data || []).forEach((t) => list.push({
            type: "transfert", id: t.id,
            titre: t.numero,
            sub: `${t.motif || "—"} · ${t.statut}`,
            href: "/transferts",
          }));
        }
        // Alpha 0.35.0 : maintenances
        if (!filterType || filterType === "maintenance") {
          const { data } = await supabase.from("maintenances").select("id, numero, type, statut").or(`numero.ilike.${term},type.ilike.${term}`).limit(5);
          (data || []).forEach((m) => list.push({
            type: "maintenance", id: m.id,
            titre: m.numero,
            sub: `${m.type || "—"} · ${m.statut}`,
            href: "/maintenance",
          }));
        }
        // Alpha 0.52.0 (G) : consentements RGPD
        if (!filterType || filterType === "consent") {
          // Seulement si déclenchement explicite c: ou recherche globale
          // (on évite de polluer la recherche globale avec trop de résultats)
          if (filterType === "consent" || searchTerm.length >= 3) {
            const { data } = await supabase
              .from("consentements_rgpd")
              .select("id, patient_nom_prenom, patient_numero_dossier, date_signature, a_consenti")
              .or(`patient_nom_prenom.ilike.${term},patient_numero_dossier.ilike.${term}`)
              .order("date_signature", { ascending: false })
              .limit(5);
            (data || []).forEach((c) => list.push({
              type: "consent", id: c.id,
              titre: c.patient_nom_prenom,
              sub: `${c.a_consenti ? "✓ Consenti" : "✗ Refusé"} · ${c.patient_numero_dossier || ""} · ${new Date(c.date_signature).toLocaleDateString("fr-FR")}`,
              href: "/consentements",
            }));
          }
        }
        // Alpha 0.52.0 (G) : fournisseurs (depuis achats, distinct)
        if (filterType === "fournisseur") {
          // Recherche dans les fournisseurs distincts mentionnés dans achats
          const { data } = await supabase
            .from("achats")
            .select("fournisseur, id, numero, statut, budget_estime")
            .ilike("fournisseur", term)
            .not("fournisseur", "is", null)
            .order("created_at", { ascending: false })
            .limit(10);
          // Grouper par fournisseur unique
          const byFourn = {};
          (data || []).forEach((a) => {
            if (!a.fournisseur) return;
            if (!byFourn[a.fournisseur]) {
              byFourn[a.fournisseur] = { fournisseur: a.fournisseur, count: 0, last: a };
            }
            byFourn[a.fournisseur].count++;
          });
          Object.values(byFourn).slice(0, 5).forEach((f) => list.push({
            type: "fournisseur", id: f.fournisseur,
            titre: f.fournisseur,
            sub: `${f.count} commande${f.count > 1 ? "s" : ""} · dernière #${f.last.numero}`,
            href: `/achats?fournisseur=${encodeURIComponent(f.fournisseur)}`,
          }));
        }
        setResults(list);
        setSel(0);
      } catch (_) {}
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, activeFilter]);

  function onKeyInput(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && results[sel]) {
      e.preventDefault();
      pushHistory(results[sel]);
      router.push(results[sel].href);
      setOpen(false);
    }
  }

  if (!open || !mounted) return null;

  // 0.58.21 : Portal vers document.body + glassmorphism premium
  return createPortal((
    <div
      className="av-cmdk-overlay"
      onClick={() => setOpen(false)}
    >
      <div
        className="av-cmdk-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Border conic scan permanent */}
        <div className="av-cmdk-scan" aria-hidden="true" />

        <div className="av-cmdk-inner">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(124,200,200,.15)", display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          <i className="ti ti-search av-cmdk-icon" />
          <input ref={inputRef} type="text" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyInput}
            placeholder="Rechercher  ·  p: patient · m: matériel · c: consent · f: fournisseur…"
            className="av-cmdk-input"
            />
          <kbd className="av-cmdk-kbd">Échap</kbd>
        </div>
        {/* 0.55.11 (AF) : chips filtres visuels par catégorie */}
        <div style={{ padding: "10px 18px", borderBottom: "1px solid rgba(124,200,200,.12)", display: "flex", flexWrap: "wrap", gap: 6, background: "rgba(255,255,255,.04)" }}>
          <button
            onClick={() => setActiveFilter(null)}
            className={`av-cmdk-chip ${!activeFilter ? "active" : ""}`}
          >
            Tout
          </button>
          {Object.entries(TYPES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(activeFilter === key ? null : key)}
              className={`av-cmdk-chip ${activeFilter === key ? "active" : ""}`}
              style={{
                "--chip-color": t.color,
                background: activeFilter === key ? t.color : "transparent",
                color: activeFilter === key ? "#fff" : t.color,
                borderColor: t.color,
              }}
            >
              <i className={`ti ${t.icon}`} style={{ fontSize: 11 }} /> {t.lbl}
            </button>
          ))}
        </div>
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {/* 0.58.23 : section ACTIONS GLOBALES — affichée si query matche un keyword d'action
              ou commence par > (mode commande explicite) */}
          {(() => {
            const matchingActions = findActions(q, pathname);
            if (matchingActions.length === 0) return null;
            return (
              <div style={{
                padding: "12px 16px 6px",
                borderBottom: "1px dashed rgba(124,200,200,.15)",
                background: "linear-gradient(135deg, rgba(124,200,200,.05), rgba(24,95,165,.04))",
              }}>
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: "rgba(124,200,200,.85)",
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <i className="ti ti-bolt" style={{ color: "#EF9F27", fontSize: 13 }} />
                  Actions rapides
                </div>
                {matchingActions.map((a) => (
                  <div
                    key={a.id}
                    onClick={async () => {
                      // 0.58.25 : actions spéciales (toggle mode présentation / focus)
                      if (a.url === "#toggle-presentation") {
                        const { togglePresentationMode } = await import("../lib/presentationMode");
                        togglePresentationMode();
                        setOpen(false);
                        return;
                      }
                      if (a.url === "#toggle-focus") {
                        const { toggleFocusMode } = await import("../lib/focusMode");
                        toggleFocusMode();
                        setOpen(false);
                        return;
                      }
                      router.push(a.url);
                      setOpen(false);
                    }}
                    style={{
                      padding: "8px 10px",
                      cursor: "pointer",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      transition: "background 120ms, transform 150ms",
                      marginBottom: 4,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = a.color + "1a";
                      e.currentTarget.style.transform = "translateX(2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    <span style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: `linear-gradient(135deg, ${a.color}, ${a.color}aa)`,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${a.color}33`,
                    }}>
                      <i className={`ti ${a.icon}`} style={{ fontSize: 14 }} />
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "rgba(255,255,255,.95)",
                    }}>
                      {a.lbl}
                    </span>
                    <i className="ti ti-arrow-right" style={{
                      fontSize: 14,
                      color: a.color,
                      opacity: 0.7,
                    }} />
                  </div>
                ))}
              </div>
            );
          })()}

          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#8a98a8", fontSize: 13 }}>Recherche…</div>
          ) : q.length < 2 ? (
            <div style={{ padding: "20px", color: "#8a98a8", fontSize: 13 }}>
              <p style={{ textAlign: "center", margin: "0 0 14px" }}>Tape au moins 2 caractères pour rechercher</p>
              <div style={{ paddingTop: 14, borderTop: "1px dashed #e3e9ee" }}>
                {/* 0.58.23 : astuce mode commande > */}
                <div style={{
                  padding: "10px 12px",
                  background: "linear-gradient(135deg, rgba(239,159,39,.10), rgba(124,200,200,.06))",
                  border: "1px solid rgba(239,159,39,.25)",
                  borderRadius: 8,
                  marginBottom: 14,
                  fontSize: 12,
                  color: "rgba(191,230,230,.85)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <i className="ti ti-bolt" style={{ color: "#EF9F27", fontSize: 14 }} />
                  <span>Tapez <kbd style={{ background: "rgba(239,159,39,.25)", color: "#EF9F27", padding: "2px 8px", borderRadius: 4, fontFamily: "Consolas, monospace", fontWeight: 700 }}>&gt;</kbd> pour les <b>actions rapides</b> (créer patient, intervention…)</span>
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#142131", textTransform: "uppercase", letterSpacing: ".5px", margin: "0 0 8px" }}>Filtres rapides</p>
                <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                  <div><kbd style={{ background: "#185FA522", color: "#185FA5", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>p:</kbd> patients</div>
                  <div><kbd style={{ background: "#7CC8C822", color: "#2a5a5a", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>m:</kbd> matériels</div>
                  <div><kbd style={{ background: "#e35d5b22", color: "#e35d5b", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>d:</kbd> demandes d'intervention</div>
                  <div><kbd style={{ background: "#7a6fb022", color: "#7a6fb0", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>s:</kbd> signalements</div>
                  <div><kbd style={{ background: "#EF9F2722", color: "#EF9F27", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>a:</kbd> achats</div>
                  <div><kbd style={{ background: "#5aa05a22", color: "#5aa05a", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>t:</kbd> transferts</div>
                  <div><kbd style={{ background: "#1c545422", color: "#1c5454", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>x:</kbd> maintenances</div>
                </div>
              </div>
              {/* 0.58.39 : Mini-timeline premium pour la section "Récents" */}
              {history.length > 0 && (
                <div style={{ paddingTop: 14, marginTop: 14, borderTop: "1px dashed #e3e9ee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#142131", textTransform: "uppercase", letterSpacing: ".5px", margin: 0, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <i className="ti ti-clock-bolt" style={{ color: "#7CC8C8" }} /> Récents
                    </p>
                    <button
                      onClick={() => {
                        try { localStorage.removeItem("aveho:search-history"); } catch {}
                        setHistory([]);
                      }}
                      style={{ background: "none", border: "none", color: "#8a98a8", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Effacer
                    </button>
                  </div>
                  {/* Timeline : ligne verticale + dots colorés à gauche */}
                  <div style={{ position: "relative", paddingLeft: 18 }}>
                    {/* Ligne verticale teal */}
                    <div style={{
                      position: "absolute", left: 7, top: 8, bottom: 8,
                      width: 2, background: "linear-gradient(180deg, #7CC8C8 0%, rgba(124,200,200,0.15) 100%)",
                      borderRadius: 1,
                    }} />
                    {history.map((r, i) => {
                      const t = TYPES[r.type];
                      if (!t) return null;
                      return (
                        <div key={`h-${r.type}-${r.id}`}
                          onClick={() => { router.push(r.href); setOpen(false); }}
                          style={{
                            position: "relative",
                            padding: "8px 10px", cursor: "pointer", borderRadius: 8,
                            display: "flex", alignItems: "center", gap: 10,
                            marginBottom: 4,
                            transition: "all .15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#eaf7f7";
                            e.currentTarget.style.transform = "translateX(2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.transform = "translateX(0)";
                          }}
                        >
                          {/* Dot coloré à gauche (sur la ligne verticale) */}
                          <span style={{
                            position: "absolute", left: -16, top: "50%", transform: "translateY(-50%)",
                            width: 12, height: 12, borderRadius: "50%",
                            background: t.color,
                            border: "2px solid #fff",
                            boxShadow: `0 0 0 2px ${t.color}55, 0 2px 6px ${t.color}40`,
                          }} />
                          <span style={{ width: 22, height: 22, borderRadius: 6, background: t.color + "22", color: t.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <i className={`ti ${t.icon}`} style={{ fontSize: 12 }} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                            <div style={{ color: "#142131", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titre}</div>
                            <div style={{ fontSize: 10, color: "#8a98a8", display: "flex", alignItems: "center", gap: 6 }}>
                              {r.sub && <span>{r.sub}</span>}
                              {r.ts && <>
                                {r.sub && <span style={{ opacity: 0.5 }}>·</span>}
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                  <i className="ti ti-clock" style={{ fontSize: 9 }} />
                                  {formatRelative(r.ts)}
                                </span>
                              </>}
                            </div>
                          </div>
                          <span style={{ fontSize: 9, color: t.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>{t.lbl}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#8a98a8", fontSize: 13 }}>Aucun résultat pour <b>"{q}"</b></div>
          ) : (
            // 0.58.27 : layout flex avec preview panel à droite
            <div style={{ display: "flex", gap: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {results.map((r, i) => {
                  const t = TYPES[r.type];
                  const isSel = i === sel;
                  return (
                    <div key={`${r.type}-${r.id}`}
                      onClick={() => { pushHistory(r); router.push(r.href); setOpen(false); }}
                      onMouseEnter={() => setSel(i)}
                      style={{
                        padding: "10px 18px", cursor: "pointer",
                        background: isSel ? "rgba(124,200,200,.10)" : "transparent",
                        borderLeft: isSel ? `3px solid ${t.color}` : "3px solid transparent",
                        display: "flex", alignItems: "center", gap: 12,
                        transition: "background 120ms",
                      }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: t.color + "22", color: t.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className={`ti ${t.icon}`} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.95)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titre}</div>
                        {r.sub && <div style={{ fontSize: 11, color: "rgba(191,230,230,.6)" }}>{r.sub}</div>}
                      </div>
                      <span style={{ fontSize: 10, color: t.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>{t.lbl}</span>
                    </div>
                  );
                })}
              </div>

              {/* 0.58.27 : Preview panel à droite pour le résultat sélectionné */}
              {results[sel] && (
                <div style={{
                  width: 280,
                  flexShrink: 0,
                  borderLeft: "1px solid rgba(124,200,200,.15)",
                  background: "linear-gradient(180deg, rgba(20,33,49,.50) 0%, rgba(13,24,34,.50) 100%)",
                  padding: "16px 18px",
                  animation: "av-cmdk-preview-in 200ms cubic-bezier(.2,.8,.2,1)",
                }}>
                  {(() => {
                    const r = results[sel];
                    const t = TYPES[r.type];
                    return (
                      <>
                        <div style={{
                          fontSize: 9.5,
                          fontWeight: 800,
                          letterSpacing: 1.5,
                          color: t.color,
                          textTransform: "uppercase",
                          marginBottom: 10,
                        }}>
                          <i className={`ti ${t.icon}`} style={{ marginRight: 4 }} />
                          Aperçu {t.lbl}
                        </div>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#fff",
                          lineHeight: 1.3,
                          marginBottom: 10,
                          wordBreak: "break-word",
                        }}>
                          {r.titre}
                        </div>
                        {r.sub && (
                          <div style={{
                            fontSize: 12,
                            color: "rgba(191,230,230,.75)",
                            lineHeight: 1.5,
                            marginBottom: 14,
                          }}>
                            {r.sub}
                          </div>
                        )}
                        {/* Métadonnées additionnelles si dispo */}
                        {r.meta && (
                          <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            paddingTop: 12,
                            borderTop: "1px dashed rgba(124,200,200,.15)",
                          }}>
                            {Object.entries(r.meta).map(([k, v]) => (
                              <div key={k} style={{ fontSize: 11, color: "rgba(191,230,230,.7)" }}>
                                <span style={{ color: "rgba(124,200,200,.6)" }}>{k}:</span>{" "}
                                <b style={{ color: "#fff" }}>{v}</b>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* CTA */}
                        <div style={{
                          marginTop: 16,
                          padding: "8px 12px",
                          background: `linear-gradient(135deg, ${t.color}33, ${t.color}11)`,
                          border: `1px solid ${t.color}44`,
                          borderRadius: 8,
                          fontSize: 11.5,
                          color: t.color,
                          fontWeight: 700,
                          textAlign: "center",
                        }}>
                          <i className="ti ti-arrow-right" style={{ marginRight: 4 }} />
                          Appuyez sur ↵ pour ouvrir
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(124,200,200,.12)", fontSize: 11, color: "rgba(191,230,230,.7)", display: "flex", gap: 14, background: "rgba(255,255,255,.03)" }}>
          <span><kbd className="av-cmdk-kbd-mini">↑↓</kbd> naviguer</span>
          <span><kbd className="av-cmdk-kbd-mini">↵</kbd> ouvrir</span>
          <span style={{ marginLeft: "auto" }}>Raccourci global : <kbd className="av-cmdk-kbd-mini">⌘ K</kbd></span>
        </div>
        </div>
      </div>
    </div>
  ), document.body);
}
