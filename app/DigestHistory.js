"use client";
// =============================================================
//  DigestHistory — Historique des envois digest email
//  Alpha 0.42.0
//
//  Affiche les 10 derniers envois de l'utilisateur (table notification_digest_log).
//  Date, type (quotidien/hebdo), succès/erreur, compteurs résumés.
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import { fmtDate } from "../lib/format";

export default function DigestHistory({ auth }) {
  const supabase = createClient();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth?.user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("notification_digest_log")
        .select("id, envoyee_le, type_digest, contenu_resume, succes, erreur")
        .eq("user_id", auth.user.id)
        .order("envoyee_le", { ascending: false })
        .limit(10);
      setLogs(data || []);
      setLoading(false);
    })();
  }, [auth?.user?.id]);

  if (loading) {
    return <p style={{ color: "#8a98a8", fontSize: 13 }}>Chargement…</p>;
  }

  if (logs.length === 0) {
    return (
      <p style={{ color: "#8a98a8", fontSize: 13, fontStyle: "italic" }}>
        <i className="ti ti-mail-off" /> Aucun envoi de digest pour le moment. Active le mode quotidien ou hebdo ci-dessus, ou clique sur "Envoyer un test maintenant" pour vérifier le format.
      </p>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: "#6c7a89", margin: "0 0 10px" }}>
        Les 10 derniers envois automatiques.
      </p>
      <div style={{ borderRadius: 8, border: "1px solid #e3e9ee", overflow: "hidden" }}>
        <table style={{ fontSize: 12.5, margin: 0 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Contenu</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const r = l.contenu_resume || {};
              const total = (r.di_actives || 0) + (r.achats_a_valider || 0) + (r.signalements_nouveaux || 0) + (r.renouvellements_30j || 0);
              return (
                <tr key={l.id}>
                  <td style={{ fontSize: 11.5, color: "#6c7a89", whiteSpace: "nowrap" }}>
                    {fmtDate(l.envoyee_le)}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                      background: l.type_digest === "hebdo" ? "#e8e0f0" : "#fcefda",
                      color: l.type_digest === "hebdo" ? "#5e4a8c" : "#7a4f15",
                      textTransform: "uppercase", letterSpacing: ".4px",
                    }}>
                      {l.type_digest === "hebdo" ? "Hebdo" : "Quotidien"}
                    </span>
                  </td>
                  <td style={{ fontSize: 11.5, color: "#142131" }}>
                    {total === 0 ? (
                      <span style={{ color: "#8a98a8", fontStyle: "italic" }}>Vide</span>
                    ) : (
                      <span>
                        {r.di_actives > 0 && <span style={{ marginRight: 8 }}><b>{r.di_actives}</b> DI</span>}
                        {r.achats_a_valider > 0 && <span style={{ marginRight: 8 }}><b>{r.achats_a_valider}</b> achats</span>}
                        {r.signalements_nouveaux > 0 && <span style={{ marginRight: 8 }}><b>{r.signalements_nouveaux}</b> signal.</span>}
                        {r.renouvellements_30j > 0 && <span style={{ marginRight: 8 }}><b>{r.renouvellements_30j}</b> RGPD</span>}
                      </span>
                    )}
                  </td>
                  <td>
                    {l.succes ? (
                      <span style={{ color: "#5aa05a", fontSize: 11.5, fontWeight: 600 }}>
                        <i className="ti ti-check" /> Envoyé
                      </span>
                    ) : (
                      <span style={{ color: "#c0392b", fontSize: 11.5, fontWeight: 600 }} title={l.erreur}>
                        <i className="ti ti-x" /> Erreur
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
