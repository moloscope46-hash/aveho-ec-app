"use client";
// =============================================================
//  app/equipes/page.js (Alpha 0.56.15)
//
//  Liste des équipes, filtrable par bâtiment et service.
//  Création / archivage d'équipes.
// =============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";

export default function EquipesPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [equipes, setEquipes] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBat, setFilterBat] = useState("");
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [newEquipe, setNewEquipe] = useState({ nom: "", description: "", batiment_id: "", couleur: "#185FA5" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!auth.ready) return;
    loadAll();
  }, [auth.ready, filterBat]);

  async function loadAll() {
    setLoading(true);
    const [e, b] = await Promise.all([
      supabase.rpc("equipes_avec_stats", { p_batiment_id: filterBat || null }),
      supabase.from("batiments").select("id, nom").order("nom"),
    ]);
    setEquipes(e.data || []);
    setBatiments(b.data || []);
    setLoading(false);
  }

  async function createEquipe() {
    if (!newEquipe.nom.trim()) { setMsg({ type: "error", text: "Le nom est obligatoire" }); return; }
    setSaving(true);
    const { error } = await supabase.from("equipes").insert({
      structure_id: auth.structureId,
      batiment_id: newEquipe.batiment_id || null,
      nom: newEquipe.nom.trim(),
      description: newEquipe.description || null,
      couleur: newEquipe.couleur,
      created_by: auth.user?.id,
    });
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setMsg({ type: "success", text: "Équipe créée" });
      setCreating(false);
      setNewEquipe({ nom: "", description: "", batiment_id: "", couleur: "#185FA5" });
      await loadAll();
    }
    setSaving(false);
  }

  async function archiveEquipe(id, label) {
    if (!confirm(`Archiver l'équipe "${label}" ? Elle disparaîtra de la liste mais les données sont conservées.`)) return;
    const { error } = await supabase.from("equipes").update({ archive: true }).eq("id", id);
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setMsg({ type: "success", text: "Équipe archivée" });
      await loadAll();
    }
  }

  const filtered = filter
    ? equipes.filter(e => (e.nom || "").toLowerCase().includes(filter.toLowerCase())
        || (e.description || "").toLowerCase().includes(filter.toLowerCase()))
    : equipes;

  // Group by bâtiment
  const grouped = {};
  filtered.forEach(e => {
    const key = e.batiment_id || "transversales";
    if (!grouped[key]) grouped[key] = { batiment_nom: e.batiment_nom || "Équipes transversales (sans bâtiment)", equipes: [] };
    grouped[key].equipes.push(e);
  });

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ÉQUIPES"
          icon="ti-users-group"
          title="Équipes"
          accent="(rattachées aux bâtiments + services)"
          sub="Une équipe regroupe des utilisateurs travaillant ensemble — rattachable à un bâtiment et à des services. Une équipe par défaut est créée automatiquement à chaque nouveau bâtiment."
        />

        {/* Filtres + création */}
        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Rechercher..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ flex: 1, minWidth: 180, padding: "8px 12px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13 }}
            />
            <select
              value={filterBat}
              onChange={(e) => setFilterBat(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13, background: "#fff" }}
            >
              <option value="">Tous les bâtiments</option>
              {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
            <button
              onClick={() => setCreating(true)}
              style={{ background: "#185FA5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-plus" /> Nouvelle équipe
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

        {/* Modal création */}
        {creating && (
          <Panel style={{ marginBottom: 12, background: "#fff8ec", borderColor: "#f0d59f" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#7a4f15" }}>
              <i className="ti ti-plus" /> Nouvelle équipe
            </h3>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                type="text"
                placeholder="Nom de l'équipe *"
                value={newEquipe.nom}
                onChange={(e) => setNewEquipe({ ...newEquipe, nom: e.target.value })}
                style={{ padding: "8px 12px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13 }}
              />
              <select
                value={newEquipe.batiment_id}
                onChange={(e) => setNewEquipe({ ...newEquipe, batiment_id: e.target.value })}
                style={{ padding: "8px 12px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13, background: "#fff" }}
              >
                <option value="">— Équipe transversale (sans bâtiment) —</option>
                {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
              </select>
              <textarea
                placeholder="Description (optionnel)"
                value={newEquipe.description}
                onChange={(e) => setNewEquipe({ ...newEquipe, description: e.target.value })}
                rows={2}
                style={{ padding: "8px 12px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label style={{ fontSize: 11, color: "#6c7a89" }}>Couleur :</label>
                <input
                  type="color"
                  value={newEquipe.couleur}
                  onChange={(e) => setNewEquipe({ ...newEquipe, couleur: e.target.value })}
                  style={{ width: 40, height: 30, border: "1px solid #d3d9e0", borderRadius: 4, cursor: "pointer" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                <button onClick={() => setCreating(false)} disabled={saving} style={btnGhost}>Annuler</button>
                <button onClick={createEquipe} disabled={saving} style={{
                  background: saving ? "#a0aeb9" : "#5aa05a", color: "#fff", border: "none",
                  padding: "8px 16px", borderRadius: 6, fontWeight: 700, fontSize: 12,
                  cursor: saving ? "wait" : "pointer", fontFamily: "inherit",
                }}>
                  {saving ? "Création…" : "Créer l'équipe"}
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* Liste */}
        {loading && <StateMsg type="loading">Chargement…</StateMsg>}
        {!loading && filtered.length === 0 && (
          <StateMsg type="empty">
            {filter ? "Aucun résultat" : "Aucune équipe pour l'instant — clique 'Nouvelle équipe' pour commencer, ou crée un nouveau bâtiment (une équipe par défaut sera créée automatiquement)"}
          </StateMsg>
        )}
        {!loading && Object.keys(grouped).map(key => {
          const g = grouped[key];
          return (
            <Panel key={key} style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#142131" }}>
                <i className="ti ti-building" /> {g.batiment_nom}
                <span style={{ marginLeft: 8, background: "#dbe7f5", color: "#185FA5", padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                  {g.equipes.length} équipe{g.equipes.length > 1 ? "s" : ""}
                </span>
              </h3>
              <div style={{ display: "grid", gap: 6 }}>
                {g.equipes.map(e => <EquipeRow key={e.id} e={e} onOpen={() => router.push(`/equipe/${e.id}`)} onArchive={() => archiveEquipe(e.id, e.nom)} />)}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function EquipeRow({ e, onOpen, onArchive }) {
  // 0.62.16 : icône déduite du nom de l'équipe (mots-clés) avec fallback générique
  const guessIcon = (nom) => {
    const n = (nom || "").toLowerCase();
    if (/infirm|soin|nurse/.test(n)) return "ti-medical-cross";
    if (/medecin|docteur|doctor/.test(n)) return "ti-stethoscope";
    if (/aide.soign|asd/.test(n)) return "ti-heart-handshake";
    if (/kine|reeduc/.test(n)) return "ti-massage";
    if (/pharma|prep/.test(n)) return "ti-pill";
    if (/admin|secret|bureau/.test(n)) return "ti-id-badge-2";
    if (/logist|stock|magasin|appro/.test(n)) return "ti-truck-loading";
    if (/livr|chauff|tournee/.test(n)) return "ti-truck-delivery";
    if (/mainten|tech|sav|atelier/.test(n)) return "ti-tool";
    if (/nuit|garde/.test(n)) return "ti-moon";
    if (/jour|matin/.test(n)) return "ti-sun";
    if (/restau|cuisin|repas/.test(n)) return "ti-tools-kitchen-2";
    if (/menag|nettoy|propret/.test(n)) return "ti-spray";
    if (/anim|loisir/.test(n)) return "ti-music";
    if (/direction|cadre|chef/.test(n)) return "ti-crown";
    return "ti-users-group";
  };
  const icone = e.icone || guessIcon(e.nom);
  const couleur = e.couleur || "#185FA5";
  return (
    <div style={{
      padding: 10, background: "#f4f7fa", borderRadius: 6,
      borderLeft: `3px solid ${couleur}`,
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    }}>
      {/* 0.62.16 : icône d'équipe */}
      <div style={{
        width: 38, height: 38, background: `${couleur}1A`, color: couleur,
        borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <i className={`ti ${icone}`} style={{ fontSize: 20 }} />
      </div>
      <div style={{ flex: 1, minWidth: 180, cursor: "pointer" }} onClick={onOpen}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <b style={{ fontSize: 13, color: "#142131" }}>{e.nom}</b>
          {e.est_par_defaut && (
            <span style={{ background: "#fff5dc", color: "#7a4f15", fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>
              <i className="ti ti-star" /> PAR DÉFAUT
            </span>
          )}
        </div>
        {e.description && (
          <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2, fontStyle: "italic" }}>{e.description}</div>
        )}
        <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span><i className="ti ti-users" /> {Number(e.nb_membres).toLocaleString()} membre{e.nb_membres > 1 ? "s" : ""}</span>
          <span><i className="ti ti-stack" /> {Number(e.nb_services).toLocaleString()} service{e.nb_services > 1 ? "s" : ""}</span>
          {e.services_noms?.length > 0 && (
            <span style={{ color: "#5a4a90", fontStyle: "italic" }}>
              {e.services_noms.slice(0, 3).join(", ")}{e.services_noms.length > 3 && ` +${e.services_noms.length - 3}`}
            </span>
          )}
        </div>
      </div>
      <button onClick={onOpen} style={btnGhost}>
        <i className="ti ti-eye" /> Détails
      </button>
      <button onClick={onArchive} style={{ ...btnGhost, color: "#c0392b" }}>
        <i className="ti ti-archive" />
      </button>
    </div>
  );
}

const btnGhost = {
  background: "#fff", color: "#142131", border: "1px solid #d3d9e0",
  padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
};
