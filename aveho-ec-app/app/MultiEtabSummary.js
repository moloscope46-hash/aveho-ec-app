"use client";
// =============================================================
//  MultiEtabSummary — Vue compacte par établissement
//  Alpha 0.49.0
//
//  Affiché en tête de /accueil uniquement si l'user a > 1 étab.
//  Pour chaque établissement de l'user, montre :
//    - Nom + type
//    - Mini-KPIs : patients, DI ouvertes, ce mois
//    - Click → switch vers cet établissement
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";

export default function MultiEtabSummary({ auth, onSwitchEtab }) {
  const supabase = createClient();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth?.ready || !auth.etablissements || auth.etablissements.length < 2) {
      setLoading(false);
      return;
    }
    (async () => {
      const ids = auth.etablissements.map(e => e.id);
      const result = {};

      try {
        // Patients par étab
        for (const id of ids) {
          const [pat, di, diMois] = await Promise.all([
            supabase.from("patients").select("id", { count: "exact", head: true }).eq("etablissement_id", id),
            supabase.from("interventions").select("id", { count: "exact", head: true }).eq("etablissement_id", id).not("statut", "in", "(Cloturée,Annulée)"),
            supabase.from("interventions").select("id", { count: "exact", head: true }).eq("etablissement_id", id).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          ]);
          result[id] = {
            patients: pat.count || 0,
            diOuvertes: di.count || 0,
            diMois: diMois.count || 0,
          };
        }
        setStats(result);
      } catch (e) {
        console.warn("MultiEtabSummary:", e?.message);
      }
      setLoading(false);
    })();
  }, [auth?.ready, auth?.etablissements?.length]);

  if (!auth?.etablissements || auth.etablissements.length < 2) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #fff 0%, #f4f7fa 100%)",
      border: "1px solid #e3e9ee",
      borderRadius: 12,
      padding: "16px 18px",
      marginBottom: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#142131", textTransform: "uppercase", letterSpacing: ".5px" }}>
          <i className="ti ti-buildings" style={{ color: "#185FA5", marginRight: 6 }} aria-hidden="true" />
          Vue {auth.etablissements.length} établissements
        </h3>
        <span style={{ fontSize: 11.5, color: "#8a98a8" }}>
          Actuel : <b style={{ color: "#185FA5" }}>{auth.etabNom || "—"}</b>
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {auth.etablissements.map((etab) => {
          const isCurrent = etab.id === auth.etabId;
          const s = stats[etab.id] || {};
          return (
            <button
              key={etab.id}
              onClick={() => !isCurrent && onSwitchEtab?.(etab.id)}
              disabled={isCurrent}
              style={{
                background: isCurrent ? "#eef5fc" : "#fff",
                border: `2px solid ${isCurrent ? "#185FA5" : "#e3e9ee"}`,
                borderRadius: 10,
                padding: "10px 12px",
                cursor: isCurrent ? "default" : "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "all .15s",
                outline: "none",
              }}
              onMouseOver={(e) => { if (!isCurrent) e.currentTarget.style.borderColor = "#7CC8C8"; }}
              onMouseOut={(e) => { if (!isCurrent) e.currentTarget.style.borderColor = "#e3e9ee"; }}
              aria-label={isCurrent ? `Établissement courant : ${etab.nom}` : `Basculer vers ${etab.nom}`}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                <b style={{ fontSize: 13, color: "#142131" }}>{etab.nom}</b>
                {isCurrent && (
                  <span style={{ fontSize: 9.5, color: "#185FA5", background: "#dbe7f5", padding: "1px 6px", borderRadius: 8, fontWeight: 700, letterSpacing: ".4px" }}>
                    EN COURS
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#8a98a8", marginBottom: 8 }}>
                {etab.type || "Établissement"}{etab.ville ? ` · ${etab.ville}` : ""}
              </div>
              {loading ? (
                <div style={{ fontSize: 11, color: "#8a98a8" }}>Chargement…</div>
              ) : (
                <div style={{ display: "flex", gap: 12, fontSize: 11.5 }}>
                  <span title="Patients">
                    <i className="ti ti-user" style={{ color: "#7a6fb0", marginRight: 2 }} aria-hidden="true" />
                    <b>{s.patients ?? "—"}</b>
                  </span>
                  <span title="DI ouvertes">
                    <i className="ti ti-tools" style={{ color: "#e35d5b", marginRight: 2 }} aria-hidden="true" />
                    <b>{s.diOuvertes ?? "—"}</b>
                  </span>
                  <span title="DI ce mois">
                    <i className="ti ti-calendar-month" style={{ color: "#5aa05a", marginRight: 2 }} aria-hidden="true" />
                    <b>{s.diMois ?? "—"}</b>
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
