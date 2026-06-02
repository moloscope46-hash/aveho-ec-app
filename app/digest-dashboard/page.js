"use client";
// =============================================================
//  /digest-dashboard — Tableau de bord des digests notifications
//  Alpha 0.52.0 (BF)
//
//  Visualise les envois de digests sur 30 jours glissants :
//   - Total envoyés (par type)
//   - Taux de succès
//   - Destinataires uniques
//   - Erreurs récentes
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useCart } from "../useCart";
import TopBar from "../TopBar";
import { PageHead, Panel, StateMsg} from "../ui";
import { logger } from "../../lib/logger";

export default function DigestDashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [stats, setStats] = useState([]);
  const [destinatairesUniques, setDestinatairesUniques] = useState([]);
  const [erreursRecentes, setErreursRecentes] = useState([]);
  const [loading, setLoading] = useState(true);

  const peutVoir = auth?.role?.nom === "Administrateur" || auth?.can?.("gerer_roles");

  useEffect(() => {
    if (!auth.ready) return;
    if (!peutVoir || !auth.structureId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [{ data: st }, { data: du }, { data: err }] = await Promise.all([
          supabase.from("v_digest_stats")
            .select("*")
            .eq("structure_id", auth.structureId),
          supabase.from("v_digest_destinataires_uniques")
            .select("*")
            .eq("structure_id", auth.structureId),
          supabase.from("notification_digest_log")
            .select("envoyee_le, user_id, type_digest, erreur")
            .eq("structure_id", auth.structureId)
            .eq("succes", false)
            .order("envoyee_le", { ascending: false })
            .limit(10),
        ]);
        setStats(st || []);
        setDestinatairesUniques(du || []);
        setErreursRecentes(err || []);
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[DigestDashboard] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.ready, auth.structureId, peutVoir]);

  if (!peutVoir && auth.ready) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg><i className="ti ti-lock" /> Accès réservé aux administrateurs.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  function fmt(d) {
    if (!d) return "—";
    return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  // Trouve destinataires uniques pour un type donné
  function destinatairesFor(type) {
    return destinatairesUniques.find(d => d.type_digest === type)?.nb_destinataires_uniques || 0;
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMINISTRATION"
          icon="ti-mail-bolt"
          title="Digests"
          accent="dashboard"
          sub="Envois de notifications digest sur 30 derniers jours"
        />

        {loading ? (
          <Panel><StateMsg>Chargement…</StateMsg></Panel>
        ) : stats.length === 0 ? (
          <Panel>
            <StateMsg>
              <i className="ti ti-mailbox" /> Aucun digest envoyé sur les 30 derniers jours.
            </StateMsg>
            <p style={{ fontSize: 12.5, color: "#6c7a89", marginTop: 10, marginBottom: 0, textAlign: "center" }}>
              Les digests sont envoyés automatiquement par les cron jobs (quotidiens, hebdomadaires).
            </p>
          </Panel>
        ) : (
          <>
            {/* Stats par type */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 16 }}>
              {stats.map((s) => {
                const isHebdo = s.type_digest === "hebdo";
                const color = isHebdo ? "#7a6fb0" : "#185FA5";
                return (
                  <Panel key={s.type_digest} style={{ borderLeft: `4px solid ${color}` }}>
                    <h3 style={{ margin: "0 0 10px", fontSize: 16, color: "#142131", display: "flex", alignItems: "center", gap: 8 }}>
                      <i className={`ti ${isHebdo ? "ti-calendar-week" : "ti-calendar"}`} style={{ color }} />
                      Digest {isHebdo ? "hebdomadaire" : "quotidien"}
                    </h3>
                    <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#6c7a89", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".4px" }}>Envoyés</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#142131" }}>{s.nb_envoyes}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#6c7a89", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".4px" }}>Erreurs</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: s.nb_erreurs > 0 ? "#c0392b" : "#5aa05a" }}>{s.nb_erreurs}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f4f7fa", display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                      <span style={{ color: "#6c7a89" }}>Taux de succès</span>
                      <b style={{ color: s.taux_succes_pct >= 95 ? "#5aa05a" : s.taux_succes_pct >= 80 ? "#EF9F27" : "#c0392b" }}>
                        {s.taux_succes_pct}%
                      </b>
                    </div>
                    <div style={{ marginTop: 6, paddingTop: 0, display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                      <span style={{ color: "#6c7a89" }}>Destinataires uniques</span>
                      <b>{destinatairesFor(s.type_digest)}</b>
                    </div>
                    <div style={{ marginTop: 10, padding: "8px 10px", background: "#f4f7fa", borderRadius: 6, fontSize: 11, color: "#6c7a89" }}>
                      <i className="ti ti-clock" /> Du {fmt(s.premier_envoi)} au {fmt(s.dernier_envoi)}
                    </div>
                  </Panel>
                );
              })}
            </div>

            {/* Erreurs récentes */}
            {erreursRecentes.length > 0 && (
              <Panel style={{ background: "#fef0ee", borderColor: "#f0c4be", borderLeft: "4px solid #c0392b" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#7a1f15" }}>
                  <i className="ti ti-alert-circle" style={{ color: "#c0392b", marginRight: 6 }} />
                  Erreurs récentes ({erreursRecentes.length} dernières)
                </h3>
                <div className="panel-table"><table style={{ fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 150 }}>Date</th>
                      <th style={{ width: 120 }}>Type</th>
                      <th>Erreur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {erreursRecentes.map((e, i) => (
                      <tr key={i}>
                        <td style={{ color: "#6c7a89", fontSize: 11.5 }}>{fmt(e.envoyee_le)}</td>
                        <td>{e.type_digest}</td>
                        <td style={{ color: "#7a1f15", fontSize: 11.5 }}>{e.erreur || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
