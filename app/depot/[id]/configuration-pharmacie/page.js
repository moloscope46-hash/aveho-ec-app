"use client";
// =============================================================
//  /depot/[id]/configuration-pharmacie
//  Configurer + générer auto les rayons/emplacements/tiroirs
// =============================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import TopBar from "../../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../../components/ui-premium";

const COLOR = "#5aa05a";

export default function ConfigPharmaciePage() {
  const supabase = createClient();
  const params = useParams();
  const depotId = params.id;
  const auth = useAuth();
  
  const [depot, setDepot] = useState(null);
  const [config, setConfig] = useState({
    nb_rayons: 6,
    nb_niveaux_par_rayon: 5,
    nb_emplacements_par_niveau: 10,
    nb_tiroirs_par_emplacement: 1,
    zones_speciales: [{ nom: "Réfrigéré", temp_min: 2, temp_max: 8 }, { nom: "Coffre Stupéfiants", secur: true }],
    tiroirs_electroniques_actifs: false,
    modele_tiroir: "BD Pyxis MedStation",
    protocole_iot: "mqtt",
    url_api_iot: "",
    pharmacie_id: null,
  });
  const [pharmacies, setPharmacies] = useState([]);
  const [tiroirs, setTiroirs] = useState([]);
  const [rayons, setRayons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (auth.ready && depotId) load();
  }, [auth.ready, depotId]);

  async function load() {
    setLoading(true);
    const [d, c, p, r, t] = await Promise.all([
      supabase.from("depots").select("*").eq("id", depotId).maybeSingle(),
      supabase.from("depot_pharmacie_config").select("*").eq("depot_id", depotId).maybeSingle(),
      supabase.from("pharmacies").select("id, nom").eq("structure_id", auth.structureId),
      supabase.from("depot_rayons").select("*").eq("depot_id", depotId).order("code"),
      supabase.from("depot_tiroirs").select("*").eq("depot_id", depotId),
    ]);
    setDepot(d.data);
    if (c.data) setConfig({ ...config, ...c.data });
    setPharmacies(p.data || []);
    setRayons(r.data || []);
    setTiroirs(t.data || []);
    setLoading(false);
  }

  async function saveConfig() {
    const payload = {
      ...config,
      structure_id: auth.structureId,
      depot_id: depotId,
    };
    if (config.id) {
      await supabase.from("depot_pharmacie_config").update(payload).eq("id", config.id);
    } else {
      const r = await supabase.from("depot_pharmacie_config").insert(payload).select().single();
      if (r.data) setConfig({ ...config, ...r.data });
    }
    alert("✓ Configuration sauvegardée");
    load();
  }

  async function generer() {
    if (!confirm(`Générer ${config.nb_rayons} rayons × ${config.nb_niveaux_par_rayon} niveaux × ${config.nb_emplacements_par_niveau} emplacements × ${config.nb_tiroirs_par_emplacement} tiroirs = ${config.nb_rayons * config.nb_niveaux_par_rayon * config.nb_emplacements_par_niveau * config.nb_tiroirs_par_emplacement} tiroirs ?\n\nLes rayons existants seront SUPPRIMÉS et REGÉNÉRÉS.`)) return;
    setGenerating(true);
    
    // S'assurer que la config est sauvegardée d'abord
    await saveConfig();
    
    // Appel fonction SQL
    const { data, error } = await supabase.rpc("generer_rayons_pharmacie", { p_depot_id: depotId });
    setGenerating(false);
    
    if (error) { alert("Erreur : " + error.message); return; }
    alert(`✅ Génération réussie !\n\nRayons : ${data[0]?.rayons_crees || 0}\nEmplacements : ${data[0]?.emplacements_crees || 0}\nTiroirs : ${data[0]?.tiroirs_crees || 0}`);
    load();
  }

  if (loading) return <><TopBar /><PageShell color={COLOR} title="Chargement..." /></>;

  const totalTiroirs = config.nb_rayons * config.nb_niveaux_par_rayon * config.nb_emplacements_par_niveau * config.nb_tiroirs_par_emplacement;

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-building-warehouse"
        title={`Config Pharmacie · ${depot?.nom || "Dépôt"}`}
        subtitle="Génération automatique rayons/emplacements/tiroirs + IoT"
        badge={`${rayons.length} rayons · ${tiroirs.length} tiroirs`}
        actions={
          <>
            <button onClick={saveConfig} style={btnSec}>
              <i className="ti ti-device-floppy" /> Enregistrer config
            </button>
            <button onClick={generer} disabled={generating} style={btnPrim(COLOR)}>
              <i className={`ti ti-${generating ? "loader-2 av-spinning" : "rocket"}`} /> {generating ? "Génération..." : `Générer (${totalTiroirs} tiroirs)`}
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Config dimensions */}
          <ModernCard color={COLOR} variant="default" padding={18}>
            <h3 style={{ color: "#fff", margin: "0 0 14px", fontSize: 15, fontWeight: 800 }}>
              <i className="ti ti-ruler-2" style={{ color: COLOR, marginRight: 8 }} />
              Dimensions du dépôt
            </h3>
            <Field label="Pharmacie rattachée">
              <select value={config.pharmacie_id || ""} onChange={(e) => setConfig({ ...config, pharmacie_id: e.target.value })}>
                <option value="">— Aucune —</option>
                {pharmacies.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Nb rayons">
                <input type="number" min={1} max={50} value={config.nb_rayons} onChange={(e) => setConfig({ ...config, nb_rayons: parseInt(e.target.value) || 1 })} />
              </Field>
              <Field label="Nb niveaux/rayon">
                <input type="number" min={1} max={20} value={config.nb_niveaux_par_rayon} onChange={(e) => setConfig({ ...config, nb_niveaux_par_rayon: parseInt(e.target.value) || 1 })} />
              </Field>
              <Field label="Nb empl./niveau">
                <input type="number" min={1} max={30} value={config.nb_emplacements_par_niveau} onChange={(e) => setConfig({ ...config, nb_emplacements_par_niveau: parseInt(e.target.value) || 1 })} />
              </Field>
              <Field label="Nb tiroirs/empl.">
                <input type="number" min={1} max={5} value={config.nb_tiroirs_par_emplacement} onChange={(e) => setConfig({ ...config, nb_tiroirs_par_emplacement: parseInt(e.target.value) || 1 })} />
              </Field>
            </div>
            <div style={{
              marginTop: 14, padding: 14, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(90,160,90,.15), rgba(90,160,90,.05))",
              border: "1px solid rgba(90,160,90,.30)",
              textAlign: "center",
            }}>
              <div style={{ color: "#5aa05a", fontSize: 36, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{totalTiroirs}</div>
              <div style={{ color: "rgba(255,255,255,.6)", fontSize: 11, textTransform: "uppercase" }}>Tiroirs générés au total</div>
            </div>
          </ModernCard>

          {/* IoT tiroirs électroniques */}
          <ModernCard color="#EF9F27" variant="default" padding={18}>
            <h3 style={{ color: "#fff", margin: "0 0 14px", fontSize: 15, fontWeight: 800 }}>
              <i className="ti ti-cpu" style={{ color: "#EF9F27", marginRight: 8 }} />
              Tiroirs électroniques (IoT)
            </h3>
            <label style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "rgba(239,159,39,.10)", borderRadius: 10, cursor: "pointer", marginBottom: 12 }}>
              <input type="checkbox" checked={config.tiroirs_electroniques_actifs} onChange={(e) => setConfig({ ...config, tiroirs_electroniques_actifs: e.target.checked })}
                style={{ accentColor: "#EF9F27", width: 18, height: 18 }} />
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Activer les tiroirs électroniques</div>
                <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>Connexion IoT pour ouverture auto + détection scan</div>
              </div>
            </label>
            {config.tiroirs_electroniques_actifs && (
              <>
                <Field label="Modèle tiroir">
                  <select value={config.modele_tiroir || ""} onChange={(e) => setConfig({ ...config, modele_tiroir: e.target.value })}>
                    <option value="BD Pyxis MedStation">BD Pyxis MedStation</option>
                    <option value="Omnicell XR2">Omnicell XR2</option>
                    <option value="Aesynt MedCarousel">Aesynt MedCarousel</option>
                    <option value="Custom Raspberry Pi">Custom Raspberry Pi (GPIO)</option>
                  </select>
                </Field>
                <Field label="Protocole IoT">
                  <select value={config.protocole_iot || "mqtt"} onChange={(e) => setConfig({ ...config, protocole_iot: e.target.value })}>
                    <option value="mqtt">MQTT</option>
                    <option value="http_rest">HTTP REST</option>
                    <option value="websocket">WebSocket</option>
                    <option value="modbus">Modbus TCP</option>
                  </select>
                </Field>
                <Field label="URL/API IoT">
                  <input value={config.url_api_iot || ""} onChange={(e) => setConfig({ ...config, url_api_iot: e.target.value })} placeholder="mqtt://broker.local:1883" />
                </Field>
                <Field label="Token / clé API">
                  <input type="password" value={config.token_iot || ""} onChange={(e) => setConfig({ ...config, token_iot: e.target.value })} />
                </Field>
              </>
            )}
          </ModernCard>

          {/* Zones spéciales */}
          <ModernCard color="#7CC8C8" variant="default" padding={18} style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ color: "#fff", margin: "0 0 14px", fontSize: 15, fontWeight: 800 }}>
              <i className="ti ti-temperature" style={{ color: "#7CC8C8", marginRight: 8 }} />
              Zones spéciales (rayons dédiés)
            </h3>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginBottom: 10 }}>
              Les premiers rayons seront automatiquement assignés à ces zones lors de la génération.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {(config.zones_speciales || []).map((z, idx) => (
                <div key={idx} style={{
                  padding: 12, borderRadius: 10,
                  background: z.secur ? "rgba(212,94,94,.15)" : "rgba(124,200,200,.15)",
                  border: `1px solid ${z.secur ? "#D45E5E" : "#7CC8C8"}50`,
                }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
                    <i className={`ti ${z.secur ? "ti-lock" : "ti-snowflake"}`} /> {z.nom}
                  </div>
                  <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>
                    Rayon R{String(idx + 1).padStart(2, "0")}
                    {z.temp_min !== undefined && ` · ${z.temp_min}-${z.temp_max}°C`}
                    {z.secur && " · Sécurisé"}
                  </div>
                </div>
              ))}
            </div>
          </ModernCard>

          {/* Visualisation des rayons générés */}
          {rayons.length > 0 && (
            <ModernCard color={COLOR} variant="default" padding={18} style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ color: "#fff", margin: "0 0 14px", fontSize: 15, fontWeight: 800 }}>
                <i className="ti ti-layout-grid" style={{ color: COLOR, marginRight: 8 }} />
                Plan du dépôt généré
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(rayons.length, 6)}, 1fr)`, gap: 6 }}>
                {rayons.map(r => {
                  const nbTiroirsRayon = tiroirs.filter(t => t.rayon_id === r.id).length;
                  return (
                    <div key={r.id} style={{
                      padding: 10, borderRadius: 8,
                      background: r.est_securise ? "rgba(212,94,94,.10)" : r.est_refrigere ? "rgba(124,200,200,.10)" : "rgba(255,255,255,.04)",
                      border: `1px solid ${r.est_securise ? "#D45E5E" : r.est_refrigere ? "#7CC8C8" : "rgba(255,255,255,.10)"}50`,
                      textAlign: "center",
                    }}>
                      <i className={`ti ${r.est_securise ? "ti-lock" : r.est_refrigere ? "ti-snowflake" : "ti-stack-2"}`} style={{ fontSize: 22, color: r.est_securise ? "#D45E5E" : r.est_refrigere ? "#7CC8C8" : COLOR }} />
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 13, marginTop: 4, fontFamily: "monospace" }}>{r.code}</div>
                      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>{nbTiroirsRayon} tiroirs</div>
                      <div style={{ color: "rgba(255,255,255,.4)", fontSize: 9 }}>{r.zone}</div>
                    </div>
                  );
                })}
              </div>
            </ModernCard>
          )}
        </div>
      </PageShell>
    </>
  );
}

const btnPrim = (c) => ({
  padding: "10px 18px", borderRadius: 10,
  background: `linear-gradient(135deg, ${c}, ${c}cc)`,
  color: "#fff", border: "none",
  fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
  cursor: "pointer", boxShadow: `0 4px 12px ${c}50`,
});

const btnSec = {
  padding: "10px 16px", borderRadius: 10,
  background: "rgba(255,255,255,.10)", color: "#fff",
  border: "1px solid rgba(255,255,255,.20)",
  fontFamily: "Quicksand", fontWeight: 700, fontSize: 12,
  cursor: "pointer", marginRight: 8,
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
