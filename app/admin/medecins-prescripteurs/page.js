"use client";
// =============================================================
//  app/admin/medecins-prescripteurs/page.js (Alpha 0.56.5)
//
//  Annuaire local des médecins prescripteurs vus via OCR.
//  Affiche le statut de vérification (ANS / dump / non vérifié)
//  et permet de relancer une vérification à la demande.
// =============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import ContactActions from "../../ContactActions";
import RppsVerifyBadge from "../../RppsVerifyBadge";
import { PageHead, Panel, StateMsg } from "../../ui";
import { fetchWithAuth } from "../../../lib/fetchWithAuth";

export default function MedecinsPrescripteursPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [stats, setStats] = useState(null);
  const [medecins, setMedecins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [filterVerif, setFilterVerif] = useState("all"); // all | verifie | non_verifie
  const [verifyingId, setVerifyingId] = useState(null);

  useEffect(() => {
    if (!auth.ready) return;
    loadAll();
  }, [auth.ready]);

  async function loadAll() {
    setLoading(true);
    const [{ data: statsData }, { data: meds }] = await Promise.all([
      supabase.rpc("medecins_stats"),
      supabase.from("medecins_prescripteurs")
        .select("*")
        .order("derniere_prescription_date", { ascending: false, nullsLast: true })
        .order("nom")
        .limit(500),
    ]);
    setStats((statsData && statsData[0]) || null);
    setMedecins(meds || []);
    setLoading(false);
  }

  async function verifyNow(m) {
    if (!m.rpps) {
      alert("Ce médecin n'a pas de RPPS — impossible de vérifier automatiquement");
      return;
    }
    setVerifyingId(m.id);
    try {
      const res = await fetchWithAuth("/api/prescriptions/verify-rpps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rpps: m.rpps,
          nom_ocr: m.nom,
          prenom_ocr: m.prenom,
          specialite_ocr: m.specialite_libelle,
        }),
      });
      const data = await res.json();
      if (data.status === "match" || data.status === "divergences") {
        const o = data.official || {};
        await supabase.from("medecins_prescripteurs").update({
          civilite: m.civilite || o.civilite,
          prenom: m.prenom || o.prenom,
          profession_libelle: m.profession_libelle || o.profession,
          specialite_libelle: o.specialite || m.specialite_libelle,
          raison_sociale_lieu: m.raison_sociale_lieu || o.raison_sociale,
          finess: m.finess || o.finess,
          adresse: m.adresse || o.adresse,
          code_postal: m.code_postal || o.code_postal,
          ville: m.ville || o.ville,
          code_insee_commune: m.code_insee_commune || o.code_insee_commune,
          telephone: m.telephone || o.telephone,
          email: m.email || o.email,
          latitude: m.latitude || o.latitude,
          longitude: m.longitude || o.longitude,
          est_verifie: true,
          source_verification: data.source || "ANS FHIR",
          date_verification: new Date().toISOString(),
        }).eq("id", m.id);
        await loadAll();
      } else {
        alert(`Vérification : ${data.message || data.status}`);
      }
    } catch (e) {
      alert("Erreur de vérification : " + e.message);
    } finally {
      setVerifyingId(null);
    }
  }

  const filtered = medecins.filter(m => {
    if (filterVerif === "verifie" && !m.est_verifie) return false;
    if (filterVerif === "non_verifie" && m.est_verifie) return false;
    if (filter) {
      const f = filter.toLowerCase();
      return (m.nom || "").toLowerCase().includes(f)
        || (m.prenom || "").toLowerCase().includes(f)
        || (m.rpps || "").includes(f)
        || (m.specialite_libelle || "").toLowerCase().includes(f)
        || (m.ville || "").toLowerCase().includes(f);
    }
    return true;
  });

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMIN · MÉDECINS"
          icon="ti-stethoscope"
          title="Médecins prescripteurs"
          accent="(cache local + vérification ANS)"
          sub="Annuaire local construit automatiquement à chaque OCR d'ordonnance, avec vérification RPPS contre l'API ANS et le dump local"
        />

        {/* Stats */}
        {stats && (
          <Panel style={{ marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
              <i className="ti ti-chart-bar" /> Statistiques de la structure
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <Kpi label="Médecins total" value={Number(stats.total_medecins).toLocaleString()} color="#7a6fb0" icon="ti-stethoscope" />
              <Kpi label="Vérifiés ANS" value={Number(stats.verifies_ans).toLocaleString()} color="#5aa05a" icon="ti-shield-check" />
              <Kpi label="Vérifiés dump" value={Number(stats.verifies_dump).toLocaleString()} color="#185FA5" icon="ti-database-export" />
              <Kpi label="Non vérifiés" value={Number(stats.non_verifies).toLocaleString()} color="#c0392b" icon="ti-alert-circle" />
              <Kpi label="Prescriptions" value={Number(stats.total_prescriptions).toLocaleString()} color="#5a4a90" icon="ti-prescription" />
              <Kpi label="Dernière activité" value={stats.derniere_activite ? new Date(stats.derniere_activite).toLocaleDateString() : "—"} color="#6c7a89" icon="ti-clock" />
            </div>
          </Panel>
        )}

        {/* Filtres */}
        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrer par nom, RPPS, spécialité, ville…"
              style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12.5 }}
            />
            <select value={filterVerif} onChange={(e) => setFilterVerif(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12, background: "#fff" }}>
              <option value="all">Tous</option>
              <option value="verifie">Vérifiés uniquement</option>
              <option value="non_verifie">Non vérifiés</option>
            </select>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "#6c7a89" }}>
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </div>
        </Panel>

        {/* Liste */}
        {loading && <StateMsg type="loading">Chargement…</StateMsg>}
        {!loading && filtered.length === 0 && (
          <StateMsg type="empty">
            {filter || filterVerif !== "all" ? "Aucun résultat" : "Aucun médecin enregistré — ils apparaîtront automatiquement à chaque scan d'ordonnance"}
          </StateMsg>
        )}
        {!loading && filtered.length > 0 && (
          <Panel>
            {filtered.map(m => (
              <div key={m.id} style={{
                padding: "12px 0", borderBottom: "1px solid #f4f7fa",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <b style={{ fontSize: 13.5, color: "#142131" }}>
                        {m.civilite || "Dr"} {m.nom} {m.prenom}
                      </b>
                      {m.est_verifie ? (
                        <span style={{ background: "#dff5e0", color: "#2e6f33", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                          <i className="ti ti-shield-check" /> Vérifié · {m.source_verification || "ANS"}
                        </span>
                      ) : (
                        <span style={{ background: "#fff8ec", color: "#7a4f15", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                          <i className="ti ti-alert-triangle" /> Non vérifié
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#6c7a89", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {m.rpps && <span><i className="ti ti-hash" /> RPPS <code style={{ fontFamily: "Consolas, monospace" }}>{m.rpps}</code></span>}
                      {m.specialite_libelle && <span style={{ background: "#f3effa", color: "#5a4a90", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{m.specialite_libelle}</span>}
                      {m.ville && <span><i className="ti ti-map-pin" /> {m.ville}{m.code_postal && ` (${m.code_postal})`}</span>}
                      {m.nb_prescriptions > 0 && <span style={{ background: "#dbe7f5", color: "#185FA5", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                        <i className="ti ti-prescription" /> {m.nb_prescriptions} ordo
                      </span>}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <ContactActions entity={m} size="sm" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {!m.est_verifie && m.rpps && (
                      <button
                        onClick={() => verifyNow(m)}
                        disabled={verifyingId === m.id}
                        style={{ background: "#5aa05a", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: verifyingId === m.id ? "wait" : "pointer", fontFamily: "inherit" }}
                      >
                        {verifyingId === m.id ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-shield-check" />}
                        {verifyingId === m.id ? " Vérification…" : " Vérifier"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Panel>
        )}

        {/* Pédagogie */}
        <Panel style={{ marginTop: 14, background: "#fff8ec", borderColor: "#f0d59f" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#7a4f15" }}>
            <i className="ti ti-help-circle" /> Comment ça marche
          </h3>
          <ul style={{ fontSize: 12, color: "#7a4f15", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>À chaque <b>scan d'ordonnance</b>, le prescripteur est automatiquement ajouté à cet annuaire local</li>
            <li>Si un <b>RPPS valide</b> est fourni, l'app vérifie automatiquement contre l'<b>API ANS officielle</b> (ou le dump local en cas de blocage)</li>
            <li>Les données <b>verrouillées</b> (RPPS vérifié) servent à enrichir les ordonnances suivantes du même médecin</li>
            <li>Tu peux relancer une vérification manuellement avec le bouton <b>"Vérifier"</b> si le médecin a un RPPS</li>
            <li>Les stats de prescription (nb, première, dernière) sont mises à jour automatiquement via trigger SQL</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Kpi({ label, value, color, icon }) {
  return (
    <div style={{ background: "#f4f7fa", borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6c7a89", fontWeight: 600, textTransform: "uppercase" }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 11 }} /> {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}
