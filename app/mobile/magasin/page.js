"use client";
// =============================================================
//  /mobile/magasin — Vue Action Mobile pour user magasin (0.60.0)
//  Affiche DI à traiter, SAV à traiter, accès rapide catalogue
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useViewMode } from "../../../lib/useViewMode";
import { useCart } from "../../useCart";

export default function MobileMagasinPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const viewMode = useViewMode();
  const cart = useCart();

  const [counts, setCounts] = useState({ di_a_traiter: 0, sav_a_traiter: 0, transferts: 0, articles: 0 });
  const [recentDIs, setRecentDIs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const [allDIs, articles] = await Promise.all([
      tryFetch(supabase.from("demandes_internes").select("id, numero, statut, type_demande, priorite, created_at, panne_description").order("created_at", { ascending: false }).limit(50)),
      tryFetch(supabase.from("articles").select("id").eq("est_catalogue_magasin", true)),
    ]);
    const aTraiter = allDIs.filter(d => ["nouvelle", "en_attente", null].includes(d.statut));
    setRecentDIs(aTraiter.slice(0, 10));
    setCounts({
      di_a_traiter: aTraiter.filter(d => (d.type_demande || "di") === "di").length,
      sav_a_traiter: aTraiter.filter(d => d.type_demande === "sav").length,
      transferts: aTraiter.filter(d => d.type_demande === "transfert").length,
      articles: articles.length,
    });
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #1c4040 0%, #142131 50%, #050a14 100%)",
      fontFamily: "Quicksand, sans-serif",
      color: "#fff",
      paddingBottom: 80,
    }}>
      {/* Header */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(94,143,143,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: 2 }}>
            a<span style={{ color: "#7CC8C8" }}>v</span>eho
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, color: "#a8d8d8", letterSpacing: 1.5, textTransform: "uppercase" }}>Action mobile · Magasin</div>
            <div style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>Bonjour {auth.user?.email?.split("@")[0]}</div>
          </div>
          <button onClick={() => { viewMode.setMode("ec"); router.push("/collaborateurs"); }} style={{
            padding: "6px 10px", background: "rgba(255,255,255,.10)", color: "#fff",
            border: "1px solid rgba(255,255,255,.20)", borderRadius: 8,
            fontFamily: "inherit", fontSize: 11, fontWeight: 600, cursor: "pointer",
          }} title="Passer en mode EC">
            <i className="ti ti-switch" /> EC
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ActionTile onClick={() => router.push("/magasin")} color="#EF9F27" icon="ti-truck-loading"
            label="DI à traiter" value={counts.di_a_traiter}
            urgent={counts.di_a_traiter > 5} />
          <ActionTile onClick={() => router.push("/magasin")} color="#e35d5b" icon="ti-tool"
            label="SAV à traiter" value={counts.sav_a_traiter}
            urgent={counts.sav_a_traiter > 0} />
          <ActionTile onClick={() => router.push("/magasin")} color="#7a6fb0" icon="ti-transfer"
            label="Transferts" value={counts.transferts} />
          <ActionTile onClick={() => router.push("/magasin")} color="#185FA5" icon="ti-package"
            label="Articles catalogue" value={counts.articles} />
        </div>

        {/* Accès rapides */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10.5, color: "#a8d8d8", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
            ⚡ Accès rapides
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <QuickBtn icon="ti-package-plus" label="Nouvel article" color="#5a8f8f" onClick={() => router.push("/articles?new=1&magasin=1")} />
            <QuickBtn icon="ti-clipboard-check" label="Bilans SAV" color="#7CC8C8" onClick={() => router.push("/magasin/bilans-sav")} />
            <QuickBtn icon="ti-building-warehouse" label="Vue magasin" color="#185FA5" onClick={() => router.push("/magasin")} />
            <QuickBtn icon="ti-scan" label="Scanner" color="#EF9F27" onClick={() => router.push("/scan")} />
          </div>
        </div>

        {/* DI récentes à traiter */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10.5, color: "#a8d8d8", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
            📋 À traiter maintenant
          </div>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#a8d8d8" }}>Chargement...</div>
          ) : recentDIs.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "#a8d8d8", background: "rgba(255,255,255,.05)", borderRadius: 10 }}>
              <i className="ti ti-check" style={{ fontSize: 36, color: "#5aa05a", display: "block", marginBottom: 6 }} />
              Tout est à jour ✓
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentDIs.map(d => {
                const isSav = d.type_demande === "sav";
                const isTransfert = d.type_demande === "transfert";
                const col = isSav ? "#e35d5b" : isTransfert ? "#7a6fb0" : "#EF9F27";
                return (
                  <div key={d.id} onClick={() => router.push(`/demandes-internes/${d.id}`)} style={{
                    background: "rgba(255,255,255,.05)",
                    border: `1px solid ${col}55`,
                    borderLeft: `3px solid ${col}`,
                    borderRadius: 10, padding: 10, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <i className={`ti ${isSav ? "ti-tool" : isTransfert ? "ti-transfer" : "ti-truck-loading"}`} style={{ color: col, fontSize: 22 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>
                          {isSav ? "SAV " : isTransfert ? "Transfert " : "DI "}
                          {d.numero || d.id?.substring(0,8)}
                        </span>
                        {d.priorite === "urgente" && <span style={{ background: "#e35d5b", color: "#fff", padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>URGENT</span>}
                      </div>
                      <div style={{ fontSize: 10.5, color: "#a8d8d8" }}>{new Date(d.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                      {d.panne_description && <div style={{ fontSize: 10.5, color: "#fdcecd", fontStyle: "italic", marginTop: 2 }}>{d.panne_description.substring(0, 80)}{d.panne_description.length > 80 && "..."}</div>}
                    </div>
                    <i className="ti ti-chevron-right" style={{ color: "#a8d8d8" }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionTile({ color, icon, label, value, urgent, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: urgent ? `${color}30` : "rgba(255,255,255,.05)",
      border: `1px solid ${urgent ? color : "rgba(255,255,255,.10)"}`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 12, padding: 14, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 28 }} />
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", fontFamily: "Consolas,monospace", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10.5, color: "#a8d8d8", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{label}</div>
      </div>
      {urgent && <span style={{ marginLeft: "auto", background: color, color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>!</span>}
    </div>
  );
}

function QuickBtn({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "rgba(255,255,255,.05)",
      border: `1px solid ${color}44`,
      borderRadius: 12, padding: 12, cursor: "pointer", color: "#fff",
      fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 24 }} />
      {label}
    </button>
  );
}
