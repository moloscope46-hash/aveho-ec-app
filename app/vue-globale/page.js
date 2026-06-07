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
import EtabPhoto from "../components/EtabPhoto";
import { logger } from "../../lib/logger";

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
      try {
        // 0.62.71 : charge plus de champs pour grosse base contact + infos sur tuiles
        const [resMine, resPartners, pa, ma, di, cm, had] = await Promise.all([
          supabase
            .from("etablissements")
            .select("id,nom,type,ville,cp,adresse,telephone,email,siret,finess,capacite,latitude,longitude,actif,est_partenaire,est_had,had_id,logo_url")
            .eq("structure_id", auth.structureId)
            .order("nom"),
          // 0.62.100 : enlevé .eq("archive", false) qui plantait en 400
          // 0.62.104 : SELECT minimal défensif (colonnes optionnelles manquantes sur certains schémas)
          supabase
            .from("etablissements_partenaires")
            .select("id,nom,type,ville,cp,adresse,telephone,email")
            .eq("structure_id", auth.structureId)
            .order("nom"),
          supabase.from("patients").select("id,etablissement_id"),
          supabase.from("materiels").select("id,etablissement_id,etat"),
          supabase.from("interventions").select("id,etablissement_id,statut"),
          supabase.from("commandes").select("id,etablissement_id,total,statut"),
          // 0.62.71 : récup HAD pour afficher dans les tuiles
          supabase.from("had").select("id,nom,code,type").eq("structure_id", auth.structureId),
        ]);

        const hadById = Object.fromEntries((had?.data || []).map(h => [h.id, h]));

        // 1) Mes établissements (non-partenaires)
        const mineEtabs = (resMine.data || []).filter((e) => !e.est_partenaire);
        const mineRows = mineEtabs.map((e) => ({
          ...e,
          est_partenaire: false,
          source: "mine",
          had: e.had_id ? hadById[e.had_id] : null,
          patients: (pa.data || []).filter((x) => x.etablissement_id === e.id).length,
          materiels: (ma.data || []).filter((x) => x.etablissement_id === e.id).length,
          di: (di.data || []).filter((x) => x.etablissement_id === e.id && x.statut !== "Clôturée").length,
          commandes: (cm.data || []).filter((x) => x.etablissement_id === e.id).length,
          aRegler: (cm.data || []).filter((x) => x.etablissement_id === e.id && x.statut !== "Livrée").reduce((s, c) => s + Number(c.total || 0), 0),
        }));

        // 2) Partenaires : nouvelle table dédiée + fallback legacy est_partenaire=true
        const partnersFromNewTable = (resPartners.data || []).map((p) => ({
          ...p,
          est_partenaire: true,
          source: "partner_table",
          patients: p.link_to_etablissement_id ? (pa.data || []).filter((x) => x.etablissement_id === p.link_to_etablissement_id).length : 0,
          materiels: p.link_to_etablissement_id ? (ma.data || []).filter((x) => x.etablissement_id === p.link_to_etablissement_id).length : 0,
          di: 0,
          commandes: 0,
          aRegler: 0,
        }));

        // Legacy
        const legacyPartnerIds = partnersFromNewTable.map((p) => p.link_to_etablissement_id).filter(Boolean);
        const legacyPartners = (resMine.data || [])
          .filter((e) => e.est_partenaire && !legacyPartnerIds.includes(e.id))
          .map((e) => ({
            ...e,
            source: "partner_legacy",
            patients: 0, materiels: 0, di: 0, commandes: 0, aRegler: 0,
          }));

        setRows([...mineRows, ...partnersFromNewTable, ...legacyPartners]);
      } catch (e) {
        logger.error("[VueGlobale] load failed:", e);
      } finally {
        setLoading(false);
      }
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
            <div className="av-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
              {filteredRows.map((e) => (
                <div key={e.id} data-3d="true" data-shimmer="true" onClick={() => entrer(e)} style={{
                  background: "#fff",
                  border: `1px solid ${e.est_partenaire ? "#7a6fb030" : "#185FA530"}`,
                  borderLeft: `4px solid ${e.est_partenaire ? "#7a6fb0" : (e.est_had ? "#EF9F27" : "#185FA5")}`,
                  borderRadius: 14, overflow: "hidden", cursor: "pointer",
                  color: e.est_partenaire ? "#7a6fb0" : (e.est_had ? "#EF9F27" : "#185FA5"),
                }}>
                  {/* Photo bannière */}
                  <div style={{ position: "relative", overflow: "hidden", height: 120 }}>
                    <EtabPhoto nom={e.nom} ville={e.ville} type={e.type} height={120} borderRadius={0} />
                    {/* Badges */}
                    <div style={{ position: "absolute", top: 8, right: 8, display: "flex", flexDirection: "column", gap: 4, zIndex: 2 }}>
                      {e.est_partenaire && (
                        <span style={{ background: "#7a6fb0", color: "#fff", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.4, boxShadow: "0 2px 6px rgba(122,111,176,.4)" }}>
                          PARTENAIRE
                        </span>
                      )}
                      {e.est_had && (
                        <span style={{ background: "#EF9F27", color: "#fff", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.4, boxShadow: "0 2px 6px rgba(239,159,39,.4)" }}>
                          HAD
                        </span>
                      )}
                      {e.had && !e.est_had && (
                        <span style={{ background: "rgba(239,159,39,.85)", color: "#fff", padding: "3px 8px", borderRadius: 6, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3 }}>
                          🏠 {e.had.code || "HAD"}
                        </span>
                      )}
                      {e.type_relation && (
                        <span style={{ background: "rgba(255,255,255,.95)", color: "#7a6fb0", padding: "3px 8px", borderRadius: 6, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3 }}>
                          {e.type_relation.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* Logo en bas-gauche si dispo */}
                    {e.logo_url && (
                      <img src={e.logo_url} alt="" style={{
                        position: "absolute", bottom: 8, left: 8,
                        width: 38, height: 38, borderRadius: 8,
                        background: "#fff", padding: 3, objectFit: "contain",
                        boxShadow: "0 3px 8px rgba(0,0,0,.2)",
                        zIndex: 2,
                      }} />
                    )}
                  </div>

                  <div style={{ padding: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#142131", lineHeight: 1.2 }}>{e.nom}</h3>
                    <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <span><i className="ti ti-tag" /> {e.type || "—"}</span>
                      {e.ville && <span><i className="ti ti-map-pin" /> {e.ville}{e.cp ? ` (${e.cp})` : ""}</span>}
                      {e.capacite && <span><i className="ti ti-bed" /> {e.capacite} lits</span>}
                    </div>

                    {/* Contact rapide */}
                    {(e.telephone || e.email) && (
                      <div style={{ marginTop: 8, padding: "6px 8px", background: "#fafbfc", borderRadius: 6, fontSize: 11, color: "#5a6878" }}>
                        {e.telephone && <div><i className="ti ti-phone" style={{ color: "#5aa05a" }} /> <span style={{ fontFamily: "Consolas, monospace" }}>{e.telephone}</span></div>}
                        {e.email && <div style={{ marginTop: 2 }}><i className="ti ti-mail" style={{ color: "#185FA5" }} /> <span style={{ fontSize: 10.5 }}>{e.email}</span></div>}
                        {e.contact_nom && <div style={{ marginTop: 2 }}><i className="ti ti-user" style={{ color: "#7a6fb0" }} /> {e.contact_nom}</div>}
                      </div>
                    )}

                    {/* Identifiants pro */}
                    {(e.finess || e.siret) && (
                      <div style={{ marginTop: 6, fontSize: 10, color: "#8a98a8", fontFamily: "Consolas, monospace" }}>
                        {e.finess && <span>FINESS {e.finess}</span>}
                        {e.finess && e.siret && " · "}
                        {e.siret && <span>SIRET {e.siret.slice(0, 9)}…</span>}
                      </div>
                    )}

                    {/* Stats : 4 mini-pills */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginTop: 10, paddingTop: 10, borderTop: "1px solid #f4f7fa" }}>
                      <MiniStat icon="ti-users"       value={e.patients}  label="Patients" color="#7a6fb0" />
                      <MiniStat icon="ti-armchair-2"  value={e.materiels} label="Matériel" color="#142131" />
                      <MiniStat icon="ti-tools"       value={e.di}        label="DI"       color="#e35d5b" />
                      <MiniStat icon="ti-shopping-cart" value={e.commandes} label="Cmd"   color="#5aa05a" />
                    </div>

                    {/* CTA */}
                    <button style={{
                      marginTop: 10, width: "100%",
                      background: e.est_partenaire
                        ? "linear-gradient(135deg, #7a6fb0, #5e4a8c)"
                        : "linear-gradient(135deg, #185FA5, #134e87)",
                      color: "#fff", border: "none",
                      padding: "8px 12px", borderRadius: 8,
                      fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 5,
                      boxShadow: `0 3px 10px ${e.est_partenaire ? "rgba(122,111,176,.3)" : "rgba(24,95,165,.3)"}`,
                    }}>
                      <i className="ti ti-arrow-right" /> {e.est_partenaire ? "Voir la fiche" : "Entrer"}
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

function MiniStat({ icon, value, label, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 14 }} />
      <div style={{ fontSize: 14, fontWeight: 800, color: "#142131", lineHeight: 1 }}>{value || 0}</div>
      <div style={{ fontSize: 9, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}
