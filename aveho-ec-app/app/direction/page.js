"use client";
// =============================================================
//  /direction — Dashboard direction multi-structures
//  Alpha 0.47.0
//
//  Affiche les KPIs consolidés de toutes les structures auxquelles
//  l'utilisateur appartient, plus un détail par structure.
//
//  Utile pour les admins / direction qui gèrent plusieurs sites.
//  Pour les users sur une seule structure, équivalent à /statistiques.
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";

export default function DirectionPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [totaux, setTotaux] = useState(null);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  const peutVoir = auth.role?.nom === "Administrateur" || auth.can?.("gerer_roles") || auth.can?.("manage_collectivite");

  async function load() {
    if (!auth.user?.id || !peutVoir) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Totaux cross-structures de l'user
      const { data: t } = await supabase
        .from("v_direction_totaux")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      setTotaux(t);

      // Détail par structure (RLS filtre déjà aux structures du user)
      const { data: s } = await supabase
        .from("v_direction_par_structure")
        .select("*")
        .order("nb_di_ce_mois", { ascending: false });
      setStructures(s || []);
    } catch (e) {
      console.warn("Direction load:", e?.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (auth.ready) load();
  }, [auth.ready, auth.user?.id, peutVoir]);

  if (!peutVoir) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg><i className="ti ti-shield-x" /> Réservé aux administrateurs.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMINISTRATION"
          icon="ti-building-skyscraper"
          title="Dashboard"
          accent="Direction"
          sub={totaux?.nb_structures > 1
            ? `Vue consolidée sur ${totaux.nb_structures} structures`
            : "Vue d'ensemble de votre structure"}
        />

        {loading ? (
          <Panel><StateMsg>Chargement…</StateMsg></Panel>
        ) : !totaux ? (
          <Panel><StateMsg>Aucune donnée. Vérifie que le patch SQL 0.47 a été appliqué.</StateMsg></Panel>
        ) : (
          <>
            {/* Totaux consolidés */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
              <KpiBig label="Structures" value={totaux.nb_structures} icon="ti-building" color="#185FA5" />
              <KpiBig label="Patients" value={totaux.nb_patients} icon="ti-user" color="#7a6fb0" />
              <KpiBig label="Matériels" value={totaux.nb_materiels} icon="ti-armchair-2" color="#5a8f8f" />
              <KpiBig 
                label="DI ouvertes" 
                value={totaux.nb_di_ouvertes} 
                icon="ti-tools" 
                color={totaux.nb_di_urgent > 0 ? "#c0392b" : "#EF9F27"}
                detail={totaux.nb_di_urgent > 0 ? `${totaux.nb_di_urgent} urgentes` : null}
              />
              <KpiBig 
                label="Users actifs (30j)" 
                value={totaux.nb_users_actifs_30j} 
                icon="ti-users-group" 
                color="#5aa05a" 
              />
              <KpiBig 
                label="Maintenances retard" 
                value={totaux.nb_maint_retard} 
                icon="ti-clock-x" 
                color={totaux.nb_maint_retard > 0 ? "#c0392b" : "#5aa05a"}
              />
              <KpiBig 
                label="Signalements ouverts" 
                value={totaux.nb_signal_ouvert} 
                icon="ti-message-circle" 
                color="#7CC8C8"
              />
              <KpiBig 
                label="DI ce mois" 
                value={totaux.nb_di_ce_mois} 
                icon="ti-calendar-month" 
                color="#5aa05a"
              />
            </div>

            {/* Détail par structure */}
            {structures.length > 1 && (
              <Panel>
                <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-list-details" style={{ color: "#185FA5", marginRight: 6 }} />
                  Détail par structure ({structures.length})
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th>Structure</th>
                        <th style={{ textAlign: "right" }}>Patients</th>
                        <th style={{ textAlign: "right" }}>DI ce mois</th>
                        <th style={{ textAlign: "right" }}>DI ouvertes</th>
                        <th style={{ textAlign: "right" }}>Maint. retard</th>
                        <th style={{ textAlign: "right" }}>Signal. ouv.</th>
                        <th style={{ textAlign: "right" }}>% résolu</th>
                        <th style={{ textAlign: "right" }}>Dernière activité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {structures.map((s) => (
                        <tr key={s.structure_id}>
                          <td>
                            <b style={{ color: "#142131" }}>{s.structure_nom}</b>
                            {s.structure_type && <div style={{ fontSize: 11, color: "#8a98a8" }}>{s.structure_type}{s.structure_ville ? ` · ${s.structure_ville}` : ""}</div>}
                          </td>
                          <td style={{ textAlign: "right" }}>{s.nb_patients}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{s.nb_di_ce_mois}</td>
                          <td style={{ textAlign: "right" }}>
                            {s.nb_di_urgent > 0 ? (
                              <span style={{ color: "#c0392b", fontWeight: 600 }}>
                                {s.nb_di_ouvertes} <span style={{ fontSize: 10 }}>(⚠ {s.nb_di_urgent})</span>
                              </span>
                            ) : (
                              s.nb_di_ouvertes
                            )}
                          </td>
                          <td style={{ textAlign: "right", color: s.nb_maint_retard > 0 ? "#c0392b" : "#6c7a89", fontWeight: s.nb_maint_retard > 0 ? 600 : 400 }}>
                            {s.nb_maint_retard || "—"}
                          </td>
                          <td style={{ textAlign: "right" }}>{s.nb_signal_ouvert || "—"}</td>
                          <td style={{ textAlign: "right" }}>
                            <span style={{ 
                              fontSize: 12, fontWeight: 600,
                              color: s.pct_resolu >= 80 ? "#5aa05a" : s.pct_resolu >= 50 ? "#EF9F27" : "#c0392b"
                            }}>
                              {s.pct_resolu}%
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontSize: 11.5, color: "#6c7a89" }}>{fmtDate(s.derniere_activite)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: 11.5, color: "#8a98a8", margin: "10px 0 0" }}>
                  <i className="ti ti-info-circle" /> Trié par DI ce mois (activité décroissante). Clique sur une structure pour basculer dessus.
                </p>
              </Panel>
            )}

            {totaux.derniere_activite && (
              <Panel style={{ marginTop: 14, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#8a98a8" }}>
                  <i className="ti ti-activity" /> Dernière action sur l'ensemble : {fmtDate(totaux.derniere_activite)}
                </p>
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KpiBig({ label, value, icon, color, detail }) {
  return (
    <div style={{ 
      background: "#fff", border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
      borderRadius: 10, padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 18 }} aria-hidden="true" />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: value > 0 ? "#142131" : "#8a98a8", lineHeight: 1 }}>
        {value || 0}
      </div>
      {detail && (
        <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 600 }}>{detail}</div>
      )}
    </div>
  );
}
