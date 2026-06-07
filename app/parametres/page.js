"use client";
// Page Paramètres — Préférences d'affichage et libellés personnalisés de la collectivité.
// Stockés dans le champ `parametres` (JSON) de la table `structures`.
// 0.58.5 : refonte avec Tabs (3 onglets) + PageHero
import { useEffect, useState, Suspense } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Btn} from "../ui";
import { PageHero, Tabs, TabPanel, Select, NeonButton } from "../components/ui-premium";
import { useTheme } from "../../lib/useTheme";
import { useKiosque } from "../../lib/useKiosque";
import NotificationOptIn from "../NotificationOptIn";
import WebhookConfig from "../WebhookConfig";
// 0.62.64 : dynamic imports des pages ramenées du menu Administration en onglets
import dynamic from "next/dynamic";
const DynNotifications = dynamic(() => import("./notifications/page.js"),   { ssr: false, loading: () => <Loading /> });
const DynAppNative   = dynamic(() => import("./app-native/page.js"),    { ssr: false, loading: () => <Loading /> });
const DynIntegrations= dynamic(() => import("./integrations/page.js"),  { ssr: false, loading: () => <Loading /> });
const DynCompta      = dynamic(() => import("./compta/page.js"),        { ssr: false, loading: () => <Loading /> });
const DynAudit       = dynamic(() => import("../audit/page.js"),        { ssr: false, loading: () => <Loading /> });
const DynWebhooks    = dynamic(() => import("../webhooks/page.js"),     { ssr: false, loading: () => <Loading /> });
const DynStatut      = dynamic(() => import("../statut/page.js"),       { ssr: false, loading: () => <Loading /> });
const DynPerfSql     = dynamic(() => import("../admin-perf/page.js"),   { ssr: false, loading: () => <Loading /> });
const DynLogApp      = dynamic(() => import("../app-logs/page.js"),     { ssr: false, loading: () => <Loading /> });
const DynMailDiag    = dynamic(() => import("../admin/mail-diagnostic/page.js"), { ssr: false, loading: () => <Loading /> });
const DynAvisGoogle  = dynamic(() => import("../admin/avis-google/page.js"),     { ssr: false, loading: () => <Loading /> });
const DynDoublons    = dynamic(() => import("../admin/doublons-forces/page.js"), { ssr: false, loading: () => <Loading /> });

function Loading() {
  return <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
    <i className="ti ti-loader-2" style={{ fontSize: 24, animation: "av-spin 1s linear infinite" }} /> Chargement...
  </div>;
}

// 0.58.41 : wrapper Suspense pour empêcher le SSG bail-out Vercel
//  (createClient au top du composant requiert les env vars runtime)
export default function Parametres() {
  return (
    <Suspense fallback={null}>
      <ParametresInner />
    </Suspense>
  );
}

function ParametresInner() {
  const supabase = createClient();
  const auth = useAuth();
  const { theme, mode, autoMode, toggle: toggleTheme, setMode: setThemeMode, setAuto } = useTheme();
  const { kiosque, on: kiosqueOn } = useKiosque();
  const cart = useCart();
  const [params, setParams] = useState({});
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");
  // 0.58.5 : 3 onglets pour mieux organiser les paramètres
  // 0.62.64 : init activeTab depuis URL ?tab=X pour navigation directe
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "general";
    const t = new URLSearchParams(window.location.search).get("tab");
    return t || "general";
  });

  async function load() {
    if (!auth.structureId) return;
    const { data } = await supabase.from("structures").select("parametres").eq("id", auth.structureId).maybeSingle();
    setParams((data && data.parametres) || {});
    setLoading(false);
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready]);

  async function save() {
    await supabase.from("structures").update({ parametres: params }).eq("id", auth.structureId);
    setSavedMsg("Préférences enregistrées.");
    setTimeout(() => setSavedMsg(""), 2500);
  }

  function setP(k, v) { setParams({ ...params, [k]: v }); }

  if (!auth.ready) return null;

  // Garde-fou : seul un admin peut modifier les paramètres collectivité
  if (!auth.can("gerer_roles") && auth.role?.nom !== "Administrateur") {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <PageHead icon="ti-settings" title="Paramètres" subtitle="Accès restreint aux administrateurs" color="#5e4a8c" small />
          <Panel><StateMsg>Ton rôle n'autorise pas la modification des paramètres collectivité.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        {/* 0.58.5 : PageHero + Tabs */}
        <PageHero
          icon="ti-settings"
          eyebrow="ADMINISTRATION"
          title="Paramètres"
          subtitle={auth.structureNom || "Préférences de la collectivité"}
          variant="navy"
          particles
          particlesCount={20}
          breadcrumbs={[
            { label: "Accueil", href: "/accueil" },
            { label: "Paramètres" },
          ]}
        />

        {!loading && (
          <div style={{ marginBottom: 20 }}>
            <Tabs
              active={activeTab}
              onChange={setActiveTab}
              style="pills"
              reorderable
              storageKey="av-parametres-tabs-order"
              tabs={[
                { id: "general",  label: "Général",         icon: "ti-adjustments" },
                { id: "notifs",   label: "Notifications",   icon: "ti-bell" },
                { id: "rgpd",     label: "RGPD",            icon: "ti-shield-check" },
                // 0.62.64 : onglets ramenés du menu Administration
                { id: "app-native",   label: "App native",        icon: "ti-device-mobile" },
                { id: "integrations", label: "Intégrations",      icon: "ti-plug-connected" },
                { id: "compta",       label: "Compta",            icon: "ti-receipt" },
                { id: "audit",        label: "Audit log",         icon: "ti-history" },
                { id: "webhooks",     label: "Webhooks",          icon: "ti-webhook" },
                { id: "statut",       label: "Statut système",    icon: "ti-activity" },
                { id: "perf-sql",     label: "Performance SQL",   icon: "ti-database" },
                { id: "log-app",      label: "Log applicatif",    icon: "ti-file-text-ai" },
                { id: "mail-diag",    label: "Diag mail",         icon: "ti-mail-bolt" },
                { id: "avis-google",  label: "Avis Google",       icon: "ti-star" },
                { id: "doublons",     label: "Doublons forcés",   icon: "ti-copy" },
              ]}
            />
          </div>
        )}

        {/* 0.58.28 : Skeleton premium pendant le chargement (au lieu de StateMsg) */}
        {loading ? <TabPanel active="loading" loading={true}>{null}</TabPanel> : (
          <>
            {/* === ONGLET GÉNÉRAL === */}
            {activeTab === "general" && (
            <div key="general" className="av-tab-content">
            {/* Libellés métier personnalisés */}
            <Panel style={{ marginBottom: 18 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 17 }}>Libellés métier</h2>
              <p style={{ color: "#8a98a8", fontSize: 13, margin: "0 0 16px" }}>
                Adaptez les termes à votre activité. Par exemple, un EHPAD préférera "Résident" à "Patient".
              </p>
              {savedMsg && <div className="ok">{savedMsg}</div>}
              <div className="fld-row">
                <div className="fld">
                  <label>Terme pour "Patient"</label>
                  <input value={params.libelle_patient || ""} onChange={(e) => setP("libelle_patient", e.target.value)} placeholder="Patient" />
                </div>
                <div className="fld">
                  <label>Terme pour "Chambre"</label>
                  <input value={params.libelle_chambre || ""} onChange={(e) => setP("libelle_chambre", e.target.value)} placeholder="Chambre" />
                </div>
              </div>
              <div className="fld-row">
                <div className="fld">
                  <label>Terme pour "Matériel"</label>
                  <input value={params.libelle_materiel || ""} onChange={(e) => setP("libelle_materiel", e.target.value)} placeholder="Matériel" />
                </div>
                <div className="fld">
                  <label>Terme pour "Service"</label>
                  <input value={params.libelle_service || ""} onChange={(e) => setP("libelle_service", e.target.value)} placeholder="Service" />
                </div>
              </div>
            </Panel>

            {/* Préférences d'affichage */}
            <Panel style={{ marginBottom: 18 }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 17 }}>Préférences d'affichage</h2>
              <div className="fld-row">
                <div className="fld">
                  <label>Devise</label>
                  {/* 0.58.11 : Select premium au lieu de <select> natif */}
                  <Select
                    value={params.devise || "EUR"}
                    onChange={(v) => setP("devise", v)}
                    fullWidth
                    options={[
                      { value: "EUR", label: "Euro (€)", icon: "ti-currency-euro" },
                      { value: "CHF", label: "Franc suisse (CHF)", icon: "ti-currency-franc" },
                      { value: "USD", label: "Dollar US ($)", icon: "ti-currency-dollar" },
                    ]}
                  />
                </div>
                <div className="fld">
                  <label>Format des dates</label>
                  <Select
                    value={params.format_date || "fr-FR"}
                    onChange={(v) => setP("format_date", v)}
                    fullWidth
                    options={[
                      { value: "fr-FR", label: "Français (28/05/2026)", icon: "ti-calendar" },
                      { value: "en-US", label: "Anglais (05/28/2026)", icon: "ti-calendar" },
                      { value: "iso", label: "ISO (2026-05-28)", icon: "ti-calendar" },
                    ]}
                  />
                </div>
              </div>
              <div className="fld">
                <label>
                  <input type="checkbox" checked={params.afficher_promotions !== false} onChange={(e) => setP("afficher_promotions", e.target.checked)} />
                  {" "}Afficher la section "Promotions" dans le menu
                </label>
              </div>
            </Panel>

            {/* Apparence (Alpha 0.7) */}
            <Panel style={{ marginBottom: 18 }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 17 }}>Apparence</h2>
              <p style={{ color: "#8a98a8", fontSize: 13, margin: "0 0 14px" }}>
                Choisis le thème visuel de l'application. Ce réglage est personnel à ton navigateur.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => setThemeMode("light")} style={{
                  padding: "14px 22px", border: "2px solid " + (mode === "light" ? "#7CC8C8" : "#e3e9ee"),
                  borderRadius: 12, background: mode === "light" ? "#eaf7f7" : "#fff",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <i className="ti ti-sun" style={{ fontSize: 20, color: "#EF9F27" }} />
                  Mode clair
                  {mode === "light" && <i className="ti ti-check" style={{ color: "#5aa05a", marginLeft: 6 }} />}
                </button>
                <button onClick={() => setThemeMode("dark")} style={{
                  padding: "14px 22px", border: "2px solid " + (mode === "dark" ? "#7CC8C8" : "#e3e9ee"),
                  borderRadius: 12, background: mode === "dark" ? "#1a2434" : "#fff",
                  color: mode === "dark" ? "#fff" : "#142131",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <i className="ti ti-moon" style={{ fontSize: 20, color: "#7a6fb0" }} />
                  Mode foncé
                  {mode === "dark" && <i className="ti ti-check" style={{ color: "#5aa05a", marginLeft: 6 }} />}
                </button>
                {/* Alpha 0.13 : mode auto */}
                <button onClick={() => setThemeMode("auto")} style={{
                  padding: "14px 22px", border: "2px solid " + (mode === "auto" ? "#7CC8C8" : "#e3e9ee"),
                  borderRadius: 12, background: mode === "auto" ? "#eaf7f7" : "#fff",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <i className="ti ti-circle-half-2" style={{ fontSize: 20, color: "#185FA5" }} />
                  Auto
                  {mode === "auto" && <i className="ti ti-check" style={{ color: "#5aa05a", marginLeft: 6 }} />}
                </button>
              </div>
              {/* Alpha 0.13 : sous-options du mode auto */}
              {mode === "auto" && (
                <div style={{ marginTop: 12, padding: "12px 16px", background: "#eaf7f7", borderRadius: 10, fontSize: 13 }}>
                  <p style={{ margin: "0 0 8px", color: "#142131", fontWeight: 600 }}>
                    <i className="ti ti-info-circle" /> Mode auto actif — actuellement : <b>{theme === "dark" ? "foncé" : "clair"}</b>
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input type="radio" name="auto-mode" checked={autoMode === "os"} onChange={() => setAuto("os")} />
                      <span>Suivre le système (clair/foncé du navigateur)</span>
                    </label>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input type="radio" name="auto-mode" checked={autoMode === "horaire"} onChange={() => setAuto("horaire")} />
                      <span>Selon l'heure (foncé entre 19h et 7h)</span>
                    </label>
                  </div>
                </div>
              )}
              {/* Alpha 0.10 : mode kiosque */}
              <div style={{ borderTop: "1px dashed #e3e9ee", marginTop: 18, paddingTop: 18 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#142131" }}>Mode kiosque / présentation</h3>
                <p style={{ color: "#8a98a8", fontSize: 13, margin: "0 0 12px" }}>
                  Masque le menu et agrandit les KPIs pour un affichage écran (salle de pause, vitrine). Appuie sur <kbd style={{ background: "#f4f7fa", padding: "2px 8px", borderRadius: 4, border: "1px solid #e3e9ee", fontSize: 11 }}>Échap</kbd> pour sortir.
                </p>
                <button onClick={kiosqueOn} style={{
                  padding: "12px 22px", border: "2px solid #142131", borderRadius: 12,
                  background: "#142131", color: "#fff", cursor: "pointer", fontFamily: "inherit",
                  fontSize: 13.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 10,
                }}>
                  <i className="ti ti-presentation" style={{ fontSize: 18 }} />
                  Activer le mode kiosque
                </button>
              </div>
              {/* Alpha 0.10 : mode lecture seule pour formateurs */}
              <div style={{ borderTop: "1px dashed #e3e9ee", marginTop: 18, paddingTop: 18 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#142131" }}>Mode lecture seule (formation)</h3>
                <p style={{ color: "#8a98a8", fontSize: 13, margin: "0 0 12px" }}>
                  Désactive temporairement toutes les actions d'écriture (création, modification, suppression, validation, commande) sans changer le rôle. Utile pour les sessions de formation : le formateur peut tout montrer sans risque d'altérer les données.
                </p>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>
                  <input type="checkbox"
                    checked={typeof window !== "undefined" && localStorage.getItem("aveho_lecture_seule") === "1"}
                    onChange={(e) => {
                      try {
                        if (e.target.checked) localStorage.setItem("aveho_lecture_seule", "1");
                        else localStorage.removeItem("aveho_lecture_seule");
                      } catch (_) {}
                      // Force un rechargement pour que le hook auth recalcule
                      window.location.reload();
                    }}
                    style={{ transform: "scale(1.3)" }} />
                  Activer le mode lecture seule
                </label>
              </div>
            </Panel>
            </div>)}

            {/* === ONGLET NOTIFICATIONS === */}
            {activeTab === "notifs" && (
            <div key="notifs" className="av-tab-content">
            {/* Notifications */}
            <Panel style={{ marginBottom: 18 }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 17 }}>Notifications</h2>
              <div className="fld">
                <label>
                  <input type="checkbox" checked={params.notif_transfert !== false} onChange={(e) => setP("notif_transfert", e.target.checked)} />
                  {" "}M'avertir lors d'un nouveau transfert à valider
                </label>
              </div>
              <div className="fld">
                <label>
                  <input type="checkbox" checked={params.notif_di !== false} onChange={(e) => setP("notif_di", e.target.checked)} />
                  {" "}M'avertir lors d'une DI urgente
                </label>
              </div>
              <div className="fld">
                <label>
                  <input type="checkbox" checked={params.notif_invitation !== false} onChange={(e) => setP("notif_invitation", e.target.checked)} />
                  {" "}M'avertir lorsqu'un utilisateur invité rejoint la collectivité
                </label>
              </div>
            </Panel>
            </div>)}

            {/* === ONGLET RGPD === */}
            {activeTab === "rgpd" && (
            <div key="rgpd" className="av-tab-content">
            {/* Alpha 0.17.1 : notifications push + webhooks */}
            <Panel style={{ marginBottom: 18 }}>
              <h2 style={{ margin:"0 0 12px", fontSize:18, color:"#142131" }}>
                <i className="ti ti-shield-lock" style={{ color:"#185FA5", marginRight:6 }} /> Conformité RGPD
              </h2>
              <p style={{ fontSize:12.5, color:"#6c7a89", margin:"0 0 16px" }}>
                Configure la durée de validité des consentements RGPD et l'email du Délégué à la Protection des Données (DPO) qui recevra les rappels de renouvellement.
              </p>

              <div className="fld-row" style={{ marginBottom: 14 }}>
                <div className="fld">
                  <label>Durée de validité d'un consentement</label>
                  <select
                    value={params.consent_validite_jours || 1095}
                    onChange={(e) => setP("consent_validite_jours", parseInt(e.target.value, 10))}
                  >
                    <option value={365}>1 an (365 jours)</option>
                    <option value={730}>2 ans (730 jours)</option>
                    <option value={1095}>3 ans (1095 jours) — recommandé</option>
                    <option value={1825}>5 ans (1825 jours)</option>
                    <option value={3650}>10 ans (3650 jours)</option>
                  </select>
                  <small style={{ color: "#8a98a8", fontSize: 12 }}>
                    <i className="ti ti-info-circle" /> S'applique aux nouveaux consentements signés. Les consentements existants conservent leur date d'expiration actuelle.
                  </small>
                </div>
                <div className="fld">
                  <label>Email du DPO (Délégué à la Protection des Données)</label>
                  <input
                    type="email"
                    value={params.dpo_email || ""}
                    onChange={(e) => setP("dpo_email", e.target.value)}
                    placeholder="dpo@etablissement.fr"
                  />
                  <small style={{ color: "#8a98a8", fontSize: 12 }}>
                    <i className="ti ti-info-circle" /> Reçoit chaque matin un récapitulatif des consentements à renouveler dans les 30 prochains jours. Laisser vide pour désactiver.
                  </small>
                </div>
              </div>

              <div style={{ padding: 12, background: "#eaf7f7", border: "1px solid #bfe6e6", borderRadius: 8, fontSize: 12.5, color: "#2a5a5a" }}>
                <b><i className="ti ti-bulb" /> Rappel CNIL :</b> La durée de conservation du consentement explicite est libre, mais il est recommandé de demander un renouvellement périodique pour s'assurer que l'accord reste éclairé et à jour. 3 ans est un compromis usuel pour le secteur santé à domicile.
              </div>
            </Panel>
            </div>)}

            {/* === ONGLET NOTIFICATIONS — page complète embed (0.62.64) === */}
            {activeTab === "notifs" && <DynPage key="notifs" component={DynNotifications} />}

            {/* 0.62.64 — Onglets ramenés du menu Administration via dynamic embed */}
            {activeTab === "app-native"   && <DynPage key="app-native" component={DynAppNative} />}
            {activeTab === "integrations" && <DynPage key="integrations" component={DynIntegrations} />}
            {activeTab === "compta"       && <DynPage key="compta" component={DynCompta} />}
            {activeTab === "audit"        && <DynPage key="audit" component={DynAudit} />}
            {activeTab === "webhooks"     && <DynPage key="webhooks" component={DynWebhooks} />}
            {activeTab === "statut"       && <DynPage key="statut" component={DynStatut} />}
            {activeTab === "perf-sql"     && <DynPage key="perf-sql" component={DynPerfSql} />}
            {activeTab === "log-app"      && <DynPage key="log-app" component={DynLogApp} />}
            {activeTab === "mail-diag"    && <DynPage key="mail-diag" component={DynMailDiag} />}
            {activeTab === "avis-google"  && <DynPage key="avis-google" component={DynAvisGoogle} />}
            {activeTab === "doublons"     && <DynPage key="doublons" component={DynDoublons} />}

            {(activeTab === "general" || activeTab === "notifs" || activeTab === "rgpd") && (
            <div style={{ textAlign: "right" }}>
              {/* 0.58.25 : NeonButton variant=navy pour Enregistrer les préférences */}
              <NeonButton variant="navy" icon="ti-device-floppy" onClick={save}>
                Enregistrer les préférences
              </NeonButton>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// 0.62.64 : composant wrapper pour embed les pages existantes dans un onglet
function DynPage({ component: Component }) {
  return (
    <div className="av-tab-content" style={{ marginTop: 8 }}>
      <Component />
    </div>
  );
}
