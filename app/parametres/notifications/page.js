"use client";
// =============================================================
//  /parametres/notifications — Préférences notifs push (0.62.62)
//  Opt-in granulaire : type × établissement + heures silencieuses + niveau min
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import BackButton from "../../components/BackButton";

const TYPES_NOTIF = [
  { v: "di_urgente",     l: "DI urgentes",            ic: "ti-alert-triangle-filled", c: "#e35d5b", desc: "DI prioritaires" },
  { v: "di_assignee",    l: "DI assignées",           ic: "ti-tools",                 c: "#185FA5", desc: "DI attribuées" },
  { v: "livraison",      l: "Livraisons planifiées",  ic: "ti-truck-delivery",        c: "#EF9F27", desc: "Tournée + livraisons" },
  { v: "sav",            l: "SAV nouveau / suivi",    ic: "ti-bug",                   c: "#c0392b", desc: "Bilans + devis" },
  { v: "commande",       l: "Commandes EC",           ic: "ti-shopping-cart",         c: "#5aa05a", desc: "Validations + statut" },
  { v: "signalement",    l: "Signalements",           ic: "ti-flag",                  c: "#7a6fb0", desc: "Signalements à traiter" },
  { v: "annonce",        l: "Annonces internes",      ic: "ti-megaphone",             c: "#5e4a8c", desc: "Annonces structure" },
  { v: "tournee",        l: "Tournée chauffeur",      ic: "ti-route",                 c: "#185FA5", desc: "Étapes + signatures" },
  { v: "rgpd",           l: "Conformité RGPD",        ic: "ti-shield-lock",           c: "#7CC8C8", desc: "Consentements à renouveler" },
  { v: "marketplace",    l: "Marketplace pièces",     ic: "ti-tool",                  c: "#EF9F27", desc: "Annonces urgentes" },
];

const NIVEAUX = [
  { v: "info", l: "Info+", c: "#185FA5" },
  { v: "warning", l: "Warn+", c: "#EF9F27" },
  { v: "critique", l: "Crit", c: "#e35d5b" },
];

export default function NotifPrefsPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [etabs, setEtabs] = useState([]);
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeEtab, setActiveEtab] = useState(null);
  const [silDebut, setSilDebut] = useState("");
  const [silFin, setSilFin] = useState("");
  const [pushActif, setPushActif] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.user?.id) return;
    reload();
    if (typeof Notification !== "undefined") {
      setPushActif(Notification.permission === "granted");
    }
  }, [auth.ready, auth.user?.id]);

  async function reload() {
    setLoading(true);
    try {
      const e = await supabase.from("etablissements")
        .select("id, nom").eq("structure_id", auth.structureId).order("nom");
      setEtabs(e.data || []);
      const r = await supabase.from("notifications_preferences")
        .select("*").eq("user_id", auth.user.id);
      if (r.error?.code === "42P01") setTableMissing(true);
      setPrefs(r.data || []);
      const first = (r.data || []).find(p => p.heures_silencieuses_debut);
      if (first) {
        setSilDebut(first.heures_silencieuses_debut || "");
        setSilFin(first.heures_silencieuses_fin || "");
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function activatePush() {
    if (typeof Notification === "undefined") { alert("Notifications non supportées par ce navigateur"); return; }
    const r = await Notification.requestPermission();
    setPushActif(r === "granted");
    if (r === "granted") new Notification("Aveho", { body: "Notifications activées ✓" });
  }

  function isEnabled(typeNotif) {
    const pref = prefs.find(p => p.type_notif === typeNotif && p.etablissement_id === activeEtab && p.canal === "push");
    return pref ? pref.enabled : true;
  }
  function getNiveauMin(typeNotif) {
    const pref = prefs.find(p => p.type_notif === typeNotif && p.etablissement_id === activeEtab && p.canal === "push");
    return pref?.niveau_min || "info";
  }

  async function upsert(typeNotif, patch) {
    const existing = prefs.find(p => p.type_notif === typeNotif && p.etablissement_id === activeEtab && p.canal === "push");
    if (existing) {
      await supabase.from("notifications_preferences").update(patch).eq("id", existing.id);
    } else {
      await supabase.from("notifications_preferences").insert({
        user_id: auth.user.id, structure_id: auth.structureId,
        etablissement_id: activeEtab, type_notif: typeNotif, canal: "push", enabled: true, ...patch,
      });
    }
  }

  async function toggle(t) { setSaving(true); try { await upsert(t, { enabled: !isEnabled(t) }); await reload(); } catch (e) { alert(e.message); } setSaving(false); }
  async function setNiveau(t, n) { setSaving(true); try { await upsert(t, { niveau_min: n }); await reload(); } catch (e) { alert(e.message); } setSaving(false); }

  async function toggleAll(enabled) {
    if (!confirm(`${enabled ? "Activer" : "Désactiver"} TOUTES les notifications ${activeEtab ? "pour cet établissement" : "globalement"} ?`)) return;
    setSaving(true);
    try {
      for (const t of TYPES_NOTIF) await upsert(t.v, { enabled });
      await reload();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function saveSilencieuses() {
    setSaving(true);
    try {
      for (const t of TYPES_NOTIF) await upsert(t.v, {
        heures_silencieuses_debut: silDebut || null,
        heures_silencieuses_fin: silFin || null,
      });
      await reload();
      alert("Heures silencieuses enregistrées ✓");
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  const stats = useMemo(() => {
    const filtered = prefs.filter(p => p.etablissement_id === activeEtab && p.canal === "push");
    const inactive = filtered.filter(p => !p.enabled).length;
    return { active: TYPES_NOTIF.length - inactive, inactive, total: TYPES_NOTIF.length };
  }, [prefs, activeEtab]);

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 1000 }}>
        <BackButton />
        <PageHead icon="ti-bell" title="Notifications push" subtitle="Opt-in granulaire par type et par établissement" color="#7a6fb0" />

        {tableMissing && (
          <Panel style={{ borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13 }}>
              ⚠ Applique <code>migration-0.62.62-notifications-preferences.sql</code>
            </div>
          </Panel>
        )}

        {/* Permission browser */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: pushActif ? "linear-gradient(135deg, #5aa05a, #4a8a4a)" : "rgba(138,152,168,.15)",
                color: pushActif ? "#fff" : "#8a98a8",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                boxShadow: pushActif ? "0 4px 12px rgba(94,160,90,.3)" : "none",
              }}>
                <i className={`ti ${pushActif ? "ti-bell-ringing" : "ti-bell-off"}`} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>
                  Permission navigateur
                </div>
                <div style={{ fontSize: 12, color: pushActif ? "#5aa05a" : "#e35d5b", fontWeight: 600 }}>
                  {pushActif ? "✓ Notifications autorisées" : "✗ Notifications bloquées"}
                </div>
              </div>
            </div>
            {!pushActif && <Btn variant="primary" onClick={activatePush}><i className="ti ti-bell-plus" /> Autoriser les notifications</Btn>}
          </div>
        </Panel>

        {/* Sélecteur étab */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            <i className="ti ti-building-hospital" /> Établissement ciblé
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => setActiveEtab(null)} style={pillStyle(activeEtab === null, "#7a6fb0")}>
              <i className="ti ti-world" /> Tous les établissements (général)
            </button>
            {etabs.map(e => (
              <button key={e.id} onClick={() => setActiveEtab(e.id)} style={pillStyle(activeEtab === e.id, "#185FA5")}>
                <i className="ti ti-building" /> {e.nom}
              </button>
            ))}
          </div>
        </Panel>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 12 }}>
          <KpiSmall label="Notifs actives" value={stats.active} color="#5aa05a" icon="ti-bell-ringing" />
          <KpiSmall label="Notifs muettes" value={stats.inactive} color="#8a98a8" icon="ti-bell-off" />
          <KpiSmall label="Types dispo" value={stats.total} color="#7a6fb0" icon="ti-category" />
        </div>

        {/* Actions globales */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={() => toggleAll(true)} disabled={saving} style={actionStyle("#5aa05a")}>
            <i className="ti ti-bell-ringing" /> Tout activer
          </button>
          <button onClick={() => toggleAll(false)} disabled={saving} style={actionStyle("#8a98a8")}>
            <i className="ti ti-bell-off" /> Tout désactiver
          </button>
        </div>

        {/* Grille types */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12, marginTop: 12 }}>
          {TYPES_NOTIF.map(t => {
            const enabled = isEnabled(t.v);
            const niveauMin = getNiveauMin(t.v);
            return (
              <div key={t.v} style={{
                background: "#fff",
                border: `1px solid ${enabled ? `${t.c}30` : "#e3e9ee"}`,
                borderLeft: `4px solid ${enabled ? t.c : "#c0d0d8"}`,
                borderRadius: 12, padding: 14,
                opacity: enabled ? 1 : 0.7,
                transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: enabled ? `0 4px 12px ${t.c}15` : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: enabled ? `linear-gradient(135deg, ${t.c}, ${t.c}cc)` : "#f4f7fa",
                      color: enabled ? "#fff" : "#8a98a8",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                      boxShadow: enabled ? `0 4px 10px ${t.c}40` : "none",
                      transition: "all 250ms", flexShrink: 0,
                    }}>
                      <i className={`ti ${t.ic}`} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>{t.l}</div>
                      <div style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 2 }}>{t.desc}</div>
                    </div>
                  </div>
                  <Toggle checked={enabled} onChange={() => toggle(t.v)} color={t.c} disabled={saving} />
                </div>
                {enabled && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f4f7fa" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
                      Niveau minimum
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {NIVEAUX.map(n => (
                        <button key={n.v} onClick={() => setNiveau(t.v, n.v)} disabled={saving} style={{
                          flex: 1, padding: "5px 8px",
                          background: niveauMin === n.v ? n.c : "#fafbfc",
                          color: niveauMin === n.v ? "#fff" : "#5a6878",
                          border: `1px solid ${niveauMin === n.v ? n.c : "#e3e9ee"}`,
                          borderRadius: 6, fontFamily: "inherit", fontSize: 11, fontWeight: 600,
                          cursor: "pointer", transition: "all 150ms",
                        }}>
                          {n.l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Heures silencieuses */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            <i className="ti ti-moon" /> Heures silencieuses (ne pas déranger)
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#8a98a8" }}>De</span>
              <input type="time" value={silDebut} onChange={(e) => setSilDebut(e.target.value)}
                style={{ padding: "8px 10px", border: "1px solid #e3e9ee", borderRadius: 8, fontSize: 14, fontFamily: "inherit" }} />
            </label>
            <span style={{ marginTop: 14, color: "#8a98a8" }}>→</span>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#8a98a8" }}>Jusqu'à</span>
              <input type="time" value={silFin} onChange={(e) => setSilFin(e.target.value)}
                style={{ padding: "8px 10px", border: "1px solid #e3e9ee", borderRadius: 8, fontSize: 14, fontFamily: "inherit" }} />
            </label>
            <Btn variant="primary" onClick={saveSilencieuses} disabled={saving}>
              <i className="ti ti-check" /> Enregistrer
            </Btn>
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: "#8a98a8" }}>
            💡 Exemple : 22:00 → 07:00 = aucune notif push entre 22h et 7h (sauf si critique)
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, color = "#7CC8C8", disabled }) {
  return (
    <button onClick={onChange} disabled={disabled} style={{
      width: 48, height: 26, borderRadius: 13,
      background: checked ? color : "#c0d0d8",
      border: "none", position: "relative", cursor: disabled ? "not-allowed" : "pointer",
      transition: "background 200ms",
      boxShadow: checked ? `0 2px 8px ${color}50` : "inset 0 1px 3px rgba(0,0,0,.1)",
      opacity: disabled ? .6 : 1, flexShrink: 0,
    }}>
      <span style={{
        position: "absolute", top: 2, left: checked ? 24 : 2,
        width: 22, height: 22, borderRadius: "50%", background: "#fff",
        transition: "left 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: "0 1px 4px rgba(0,0,0,.2)",
      }} />
    </button>
  );
}

function KpiSmall({ label, value, color, icon }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`,
      borderRadius: 12, padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: `${color}15`, color,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
      }}>
        <i className={`ti ${icon}`} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#8a98a8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function pillStyle(active, color) {
  return {
    padding: "8px 14px",
    background: active ? `linear-gradient(135deg, ${color}, ${color}cc)` : "#fafbfc",
    color: active ? "#fff" : "#5a6878",
    border: `1px solid ${active ? color : "#e3e9ee"}`,
    borderRadius: 10, fontFamily: "Quicksand, sans-serif", fontSize: 12.5, fontWeight: 600,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
    boxShadow: active ? `0 4px 12px ${color}30` : "none", transition: "all 200ms",
  };
}

function actionStyle(color) {
  return {
    padding: "7px 14px", background: "#fff", color,
    border: `1px solid ${color}40`, borderRadius: 8,
    fontFamily: "Quicksand, sans-serif", fontSize: 12.5, fontWeight: 600,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
    transition: "all 150ms",
  };
}
