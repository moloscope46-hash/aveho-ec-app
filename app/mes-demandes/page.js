"use client";
// =============================================================
//  /mes-demandes — Suivi DI envoyées côté EC (0.59.7)
//  Affiche les DI émises par la structure avec leur statut
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn } from "../ui";
import BackButton from "../components/BackButton";

const STATUTS = {
  nouvelle:   { lbl: "Envoyée",       col: "#EF9F27", ic: "ti-send", description: "En attente de validation par le magasin" },
  en_attente: { lbl: "En attente",    col: "#EF9F27", ic: "ti-clock", description: "Le magasin n'a pas encore traité" },
  validee:    { lbl: "Validée",       col: "#5aa05a", ic: "ti-check", description: "Validée — livraison à venir" },
  refusee:    { lbl: "Refusée",       col: "#e35d5b", ic: "ti-x",     description: "Refusée par le magasin" },
  livree:     { lbl: "Livrée",        col: "#185FA5", ic: "ti-truck-delivery", description: "BL généré, livraison en cours" },
  cloturee:   { lbl: "Clôturée",      col: "#7a6fb0", ic: "ti-circle-check", description: "Réception confirmée" },
};

export default function MesDemandesPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState("");
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    try {
      const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
      const dis = await tryFetch(
        supabase.from("demandes_internes")
          .select("*")
          .eq("structure_id", auth.structureId)
          .order("created_at", { ascending: false })
          .limit(200)
      );
      setDemandes(dis);

      // Stats par statut
      const s = {};
      dis.forEach(d => {
        const st = d.statut || "nouvelle";
        s[st] = (s[st] || 0) + 1;
      });
      setStats(s);
    } finally { setLoading(false); }
  }

  const filtered = filterStatut ? demandes.filter(d => (d.statut || "nouvelle") === filterStatut) : demandes;

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />
        <PageHead icon="ti-truck-loading" title="Mes demandes (DI)" subtitle="Suivi en temps réel des demandes envoyées au magasin" />

        {/* Stats cliquables par statut */}
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 180px))", justifyContent: "start", gap: 8 }}>
            <StatTile lbl="Total" val={demandes.length} col="#5a6878" ic="ti-list"
              active={!filterStatut} onClick={() => setFilterStatut("")} />
            {Object.entries(STATUTS).map(([key, st]) => {
              const n = stats[key] || 0;
              if (n === 0) return null;
              return (
                <StatTile key={key} lbl={st.lbl} val={n} col={st.col} ic={st.ic}
                  active={filterStatut === key} onClick={() => setFilterStatut(filterStatut === key ? "" : key)} />
              );
            })}
          </div>
        </Panel>

        {/* Liste DI */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, color: "#185FA5" }}>
              {filterStatut ? `${STATUTS[filterStatut]?.lbl} (${filtered.length})` : `Toutes (${filtered.length})`}
            </h3>
            <Btn variant="ghost" icon="ti-refresh" onClick={reload}>Actualiser</Btn>
          </div>

          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "#5a6878" }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-inbox" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              Aucune demande {filterStatut ? `avec le statut ${STATUTS[filterStatut]?.lbl}` : "envoyée"}.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(d => {
                const st = STATUTS[d.statut || "nouvelle"] || { lbl: d.statut || "?", col: "#8a98a8", ic: "ti-help" };
                return (
                  <div key={d.id} onClick={() => router.push(`/demandes-internes/${d.id}`)} style={{
                    background: "#fff", border: "1px solid #e3e9ee",
                    borderLeft: `4px solid ${st.col}`,
                    borderRadius: 10, padding: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${st.col}22`, color: st.col,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                    }}>
                      <i className={`ti ${st.ic}`} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontWeight: 700, color: "#142131", fontSize: 13.5 }}>
                          {d.numero || `DI-${d.id?.substring(0, 8)}`}
                        </span>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6,
                          background: `${st.col}22`, color: st.col,
                          fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
                        }}>{st.lbl}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 2 }}>
                        Créée le {new Date(d.created_at).toLocaleString("fr-FR")}
                        {d.priorite && <span style={{ marginLeft: 8 }}>· Priorité {d.priorite}</span>}
                      </div>
                      {/* Messages contextuels selon statut */}
                      {d.statut === "refusee" && d.motif_refus && (
                        <div style={{ fontSize: 11, color: "#e35d5b", marginTop: 4, fontStyle: "italic" }}>
                          ❌ Motif refus : {d.motif_refus}
                        </div>
                      )}
                      {d.statut === "livree" && d.numero_bl && (
                        <div style={{ fontSize: 11, color: "#185FA5", marginTop: 4 }}>
                          📦 BL : <code style={{ fontFamily: "Consolas,monospace" }}>{d.numero_bl}</code>
                        </div>
                      )}
                      {(d.statut === "validee" || d.statut === "livree") && (
                        <div style={{ fontSize: 11, color: "#5aa05a", marginTop: 4 }}>
                          {st.description}
                        </div>
                      )}
                    </div>
                    <i className="ti ti-chevron-right" style={{ color: "#8a98a8", fontSize: 20 }} />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatTile({ lbl, val, col, ic, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: active ? `${col}22` : "#fff",
      border: `2px solid ${active ? col : "#e3e9ee"}`,
      borderRadius: 10, padding: 10, cursor: "pointer",
      display: "flex", gap: 8, alignItems: "center",
      transition: "all 150ms",
    }}>
      <i className={`ti ${ic}`} style={{ color: col, fontSize: 22 }} />
      <div>
        <div style={{ fontSize: 9.5, color: col, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{lbl}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#142131", fontFamily: "Consolas,monospace" }}>{val}</div>
      </div>
    </div>
  );
}
