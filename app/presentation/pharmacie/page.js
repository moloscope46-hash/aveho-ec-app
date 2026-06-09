"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /presentation/pharmacie — Mode TV Pharmacie
//  Affiche : stock alertes, dispensations jour, prescriptions actives, stupéfiants
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import RefreshButton from "../../components/RefreshButton";
import CastButton from "../../components/CastButton";
import ModeTVToolbar from "../../components/ModeTVToolbar";

export default function PresentationPharmaciePage() {
  const supabase = createClient();
  const auth = useAuth();
  const router = useRouter();
  const [data, setData] = useState({ alertes: [], dispensations: [], prescriptions: [], stupefiants: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!auth?.structureId) return;
    setLoading(true);
    const safe = async (q) => { try { const r = await q; return r.error ? [] : (r.data || []); } catch { return []; } };
    const today = new Date().toISOString().split("T")[0];
    const [al, di, pr, st] = await Promise.all([
      safe(supabase.from("pharmacie_stock").select("id, article_id, quantite, casier_id").lt("quantite", 5).limit(30)),
      safe(supabase.from("prescriptions_lignes").select("id, prescription_id, medicament_id, quantite, created_at").gte("created_at", today).limit(40)),
      safe(supabase.from("prescriptions").select("id, numero, patient_id, statut, created_at").eq("statut", "active").order("created_at", { ascending: false }).limit(20)),
      safe(supabase.from("pharmacie_stupefiants_registre").select("id, type_mouvement, quantite, created_at").order("created_at", { ascending: false }).limit(20)),
    ]);
    setData({ alertes: al, dispensations: di, prescriptions: pr, stupefiants: st });
    setLoading(false);
  }
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [auth?.structureId]);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0c1726 0%, #142131 100%)", color: "#fff", fontFamily: "Quicksand, sans-serif" }}>
      {/* Toolbar */}
      <div style={{ position: "fixed", top: 16, right: 16, display: "flex", gap: 8, zIndex: 8500, padding: "8px 10px", background: "rgba(20,33,49,.75)", backdropFilter: "blur(10px)", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}>
        <button onClick={() => router.back()} title="Retour" style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.10)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          <i className="ti ti-arrow-left" />
        </button>
        <button onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()} title="Plein écran" style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.10)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          <i className="ti ti-arrows-maximize" />
        </button>
        <RefreshButton onRefresh={load} color="#5aa05a" size="sm" label="" />
        <CastButton size={28} />
      </div>

      <header style={{ padding: "20px 28px", background: "linear-gradient(135deg, #5aa05a30, #5aa05a10)", borderBottom: "1px solid #5aa05a40", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, background: "linear-gradient(135deg, #5aa05a, #4a8a4a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 6px 20px #5aa05a60" }}>
          <i className="ti ti-pill" />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Mode TV - Pharmacie</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>Stock, dispensations, ordonnances, stupéfiants - Refresh auto 30s</div>
        </div>
      </header>

      <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
        <Panel color="#D45E5E" ic="ti-alert-triangle" titre="Alertes stock seuil bas" items={data.alertes.map(x => ({ titre: x.casier_id || x.article_id, sous: `Qté: ${x.quantite}`, badge: "BAS" }))} />
        <Panel color="#185FA5" ic="ti-scan" titre="Dispensations aujourd'hui" items={data.dispensations.map(x => ({ titre: `Ligne ${x.id?.toString().substring(0, 6)}`, sous: `Qté ${x.quantite}`, badge: new Date(x.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }))} />
        <Panel color="#7a6fb0" ic="ti-prescription" titre="Ordonnances actives" items={data.prescriptions.map(x => ({ titre: x.numero || `Ord ${x.id?.toString().substring(0, 6)}`, sous: x.statut, badge: new Date(x.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) }))} />
        <Panel color="#5aa05a" ic="ti-shield-lock" titre="Registre stupéfiants" items={data.stupefiants.map(x => ({ titre: x.type_mouvement, sous: `Qté ${x.quantite}`, badge: new Date(x.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) }))} />
      </div>
    </div>
  );
}

function Panel({ color, ic, titre, items }) {
  return (
    <div style={{ background: `linear-gradient(180deg, ${color}15, ${color}05)`, border: `1px solid ${color}40`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${color}, ${color}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          <i className={`ti ${ic}`} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{titre}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{items.length} entrées</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflow: "auto" }}>
        {items.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,.4)", fontSize: 12 }}>Aucune donnée</div> :
          items.slice(0, 15).map((it, i) => (
            <div key={i} style={{ padding: "8px 10px", background: "rgba(255,255,255,.04)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.titre}</div>
                <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>{it.sous}</div>
              </div>
              {it.badge && <span style={{ padding: "2px 8px", background: `${color}25`, color, borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{it.badge}</span>}
            </div>
          ))}
      </div>
    </div>
  );
}
