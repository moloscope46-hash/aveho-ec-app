"use client";
// Page Audit Log — Vue chronologique lisible de l'activité de la collectivité.
// Filtre par utilisateur, par entité, par période. Timeline visuelle.
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { logger } from "../../lib/logger";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Btn } from "../ui";
// 0.57.10 : imports retirés (fmtDate non utilisés)

const COULEUR_ACTION = {
  creer: "#5aa05a", modifier: "#185FA5", supprimer: "#e35d5b",
  valider: "#7CC8C8", refuser: "#e35d5b", soumettre: "#EF9F27",
  alerte: "#EF9F27", commander: "#185FA5",
};
const ICON_ACTION = {
  creer: "ti-plus", modifier: "ti-edit", supprimer: "ti-trash",
  valider: "ti-check", refuser: "ti-x", soumettre: "ti-send",
  alerte: "ti-alert-triangle", commander: "ti-shopping-cart",
};
const COULEUR_ENTITE = {
  patient: "#185FA5", materiel: "#7CC8C8", intervention: "#e35d5b",
  maintenance: "#5a8f8f", signalement: "#7a6fb0", commande: "#EF9F27",
};

export default function AuditLogPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState({});  // {user_id: email/nom}
  const [loading, setLoading] = useState(true);
  const [fUser, setFUser] = useState("");
  const [fEntite, setFEntite] = useState("");
  const [fPeriode, setFPeriode] = useState("7"); // jours

  async function load() {
    if (!auth.structureId) { setLoading(false); return; }
    try {
      const sinceDate = new Date(Date.now() - parseInt(fPeriode) * 86400000).toISOString();
      // Alpha 0.15.1 : table audit_log (et non evenements)
      let q = supabase.from("audit_log")
        .select("*")
        .eq("structure_id", auth.structureId)
        .gte("created_at", sinceDate)
        .order("created_at", { ascending: false })
        .limit(500);
      if (fEntite) q = q.eq("entite", fEntite);
      if (fUser) q = q.eq("user_id", fUser);
      const { data } = await q;
      setRows(data || []);
      // Charger les noms d'utilisateurs depuis membres_structure
      // Alpha 0.15.1 : colonne nom_affiche (et non prenom/nom/email séparés)
      const { data: ms } = await supabase.from("membres_structure")
        .select("user_id, nom_affiche")
        .eq("structure_id", auth.structureId);
      const map = {};
      (ms || []).forEach((m) => {
        map[m.user_id] = m.nom_affiche || "Utilisateur";
      });
      setUsers(map);
    } catch (e) {
      // 0.56.22 : try/catch pour pas planter la page
      logger.error("[Journal] load failed:", e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.structureId, fEntite, fUser, fPeriode]);

  if (!auth.ready) return null;

  // Grouper par jour
  const parJour = {};
  rows.forEach((r) => {
    const j = r.created_at.slice(0, 10);
    if (!parJour[j]) parJour[j] = [];
    parJour[j].push(r);
  });

  // Liste des utilisateurs présents dans les events pour le filtre
  const usersInLog = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));

  function formatDateLong(dateStr) {
    const d = new Date(dateStr);
    const auj = new Date();
    auj.setHours(0, 0, 0, 0);
    const hier = new Date(auj.getTime() - 86400000);
    const dD = new Date(d); dD.setHours(0, 0, 0, 0);
    if (dD.getTime() === auj.getTime()) return "Aujourd'hui";
    if (dD.getTime() === hier.getTime()) return "Hier";
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function formatHeure(dateStr) {
    return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="TRAÇABILITÉ" icon="ti-history" title="Journal" accent="d'activité"
          sub="Timeline lisible des actions de la collectivité — filtre par utilisateur, entité et période" />

        {/* Filtres */}
        <Panel style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div className="fld">
              <label>Période</label>
              <select value={fPeriode} onChange={(e) => setFPeriode(e.target.value)}>
                <option value="1">Dernières 24h</option>
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
                <option value="90">3 derniers mois</option>
              </select>
            </div>
            <div className="fld">
              <label>Entité</label>
              <select value={fEntite} onChange={(e) => setFEntite(e.target.value)}>
                <option value="">Toutes</option>
                <option value="patient">Patients</option>
                <option value="materiel">Matériels</option>
                <option value="intervention">Demandes d'intervention</option>
                <option value="maintenance">Maintenances</option>
                <option value="signalement">Signalements</option>
                <option value="commande">Commandes</option>
              </select>
            </div>
            <div className="fld">
              <label>Utilisateur</label>
              <select value={fUser} onChange={(e) => setFUser(e.target.value)}>
                <option value="">Tous</option>
                {usersInLog.map((uid) => (
                  <option key={uid} value={uid}>{users[uid] || uid.slice(0, 8)}</option>
                ))}
              </select>
            </div>
            {(fEntite || fUser || fPeriode !== "7") && (
              <div className="fld" style={{ alignSelf: "end" }}>
                <Btn variant="ghost" icon="ti-x" onClick={() => { setFEntite(""); setFUser(""); setFPeriode("7"); }}>Effacer</Btn>
              </div>
            )}
          </div>
        </Panel>

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel>
          : rows.length === 0 ? <Panel><StateMsg>Aucune activité sur la période sélectionnée.</StateMsg></Panel>
          : (
            <div>
              {Object.keys(parJour).sort().reverse().map((jour) => (
                <div key={jour} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <h2 style={{ margin: 0, fontSize: 15, color: "#142131", textTransform: "capitalize" }}>{formatDateLong(jour)}</h2>
                    <span style={{ background: "#7CC8C822", color: "#2a5a5a", padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{parJour[jour].length} action(s)</span>
                    <div style={{ flex: 1, height: 1, background: "#e3e9ee" }} />
                  </div>
                  <div style={{ position: "relative", paddingLeft: 26 }}>
                    {/* Trait vertical timeline */}
                    <div style={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 2, background: "#e3e9ee" }} />
                    {parJour[jour].map((r) => {
                      const cAction = COULEUR_ACTION[r.action] || "#8a98a8";
                      const iAction = ICON_ACTION[r.action] || "ti-circle";
                      const cEntite = COULEUR_ENTITE[r.entite] || "#8a98a8";
                      // Fallback : nom_affiche dans map, sinon user_email snapshot dans audit_log
                      const userName = r.user_id 
                        ? (users[r.user_id] || r.user_email || "Utilisateur") 
                        : (r.user_email || "Système");
                      return (
                        <div key={r.id} style={{ position: "relative", paddingBottom: 12, paddingLeft: 18 }}>
                          {/* Point sur la timeline */}
                          <span style={{
                            position: "absolute", left: -15, top: 4,
                            width: 24, height: 24, borderRadius: "50%",
                            background: "#fff", border: `2px solid ${cAction}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: cAction, fontSize: 11,
                          }}>
                            <i className={`ti ${iAction}`} />
                          </span>
                          <div style={{ background: "#fff", padding: "8px 14px", borderRadius: 10, border: "1px solid #e3e9ee" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, color: "#142131", fontSize: 13 }}>{userName}</span>
                              <span style={{ color: "#6c7a89", fontSize: 12 }}>a</span>
                              <span style={{ color: cAction, fontWeight: 600, fontSize: 12 }}>{r.action}</span>
                              <span style={{ background: cEntite + "22", color: cEntite, padding: "1px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>{r.entite}</span>
                              {r.titre && <span style={{ color: "#2a3a48", fontSize: 12 }}>· {r.titre}</span>}
                              <span style={{ marginLeft: "auto", color: "#8a98a8", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{formatHeure(r.created_at)}</span>
                            </div>
                            {r.message && <p style={{ margin: "4px 0 0", color: "#6c7a89", fontSize: 12 }}>{r.message}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
