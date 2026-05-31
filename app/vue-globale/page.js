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
  // 0.55.29 : toggle Mes / Partenaires / Tous
  const [filter, setFilter] = useState("mine"); // 'mine' | 'partners' | 'all'

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      const { data: etabs } = await supabase
        .from("etablissements")
        .select("id,nom,type,ville,actif,est_partenaire,groupement_id")
        .eq("structure_id", auth.structureId)
        .order("nom");
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

  // 0.55.29 : filtre Mes / Partenaires / Tous
  const filteredRows = rows.filter((e) => {
    if (filter === "mine") return !e.est_partenaire;
    if (filter === "partners") return e.est_partenaire;
    return true; // all
  });

  const tot = (k) => filteredRows.reduce((s, r) => s + (r[k] || 0), 0);
  const countMine = rows.filter((e) => !e.est_partenaire).length;
  const countPartners = rows.filter((e) => e.est_partenaire).length;

  function entrer(e) {
    if (e.est_partenaire) {
      // 0.55.29 : on ne peut pas "entrer" dans un partenaire
      router.push(`/etablissements?focus=${e.id}`);
      return;
    }
    auth.setEtab(e.id);
    router.push("/accueil");
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="COLLECTIVITÉ" title="Vue globale" accent="multi-établissements" sub={auth.structureNom} />
        <KpiRow tiles={[
          { label: "Établissements", value: filteredRows.length, icon: "ti-buildings", color: "#185FA5" },
          { label: lbl("patients", "Patients") + " (total)", value: tot("patients"), icon: "ti-users", color: "#7a6fb0" },
          { label: lbl("materiel", "Matériel") + " (total)", value: tot("materiels"), icon: "ti-armchair-2", color: "#142131" },
          { label: "DI en cours (total)", value: tot("di"), icon: "ti-tools", color: "#e35d5b" },
          { label: "À régler (total)", value: tot("aRegler").toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), icon: "ti-cash", color: "#5aa05a" },
        ]} />

        {/* 0.55.29 : Toggle filtre Mes / Partenaires / Tous */}
        <div style={{
          display: "flex",
          gap: 8,
          margin: "12px 0 18px",
          flexWrap: "wrap",
          alignItems: "center",
        }}>
          <span style={{ color: "#a0aeb9", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginRight: 8 }}>
            Filtre :
          </span>
          {[
            { key: "mine", label: `Mes établissements (${countMine})`, icon: "ti-building-hospital" },
            { key: "partners", label: `Partenaires (${countPartners})`, icon: "ti-building-community" },
            { key: "all", label: `Tous (${rows.length})`, icon: "ti-building" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              style={{
                background: filter === opt.key ? "linear-gradient(135deg, #185FA5, #7CC8C8)" : "rgba(255,255,255,.08)",
                color: filter === opt.key ? "#fff" : "#cfd5dd",
                border: `1px solid ${filter === opt.key ? "transparent" : "rgba(255,255,255,.15)"}`,
                padding: "7px 14px",
                borderRadius: 18,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "inherit",
              }}
            >
              <i className={`ti ${opt.icon}`} /> {opt.label}
            </button>
          ))}
        </div>

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel>
          : filteredRows.length === 0 ? <Panel><StateMsg>
              {filter === "partners" ? "Aucun établissement partenaire." : filter === "mine" ? <>Aucun établissement. <a style={{ color: "#2a5a5a", fontWeight: 600, cursor: "pointer" }} onClick={() => router.push("/collectivite")}>Créer un établissement</a></> : "Aucun établissement."}
            </StateMsg></Panel>
          : (
            <div className="mag-grid">
              {filteredRows.map((e) => (
                <div className="mag-tile" key={e.id} onClick={() => entrer(e)}>
                  <div className="mag-photo" style={{
                    background: e.est_partenaire
                      ? "linear-gradient(135deg,#7a6fb0,#bfa9e0)"
                      : "linear-gradient(135deg,#142131,#2a5a5a)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                  }}>
                    <i className={`ti ${e.est_partenaire ? "ti-building-community" : "ti-building-hospital"}`}
                       style={{ fontSize: 40, color: e.est_partenaire ? "#fff" : "#7CC8C8" }} />
                    {e.est_partenaire && (
                      <span style={{
                        position: "absolute", top: 8, right: 8,
                        background: "#7a6fb0", color: "#fff",
                        padding: "2px 8px", borderRadius: 8,
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
                      }}>
                        PARTENAIRE
                      </span>
                    )}
                  </div>
                  <div className="mag-body">
                    <p className="mag-name">{e.nom}</p>
                    <div className="mag-meta"><i className="ti ti-map-pin" /> {e.type || "—"}{e.ville ? ` · ${e.ville}` : ""}</div>
                    <div className="mag-stats">
                      <div className="mag-stat"><span className="v">{e.patients}</span><span className="l">patients</span></div>
                      <div className="mag-stat"><span className="v">{e.materiels}</span><span className="l">matériel</span></div>
                      <div className="mag-stat"><span className="v">{e.di}</span><span className="l">DI</span></div>
                    </div>
                    <button className="mag-cta" style={{ background: e.est_partenaire ? "#7a6fb0" : "#142131" }}>
                      <i className="ti ti-arrow-right" /> {e.est_partenaire ? "Voir la fiche partenaire" : "Entrer dans l'établissement"}
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
