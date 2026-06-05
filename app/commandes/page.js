"use client";
// Page Commandes — Historique et suivi des commandes passées aux magasins
import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { fmtEur, fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Statut, StateMsg } from "../ui";
import { EmptyState, SkeletonRow } from "../components/ui-premium";
import { KpiRow } from "../kpis";
import { logger } from "../../lib/logger";

export default function Commandes() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [cmds, setCmds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [lignes, setLignes] = useState({});

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        let q = supabase.from("commandes").select("*, magasins(nom)").order("created_at", { ascending: false });
        if (auth.etabId) q = q.eq("etablissement_id", auth.etabId);
        const { data } = await q;
        setCmds(data || []);
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[Commandes] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.ready, auth.etabId]);

  async function toggle(id) {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    if (!lignes[id]) {
      const { data } = await supabase.from("commande_lignes").select("*").eq("commande_id", id);
      setLignes((p) => ({ ...p, [id]: data || [] }));
    }
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Mes commandes" sub="Historique des commandes passées auprès de vos magasins" />
        <KpiRow tiles={[
          { label: "Commandes", value: cmds.length, icon: "ti-truck-delivery", color: "#5a8f8f" },
          { label: "En cours", value: cmds.filter((c) => c.statut === "En cours").length, icon: "ti-clock", color: "#EF9F27" },
          { label: "Livrées", value: cmds.filter((c) => c.statut === "Livrée").length, icon: "ti-check", color: "#5aa05a" },
          { label: "Total", value: cmds.reduce((s2, c) => s2 + Number(c.total || 0), 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), icon: "ti-cash", color: "#7a6fb0" },
        ]} />
        <Panel>
          {loading ? (
            /* 0.58.9 : SkeletonRow x 4 */
            <div style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12, padding: 6 }}>
              {[0,1,2,3].map((i) => <SkeletonRow key={i} cols={4} />)}
            </div>
          )
            : cmds.length === 0 ? (
              <EmptyState
                illustration="folder"
                variant="teal"
                title="Aucune commande pour le moment"
                message="Découvre les promotions du moment pour passer ta première commande auprès du fournisseur."
                actionLabel="Voir les promotions"
                onAction={() => router.push("/promotions")}
              />
            )
            : (
              <table>
                <thead><tr><th>N°</th><th>Date</th><th>Magasin</th><th style={{ textAlign: "right" }}>Total</th><th>Statut</th><th></th></tr></thead>
                <tbody>
                  {cmds.map((c) => (
                    <Fragment key={c.id}>
                      <tr style={{ cursor: "pointer" }} onClick={() => toggle(c.id)}>
                        <td style={{ fontWeight: 600 }}>{c.numero}</td>
                        <td>{fmtDate(c.created_at)}</td>
                        <td>{c.magasins?.nom || "—"}</td>
                        <td style={{ textAlign: "right" }}>{fmtEur(c.total)}</td>
                        <td><Statut value={c.statut} /></td>
                        <td style={{ textAlign: "right" }}><i className={`ti ti-chevron-${open === c.id ? "up" : "down"}`} /></td>
                      </tr>
                      {open === c.id && (
                        <tr><td colSpan={6} style={{ background: "#f9fbfc", padding: 0 }}>
                          <table><tbody>
                            {(lignes[c.id] || []).map((l) => (
                              <tr key={l.id}>
                                <td style={{ paddingLeft: 24 }}>{l.libelle}</td>
                                <td style={{ textAlign: "right" }}>{l.quantite} × {fmtEur(l.prix_unitaire)}</td>
                                <td style={{ textAlign: "right", paddingRight: 24, fontWeight: 600 }}>{fmtEur(l.quantite * l.prix_unitaire)}</td>
                              </tr>
                            ))}
                          </tbody></table>
                        </td></tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
        </Panel>
      </div>
    </div>
  );
}
