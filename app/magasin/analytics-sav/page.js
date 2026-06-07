"use client";
// =============================================================
//  /magasin/analytics-sav — Dashboard analytics SAV (0.60.6)
//  Métriques clés : conformité, durée moyenne, top articles, tendances
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";

export default function AnalyticsSavPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [data, setData] = useState([]);
  const [articlesMap, setArticlesMap] = useState({});
  const [bilansMap, setBilansMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState("30");  // 7, 30, 90, 365

  useEffect(() => {
    if (!auth.ready || !auth.structureId || magasinCtx.loading) return;
    reload();
  }, [auth.ready, auth.structureId, magasinCtx.magasinId, periode]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const since = new Date(Date.now() - parseInt(periode) * 24 * 60 * 60 * 1000).toISOString();

    // Filtre par magasin si user magasin
    let q = supabase.from("v_analytics_sav").select("*").gte("created_at", since);
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) {
      q = q.eq("magasin_id", magasinCtx.magasinId);
    }
    const [savData, arts, bils] = await Promise.all([
      tryFetch(q),
      tryFetch(supabase.from("articles").select("id, libelle, code")),
      tryFetch(supabase.from("bilans_sav").select("id, nom, couleur")),
    ]);
    setData(savData);
    setArticlesMap(Object.fromEntries(arts.map(a => [a.id, a])));
    setBilansMap(Object.fromEntries(bils.map(b => [b.id, b])));
    setLoading(false);
  }

  // Calculs analytics
  const total = data.length;
  const conformes = data.filter(d => d.verdict === "CONFORME").length;
  const nonConformes = data.filter(d => d.verdict === "NON_CONFORME").length;
  const enAttente = data.filter(d => d.verdict === "EN_ATTENTE").length;
  const tauxConformite = total > 0 ? Math.round((conformes / (conformes + nonConformes || 1)) * 100) : 0;
  const dureeMoyenne = data.length > 0 ? Math.round(data.filter(d => d.duree_heures).reduce((s, d) => s + parseFloat(d.duree_heures || 0), 0) / data.filter(d => d.duree_heures).length || 0) : 0;
  const urgents = data.filter(d => d.priorite === "urgente").length;
  const ratesByBilan = {};
  data.forEach(d => {
    if (!d.bilan_sav_id) return;
    if (!ratesByBilan[d.bilan_sav_id]) ratesByBilan[d.bilan_sav_id] = { total: 0, conformes: 0, nom: d.bilan_nom };
    ratesByBilan[d.bilan_sav_id].total++;
    if (d.verdict === "CONFORME") ratesByBilan[d.bilan_sav_id].conformes++;
  });
  const topBilans = Object.values(ratesByBilan).sort((a, b) => b.total - a.total).slice(0, 5);

  const ratesByArticle = {};
  data.forEach(d => {
    if (!d.article_concerne_id) return;
    if (!ratesByArticle[d.article_concerne_id]) ratesByArticle[d.article_concerne_id] = { total: 0, non_conformes: 0 };
    ratesByArticle[d.article_concerne_id].total++;
    if (d.verdict === "NON_CONFORME") ratesByArticle[d.article_concerne_id].non_conformes++;
  });
  const topArticles = Object.entries(ratesByArticle)
    .map(([id, stats]) => ({ id, ...stats, article: articlesMap[id] }))
    .filter(x => x.article)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Tendance par jour (last 7 days)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const trendsByDay = days.map(d => ({
    day: d,
    count: data.filter(x => x.created_at?.slice(0, 10) === d).length,
    ok: data.filter(x => x.created_at?.slice(0, 10) === d && x.verdict === "CONFORME").length,
    ko: data.filter(x => x.created_at?.slice(0, 10) === d && x.verdict === "NON_CONFORME").length,
  }));
  const maxTrend = Math.max(1, ...trendsByDay.map(t => t.count));

  const content = (
    <>
      <PageHead icon="ti-chart-bar" title="Analytics SAV" subtitle={`Métriques ${periode === "7" ? "7 derniers jours" : periode === "30" ? "30 derniers jours" : periode === "90" ? "3 derniers mois" : "12 derniers mois"}`} />

      {/* Sélecteur période */}
      <Panel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { v: "7", l: "7 jours" },
            { v: "30", l: "30 jours" },
            { v: "90", l: "90 jours" },
            { v: "365", l: "1 an" },
          ].map(p => (
            <button key={p.v} onClick={() => setPeriode(p.v)} style={{
              padding: "8px 16px", border: "none", borderRadius: 8,
              background: periode === p.v ? "linear-gradient(135deg,#5a8f8f,#477676)" : "#fff",
              color: periode === p.v ? "#fff" : "#5a6878",
              fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              border: periode === p.v ? "none" : "1px solid #e3e9ee",
            }}>{p.l}</button>
          ))}
          <Btn variant="ghost" icon="ti-refresh" onClick={reload}>Actualiser</Btn>
        </div>
      </Panel>

      {loading ? (
        <Panel><div style={{ padding: 40, textAlign: "center", color: "#5a6878" }}>Chargement des analytics...</div></Panel>
      ) : data.length === 0 ? (
        <Panel>
          <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
            <i className="ti ti-chart-off" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 10 }} />
            Aucune donnée SAV sur la période sélectionnée.
          </div>
        </Panel>
      ) : (
        <>
          {/* Stat cards principales */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 240px))", gap: 12, marginTop: 12, justifyContent: "start" }}>
            <BigStat color="#5a8f8f" icon="ti-clipboard-list" lbl="Total SAV" val={total} />
            <BigStat color="#5aa05a" icon="ti-shield-check" lbl="Taux conformité" val={`${tauxConformite}%`} sub={`${conformes}/${conformes + nonConformes} OK`} />
            <BigStat color="#185FA5" icon="ti-clock" lbl="Durée moyenne" val={`${dureeMoyenne}h`} sub="Création → clôture" />
            <BigStat color="#e35d5b" icon="ti-flame" lbl="Urgents" val={urgents} />
          </div>

          {/* Répartition verdict */}
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#5a8f8f" }}>📊 Répartition par verdict</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <VerdictBar lbl="🟢 Conforme" col="#5aa05a" val={conformes} total={total} />
              <VerdictBar lbl="🔴 Non conforme" col="#e35d5b" val={nonConformes} total={total} />
              <VerdictBar lbl="⚠ En attente" col="#EF9F27" val={enAttente} total={total} />
            </div>
          </Panel>

          {/* Tendance 7 jours */}
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#185FA5" }}>📈 Tendance sur 7 jours</h3>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 160, padding: "10px 0" }}>
              {trendsByDay.map((t, i) => {
                const h = (t.count / maxTrend) * 140;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#142131" }}>{t.count}</div>
                    <div style={{ width: "100%", maxWidth: 50, height: h, background: "linear-gradient(180deg, #5a8f8f, #185FA5)", borderRadius: "4px 4px 0 0", position: "relative" }}>
                      {t.ko > 0 && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${(t.ko / t.count) * 100}%`, background: "#e35d5b", borderRadius: "0 0 4px 4px" }} />}
                    </div>
                    <div style={{ fontSize: 9.5, color: "#8a98a8", textAlign: "center" }}>
                      {new Date(t.day).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "#8a98a8", textAlign: "center", marginTop: 6 }}>
              <span style={{ color: "#185FA5" }}>━</span> Total · <span style={{ color: "#e35d5b" }}>━</span> Non conformes
            </div>
          </Panel>

          {/* Top bilans */}
          {topBilans.length > 0 && (
            <Panel style={{ marginTop: 12 }}>
              <h3 style={{ margin: "0 0 12px", color: "#7CC8C8" }}>🩺 Top bilans exécutés</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {topBilans.map((b, i) => {
                  const pct = b.total > 0 ? Math.round((b.conformes / b.total) * 100) : 0;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, background: "#fafbfc", borderRadius: 8 }}>
                      <span style={{ width: 24, height: 24, background: "#7CC8C8", color: "#fff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{b.nom}</div>
                        <div style={{ fontSize: 11, color: "#5a6878" }}>{b.total} exécutions · {pct}% conformes</div>
                      </div>
                      <div style={{ width: 120, height: 6, background: "#e3e9ee", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "#5aa05a" : pct >= 50 ? "#EF9F27" : "#e35d5b" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* Top articles avec SAV */}
          {topArticles.length > 0 && (
            <Panel style={{ marginTop: 12 }}>
              <h3 style={{ margin: "0 0 12px", color: "#e35d5b" }}>📦 Articles avec le plus de SAV</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "#fafbfc" }}>
                      <th style={{ textAlign: "left", padding: 8, color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Article</th>
                      <th style={{ textAlign: "center", padding: 8, color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, width: 80 }}>Total</th>
                      <th style={{ textAlign: "center", padding: 8, color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, width: 100 }}>Non conformes</th>
                      <th style={{ textAlign: "center", padding: 8, color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, width: 100 }}>Taux échec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topArticles.map(a => {
                      const tauxKO = a.total > 0 ? Math.round((a.non_conformes / a.total) * 100) : 0;
                      return (
                        <tr key={a.id} style={{ borderTop: "1px solid #f0f3f6" }}>
                          <td style={{ padding: 8 }}>
                            <div style={{ fontWeight: 600 }}>{a.article.libelle}</div>
                            {a.article.code && <div style={{ fontSize: 10.5, color: "#8a98a8", fontFamily: "Consolas,monospace" }}>{a.article.code}</div>}
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 700, fontFamily: "Consolas,monospace" }}>{a.total}</td>
                          <td style={{ textAlign: "center", color: "#e35d5b", fontWeight: 700, fontFamily: "Consolas,monospace" }}>{a.non_conformes}</td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 4, background: tauxKO >= 50 ? "rgba(227,93,91,.15)" : tauxKO >= 20 ? "rgba(239,159,39,.15)" : "rgba(94,160,90,.15)", color: tauxKO >= 50 ? "#c0392b" : tauxKO >= 20 ? "#d48820" : "#5aa05a", fontWeight: 700, fontSize: 11.5 }}>
                              {tauxKO}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          {content}
        </div>
      </div>
    </div>
  );
}

function BigStat({ color, icon, lbl, val, sub }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
      borderRadius: 12, padding: 16,
    }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 28, display: "block", marginBottom: 6 }} />
      <div style={{ fontSize: 28, fontWeight: 700, color: "#142131", fontFamily: "Consolas,monospace", lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 10.5, color, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, marginTop: 4 }}>{lbl}</div>
      {sub && <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function VerdictBar({ lbl, col, val, total }) {
  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
  return (
    <div style={{ background: "#fafbfc", borderRadius: 8, padding: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{lbl}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#142131" }}>{val}</span>
      </div>
      <div style={{ height: 8, background: "#e3e9ee", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: col, transition: "width 300ms" }} />
      </div>
      <div style={{ fontSize: 10.5, color: "#8a98a8", textAlign: "right", marginTop: 2 }}>{pct}%</div>
    </div>
  );
}
