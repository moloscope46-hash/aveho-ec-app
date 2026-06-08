"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { fmtEur, fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Statut, StateMsg } from "../ui";

export default function Accueil() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ promos: 0, commandes: 0, enCours: 0, aRegler: 0 });
  const [dernieres, setDernieres] = useState([]);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      const [{ data: promos }, { data: cmds }] = await Promise.all([
        supabase.from("promotions").select("id").eq("actif", true),
        supabase.from("commandes").select("*, magasins(nom)").order("created_at", { ascending: false }),
      ]);
      const list = cmds || [];
      setKpis({
        promos: (promos || []).length,
        commandes: list.length,
        enCours: list.filter((c) => c.statut === "En cours").length,
        aRegler: list.filter((c) => c.statut !== "Livrée").reduce((s, c) => s + Number(c.total || 0), 0),
      });
      setDernieres(list.slice(0, 5));
      setLoading(false);
    })();
  }, [auth.ready]);

  if (!auth.ready) return null;

  const tiles = [
    { label: "Promotions en cours", value: kpis.promos, icon: "ti-discount-2", color: "#e35d5b", to: "/promotions" },
    { label: "Commandes passées", value: kpis.commandes, icon: "ti-truck-delivery", color: "#7CC8C8", to: "/commandes" },
    { label: "Commandes en cours", value: kpis.enCours, icon: "ti-clock", color: "#EF9F27", to: "/commandes" },
    { label: "Montant à régler", value: fmtEur(kpis.aRegler), icon: "ti-file-invoice", color: "#7a6fb0", to: "/commandes" },
  ];

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="ESPACE COLLECTIVITÉ" title="Bonjour, bienvenue sur votre" accent="espace"
          sub={auth.structureNom ? `Vous êtes connecté pour ${auth.structureNom}` : "Rattachez votre compte à une structure pour commander."} />

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel> : (
          <>
            <div className="kpi-grid">
              {tiles.map((t) => (
                <button key={t.label} className="kpi-tile" onClick={() => router.push(t.to)}>
                  <span className="kpi-ic" style={{ background: t.color + "22", color: t.color }}><i className={`ti ${t.icon}`} /></span>
                  <span className="kpi-val">{t.value}</span>
                  <span className="kpi-lbl">{t.label}</span>
                </button>
              ))}
            </div>

            <Panel style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Dernières commandes</h2>
                <a style={{ color: "#2a5a5a", fontWeight: 600, fontSize: 13 }} onClick={() => router.push("/commandes")}>Tout voir →</a>
              </div>
              {dernieres.length === 0 ? <StateMsg>Aucune commande pour l'instant. <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={() => router.push("/promotions")}>Voir les promotions</a></StateMsg> : (
                <table>
                  <thead><tr><th>N°</th><th>Date</th><th>Magasin</th><th style={{ textAlign: "right" }}>Total</th><th>Statut</th></tr></thead>
                  <tbody>
                    {dernieres.map((c) => (
                      <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => router.push("/commandes")}>
                        <td style={{ fontWeight: 600 }}>{c.numero}</td>
                        <td>{fmtDate(c.created_at)}</td>
                        <td>{c.magasins?.nom || "—"}</td>
                        <td style={{ textAlign: "right" }}>{fmtEur(c.total)}</td>
                        <td><Statut value={c.statut} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
