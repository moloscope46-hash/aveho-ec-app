"use client";
import AdminGuard from "../../components/AdminGuard"; // 0.57.34 anti-régression admin
// =============================================================
//  app/admin/doublons-forces/page.js (Alpha 0.56.7)
//
//  Audit des doublons forces (établissements + groupements +
//  médecins prescripteurs) via similarité fuzzy pg_trgm.
// =============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel} from "../../ui";
const CIBLES = [
  { id: "etablissements", lbl: "Établissements", icon: "ti-building-hospital", color: "#185FA5", seuilDefault: 0.55 },
  { id: "groupements", lbl: "Groupements", icon: "ti-network", color: "#5aa05a", seuilDefault: 0.6 },
  { id: "medecins", lbl: "Médecins", icon: "ti-stethoscope", color: "#5a4a90", seuilDefault: 0.6 },
];

function DoublonsForcesPageInner() {
  const supabase = createClient();
  const auth = useAuth();
  const router = useRouter();
  const cart = useCart();
  const [tab, setTab] = useState("etablissements");
  const [stats, setStats] = useState(null);
  const [data, setData] = useState({ etablissements: [], groupements: [], medecins: [] });
  const [loading, setLoading] = useState(true);
  const [seuil, setSeuil] = useState(0.55);
  const [running, setRunning] = useState(false);
  const [ignoringId, setIgnoringId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [fusionModal, setFusionModal] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [showHistorique, setShowHistorique] = useState(false);

  useEffect(() => {
    if (!auth.ready) return;
    loadStats();
    loadHistorique();
    runDetection("etablissements", 0.55);
  }, [auth.ready]);

  async function loadHistorique() {
    const { data: h } = await supabase
      .from("doublons_fusions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistorique(h || []);
  }

  useEffect(() => {
    const cible = CIBLES.find(c => c.id === tab);
    if (cible) setSeuil(cible.seuilDefault);
  }, [tab]);

  async function loadStats() {
    const { data: statsData } = await supabase.rpc("doublons_stats", {
      p_seuil_etab: 0.55,
      p_seuil_grp: 0.6,
      p_seuil_med: 0.6,
    });
    setStats((statsData && statsData[0]) || null);
  }

  async function runDetection(targetTab = tab, targetSeuil = seuil) {
    setRunning(true);
    setMsg(null);
    const rpcMap = {
      etablissements: "detecter_doublons_etablissements",
      groupements: "detecter_doublons_groupements",
      medecins: "detecter_doublons_medecins",
    };
    const { data: results, error } = await supabase.rpc(rpcMap[targetTab], {
      p_seuil_similarite: targetSeuil,
      p_max_resultats: 100,
    });
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setData(prev => ({ ...prev, [targetTab]: results || [] }));
    }
    setRunning(false);
  }

  async function ignorer(cible, id1, id2, label1, label2) {
    const raison = prompt(`Marquer comme "non doublon" la paire :\n\n${label1}\n↕\n${label2}\n\nRaison (optionnelle) :`);
    if (raison === null) return; // annulé
    setIgnoringId(`${id1}-${id2}`);
    try {
      const cibleSingular = cible === "etablissements" ? "etablissement" : cible === "groupements" ? "groupement" : "medecin";
      const { error } = await supabase.rpc("ignorer_doublon", {
        p_cible: cibleSingular,
        p_id_1: id1,
        p_id_2: id2,
        p_raison: raison || null,
      });
      if (error) {
        setMsg({ type: "error", text: error.message });
      } else {
        setMsg({ type: "success", text: "Paire marquée comme ignorée — ne s'affichera plus" });
        await runDetection();
        await loadStats();
      }
    } finally {
      setIgnoringId(null);
    }
  }

  // 0.56.9 : ouverture modale fusion
  function openFusion(cible, d) {
    let p;
    if (cible === "etablissements") {
      p = {
        cible: "etablissement",
        ent1: { id: d.etab_1_id, label: d.etab_1_nom, sub: `${d.etab_1_cp || ""} ${d.etab_1_ville || ""}`.trim(), nb: null },
        ent2: { id: d.etab_2_id, label: d.etab_2_nom, sub: `${d.etab_2_cp || ""} ${d.etab_2_ville || ""}`.trim(), nb: null },
      };
    } else if (cible === "groupements") {
      p = {
        cible: "groupement",
        ent1: { id: d.grp_1_id, label: d.grp_1_nom, sub: `${d.grp_1_nb_etabs} établissement(s)`, nb: Number(d.grp_1_nb_etabs) },
        ent2: { id: d.grp_2_id, label: d.grp_2_nom, sub: `${d.grp_2_nb_etabs} établissement(s)`, nb: Number(d.grp_2_nb_etabs) },
      };
    } else if (cible === "medecins") {
      p = {
        cible: "medecin",
        ent1: { id: d.med_1_id, label: `Dr ${d.med_1_nom} ${d.med_1_prenom || ""}`.trim(), sub: `RPPS ${d.med_1_rpps || "—"} · ${d.med_1_nb_prescriptions} ordo`, nb: Number(d.med_1_nb_prescriptions) },
        ent2: { id: d.med_2_id, label: `Dr ${d.med_2_nom} ${d.med_2_prenom || ""}`.trim(), sub: `RPPS ${d.med_2_rpps || "—"} · ${d.med_2_nb_prescriptions} ordo`, nb: Number(d.med_2_nb_prescriptions) },
      };
    }
    setFusionModal(p);
  }

  const currentList = data[tab] || [];
  const currentCible = CIBLES.find(c => c.id === tab);

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMIN · AUDIT QUALITÉ"
          icon="ti-copy"
          title="Doublons forces"
          accent="(détection fuzzy)"
          sub="Détection automatique des doublons potentiels par similarité de nom (Levenshtein/trigrammes) + SIRET/FINESS/RPPS identiques"
        />

        {/* Stats globales */}
        {stats && (
          <Panel style={{ marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
              <i className="ti ti-alert-circle" /> Doublons potentiels détectés
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <Kpi label="Total" value={Number(stats.total).toLocaleString()} color="#c0392b" icon="ti-alert-triangle" big />
              <Kpi label="Établissements" value={Number(stats.nb_doublons_etablissements).toLocaleString()} color="#185FA5" icon="ti-building-hospital" />
              <Kpi label="Groupements" value={Number(stats.nb_doublons_groupements).toLocaleString()} color="#5aa05a" icon="ti-network" />
              <Kpi label="Médecins" value={Number(stats.nb_doublons_medecins).toLocaleString()} color="#5a4a90" icon="ti-stethoscope" />
              <Kpi label="Ignorés" value={Number(stats.nb_ignores).toLocaleString()} color="#6c7a89" icon="ti-eye-off" />
            </div>
          </Panel>
        )}

        {/* Onglets */}
        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CIBLES.map(c => (
              <TabBtn
                key={c.id}
                label={c.lbl}
                icon={c.icon}
                color={c.color}
                count={data[c.id]?.length || (stats ? Number(stats[`nb_doublons_${c.id}`]) : 0)}
                active={tab === c.id}
                onClick={() => setTab(c.id)}
              />
            ))}
          </div>
        </Panel>

        {/* Réglage seuil */}
        <Panel style={{ marginBottom: 12, background: "#f4f7fa" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 11, color: "#6c7a89", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.3 }}>
                Seuil de similarité ({(seuil * 100).toFixed(0)}%)
              </label>
              <input
                type="range"
                min="0.3"
                max="0.95"
                step="0.05"
                value={seuil}
                onChange={(e) => setSeuil(parseFloat(e.target.value))}
                style={{ width: "100%", marginTop: 4 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "#a0aeb9", marginTop: 2 }}>
                <span>30% (très permissif)</span><span>65%</span><span>95% (très strict)</span>
              </div>
            </div>
            <button
              onClick={() => runDetection()}
              disabled={running}
              style={{
                background: running ? "#a0aeb9" : currentCible.color, color: "#fff", border: "none",
                padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: running ? "wait" : "pointer", fontFamily: "inherit",
              }}
            >
              {running ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-search" />}
              {running ? " Analyse…" : " Relancer la détection"}
            </button>
          </div>
        </Panel>

        {msg && (
          <Panel style={{
            marginBottom: 12,
            background: msg.type === "success" ? "#dff5e0" : "#fce5e0",
            borderColor: msg.type === "success" ? "#bfe2bf" : "#f0c4be",
          }}>
            <p style={{ margin: 0, fontSize: 12, color: msg.type === "success" ? "#2e6f33" : "#7a2d23" }}>
              <i className={`ti ${msg.type === "success" ? "ti-check" : "ti-alert-circle"}`} /> {msg.text}
            </p>
          </Panel>
        )}

        {/* Liste des doublons */}
        {currentList.length === 0 && !running && (
          <Panel style={{ background: "#dff5e0", borderColor: "#bfe2bf", textAlign: "center", padding: 30 }}>
            <i className="ti ti-check" style={{ fontSize: 40, color: "#2e6f33" }} />
            <h3 style={{ margin: "10px 0 5px", color: "#2e6f33" }}>Aucun doublon détecté</h3>
            <p style={{ fontSize: 12, color: "#6c7a89", margin: 0 }}>
              Pour ce seuil ({(seuil * 100).toFixed(0)}%) et cette cible, les données sont propres.
              Essaie un seuil plus bas si tu cherches des doublons faibles.
            </p>
          </Panel>
        )}

        {tab === "etablissements" && currentList.map(d => (
          <DoublonCardEtab key={`${d.etab_1_id}-${d.etab_2_id}`} d={d} onIgnore={ignorer} onMerge={() => openFusion("etablissements", d)} ignoringId={ignoringId} />
        ))}
        {tab === "groupements" && currentList.map(d => (
          <DoublonCardGroupement key={`${d.grp_1_id}-${d.grp_2_id}`} d={d} onIgnore={ignorer} onMerge={() => openFusion("groupements", d)} ignoringId={ignoringId} />
        ))}
        {tab === "medecins" && currentList.map(d => (
          <DoublonCardMedecin key={`${d.med_1_id}-${d.med_2_id}`} d={d} onIgnore={ignorer} onMerge={() => openFusion("medecins", d)} ignoringId={ignoringId} />
        ))}

        {/* Modale fusion */}
        {fusionModal && (
          <FusionModal
            data={fusionModal}
            onClose={() => setFusionModal(null)}
            onDone={async () => {
              setFusionModal(null);
              setMsg({ type: "success", text: "Fusion effectuée avec succès" });
              await runDetection();
              await loadStats();
              await loadHistorique();
            }}
            supabase={supabase}
          />
        )}

        {/* Toggle historique */}
        {historique.length > 0 && (
          <Panel style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 13, flex: 1 }}>
                <i className="ti ti-history" /> Historique des fusions ({historique.length})
              </h3>
              <button onClick={() => setShowHistorique(!showHistorique)} style={btnGhost}>
                {showHistorique ? "Replier" : "Voir"} <i className={`ti ${showHistorique ? "ti-chevron-up" : "ti-chevron-down"}`} />
              </button>
            </div>
            {showHistorique && (
              <div style={{ marginTop: 10 }}>
                {historique.map(h => (
                  <HistoriqueRow key={h.id} h={h} supabase={supabase} onRollback={async () => {
                    await loadHistorique();
                    await runDetection();
                    await loadStats();
                  }} />
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Pédagogie */}
        <Panel style={{ marginTop: 14, background: "#fff8ec", borderColor: "#f0d59f" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#7a4f15" }}>
            <i className="ti ti-info-circle" /> Comment fonctionne la détection ?
          </h3>
          <ul style={{ fontSize: 12, color: "#7a4f15", margin: 0, paddingLeft: 18, lineHeight: 1.65 }}>
            <li><b>Établissements</b> : SIRET identique → score 100% (certain) · FINESS identique → 95% · sinon similarité du nom (trigrammes pg_trgm) + indication si même CP</li>
            <li><b>Groupements</b> : similarité de nom uniquement</li>
            <li><b>Médecins</b> : RPPS identique → 100% (certain) · sinon similarité nom + prénom concaténés</li>
            <li>Le <b>seuil de similarité</b> (slider) filtre les paires : 30% = très permissif (beaucoup de faux positifs), 95% = quasi-identique</li>
            <li>Tu peux <b>marquer une paire comme non-doublon</b> (icône œil barré) si ce sont 2 vraies entités distinctes — elle n'apparaîtra plus dans les futures détections</li>
            <li>L'extension PostgreSQL <code>pg_trgm</code> est utilisée pour calculer la similarité (très rapide grâce à l'index GIN trigramme)</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function TabBtn({ label, icon, color, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color : "transparent",
        color: active ? "#fff" : color,
        border: `1.5px solid ${color}`,
        padding: "8px 14px", borderRadius: 8,
        fontSize: 13, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      <i className={`ti ${icon}`} /> {label}
      <span style={{
        background: active ? "rgba(255,255,255,.25)" : `${color}22`,
        padding: "1px 7px", borderRadius: 10, fontSize: 10.5,
      }}>{count}</span>
    </button>
  );
}

function Kpi({ label, value, color, icon, big }) {
  return (
    <div style={{
      background: big ? `${color}11` : "#f4f7fa", borderRadius: 8, padding: "10px 12px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6c7a89", fontWeight: 600, textTransform: "uppercase" }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 11 }} /> {label}
      </div>
      <div style={{ fontSize: big ? 24 : 18, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ScoreBadge({ score, motif }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.95 ? "#c0392b" : score >= 0.8 ? "#EF9F27" : "#7a6fb0";
  const label = score >= 0.95 ? "Quasi-certain" : score >= 0.8 ? "Forte similarité" : "Suggestion";
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <span style={{
        background: color, color: "#fff", fontSize: 13, fontWeight: 700,
        padding: "4px 10px", borderRadius: 12,
      }}>
        {pct}%
      </span>
      <span style={{ fontSize: 10, color, fontWeight: 600 }}>{label}</span>
      {motif && <span style={{ fontSize: 10, color: "#6c7a89", fontStyle: "italic" }}>{motif}</span>}
    </div>
  );
}

function EntityCard({ children, color = "#185FA5" }) {
  return (
    <div style={{
      flex: 1, minWidth: 220,
      background: "#fff", border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`,
      borderRadius: 8, padding: 10,
    }}>
      {children}
    </div>
  );
}

function DoublonCardEtab({ d, onIgnore, onMerge, ignoringId }) {
  const id = `${d.etab_1_id}-${d.etab_2_id}`;
  return (
    <Panel style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <EntityCard color="#185FA5">
          <b style={{ fontSize: 13 }}>{d.etab_1_nom}</b>
          <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 3, lineHeight: 1.5 }}>
            {d.etab_1_siret && <div>SIRET <code style={{ fontFamily: "Consolas, monospace" }}>{d.etab_1_siret}</code></div>}
            {d.etab_1_finess && <div>FINESS <code style={{ fontFamily: "Consolas, monospace" }}>{d.etab_1_finess}</code></div>}
            {(d.etab_1_cp || d.etab_1_ville) && <div><i className="ti ti-map-pin" /> {d.etab_1_cp} {d.etab_1_ville}</div>}
          </div>
        </EntityCard>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 4px" }}>
          <i className="ti ti-arrows-left-right" style={{ fontSize: 22, color: "#a0aeb9" }} />
          <ScoreBadge score={d.score} motif={d.motif} />
        </div>
        <EntityCard color="#5aa05a">
          <b style={{ fontSize: 13 }}>{d.etab_2_nom}</b>
          <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 3, lineHeight: 1.5 }}>
            {d.etab_2_siret && <div>SIRET <code style={{ fontFamily: "Consolas, monospace" }}>{d.etab_2_siret}</code></div>}
            {d.etab_2_finess && <div>FINESS <code style={{ fontFamily: "Consolas, monospace" }}>{d.etab_2_finess}</code></div>}
            {(d.etab_2_cp || d.etab_2_ville) && <div><i className="ti ti-map-pin" /> {d.etab_2_cp} {d.etab_2_ville}</div>}
          </div>
        </EntityCard>
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
        <button
          onClick={() => onIgnore("etablissements", d.etab_1_id, d.etab_2_id, d.etab_1_nom, d.etab_2_nom)}
          disabled={ignoringId === id}
          style={btnGhost}
        >
          {ignoringId === id ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-eye-off" />}
          Marquer "non-doublon"
        </button>
        <button onClick={onMerge} style={btnMerge}>
          <i className="ti ti-git-merge" /> Fusionner
        </button>
      </div>
    </Panel>
  );
}

function DoublonCardGroupement({ d, onIgnore, onMerge, ignoringId }) {
  const id = `${d.grp_1_id}-${d.grp_2_id}`;
  return (
    <Panel style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <EntityCard color="#5aa05a">
          <b style={{ fontSize: 13 }}>{d.grp_1_nom}</b>
          <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 3 }}>
            <i className="ti ti-building-hospital" /> {Number(d.grp_1_nb_etabs).toLocaleString()} établissement{d.grp_1_nb_etabs > 1 ? "s" : ""}
          </div>
        </EntityCard>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 4px" }}>
          <i className="ti ti-arrows-left-right" style={{ fontSize: 22, color: "#a0aeb9" }} />
          <ScoreBadge score={d.score} motif="Nom similaire" />
        </div>
        <EntityCard color="#185FA5">
          <b style={{ fontSize: 13 }}>{d.grp_2_nom}</b>
          <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 3 }}>
            <i className="ti ti-building-hospital" /> {Number(d.grp_2_nb_etabs).toLocaleString()} établissement{d.grp_2_nb_etabs > 1 ? "s" : ""}
          </div>
        </EntityCard>
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
        <button
          onClick={() => onIgnore("groupements", d.grp_1_id, d.grp_2_id, d.grp_1_nom, d.grp_2_nom)}
          disabled={ignoringId === id}
          style={btnGhost}
        >
          {ignoringId === id ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-eye-off" />}
          Marquer "non-doublon"
        </button>
        <button onClick={onMerge} style={btnMerge}>
          <i className="ti ti-git-merge" /> Fusionner
        </button>
      </div>
    </Panel>
  );
}

function DoublonCardMedecin({ d, onIgnore, onMerge, ignoringId }) {
  const id = `${d.med_1_id}-${d.med_2_id}`;
  const label1 = `Dr ${d.med_1_nom} ${d.med_1_prenom || ""}`.trim();
  const label2 = `Dr ${d.med_2_nom} ${d.med_2_prenom || ""}`.trim();
  return (
    <Panel style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <EntityCard color="#5a4a90">
          <b style={{ fontSize: 13 }}>{label1}</b>
          <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 3, lineHeight: 1.5 }}>
            {d.med_1_rpps && <div>RPPS <code style={{ fontFamily: "Consolas, monospace" }}>{d.med_1_rpps}</code></div>}
            {d.med_1_specialite && <div><i className="ti ti-stethoscope" /> {d.med_1_specialite}</div>}
            {d.med_1_ville && <div><i className="ti ti-map-pin" /> {d.med_1_ville}</div>}
            <div><i className="ti ti-prescription" /> {Number(d.med_1_nb_prescriptions).toLocaleString()} ordo</div>
          </div>
        </EntityCard>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 4px" }}>
          <i className="ti ti-arrows-left-right" style={{ fontSize: 22, color: "#a0aeb9" }} />
          <ScoreBadge score={d.score} motif={d.motif} />
        </div>
        <EntityCard color="#7a6fb0">
          <b style={{ fontSize: 13 }}>{label2}</b>
          <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 3, lineHeight: 1.5 }}>
            {d.med_2_rpps && <div>RPPS <code style={{ fontFamily: "Consolas, monospace" }}>{d.med_2_rpps}</code></div>}
            {d.med_2_specialite && <div><i className="ti ti-stethoscope" /> {d.med_2_specialite}</div>}
            {d.med_2_ville && <div><i className="ti ti-map-pin" /> {d.med_2_ville}</div>}
            <div><i className="ti ti-prescription" /> {Number(d.med_2_nb_prescriptions).toLocaleString()} ordo</div>
          </div>
        </EntityCard>
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
        <button
          onClick={() => onIgnore("medecins", d.med_1_id, d.med_2_id, label1, label2)}
          disabled={ignoringId === id}
          style={btnGhost}
        >
          {ignoringId === id ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-eye-off" />}
          Marquer "non-doublon"
        </button>
        <button onClick={onMerge} style={btnMerge}>
          <i className="ti ti-git-merge" /> Fusionner
        </button>
      </div>
    </Panel>
  );
}

const btnGhost = {
  background: "#fff", color: "#6c7a89", border: "1px solid #d3d9e0",
  padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
};

const btnMerge = {
  background: "#c0392b", color: "#fff", border: "none",
  padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
};

function FusionModal({ data, onClose, onDone, supabase }) {
  const [gagnantId, setGagnantId] = useState(null);  // qui on garde
  const [preview, setPreview] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [merging, setMerging] = useState(false);
  const [raison, setRaison] = useState("");
  const [error, setError] = useState(null);

  const { cible, ent1, ent2 } = data;

  // Suggère automatiquement comme gagnant celui qui a le plus de FK
  useEffect(() => {
    if (ent1.nb !== null && ent2.nb !== null) {
      setGagnantId(ent1.nb >= ent2.nb ? ent1.id : ent2.id);
    }
  }, [ent1.id, ent2.id]);

  async function loadPreview(g, p) {
    if (!g || !p) return;
    setLoadingPreview(true);
    try {
      const { data: prev, error: err } = await supabase.rpc("preview_fusion_doublon", {
        p_cible: cible,
        p_gagnant_id: g,
        p_perdant_id: p,
      });
      if (err) {
        setError(err.message);
        setPreview([]);
      } else {
        setPreview(prev || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  useEffect(() => {
    if (gagnantId) {
      const perdantId = gagnantId === ent1.id ? ent2.id : ent1.id;
      loadPreview(gagnantId, perdantId);
    }
  }, [gagnantId]);

  async function executeMerge() {
    if (!gagnantId) return;
    const perdantId = gagnantId === ent1.id ? ent2.id : ent1.id;
    setMerging(true);
    setError(null);
    try {
      const { data: fusionId, error: err } = await supabase.rpc("fusionner_doublon", {
        p_cible: cible,
        p_gagnant_id: gagnantId,
        p_perdant_id: perdantId,
        p_raison: raison || null,
        p_merge_champs: true,
      });
      if (err) {
        setError(err.message);
        setMerging(false);
        return;
      }
      onDone();
    } catch (e) {
      setError(e.message);
      setMerging(false);
    }
  }

  const totalRows = preview.reduce((sum, r) => sum + Number(r.nb_rows), 0);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,33,49,.6)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, overflowY: "auto",
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, maxWidth: 700, width: "100%",
        padding: 24, maxHeight: "92vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, flex: 1, color: "#c0392b" }}>
            <i className="ti ti-git-merge" style={{ marginRight: 6 }} /> Fusion des doublons
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 26, color: "#a0aeb9", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <p style={{ fontSize: 12.5, color: "#6c7a89", margin: "0 0 14px" }}>
          Choisis l'entité à <b>conserver</b> (gagnant). L'autre sera <b>supprimée</b> et toutes ses références (prescriptions, contrats, etc.) seront migrées vers le gagnant.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <ChoixCard
            entity={ent1}
            selected={gagnantId === ent1.id}
            onClick={() => setGagnantId(ent1.id)}
            color="#5aa05a"
          />
          <ChoixCard
            entity={ent2}
            selected={gagnantId === ent2.id}
            onClick={() => setGagnantId(ent2.id)}
            color="#7a6fb0"
          />
        </div>

        {gagnantId && (
          <>
            <Panel style={{ marginBottom: 12, background: "#f4f7fa" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 12.5, color: "#142131" }}>
                <i className="ti ti-affiliate" /> Migration des références
              </h4>
              {loadingPreview && <p style={{ fontSize: 11, color: "#6c7a89" }}><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Analyse…</p>}
              {!loadingPreview && preview.length === 0 && (
                <p style={{ fontSize: 11, color: "#6c7a89", fontStyle: "italic" }}>Aucune référence à migrer — fusion sans effet de bord</p>
              )}
              {!loadingPreview && preview.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#6c7a89", marginBottom: 6 }}>
                    <b>{totalRows.toLocaleString()}</b> ligne(s) à migrer depuis le perdant vers le gagnant :
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                    <thead>
                      <tr style={{ background: "#fff" }}>
                        <th style={{ textAlign: "left", padding: 5, color: "#6c7a89", fontSize: 10, textTransform: "uppercase" }}>Table</th>
                        <th style={{ textAlign: "left", padding: 5, color: "#6c7a89", fontSize: 10, textTransform: "uppercase" }}>Colonne</th>
                        <th style={{ textAlign: "right", padding: 5, color: "#6c7a89", fontSize: 10, textTransform: "uppercase" }}>Lignes</th>
                        <th style={{ textAlign: "left", padding: 5, color: "#6c7a89", fontSize: 10, textTransform: "uppercase" }}>Action FK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #e3e9ee" }}>
                          <td style={{ padding: 5, fontFamily: "Consolas, monospace", color: "#185FA5" }}>{p.table_name}</td>
                          <td style={{ padding: 5, fontFamily: "Consolas, monospace", color: "#5a4a90" }}>{p.column_name}</td>
                          <td style={{ padding: 5, textAlign: "right", fontFamily: "Consolas, monospace", fontWeight: 700 }}>{Number(p.nb_rows).toLocaleString()}</td>
                          <td style={{ padding: 5, color: "#6c7a89" }}>{p.on_delete_action || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10.5, color: "#6c7a89", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.3 }}>Raison (optionnelle, conseillée)</label>
              <input
                type="text"
                value={raison}
                onChange={(e) => setRaison(e.target.value)}
                placeholder="Ex: doublon CSV import + saisie manuelle"
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12, marginTop: 4 }}
              />
            </div>

            <Panel style={{ marginBottom: 12, background: "#fff8ec", borderColor: "#f0d59f", padding: "10px 14px" }}>
              <p style={{ margin: 0, fontSize: 11.5, color: "#7a4f15" }}>
                <i className="ti ti-alert-triangle" /> <b>Action irréversible immédiatement.</b> Un snapshot du perdant est conservé pour un rollback éventuel via l'historique des fusions.
              </p>
            </Panel>
          </>
        )}

        {error && (
          <Panel style={{ background: "#fce5e0", borderColor: "#f0c4be", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#7a2d23" }}>
              <i className="ti ti-alert-circle" /> {error}
            </p>
          </Panel>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} disabled={merging} style={btnGhost}>Annuler</button>
          <button
            onClick={executeMerge}
            disabled={!gagnantId || merging || loadingPreview}
            style={{
              background: !gagnantId || merging ? "#a0aeb9" : "#c0392b",
              color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: merging ? "wait" : "pointer", fontFamily: "inherit",
            }}
          >
            {merging ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-git-merge" />}
            {merging ? " Fusion en cours…" : " Confirmer la fusion"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChoixCard({ entity, selected, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? `${color}15` : "#fff",
        border: `2px solid ${selected ? color : "#d3d9e0"}`,
        borderRadius: 8, padding: "12px 14px", textAlign: "left",
        cursor: "pointer", fontFamily: "inherit", position: "relative",
      }}
    >
      {selected && (
        <span style={{ position: "absolute", top: 6, right: 6, background: color, color: "#fff", padding: "1px 7px", borderRadius: 10, fontSize: 9.5, fontWeight: 700 }}>
          <i className="ti ti-check" /> GARDÉ
        </span>
      )}
      <b style={{ fontSize: 13, color: "#142131", display: "block", marginBottom: 4 }}>{entity.label}</b>
      <div style={{ fontSize: 11, color: "#6c7a89" }}>{entity.sub}</div>
      {entity.nb !== null && entity.nb !== undefined && (
        <div style={{ marginTop: 6, fontSize: 10, color }}>
          <i className="ti ti-link" /> {entity.nb} référence{entity.nb > 1 ? "s" : ""}
        </div>
      )}
    </button>
  );
}

function HistoriqueRow({ h, supabase, onRollback }) {
  const [rolling, setRolling] = useState(false);

  async function doRollback() {
    const raison = prompt(`Annuler la fusion ?\n\n${h.gagnant_label} ← ${h.perdant_label}\n\nLe perdant sera recréé à partir du snapshot, mais les FK déjà migrées resteront sur le gagnant.\n\nRaison du rollback :`);
    if (raison === null) return;
    setRolling(true);
    try {
      const { error } = await supabase.rpc("rollback_fusion", {
        p_fusion_id: h.id,
        p_raison: raison || null,
      });
      if (error) {
        alert("Erreur rollback : " + error.message);
      } else {
        onRollback();
      }
    } finally {
      setRolling(false);
    }
  }

  const cibleColor = h.cible === "etablissement" ? "#185FA5" : h.cible === "groupement" ? "#5aa05a" : "#5a4a90";

  return (
    <div style={{
      padding: "10px 0", borderBottom: "1px solid #f4f7fa",
      opacity: h.est_rollbacke ? 0.55 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ background: `${cibleColor}22`, color: cibleColor, padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{h.cible}</span>
        <b style={{ fontSize: 12 }}>{h.gagnant_label}</b>
        <i className="ti ti-arrow-left" style={{ color: "#a0aeb9" }} />
        <span style={{ fontSize: 12, color: "#6c7a89", textDecoration: h.est_rollbacke ? "line-through" : "none" }}>{h.perdant_label}</span>
        <span style={{ fontSize: 10, color: "#185FA5", background: "#dbe7f5", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
          <i className="ti ti-link" /> {h.nb_rows_migrees} migrée{h.nb_rows_migrees > 1 ? "s" : ""}
        </span>
        {h.est_rollbacke && (
          <span style={{ background: "#fff8ec", color: "#7a4f15", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
            <i className="ti ti-arrow-back-up" /> ROLLBACKÉE
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#a0aeb9" }}>
          {new Date(h.created_at).toLocaleString()}
        </span>
      </div>
      {h.raison && <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 4, fontStyle: "italic" }}>« {h.raison} »</div>}
      {!h.est_rollbacke && (
        <div style={{ marginTop: 6 }}>
          <button
            onClick={doRollback}
            disabled={rolling}
            style={{
              background: "#fff", color: "#c0392b", border: "1px solid #f0c4be",
              padding: "3px 8px", borderRadius: 5, fontSize: 10.5, fontWeight: 700,
              cursor: rolling ? "wait" : "pointer", fontFamily: "inherit",
            }}
          >
            {rolling ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-arrow-back-up" />}
            {rolling ? " Rollback…" : " Annuler cette fusion"}
          </button>
        </div>
      )}
    </div>
  );
}

// 0.57.34 : wrapper AdminGuard pour restreindre l'accès aux admins
export default function DoublonsForcesPage() {
  return (
    <AdminGuard>
      <DoublonsForcesPageInner />
    </AdminGuard>
  );
}
