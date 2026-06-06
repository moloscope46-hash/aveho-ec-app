"use client";
// Page Promotions — Promotions actives sur le catalogue
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { joursRestants } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, StateMsg } from "../ui";
// 0.58.50 : migration UI premium
import { EmptyState, SkeletonRow } from "../components/ui-premium";
import { logger } from "../../lib/logger";

export default function Promotions() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [promos, setPromos] = useState([]);
  const [magasins, setMagasins] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        const [{ data: pr }, { data: mg }] = await Promise.all([
          supabase.from("promotions").select("*").eq("actif", true).order("fin_le"),
          supabase.from("magasins").select("id,nom"),
        ]);
        setPromos(pr || []);
        setMagasins(Object.fromEntries((mg || []).map((m) => [m.id, m.nom])));
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[Promotions] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.ready]);

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="ESPACE COLLECTIVITÉ" title="Promotions en cours chez vos" accent="magasins"
          sub="Profitez des offres ponctuelles de vos magasins Aveho fournisseurs. Ajoutez au panier puis validez votre commande." />

        <div className="promo-panel">
          <div className="promo-head">
            <span className="icon"><i className="ti ti-flame" /></span>
            <h2>Promotions en cours</h2>
            <span className="live">● LIVE</span>
            <span className="count">{promos.length}</span>
          </div>
          <div className="promo-sub">Cliquez sur COMMANDER pour ajouter l'offre à votre panier</div>

          {loading ? <SkeletonRow count={4} />
            : promos.length === 0 ? (
              <EmptyState
                icon="ti-discount-2-off"
                title="Aucune promotion active"
                description="Aucune offre promotionnelle n'est disponible pour le moment. Revenez plus tard ou consultez le catalogue complet."
                actionLabel="Voir le catalogue"
                onAction={() => window.location.href = "/catalogue"}
              />
            )
            : (
              <div className="promo-grid">
                {promos.map((p) => {
                  const t = "t-" + p.type.toLowerCase();
                  const jr = joursRestants(p.fin_le);
                  return (
                    <div className="promo-card" key={p.id}>
                      <span className={`tag ${t}`}>{p.type}</span>
                      {p.remise_pct ? <span className="remise">-{p.remise_pct}%</span> : null}
                      <div className="emoji">{p.emoji || "📦"}</div>
                      <div className="mag"><i className="ti ti-building-store" /> {magasins[p.magasin_id] || "Magasin Aveho"}</div>
                      <p className="pname">{p.titre}</p>
                      <p className="pdesc">{p.sous_titre}</p>
                      <div className="prices">
                        {p.prix_avant ? <span className="pbefore">{p.prix_avant}€{p.unite}</span> : null}
                        <span className="pafter">{p.prix_apres} €</span><span className="punit">{p.unite}</span>
                      </div>
                      <div className="promo-foot">
                        <span className="days"><i className="ti ti-clock" /> {jr != null ? `${jr}j restants` : "—"}</span>
                        <button className={`btn-cmd ${t}`} onClick={() => cart.add(p)}>Commander <i className="ti ti-arrow-right" /></button>
                      </div>
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
