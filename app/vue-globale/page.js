"use client";
// Page Vue-Globale — Vue agrégée multi-établissements (écran de choix au login)
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLibelles } from "../../lib/useLibelles";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import { KpiRow } from "../kpis";

export default function VueGlobale() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const { lbl } = useLibelles(auth.structureId);
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      const { data: etabs } = await supabase.from("etablissements").select("*").order("nom");
      // agréger par établissement (comptages)
      const [pa, ma, di, cm] = await Promise.all([
        supabase.from("patients").select("id,etablissement_id"),
        supabase.from("materiels").select("id,etablissement_id,etat"),
        supabase.from("interventions").select("id,etablissement_id,statut"),
        supabase.from("commandes").select("id,etablissement_id,total,statut"),
      ]);
      const byEtab = (etabs || []).map((e) => ({
        ...e,
        patients: (pa.data || []).filter((x) => x.etablissement_id === e.id).length,
        materiels: (ma.data || []).filter((x) => x.etablissement_id === e.id).length,
        di: (di.data || []).filter((x) => x.etablissement_id === e.id && x.statut !== "Clôturée").length,
        commandes: (cm.data || []).filter((x) => x.etablissement_id === e.id).length,
        aRegler: (cm.data || []).filter((x) => x.etablissement_id === e.id && x.statut !== "Livrée").reduce((s, c) => s + Number(c.total || 0), 0),
      }));
      setRows(byEtab);
      setLoading(false);
    })();
  }, [auth.ready]);

  if (!auth.ready) return null;

  const tot = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);

  function entrer(e) { auth.setEtab(e.id); router.push("/accueil"); }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="COLLECTIVITÉ" title="Vue globale" accent="multi-établissements" sub={auth.structureNom} />
        <KpiRow tiles={[
          { label: "Établissements", value: rows.length, icon: "ti-buildings", color: "#185FA5" },
          { label: lbl("patients", "Patients") + " (total)", value: tot("patients"), icon: "ti-users", color: "#7a6fb0" },
          { label: lbl("materiel", "Matériel") + " (total)", value: tot("materiels"), icon: "ti-armchair-2", color: "#142131" },
          { label: "DI en cours (total)", value: tot("di"), icon: "ti-tools", color: "#e35d5b" },
          { label: "À régler (total)", value: tot("aRegler").toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), icon: "ti-cash", color: "#5aa05a" },
        ]} />

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel>
          : rows.length === 0 ? <Panel><StateMsg>Aucun établissement. <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={() => router.push("/collectivite")}>Créer un établissement</a></StateMsg></Panel>
          : (
            <div className="mag-grid">
              {rows.map((e) => (
                <div className="mag-tile" key={e.id} onClick={() => entrer(e)}>
                  <div className="mag-photo" style={{ background: "linear-gradient(135deg,#142131,#2a5a5a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="ti ti-building-hospital" style={{ fontSize: 40, color: "#7CC8C8" }} />
                  </div>
                  <div className="mag-body">
                    <p className="mag-name">{e.nom}</p>
                    <div className="mag-meta"><i className="ti ti-map-pin" /> {e.type || "—"}{e.ville ? ` · ${e.ville}` : ""}</div>
                    <div className="mag-stats">
                      <div className="mag-stat"><span className="v">{e.patients}</span><span className="l">patients</span></div>
                      <div className="mag-stat"><span className="v">{e.materiels}</span><span className="l">matériel</span></div>
                      <div className="mag-stat"><span className="v">{e.di}</span><span className="l">DI</span></div>
                    </div>
                    <button className="mag-cta" style={{ background: "#142131" }}><i className="ti ti-arrow-right" /> Entrer dans l'établissement</button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
