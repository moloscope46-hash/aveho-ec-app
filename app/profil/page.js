"use client";
// Page Profil — Permet à l'utilisateur connecté de modifier son nom d'affichage,
// son mot de passe, et ses préférences personnelles (notifs reçues, etc.).
// Alpha 0.29.0 : dashboard "mes stats" + préférences notifications par user
// 0.58.6 : refonte UI avec PageHero + Tabs (4 onglets) + Avatar premium
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Btn, EntityIcon, CollapsibleSection } from "../ui";
import { PageHero, Tabs, TabPanel, Avatar, KpiCard, NeonButton } from "../components/ui-premium";
import { resetOnboarding } from "../OnboardingTour";
import NotifCategories from "../NotifCategories";
import { KpiRow } from "../kpis";
import { relativeTime} from "../../lib/format";
import NotificationPreferences from "../NotificationPreferences";
import DigestPreferences from "../DigestPreferences";
import DigestHistory from "../DigestHistory";
import PasswordInput from "../PasswordInput";
import BiometricSection from "../BiometricSection";
// 0.58.20 : factory reset cache front
import { fullCacheReset } from "../../lib/cacheReset";
// 0.58.24 : toggle mode présentation depuis le profil
import { isPresentationMode, togglePresentationMode, isPresentationHideNotifs, setPresentationHideNotifs } from "../../lib/presentationMode";
// 0.58.26 : toggle mode focus zen depuis le profil
// 0.58.30 : sous-option masquer aussi les notifs
import { isFocusMode, toggleFocusMode, isFocusHideNotifs, setFocusHideNotifs } from "../../lib/focusMode";
// 0.58.31 : config des 3 raccourcis du menu en haut-gauche
import { getShortcutsConfig, setShortcutsConfig, resetShortcutsConfig, SHORTCUT_COLORS, SHORTCUT_ICONS, DEFAULT_SHORTCUTS } from "../../lib/shortcutsConfig";

export default function Profil() {
  const supabase = createClient();
  const auth = useAuth();
  const router = useRouter();  // 0.58.91 : manquant — utilisé par le bouton Rouvrir popup choix-mode
  // 0.58.97 : launchMode state initialisé après mount pour éviter hydration mismatch
  const [launchMode, setLaunchMode] = useState(null);
  useEffect(() => {
    try { setLaunchMode(localStorage.getItem("av-launch-mode")); } catch {}
  }, []);
  const cart = useCart();
  const [nom, setNom] = useState("");
  // 0.58.83 : numéro de téléphone perso pour le FAB "Continuer sur mon téléphone"
  const [telPerso, setTelPerso] = useState("");
  const [telSavedMsg, setTelSavedMsg] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  // Alpha 0.29.0 : stats utilisateur
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  // 0.58.6 : 4 onglets pour mieux organiser la page Profil
  const [activeTab, setActiveTab] = useState("activite");

  useEffect(() => {
    if (!auth.ready) return;
    setNom(auth.user?.user_metadata?.nom_affiche || auth.user?.email?.split("@")[0] || "");
    setTelPerso(auth.user?.user_metadata?.telephone_perso || "");
    loadStats();
    setLoading(false);
  }, [auth.ready]);

  async function loadStats() {
    if (!auth.user?.id || !auth.structureId) return;
    const userId = auth.user.id;

    // 0.65.4 : tryFetch défensif - si une requête plante, les autres marchent
    const tryFetch = async (q) => {
      try { const r = await q; if (r.error) return { data: [] }; return r; } catch { return { data: [] }; }
    };

    // Stats parallèles via Promise.all (chaque requête est sécurisée)
    const [diResp, achatsResp, transfertsResp, signResp, eventsResp] = await Promise.all([
      // DI créées par l'utilisateur
      tryFetch(supabase.from("interventions")
        .select("id, statut, urgence", { count: "exact" })
        .eq("structure_id", auth.structureId)
        .eq("created_by", userId)),
      // Achats créés (demandeur)
      tryFetch(supabase.from("achats")
        .select("id, statut", { count: "exact" })
        .eq("structure_id", auth.structureId)
        .eq("demandeur_id", userId)),
      // Transferts créés
      tryFetch(supabase.from("transferts")
        .select("id, statut", { count: "exact" })
        .eq("structure_id", auth.structureId)
        .eq("created_by", userId)),
      // Signalements signés par l'utilisateur (opt-in created_by)
      tryFetch(supabase.from("signalements")
        .select("id, statut", { count: "exact" })
        .eq("structure_id", auth.structureId)
        .eq("created_by", userId)),
      // Activité récente — table s'appelle audit_log (pas audit_events)
      tryFetch(supabase.from("audit_log")
        .select("action, entite, entite_id, details, created_at")
        .eq("structure_id", auth.structureId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15)),
    ]);

    const di = diResp.data || [];
    const achats = achatsResp.data || [];
    const transferts = transfertsResp.data || [];
    const signalements = signResp.data || [];

    setStats({
      di_total: di.length,
      di_urgentes: di.filter((d) => d.urgence === "Urgent").length,
      di_cloturees: di.filter((d) => d.statut === "Clôturée").length,
      achats_total: achats.length,
      achats_a_valider: achats.filter((a) => a.statut === "À valider").length,
      transferts_total: transferts.length,
      // Alpha 0.32.0 : signalements perso (opt-in created_by)
      signalements_total: signalements.length,
      signalements_traites: signalements.filter((s) => s.statut === "Traité").length,
    });
    setRecentActivity(eventsResp.data || []);
  }

  async function saveNom() {
    setErr("");
    try {
      const { error } = await supabase.auth.updateUser({ data: { nom_affiche: nom } });
      if (error) throw error;
      setSavedMsg("Nom d'affichage mis à jour.");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (e) { setErr(e.message); }
  }

  // 0.58.83 : sauvegarde du numéro perso (pour le FAB Continuer sur le téléphone)
  async function saveTelPerso() {
    setErr("");
    try {
      const { error } = await supabase.auth.updateUser({ data: { telephone_perso: telPerso || null } });
      if (error) throw error;
      setTelSavedMsg("Numéro enregistré !");
      setTimeout(() => setTelSavedMsg(""), 2500);
    } catch (e) { setErr(e.message); }
  }

  async function savePwd() {
    setPwdMsg(""); setErr("");
    // 0.55.12 : policy stricte
    const { checkPassword } = await import("../../lib/passwordPolicy");
    const check = checkPassword(pwd);
    if (!check.ok) {
      setErr("Mot de passe non conforme : " + check.problems.join(", "));
      return;
    }
    if (pwd !== pwd2) { setErr("Les deux mots de passe ne correspondent pas."); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      setPwd(""); setPwd2("");
      setPwdMsg("Mot de passe modifié.");
      setTimeout(() => setPwdMsg(""), 2500);
    } catch (e) { setErr(e.message); }
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        {/* 0.58.6 : PageHero premium */}
        <PageHero
          icon="ti-user-circle"
          eyebrow="MON COMPTE"
          title="Mon profil"
          subtitle={auth.user?.email}
          variant="blue"
          breadcrumbs={[
            { label: "Accueil", href: "/accueil" },
            { label: "Mon profil" },
          ]}
        />

        {!loading && (
          <div style={{ marginBottom: 20 }}>
            <Tabs
              active={activeTab}
              onChange={setActiveTab}
              style="pills"
              reorderable
              storageKey="av-profil-tabs-order"
              tabs={[
                { id: "activite", label: "Activité",      icon: "ti-chart-bar" },
                { id: "profil",   label: "Profil",        icon: "ti-user" },
                { id: "notifs",   label: "Notifications", icon: "ti-bell-cog" },
                { id: "secu",     label: "Sécurité",      icon: "ti-shield-lock" },
              ]}
            />
          </div>
        )}

        {/* 0.58.28 : Skeleton premium pendant le chargement (au lieu de StateMsg) */}
        {loading ? <TabPanel active="loading" loading={true}>{null}</TabPanel> : (
          <>
            {/* En-tête identité avec Avatar premium - toujours visible */}
            <Panel style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                {/* 0.58.6 : Avatar premium avec halo glow remplace EntityIcon */}
                <Avatar name={nom || auth.user?.email} size={64} ring />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#142131" }}>{nom || auth.user?.email}</div>
                  <div style={{ fontSize: 13, color: "#6c7a89" }}>{auth.user?.email}</div>
                  <div style={{ fontSize: 12, color: "#8a98a8", marginTop: 6 }}>
                    Collectivité : <b>{auth.structureNom}</b>
                    {auth.role?.nom && <> · Rôle : <b>{auth.role.nom}</b></>}
                  </div>
                </div>
              </div>
            </Panel>

            {err && <div className="err" style={{ marginBottom: 14 }}>{err}</div>}

            {/* 0.62.133 : Panel notifications natives */}
            <NotifPrefsPanel />

            {/* === ONGLET ACTIVITÉ === */}
            {activeTab === "activite" && (
            <div key="activite" className="av-tab-content">
            {/* Alpha 0.29.0 : Dashboard "Mes stats" */}
            {stats && (
              <Panel style={{ marginBottom: 18 }}>
                <h2 style={{ margin:"0 0 14px", fontSize:17, color:"#142131" }}>
                  <i className="ti ti-chart-bar" style={{ color:"#7CC8C8", marginRight:6 }} /> Mon activité dans Aveho
                </h2>
                <KpiRow tiles={[
                  { label: "DI créées", value: stats.di_total, icon: "ti-tools", color: "#185FA5" },
                  { label: "DI urgentes", value: stats.di_urgentes, icon: "ti-alert-triangle", color: "#c0392b" },
                  { label: "DI clôturées", value: stats.di_cloturees, icon: "ti-check", color: "#5aa05a" },
                  { label: "Achats demandés", value: stats.achats_total, icon: "ti-shopping-cart", color: "#EF9F27" },
                  { label: "Achats à valider", value: stats.achats_a_valider, icon: "ti-clock", color: "#EF9F27" },
                  { label: "Transferts", value: stats.transferts_total, icon: "ti-arrows-exchange", color: "#7a6fb0" },
                  { label: "Signalements signés", value: stats.signalements_total, icon: "ti-message", color: "#7CC8C8" },
                ]} />
                {/* Alpha 0.32.0 : info-bulle signalements opt-in */}
                <p style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 8, marginBottom: 0 }}>
                  <i className="ti ti-info-circle" /> Seuls les signalements pour lesquels tu as coché "Tracker dans mon profil" sont comptés. Les autres restent anonymes.
                </p>
              </Panel>
            )}

            {/* Activité récente */}
            {recentActivity.length > 0 && (
              <Panel style={{ marginBottom: 18 }}>
                <h2 style={{ margin:"0 0 14px", fontSize:17, color:"#142131" }}>
                  <i className="ti ti-history" style={{ color:"#185FA5", marginRight:6 }} /> Mes 15 dernières actions
                </h2>
                <div style={{ fontSize: 13 }}>
                  {recentActivity.map((e, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: idx < recentActivity.length - 1 ? "1px solid #eef2f5" : "none" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: actionColor(e.action).bg, color: actionColor(e.action).fg, textTransform: "uppercase", letterSpacing: ".5px", minWidth: 72, textAlign: "center" }}>
                        {e.action}
                      </span>
                      <i className={`ti ${entiteIcon(e.entite)}`} style={{ color: "#8a98a8", fontSize: 14 }} />
                      <span style={{ flex: 1, color: "#2a3a48" }}>
                        {e.entite}
                        {e.details?.numero && <span style={{ marginLeft: 6, color: "#185FA5", fontFamily: "monospace", fontSize: 12 }}>{e.details.numero}</span>}
                      </span>
                      <span style={{ fontSize: 11, color: "#8a98a8" }} title={new Date(e.created_at).toLocaleString("fr-FR")}>
                        {relativeTime(e.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
            </div>)}

            {/* === ONGLET PROFIL === */}
            {activeTab === "profil" && (
            <div key="profil" className="av-tab-content">
            {/* 0.65.11 : Section Mes affectations & droits ULTRA enrichie */}
            <MesAffectationsPanel auth={auth} supabase={supabase} />
            {/* Nom d'affichage */}
            <Panel style={{ marginBottom: 18 }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 17 }}>Nom d'affichage</h2>
              {savedMsg && <div className="ok">{savedMsg}</div>}
              <div className="fld-row">
                <div className="fld" style={{ flex: 1 }}>
                  <label>Nom affiché à vos collègues</label>
                  <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Cédric Mignot" />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {/* 0.58.21 : migration vers NeonButton premium */}
                <NeonButton variant="teal" icon="ti-device-floppy" onClick={saveNom}>
                  Enregistrer
                </NeonButton>
              </div>
            </Panel>

            {/* 0.58.85 : Mode de démarrage (rouvrir le popup choix-mode) */}
            <Panel style={{ marginBottom: 18, borderLeft: "4px solid #EF9F27" }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 17 }}>
                <i className="ti ti-device-desktop" style={{ color: "#EF9F27", marginRight: 6 }} /> Mode de démarrage
              </h2>
              <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#5a6878" }}>
                Choisis si tu veux démarrer en mode <b>Logiciel</b> (interface complète bureau) ou <b>Action Mobile</b> (mode terrain simplifié) à chaque connexion.
                {launchMode !== null && (
                  <> Mode actuel : <b>{launchMode === "mobile" ? "📱 Action Mobile" : launchMode === "desktop" ? "💻 Logiciel" : "Non défini"}</b></>
                )}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => { try { localStorage.setItem("av-launch-mode", "desktop"); } catch {}; setLaunchMode("desktop"); setSavedMsg("Mode Logiciel choisi"); setTimeout(() => setSavedMsg(""), 2500); }}
                  style={{ flex: 1, minWidth: 200, padding: "10px 14px", background: "#fff", border: "2px solid #7CC8C8", color: "#142131", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>
                  <i className="ti ti-device-desktop" style={{ color: "#7CC8C8" }} /> Démarrer en <b>Logiciel</b>
                </button>
                <button onClick={() => { try { localStorage.setItem("av-launch-mode", "mobile"); } catch {}; setLaunchMode("mobile"); setSavedMsg("Mode Action Mobile choisi"); setTimeout(() => setSavedMsg(""), 2500); }}
                  style={{ flex: 1, minWidth: 200, padding: "10px 14px", background: "#fff", border: "2px solid #EF9F27", color: "#142131", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>
                  <i className="ti ti-scan" style={{ color: "#EF9F27" }} /> Démarrer en <b>Action Mobile</b>
                </button>
                <button onClick={() => { try { localStorage.removeItem("av-launch-mode"); } catch {}; setLaunchMode(null); router.push("/choix-mode"); }}
                  style={{ padding: "10px 14px", background: "rgba(94,74,140,.10)", border: "1px solid #5e4a8c", color: "#5e4a8c", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>
                  <i className="ti ti-arrow-back-up" /> Rouvrir le popup de choix
                </button>
              </div>
            </Panel>

            {/* 0.58.83 : Mon téléphone (pour FAB Continuer sur le téléphone) */}
            <Panel style={{ marginBottom: 18, borderLeft: "4px solid #7CC8C8" }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 17 }}>
                <i className="ti ti-device-mobile" style={{ color: "#7CC8C8", marginRight: 6 }} /> Mon téléphone
              </h2>
              <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#5a6878" }}>
                Renseigne ton numéro pour le FAB <b>"Continuer sur mon téléphone"</b> (bouton flottant <i className="ti ti-device-mobile" /> en bas à droite de chaque page).
                Quand tu cliques, un QR de la page actuelle s'affiche et ton numéro apparaît à côté pour rappel.
              </p>
              {telSavedMsg && <div className="ok" style={{ marginBottom: 10 }}>{telSavedMsg}</div>}
              <div className="fld-row">
                <div className="fld" style={{ flex: 1 }}>
                  <label>Numéro personnel</label>
                  <input
                    type="tel"
                    value={telPerso}
                    onChange={(e) => setTelPerso(e.target.value)}
                    placeholder="06 12 34 56 78"
                    style={{ fontFamily: "Consolas, monospace" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <div style={{ flex: 1, padding: "8px 12px", background: "rgba(124,200,200,.08)", borderRadius: 8, fontSize: 11.5, color: "#5a6878" }}>
                  <i className="ti ti-info-circle" /> Stocké chiffré dans tes métadonnées Supabase (auth.users)
                </div>
                <NeonButton variant="teal" icon="ti-device-floppy" onClick={saveTelPerso}>
                  Enregistrer
                </NeonButton>
              </div>
            </Panel>
            </div>)}

            {/* === ONGLET NOTIFICATIONS === */}
            {activeTab === "notifs" && (
            <div key="notifs" className="av-tab-content">
            {/* Alpha 0.29.0 : Préférences notif par user (déplacé depuis /parametres) */}
            <Panel style={{ marginBottom: 18 }}>
              <h2 style={{ margin:"0 0 14px", fontSize:17, color:"#142131" }}>
                <i className="ti ti-bell-cog" style={{ color:"#185FA5", marginRight:6 }} /> Mes notifications
              </h2>
              <NotificationPreferences auth={auth} />
            </Panel>

            {/* Alpha 0.40.0 : Digest email — replié par défaut depuis 0.46.0 */}
            <CollapsibleSection 
              title="Récap email automatique" 
              icon="ti-mail" 
              iconColor="#185FA5"
              defaultOpen={false}
            >
              <DigestPreferences auth={auth} />
            </CollapsibleSection>

            {/* Alpha 0.42.0 : Historique digest — replié par défaut depuis 0.46.0 */}
            <CollapsibleSection 
              title="Historique des envois" 
              icon="ti-history" 
              iconColor="#7a6fb0"
              defaultOpen={false}
            >
              <DigestHistory auth={auth} />
            </CollapsibleSection>

            {/* Alpha 0.49.0 : Catégories de notifications */}
            <CollapsibleSection 
              title="Catégories de notifications" 
              icon="ti-bell-cog" 
              iconColor="#5aa05a"
              defaultOpen={false}
            >
              <NotifCategories auth={auth} />
            </CollapsibleSection>
            </div>)}

            {/* === ONGLET SÉCURITÉ === */}
            {activeTab === "secu" && (
            <div key="secu" className="av-tab-content">
            {/* Alpha 0.46.0 : Aide & onboarding */}
            <CollapsibleSection 
              title="Aide & visite guidée" 
              icon="ti-help-circle" 
              iconColor="#7CC8C8"
              defaultOpen={false}
            >
              <p style={{ fontSize: 13, color: "#6c7a89", margin: "0 0 12px" }}>
                Si tu veux te rafraichir la mémoire sur les bases de l'interface (menu, notifications, raccourcis…), tu peux relancer la visite guidée.
              </p>
              <Btn 
                variant="ghost" 
                icon="ti-map-2" 
                onClick={() => {
                  resetOnboarding();
                  window.location.href = "/accueil";
                }}
              >
                Refaire la visite guidée
              </Btn>
            </CollapsibleSection>

            {/* Mot de passe — replié par défaut depuis 0.46.0 */}
            <CollapsibleSection 
              title="Changer mon mot de passe" 
              icon="ti-lock" 
              iconColor="#c0392b"
              defaultOpen={false}
            >
              {pwdMsg && <div className="ok">{pwdMsg}</div>}
              <div className="fld-row">
                <div className="fld">
                  <label>Nouveau mot de passe</label>
                  <PasswordInput value={pwd} onChange={setPwd} showGenerate />
                </div>
                <div className="fld">
                  <label>Confirmer</label>
                  <PasswordInput value={pwd2} onChange={setPwd2} showStrength={false} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#8a98a8", margin: "4px 0 14px" }}>
                <i className="ti ti-shield-lock" /> Au moins 12 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial. Tu seras déconnecté(e) après changement.
              </p>
              <div style={{ textAlign: "right" }}>
                <NeonButton variant="blue" icon="ti-lock" onClick={savePwd} disabled={!pwd || !pwd2}>
                  Modifier le mot de passe
                </NeonButton>
              </div>
            </CollapsibleSection>

            {/* 0.55.13/17/20 : Sections biométriques séparées (empreinte + face) */}
            <CollapsibleSection
              title="Connexion par empreinte digitale"
              icon="ti-fingerprint"
              iconColor="#185FA5"
              defaultOpen={false}
            >
              <BiometricSection auth={auth} methodFilter="empreinte" />
            </CollapsibleSection>

            <CollapsibleSection
              title="Connexion par détection faciale"
              icon="ti-face-id"
              iconColor="#7a6fb0"
              defaultOpen={false}
            >
              <BiometricSection auth={auth} methodFilter="face" />
            </CollapsibleSection>

            {/* Informations session */}
            <Panel>
              <h2 style={{ margin: "0 0 16px", fontSize: 17 }}>Ma session</h2>
              <div style={{ fontSize: 13, color: "#6c7a89", lineHeight: 1.9 }}>
                <div><b>Email :</b> {auth.user?.email}</div>
                <div><b>Identifiant utilisateur :</b> <code style={{ fontSize: 11 }}>{auth.user?.id}</code></div>
                <div><b>Établissements accessibles :</b> {auth.etablissements?.length || 0}</div>
                {auth.role && <div><b>Permissions :</b> {Array.isArray(auth.role.permissions_json) ? auth.role.permissions_json.join(", ") : "—"}</div>}
              </div>
            </Panel>

            {/* 0.58.24 : toggle Mode présentation (en plus du Ctrl+Shift+P) */}
            <Panel style={{ marginTop: 16, background: "linear-gradient(135deg, #f3eef9 0%, #ffffff 100%)", borderColor: "#d7c9eb", borderLeft: "4px solid #7a6fb0" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 16, color: "#3d2f5e", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-presentation" /> Mode présentation
              </h2>
              <p style={{ fontSize: 12.5, color: "#5a4889", margin: "0 0 14px", lineHeight: 1.6 }}>
                Active le mode démo pour vos présentations clients : zoom léger, animations ralenties, ombres renforcées. Un badge "🎥 MODE PRÉSENTATION" apparaît en bas de l'écran.
              </p>
              <PresentationModeToggle />
              <p style={{ fontSize: 11, color: "#8a78aa", margin: "10px 0 0", fontStyle: "italic" }}>
                💡 Raccourci : <kbd style={{ background: "#e8e0f3", padding: "2px 7px", borderRadius: 4, fontSize: 11 }}>Ctrl+Shift+P</kbd> (ou <kbd style={{ background: "#e8e0f3", padding: "2px 7px", borderRadius: 4, fontSize: 11 }}>⌘+Shift+P</kbd> sur Mac) pour activer partout dans l'app
              </p>
            </Panel>

            {/* 0.58.26 : toggle Mode focus zen (en plus du Ctrl+Shift+F) */}
            <Panel style={{ marginTop: 16, background: "linear-gradient(135deg, #f0f9f0 0%, #ffffff 100%)", borderColor: "#c2dec2", borderLeft: "4px solid #5aa05a" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 16, color: "#2e6f33", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-target" /> Mode focus zen
              </h2>
              <p style={{ fontSize: 12.5, color: "#3d6f3d", margin: "0 0 14px", lineHeight: 1.6 }}>
                Pour les sessions de saisie concentrée : cache la topbar, la sidebar, les notifications et autres distractions. Centre le contenu pour une lecture/saisie sereine. Un badge "🧘 FOCUS ZEN" apparaît en haut à droite.
              </p>
              <FocusModeToggle />
              <p style={{ fontSize: 11, color: "#5a7d5a", margin: "10px 0 0", fontStyle: "italic" }}>
                💡 Raccourci : <kbd style={{ background: "#dfeddf", padding: "2px 7px", borderRadius: 4, fontSize: 11 }}>Ctrl+Shift+F</kbd> (ou <kbd style={{ background: "#dfeddf", padding: "2px 7px", borderRadius: 4, fontSize: 11 }}>⌘+Shift+F</kbd> sur Mac) pour activer partout dans l'app
              </p>
            </Panel>

            {/* 0.58.26 : Rejouer la visite guidée onboarding */}
            <Panel style={{ marginTop: 16, background: "linear-gradient(135deg, #e7f0fa 0%, #ffffff 100%)", borderColor: "#b8d0e8", borderLeft: "4px solid #185FA5" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 16, color: "#0e4884", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-route" /> Visite guidée
              </h2>
              <p style={{ fontSize: 12.5, color: "#185FA5", margin: "0 0 14px", lineHeight: 1.6 }}>
                Vous voulez (re)découvrir les fonctionnalités principales ? Relancez la visite guidée qui s'affiche à la première connexion. Le tour vous présente la topbar, les KPIs, la palette Cmd+K et plus.
              </p>
              <ReplayTourButton />
            </Panel>

            {/* 0.58.31 : config des 3 raccourcis du menu haut-gauche */}
            <Panel style={{ marginTop: 16, background: "linear-gradient(135deg, #f0fafa 0%, #ffffff 100%)", borderColor: "#bce0e0", borderLeft: "4px solid #7CC8C8" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 16, color: "#1c5454", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-layout-grid" /> Mes 3 raccourcis rapides
              </h2>
              <p style={{ fontSize: 12.5, color: "#2a5a5a", margin: "0 0 14px", lineHeight: 1.6 }}>
                Personnalise les 3 bulles qui apparaissent dans le menu en haut-gauche de l'écran (bouton <i className="ti ti-menu-2" style={{ verticalAlign: "middle" }} />). Pour chaque raccourci : libellé, URL de destination, icône et couleur.
              </p>
              <ShortcutsConfigPanel />
            </Panel>

            {/* 0.58.20 : panneau "Vider le cache" pour résoudre les bugs de cache navigateur/SW */}
            <Panel style={{ marginTop: 16, background: "linear-gradient(135deg, #fff8ec 0%, #fffcf3 100%)", borderColor: "#f0d59f", borderLeft: "4px solid #EF9F27" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 16, color: "#7a4f15", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-refresh-alert" /> Problème d'affichage ?
              </h2>
              <p style={{ fontSize: 12.5, color: "#7a4f15", margin: "0 0 14px", lineHeight: 1.6 }}>
                Si la nouvelle interface ne s'affiche pas correctement (vieille TopBar, KPIs non animés, etc.) après une mise à jour, c'est probablement un problème de cache navigateur ou Service Worker. Cliquez ci-dessous pour forcer un nettoyage complet et recharger.
              </p>
              <CacheResetButton />
              <p style={{ fontSize: 11, color: "#8a98a8", margin: "10px 0 0", fontStyle: "italic" }}>
                ✓ Votre session reste active (vous n'avez pas besoin de vous reconnecter)
              </p>
            </Panel>
            </div>)}
          </>
        )}
      </div>
    </div>
  );
}

// Helpers couleur/icône pour l'activité récente
function actionColor(action) {
  const map = {
    creer: { bg: "#eef9ef", fg: "#2e6f33" },
    modifier: { bg: "#eef5fc", fg: "#185FA5" },
    supprimer: { bg: "#fef0ee", fg: "#c0392b" },
    valider: { bg: "#eef9ef", fg: "#2e6f33" },
    refuser: { bg: "#fef0ee", fg: "#c0392b" },
    soumettre: { bg: "#fef3e2", fg: "#7a4f15" },
    recevoir: { bg: "#eef9ef", fg: "#2e6f33" },
    archiver: { bg: "#f4f7fa", fg: "#6c7a89" },
  };
  return map[action] || { bg: "#f4f7fa", fg: "#6c7a89" };
}

function entiteIcon(entite) {
  const map = {
    intervention: "ti-tools",
    commande: "ti-shopping-cart",
    transfert: "ti-arrows-exchange",
    signalement: "ti-message",
    patient: "ti-user",
    materiel: "ti-package",
    maintenance: "ti-tool",
    consentement: "ti-shield-lock",
  };
  return map[entite] || "ti-circle";
}

// =============================================================
//  0.58.24 : Toggle Mode Présentation (lié à lib/presentationMode)
// =============================================================
function PresentationModeToggle() {
  const [isOn, setIsOn] = useState(false);
  // 0.58.38 : option masquer notifs aussi (cohérent avec focus mode)
  const [hideNotifs, setHideNotifsState] = useState(false);

  useEffect(() => {
    // Init depuis localStorage
    setIsOn(isPresentationMode());
    setHideNotifsState(isPresentationHideNotifs());
    // Écoute les changements (déclenché aussi par le shortcut Ctrl+Shift+P)
    function onChange(e) {
      setIsOn(e?.detail?.on ?? isPresentationMode());
    }
    function onHideChange(e) {
      setHideNotifsState(e?.detail?.on ?? isPresentationHideNotifs());
    }
    window.addEventListener("av-presentation-mode-change", onChange);
    window.addEventListener("av-presentation-hide-notifs-change", onHideChange);
    return () => {
      window.removeEventListener("av-presentation-mode-change", onChange);
      window.removeEventListener("av-presentation-hide-notifs-change", onHideChange);
    };
  }, []);

  function handleToggle() {
    const next = togglePresentationMode();
    setIsOn(next);
  }

  function toggleHideNotifs() {
    const next = !hideNotifs;
    setHideNotifsState(next);
    setPresentationHideNotifs(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <NeonButton
        variant={isOn ? "amber" : "violet"}
        icon={isOn ? "ti-presentation-analytics" : "ti-presentation"}
        onClick={handleToggle}
      >
        {isOn ? "Désactiver le mode présentation" : "Activer le mode présentation"}
      </NeonButton>
      {/* 0.58.38 : option masquer notifs durant la démo */}
      <label style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        background: isOn ? "rgba(122,111,176,.08)" : "rgba(150,150,150,.05)",
        border: `1px solid ${isOn ? "rgba(122,111,176,.20)" : "rgba(150,150,150,.10)"}`,
        borderRadius: 8,
        cursor: isOn ? "pointer" : "not-allowed",
        opacity: isOn ? 1 : 0.5,
        fontSize: 12.5,
        transition: "all 200ms",
      }}>
        <input
          type="checkbox"
          checked={hideNotifs}
          onChange={toggleHideNotifs}
          disabled={!isOn}
          style={{ cursor: isOn ? "pointer" : "not-allowed" }}
        />
        <i className="ti ti-bell-off" style={{ color: "#7a6fb0" }} />
        <span>Masquer les notifications pendant les démos
          <span style={{ display: "block", fontSize: 11, color: "#8a98a8", marginTop: 2 }}>
            Cache la cloche + les toasts realtime pour une démo client sans interruption
          </span>
        </span>
      </label>
    </div>
  );
}

// =============================================================
//  0.58.26 : Toggle Mode Focus zen (lié à lib/focusMode)
// =============================================================
function FocusModeToggle() {
  const [isOn, setIsOn] = useState(false);
  // 0.58.30 : sous-option "masquer aussi les notifs"
  const [hideNotifs, setHideNotifsState] = useState(false);

  useEffect(() => {
    setIsOn(isFocusMode());
    setHideNotifsState(isFocusHideNotifs());
    function onChange(e) {
      setIsOn(e?.detail?.on ?? isFocusMode());
    }
    function onHideNotifsChange(e) {
      setHideNotifsState(e?.detail?.on ?? isFocusHideNotifs());
    }
    window.addEventListener("av-focus-mode-change", onChange);
    window.addEventListener("av-focus-hide-notifs-change", onHideNotifsChange);
    return () => {
      window.removeEventListener("av-focus-mode-change", onChange);
      window.removeEventListener("av-focus-hide-notifs-change", onHideNotifsChange);
    };
  }, []);

  function handleToggle() {
    const next = toggleFocusMode();
    setIsOn(next);
  }
  function handleToggleHideNotifs() {
    const next = !hideNotifs;
    setFocusHideNotifs(next);
    setHideNotifsState(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <NeonButton
        variant={isOn ? "amber" : "teal"}
        icon={isOn ? "ti-target-off" : "ti-target"}
        onClick={handleToggle}
      >
        {isOn ? "Désactiver le mode focus" : "Activer le mode focus zen"}
      </NeonButton>

      {/* 0.58.30 : sous-option (toujours visible pour configurer même quand focus off) */}
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          background: hideNotifs ? "#e8f5e8" : "#f4f7fa",
          border: `1px solid ${hideNotifs ? "#a8d5a8" : "#d8e2ea"}`,
          borderRadius: 10,
          cursor: "pointer",
          fontSize: 12.5,
          color: hideNotifs ? "#2e6f33" : "#5a6878",
          fontWeight: 500,
          transition: "all 180ms",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={hideNotifs}
          onChange={handleToggleHideNotifs}
          style={{
            width: 16,
            height: 16,
            cursor: "pointer",
            accentColor: "#5aa05a",
          }}
        />
        <span>
          <i className="ti ti-bell-off" style={{ marginRight: 5, color: hideNotifs ? "#5aa05a" : "#8a98a8" }} />
          Masquer aussi les notifications (cloche + toasts) pendant le mode focus
        </span>
      </label>
    </div>
  );
}

// =============================================================
//  0.58.26 : Relancer la visite guidée (reset localStorage + redirect)
// =============================================================
function ReplayTourButton() {
  const router = useRouter();
  function handleReplay() {
    // 0.58.27 : redirige vers /accueil?tour=premium pour déclencher le nouveau tour premium
    // Le legacy reste accessible via reset complet, mais on privilégie l'expérience premium
    try { localStorage.removeItem("av-tour-premium-058"); } catch {}
    router.push("/accueil?tour=premium");
  }
  return (
    <NeonButton variant="blue" icon="ti-route" onClick={handleReplay}>
      Rejouer la visite guidée
    </NeonButton>
  );
}

// =============================================================
//  0.58.20 : Bouton de reset cache complet (utilise lib/cacheReset)
// =============================================================
function CacheResetButton() {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleReset() {
    setBusy(true);
    try {
      // Petit délai visuel pour que l'user comprenne ce qui se passe
      await new Promise((r) => setTimeout(r, 200));
      // fullCacheReset reload automatiquement à la fin
      await fullCacheReset({ reload: true, keepAuth: true });
    } catch (e) {
      console.error("Cache reset failed:", e);
      setBusy(false);
      // 0.58.20 : dialogs.alert au lieu de window.alert() natif (charte UI)
      const { dialogs } = await import("../dialogs");
      dialogs.alert?.({
        title: "Nettoyage impossible",
        message: "Une erreur est survenue. Essayez Ctrl+Shift+R pour un rafraîchissement forcé du navigateur.",
        variant: "danger",
      });
    }
  }

  if (!confirming) {
    return (
      <NeonButton
        variant="amber"
        icon="ti-refresh"
        onClick={() => setConfirming(true)}
      >
        Vider le cache et recharger
      </NeonButton>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <NeonButton
        variant={busy ? "terra" : "teal"}
        icon={busy ? "ti-loader-2" : "ti-check"}
        onClick={handleReset}
        disabled={busy}
      >
        {busy ? "Nettoyage en cours…" : "Confirmer : vider et recharger"}
      </NeonButton>
      {!busy && (
        <button
          onClick={() => setConfirming(false)}
          style={{
            background: "transparent",
            color: "#6c7a89",
            border: "1px solid #cfd8e0",
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
      )}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// =============================================================
//  0.58.31 : Panel de config des 3 raccourcis (menu haut-gauche)
//
//  Permet à l'utilisateur de personnaliser chacun des 3 raccourcis :
//  - Libellé (texte court)
//  - URL de destination (chemin interne, ex: /achats)
//  - Icône (parmi une grille de 28 icônes Tabler)
//  - Couleur (parmi 8 swatches)
//
//  Sauvegarde via lib/shortcutsConfig (localStorage + event).
// =============================================================
function ShortcutsConfigPanel() {
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [editingIdx, setEditingIdx] = useState(null); // 0 | 1 | 2 | null
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    setShortcuts(getShortcutsConfig());
  }, []);

  function updateShortcut(idx, patch) {
    const updated = shortcuts.map((s, i) => i === idx ? { ...s, ...patch } : s);
    // Recalcule le gradient si la couleur change
    if (patch.color) {
      const found = SHORTCUT_COLORS.find(c => c.color === patch.color);
      updated[idx].gradient = found?.gradient || `linear-gradient(135deg, ${patch.color}cc, ${patch.color})`;
    }
    setShortcuts(updated);
    setShortcutsConfig(updated);
    setSavedMsg("✓ Sauvegardé");
    setTimeout(() => setSavedMsg(""), 1500);
  }

  function handleReset() {
    resetShortcutsConfig();
    setShortcuts(DEFAULT_SHORTCUTS);
    setEditingIdx(null);
    setSavedMsg("✓ Réinitialisé");
    setTimeout(() => setSavedMsg(""), 1500);
  }

  return (
    <div>
      {/* Aperçu compact des 3 raccourcis actuels */}
      <div style={{
        display: "flex",
        gap: 12,
        padding: 16,
        background: "linear-gradient(135deg, #142131, #243044)",
        borderRadius: 12,
        marginBottom: 14,
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16,
          background: "linear-gradient(135deg, #2a3a52, #142131)",
          color: "#fff",
          border: "1px solid rgba(124,200,200,.20)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
          boxShadow: "0 6px 18px rgba(20,33,49,.30)",
          flexShrink: 0,
        }}>
          <i className="ti ti-menu-2" />
        </div>
        {shortcuts.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
            style={{
              width: 48, height: 48, borderRadius: 16,
              background: s.gradient || `linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
              color: "#fff",
              border: editingIdx === idx ? "2px solid #fff" : "1px solid rgba(255,255,255,.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
              boxShadow: editingIdx === idx
                ? `0 8px 24px ${s.color}90, 0 0 0 3px ${s.color}40`
                : `0 6px 18px ${s.color}55`,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "all 200ms",
              transform: editingIdx === idx ? "scale(1.10)" : "scale(1)",
              padding: 0,
              flexShrink: 0,
            }}
            title={`Modifier "${s.label}"`}
          >
            <i className={`ti ${s.icon}`} />
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(191,230,230,.7)", fontStyle: "italic" }}>
          {editingIdx !== null ? "Modification en cours…" : "Clique sur une bulle pour la modifier"}
        </span>
      </div>

      {/* Éditeur (visible si une bulle est sélectionnée) */}
      {editingIdx !== null && (
        <div style={{
          padding: 16,
          background: "#fff",
          border: "1px solid #d8e2ea",
          borderRadius: 12,
          marginBottom: 14,
          animation: "av-fade-in 200ms ease-out",
        }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#142131", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 24, height: 24, borderRadius: 6,
              background: shortcuts[editingIdx].color,
              color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 12,
            }}>
              {editingIdx + 1}
            </span>
            Raccourci {editingIdx + 1} : <code style={{ fontSize: 12, color: "#6c7a89" }}>{shortcuts[editingIdx].label}</code>
          </h3>

          {/* Champ Libellé */}
          <div className="fld" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#142131", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>
              Libellé
            </label>
            <input
              type="text"
              value={shortcuts[editingIdx].label}
              onChange={(e) => updateShortcut(editingIdx, { label: e.target.value })}
              maxLength={20}
              placeholder="Ex: Mes patients"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 13.5,
                fontFamily: "inherit",
                border: "1px solid #d8e2ea",
                borderRadius: 8,
              }}
            />
          </div>

          {/* Champ URL */}
          <div className="fld" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#142131", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>
              Destination (URL interne)
            </label>
            <input
              type="text"
              value={shortcuts[editingIdx].url}
              onChange={(e) => updateShortcut(editingIdx, { url: e.target.value })}
              placeholder="/patients"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 13,
                fontFamily: "Consolas, monospace",
                border: "1px solid #d8e2ea",
                borderRadius: 8,
              }}
            />
            <p style={{ fontSize: 11, color: "#8a98a8", margin: "4px 0 0" }}>
              <i className="ti ti-info-circle" /> Saisir un chemin commençant par <code style={{ fontSize: 11 }}>/</code> (ex: <code style={{ fontSize: 11 }}>/achats</code>, <code style={{ fontSize: 11 }}>/patients</code>, <code style={{ fontSize: 11 }}>/etablissement/fiche</code>)
            </p>
          </div>

          {/* 0.58.56 : option ouvrir en popup plein écran avec bouton retour */}
          <div className="fld" style={{ marginBottom: 10, padding: 12, background: "linear-gradient(135deg, #f0fafa, #fff)", borderRadius: 10, border: "1px solid #d8e2ea" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!shortcuts[editingIdx].openInPopup}
                onChange={(e) => updateShortcut(editingIdx, { openInPopup: e.target.checked })}
                style={{ marginTop: 2, cursor: "pointer", width: 18, height: 18, accentColor: "#7CC8C8" }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#142131", marginBottom: 2 }}>
                  <i className="ti ti-window-maximize" style={{ color: "#7CC8C8", marginRight: 4 }} />
                  Ouvrir dans une popup plein écran
                </div>
                <p style={{ fontSize: 11.5, color: "#5a6878", margin: 0, lineHeight: 1.5 }}>
                  Si activé, le raccourci s'ouvre dans une fenêtre superposée plein écran avec un bouton « ← Retour » pour revenir où tu étais — pratique pour des actions courtes (scan, panier).
                  <br />Sinon (par défaut), le raccourci redirige vers la page comme un lien normal.
                </p>
              </div>
            </label>
          </div>

          {/* Couleurs */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#142131", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
              Couleur
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SHORTCUT_COLORS.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => updateShortcut(editingIdx, { color: c.color, gradient: c.gradient })}
                  title={c.label}
                  aria-label={`Couleur ${c.label}`}
                  style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: c.gradient,
                    border: shortcuts[editingIdx].color === c.color ? "2px solid #142131" : "1px solid rgba(0,0,0,.10)",
                    cursor: "pointer",
                    transition: "all 150ms",
                    transform: shortcuts[editingIdx].color === c.color ? "scale(1.10)" : "scale(1)",
                    boxShadow: shortcuts[editingIdx].color === c.color
                      ? `0 6px 14px ${c.color}80, 0 0 0 3px ${c.color}30`
                      : `0 2px 6px ${c.color}40`,
                    fontFamily: "inherit",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Icônes */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#142131", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
              Icône
            </label>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
              gap: 6,
              maxHeight: 180,
              overflowY: "auto",
              padding: 4,
              background: "#f4f7fa",
              borderRadius: 8,
              border: "1px solid #e3e9ee",
            }}>
              {SHORTCUT_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => updateShortcut(editingIdx, { icon: ic })}
                  title={ic}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: 8,
                    background: shortcuts[editingIdx].icon === ic ? shortcuts[editingIdx].color : "#fff",
                    color: shortcuts[editingIdx].icon === ic ? "#fff" : "#5a6878",
                    border: shortcuts[editingIdx].icon === ic
                      ? `1px solid ${shortcuts[editingIdx].color}`
                      : "1px solid #e3e9ee",
                    cursor: "pointer",
                    fontSize: 17,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "inherit",
                    transition: "all 120ms",
                    transform: shortcuts[editingIdx].icon === ic ? "scale(1.05)" : "scale(1)",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (shortcuts[editingIdx].icon !== ic) {
                      e.currentTarget.style.background = "#eef5fc";
                      e.currentTarget.style.borderColor = shortcuts[editingIdx].color;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (shortcuts[editingIdx].icon !== ic) {
                      e.currentTarget.style.background = "#fff";
                      e.currentTarget.style.borderColor = "#e3e9ee";
                    }
                  }}
                >
                  <i className={`ti ${ic}`} />
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, alignItems: "center" }}>
            {savedMsg && (
              <span style={{ marginRight: "auto", color: "#5aa05a", fontSize: 12, fontWeight: 600 }}>
                {savedMsg}
              </span>
            )}
            <button
              type="button"
              onClick={() => setEditingIdx(null)}
              style={{
                background: "transparent",
                color: "#6c7a89",
                border: "1px solid #cfd8e0",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={handleReset}
          style={{
            background: "transparent",
            color: "#7a4f15",
            border: "1px solid #f0d59f",
            padding: "7px 13px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <i className="ti ti-refresh" /> Réinitialiser aux valeurs par défaut
        </button>
        {savedMsg && editingIdx === null && (
          <span style={{ color: "#5aa05a", fontSize: 12, fontWeight: 600 }}>{savedMsg}</span>
        )}
      </div>
    </div>
  );
}

// 0.62.133 : Panel paramètres notifications natives
function NotifPrefsPanel() {
  const [prefs, setPrefs] = useState({ sound: true, native: true });
  const [permission, setPermission] = useState("default");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { getNotifPrefs } = await import("../../lib/notifSounds");
      setPrefs(getNotifPrefs());
      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
      setLoading(false);
    })();
  }, []);

  async function toggle(key) {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    const { setNotifPrefs, requestNotifPermission } = await import("../../lib/notifSounds");
    setNotifPrefs(newPrefs);
    if (key === "native" && newPrefs.native && permission !== "granted") {
      const res = await requestNotifPermission();
      setPermission(res);
    }
  }

  async function testSound(type) {
    const { playNotifSound } = await import("../../lib/notifSounds");
    playNotifSound(type);
  }

  async function testNative() {
    const { showNativeNotif } = await import("../../lib/notifSounds");
    await showNativeNotif("🔔 Test Aveho", { body: "Si vous voyez ceci, les notifications natives fonctionnent !" });
  }

  if (loading) return null;

  return (
    <Panel style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <i className="ti ti-bell-ringing" style={{ fontSize: 20, color: "#EF9F27" }} />
        <h2 style={{ margin: 0, fontSize: 17, color: "#142131" }}>Notifications</h2>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#8a98a8" }}>
          Personnalise tes alertes auto
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {/* Card SON */}
        <div style={{
          padding: 14,
          background: prefs.sound ? "linear-gradient(135deg, rgba(124, 200, 200, .12), #fff)" : "#fff",
          border: `1.5px solid ${prefs.sound ? "rgba(124, 200, 200, .4)" : "#e3e9ee"}`,
          borderRadius: 12,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className={`ti ${prefs.sound ? "ti-volume" : "ti-volume-off"}`} style={{ fontSize: 22, color: prefs.sound ? "#1c5454" : "#8a98a8" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#142131" }}>Sons de notification</div>
              <div style={{ fontSize: 11, color: "#5a6878" }}>Joue un son lors d'événements importants</div>
            </div>
            <button onClick={() => toggle("sound")}
              style={{
                padding: "4px 12px",
                background: prefs.sound ? "linear-gradient(135deg, #5aa05a, #3d7a3d)" : "transparent",
                color: prefs.sound ? "#fff" : "#5a6878",
                border: prefs.sound ? "none" : "1px solid #cfd8e0",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 11,
                fontFamily: "inherit",
              }}>
              {prefs.sound ? "✓ Activé" : "Désactivé"}
            </button>
          </div>
          {prefs.sound && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 6, borderTop: "1px solid rgba(124, 200, 200, .25)" }}>
              {["info", "success", "warning", "error", "urgent"].map(t => (
                <button key={t} onClick={() => testSound(t)}
                  style={{
                    fontSize: 10, padding: "3px 8px",
                    background: "#fff", border: "1px dashed #cfd8e0",
                    borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                    color: "#5a6878", fontWeight: 700,
                  }}>
                  🎵 {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Card NATIVE */}
        <div style={{
          padding: 14,
          background: prefs.native ? "linear-gradient(135deg, rgba(24, 95, 165, .12), #fff)" : "#fff",
          border: `1.5px solid ${prefs.native ? "rgba(24, 95, 165, .4)" : "#e3e9ee"}`,
          borderRadius: 12,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className={`ti ${prefs.native ? "ti-bell" : "ti-bell-off"}`} style={{ fontSize: 22, color: prefs.native ? "#185FA5" : "#8a98a8" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#142131" }}>Notifications natives</div>
              <div style={{ fontSize: 11, color: "#5a6878" }}>Affiche des popups système (même app en arrière-plan)</div>
            </div>
            <button onClick={() => toggle("native")}
              style={{
                padding: "4px 12px",
                background: prefs.native ? "linear-gradient(135deg, #185FA5, #7CC8C8)" : "transparent",
                color: prefs.native ? "#fff" : "#5a6878",
                border: prefs.native ? "none" : "1px solid #cfd8e0",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 11,
                fontFamily: "inherit",
              }}>
              {prefs.native ? "✓ Activé" : "Désactivé"}
            </button>
          </div>
          <div style={{ paddingTop: 6, borderTop: "1px solid rgba(24, 95, 165, .25)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 10, color: "#5a6878" }}>
              <strong>Statut permission :</strong>{" "}
              {permission === "granted" ? (
                <span style={{ color: "#5aa05a", fontWeight: 700 }}>✓ Accordée</span>
              ) : permission === "denied" ? (
                <span style={{ color: "#e35d5b", fontWeight: 700 }}>✕ Refusée (voir paramètres navigateur)</span>
              ) : (
                <span style={{ color: "#EF9F27", fontWeight: 700 }}>⏸ Non demandée</span>
              )}
            </div>
            {prefs.native && permission === "granted" && (
              <button onClick={testNative}
                style={{
                  marginLeft: "auto",
                  fontSize: 10, padding: "3px 8px",
                  background: "#fff", border: "1px dashed #cfd8e0",
                  borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                  color: "#185FA5", fontWeight: 700,
                }}>
                🔔 Tester
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, padding: 10, background: "#fafbfc", borderRadius: 8, fontSize: 11, color: "#5a6878" }}>
        <i className="ti ti-info-circle" style={{ color: "#185FA5", marginRight: 4 }} />
        Les notifications auto se déclenchent sur : <b>DI urgentes</b>, <b>workflow d'approbation</b>, <b>signalements critiques</b>. Historique consultable dans <a href="/audit/notifs" style={{ color: "#185FA5", fontWeight: 700 }}>Audit → Notifications</a>.
      </div>
    </Panel>
  );
}

// =============================================================
// 0.65.11 : MesAffectationsPanel - infos complètes user
// =============================================================
function MesAffectationsPanel({ auth, supabase }) {
  const [etablissements, setEtablissements] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth?.user?.id || !auth?.structureId) { setLoading(false); return; }
    (async () => {
      try {
        const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
        const [etabs, batLinks, svcLinks, eqMembres] = await Promise.all([
          tryFetch(supabase.from("membres_etablissements")
            .select("etablissement_id, role, batiment_id, service_id, etablissements(id, nom, ville, type, code_postal)")
            .eq("user_id", auth.user.id)),
          tryFetch(supabase.from("batiments")
            .select("id, nom, etablissement_id")
            .eq("structure_id", auth.structureId)),
          tryFetch(supabase.from("services")
            .select("id, nom, batiment_id, etage")
            .eq("structure_id", auth.structureId)),
          tryFetch(supabase.from("equipes_membres")
            .select("equipe_id, role, equipes(id, nom, couleur, description)")
            .eq("user_id", auth.user.id)),
        ]);

        const etabsMap = {};
        etabs.forEach(e => {
          const etabId = e.etablissement_id;
          if (!etabsMap[etabId]) {
            etabsMap[etabId] = {
              ...e.etablissements,
              role: e.role,
              batiments: new Set(),
              services: new Set(),
            };
          }
          if (e.batiment_id) etabsMap[etabId].batiments.add(e.batiment_id);
          if (e.service_id) etabsMap[etabId].services.add(e.service_id);
        });
        setEtablissements(Object.values(etabsMap));

        // Bâtiments rattachés (résolus)
        const myBatIds = new Set();
        const mySvcIds = new Set();
        etabs.forEach(e => {
          if (e.batiment_id) myBatIds.add(e.batiment_id);
          if (e.service_id) mySvcIds.add(e.service_id);
        });
        setBatiments(batLinks.filter(b => myBatIds.has(b.id)));
        setServices(svcLinks.filter(s => mySvcIds.has(s.id)));
        setEquipes(eqMembres.map(em => ({ ...em.equipes, roleDansEquipe: em.role })));
      } catch (e) {
        console.error("MesAffectations error", e);
      }
      setLoading(false);
    })();
  }, [auth?.user?.id, auth?.structureId]);

  if (loading) return null;

  const droits = auth?.role?.droits || auth?.role?.permissions_json || {};
  const droitsList = Object.entries(droits).filter(([_, v]) => v === true || v === "true");

  return (
    <Panel style={{ marginBottom: 18, borderLeft: "4px solid #185FA5" }}>
      <h2 style={{ margin: "0 0 14px", fontSize: 17, color: "#142131" }}>
        <i className="ti ti-id-badge" style={{ color: "#185FA5", marginRight: 6 }} /> Mes affectations & droits
      </h2>

      {/* Rôle principal */}
      {auth?.role && (
        <div style={{
          padding: "12px 14px",
          background: `linear-gradient(135deg, ${auth.role.couleur || "#185FA5"}15, ${auth.role.couleur || "#185FA5"}05)`,
          borderRadius: 12,
          border: `1.5px solid ${auth.role.couleur || "#185FA5"}40`,
          marginBottom: 14,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <i className={`ti ${auth.role.icone || "ti-user"}`} style={{ fontSize: 32, color: auth.role.couleur || "#185FA5" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Rôle</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#142131" }}>{auth.role.nom}</div>
            {auth.role.systeme && <span style={{ fontSize: 10, padding: "2px 8px", background: "#185FA5", color: "#fff", borderRadius: 6, fontWeight: 700, marginLeft: 4 }}>SYSTÈME</span>}
          </div>
          {droitsList.length > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Permissions</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: auth.role.couleur || "#185FA5", fontFamily: "Consolas, monospace" }}>{droitsList.length}</div>
            </div>
          )}
        </div>
      )}

      {/* Structure */}
      {auth?.structureNom && (
        <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(124,200,200,.06)", borderRadius: 10, borderLeft: "3px solid #7CC8C8" }}>
          <div style={{ fontSize: 10, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>
            <i className="ti ti-building-store" /> Collectivité / Structure
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#142131", marginTop: 2 }}>{auth.structureNom}</div>
        </div>
      )}

      {/* Établissements rattachés */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 8 }}>
          <i className="ti ti-building-hospital" /> Établissements rattachés ({etablissements.length})
        </div>
        {etablissements.length === 0 ? (
          <div style={{ padding: 12, background: "#fafbfc", borderRadius: 8, fontSize: 12, color: "#8a98a8", fontStyle: "italic" }}>
            Aucun établissement rattaché. Demande à un admin de t'affecter.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {etablissements.map(e => (
              <div key={e.id} style={{
                padding: 12,
                background: "#fff",
                border: "1.5px solid #e3e9ee",
                borderRadius: 10,
                boxShadow: "0 2px 6px rgba(20,33,49,.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <i className="ti ti-building-hospital" style={{ fontSize: 18, color: "#185FA5" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#142131", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nom}</div>
                    <div style={{ fontSize: 11, color: "#5a6878" }}>{e.type || "Établissement"} · {e.ville}</div>
                  </div>
                </div>
                {e.role && (
                  <div style={{ fontSize: 10, color: "#7CC8C8", padding: "2px 8px", background: "rgba(124,200,200,.1)", borderRadius: 6, display: "inline-block", fontWeight: 700, marginRight: 4 }}>
                    Rôle : {e.role}
                  </div>
                )}
                <div style={{ marginTop: 6, fontSize: 11, color: "#5a6878" }}>
                  {e.batiments.size > 0 && <><i className="ti ti-building" /> {e.batiments.size} bâtiment{e.batiments.size > 1 ? "s" : ""} </>}
                  {e.services.size > 0 && <><i className="ti ti-stethoscope" /> {e.services.size} service{e.services.size > 1 ? "s" : ""}</>}
                  {e.batiments.size === 0 && e.services.size === 0 && <span style={{ fontStyle: "italic" }}>Accès complet</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bâtiments rattachés */}
      {batiments.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 8 }}>
            <i className="ti ti-building" /> Bâtiments rattachés ({batiments.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {batiments.map(b => (
              <span key={b.id} style={{ padding: "4px 10px", background: "rgba(24,95,165,.08)", color: "#185FA5", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid rgba(24,95,165,.2)" }}>
                <i className="ti ti-building" /> {b.nom}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Services rattachés */}
      {services.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 8 }}>
            <i className="ti ti-stethoscope" /> Services rattachés ({services.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {services.map(s => (
              <span key={s.id} style={{ padding: "4px 10px", background: "rgba(122,111,176,.08)", color: "#7a6fb0", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid rgba(122,111,176,.2)" }}>
                <i className="ti ti-stethoscope" /> {s.nom} {s.etage != null && <span style={{ fontSize: 10, opacity: 0.7 }}>(étage {s.etage})</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Équipes */}
      {equipes.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 8 }}>
            <i className="ti ti-users" /> Équipes ({equipes.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {equipes.map(eq => (
              <span key={eq.id} style={{ padding: "4px 10px", background: (eq.couleur || "#5aa05a") + "15", color: eq.couleur || "#5aa05a", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${(eq.couleur || "#5aa05a")}40` }}>
                <i className="ti ti-users-group" /> {eq.nom}
                {eq.roleDansEquipe && <span style={{ fontSize: 10, opacity: 0.8, marginLeft: 4 }}>· {eq.roleDansEquipe}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Droits/Permissions détaillés */}
      {droitsList.length > 0 && (
        <CollapsibleSection title={`Mes droits détaillés (${droitsList.length})`} icon="ti-key" defaultOpen={false}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 4, marginTop: 6 }}>
            {droitsList.map(([key]) => (
              <div key={key} style={{ padding: "4px 8px", background: "#fafbfc", borderRadius: 6, fontSize: 11, color: "#142131", display: "flex", alignItems: "center", gap: 4 }}>
                <i className="ti ti-check" style={{ color: "#5aa05a" }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{key.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Email + ID user */}
      <div style={{ marginTop: 14, padding: 10, background: "#fafbfc", borderRadius: 8, fontSize: 11, color: "#5a6878" }}>
        <div><i className="ti ti-mail" /> <b>Email :</b> {auth?.user?.email}</div>
        <div style={{ marginTop: 3 }}><i className="ti ti-id" /> <b>User ID :</b> <code style={{ fontFamily: "Consolas, monospace", fontSize: 10 }}>{auth?.user?.id}</code></div>
        {auth?.user?.created_at && <div style={{ marginTop: 3 }}><i className="ti ti-calendar" /> <b>Inscrit le :</b> {new Date(auth.user.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>}
      </div>
    </Panel>
  );
}
