"use client";
// Page Profil — Permet à l'utilisateur connecté de modifier son nom d'affichage,
// son mot de passe, et ses préférences personnelles (notifs reçues, etc.).
// Alpha 0.29.0 : dashboard "mes stats" + préférences notifications par user
// 0.58.6 : refonte UI avec PageHero + Tabs (4 onglets) + Avatar premium
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Btn, EntityIcon, CollapsibleSection } from "../ui";
import { PageHero, Tabs, Avatar, KpiCard } from "../components/ui-premium";
import { resetOnboarding } from "../OnboardingTour";
import NotifCategories from "../NotifCategories";
import { KpiRow } from "../kpis";
import { relativeTime} from "../../lib/format";
import NotificationPreferences from "../NotificationPreferences";
import DigestPreferences from "../DigestPreferences";
import DigestHistory from "../DigestHistory";
import PasswordInput from "../PasswordInput";
import BiometricSection from "../BiometricSection";

export default function Profil() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [nom, setNom] = useState("");
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
    loadStats();
    setLoading(false);
  }, [auth.ready]);

  async function loadStats() {
    if (!auth.user?.id || !auth.structureId) return;
    const userId = auth.user.id;
    // Stats parallèles via Promise.all
    // Alpha 0.32.0 : signalements perso disponibles via created_by opt-in
    const [diResp, achatsResp, transfertsResp, signResp, eventsResp] = await Promise.all([
      // DI créées par l'utilisateur
      supabase.from("interventions")
        .select("id, statut, urgence", { count: "exact" })
        .eq("structure_id", auth.structureId)
        .eq("created_by", userId),
      // Achats créés (demandeur)
      supabase.from("achats")
        .select("id, statut", { count: "exact" })
        .eq("structure_id", auth.structureId)
        .eq("demandeur_id", userId),
      // Transferts créés
      supabase.from("transferts")
        .select("id, statut", { count: "exact" })
        .eq("structure_id", auth.structureId)
        .eq("created_by", userId),
      // Alpha 0.32.0 : Signalements signés par l'utilisateur (opt-in created_by)
      // Reste anonyme pour les signalements créés AVANT la 0.32 ou sans coche
      supabase.from("signalements")
        .select("id, statut", { count: "exact" })
        .eq("structure_id", auth.structureId)
        .eq("created_by", userId),
      // Activité récente — table s'appelle audit_log (pas audit_events)
      supabase.from("audit_log")
        .select("action, entite, entite_id, details, created_at")
        .eq("structure_id", auth.structureId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15),
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
              tabs={[
                { id: "activite", label: "Activité",      icon: "ti-chart-bar" },
                { id: "profil",   label: "Profil",        icon: "ti-user" },
                { id: "notifs",   label: "Notifications", icon: "ti-bell-cog" },
                { id: "secu",     label: "Sécurité",      icon: "ti-shield-lock" },
              ]}
            />
          </div>
        )}

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel> : (
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
                <Btn variant="primary" icon="ti-device-floppy" onClick={saveNom}>Enregistrer</Btn>
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
                <Btn variant="primary" icon="ti-lock" onClick={savePwd} disabled={!pwd || !pwd2}>Modifier le mot de passe</Btn>
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
