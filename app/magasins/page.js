"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, StateMsg } from "../ui";

export default function Magasins() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [magasins, setMagasins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      const { data } = await supabase
        .from("magasins")
        .select("*")
        .order("favori", { ascending: false })
        .order("nom");
      setMagasins(data || []);
      setLoading(false);
    })();
  }, [auth.ready]);

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="ESPACE COLLECTIVITÉ" title="Choisissez votre" accent="magasin fournisseur"
          sub="Vous avez accès aux magasins Aveho auprès desquels votre établissement passe ses commandes de matériel médical." />

        {loading ? <StateMsg>Chargement des magasins…</StateMsg>
          : magasins.length === 0 ? <StateMsg>Aucun magasin disponible.</StateMsg>
          : (
            <div className="mag-grid">
              {magasins.map((m) => (
                <div className="mag-tile" key={m.id} onClick={() => router.push("/promotions")}>
                  <div className="mag-photo" style={{ backgroundImage: m.photo ? `url(/magasins/${m.photo})` : "none", background: m.photo ? undefined : (m.couleur || "#5a8f8f") }}>
                    {m.favori && <span className="fav"><i className="ti ti-heart-filled" /></span>}
                  </div>
                  <div className="mag-body">
                    <p className="mag-name">{m.nom}</p>
                    <div className="mag-meta"><i className="ti ti-map-pin" /> {m.ville}{m.distance ? ` · ${m.distance}` : ""}</div>
                    <div className="mag-stats">
                      <div className="mag-stat"><span className="v">{m.nb_articles}</span><span className="l">articles</span></div>
                      <div className="mag-stat"><span className="v">{m.delai || "—"}</span><span className="l">livraison</span></div>
                    </div>
                    <button className="mag-cta" style={{ background: m.couleur || "#5a8f8f" }}>
                      <i className="ti ti-arrow-right" /> Accéder à l'EC du magasin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
