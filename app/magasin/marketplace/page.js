"use client";
// =============================================================
//  /magasin/marketplace — Marketplace inter-magasins (0.61.9)
//  Réassorts urgents : magasins proposent ou demandent des articles
// =============================================================
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";
import { MarketplaceChat } from "../../components/MarketplaceChat";

const URGENCES = {
  normale: { lbl: "Normale", col: "#5a8f8f", ic: "⚪" },
  urgent: { lbl: "Urgent", col: "#EF9F27", ic: "🟠" },
  critique: { lbl: "Critique", col: "#e35d5b", ic: "🔴" },
};

const STATUTS = {
  active: { lbl: "✓ Active", col: "#5aa05a" },
  en_negociation: { lbl: "💬 Négociation", col: "#EF9F27" },
  acceptee: { lbl: "✓ Acceptée", col: "#185FA5" },
  expiree: { lbl: "⏰ Expirée", col: "#e35d5b" },
  annulee: { lbl: "⊘ Annulée", col: "#8a98a8" },
};

const empty = {
  type_offre: "demande", urgence: "normale",
  libelle: "", quantite: 1, unite: "unité",
  prix_propose_ht: "", conditions: "",
  delai_max_jours: 7, date_limite: "",
  zone_geographique: "regionale", rayon_km: 100,
  statut: "active",
};

export default function MarketplacePage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [offres, setOffres] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [filterType, setFilterType] = useState("");
  const [filterUrgence, setFilterUrgence] = useState("");
  const [filterStatut, setFilterStatut] = useState("active");
  const [tab, setTab] = useState("toutes");  // toutes | mes-offres | demandes-vers-moi
  const [viewMode, setViewMode] = useState("liste"); // 0.62.0 : liste | carte
  const [chatOffre, setChatOffre] = useState(null); // 0.62.0 : chat realtime
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId, tab]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    let q = supabase.from("marketplace_offres").select("*").order("created_at", { ascending: false });
    if (tab === "mes-offres" && magasinCtx.magasinId) q = q.eq("magasin_emetteur_id", magasinCtx.magasinId);
    if (tab === "demandes-vers-moi" && magasinCtx.magasinId) q = q.eq("magasin_repondeur_id", magasinCtx.magasinId);
    const [o, m] = await Promise.all([
      tryFetch(q),
      tryFetch(supabase.from("magasins_fournisseurs").select("id, nom, ville")),
    ]);
    setOffres(o);
    setMagasins(m);
    setLoading(false);
  }

  function openCreate() { setForm({ ...empty }); setEditing({ mode: "create" }); }
  function openView(o) { setForm({ ...empty, ...o }); setEditing({ mode: "view", data: o }); }

  async function save() {
    if (!form.libelle.trim()) { alert("Description obligatoire"); return; }
    setSaving(true);
    try {
      const payload = {
        magasin_emetteur_id: magasinCtx.magasinId || null,
        structure_id: auth.structureId,
        type_offre: form.type_offre,
        urgence: form.urgence,
        libelle: form.libelle.trim(),
        quantite: form.quantite ? parseFloat(form.quantite) : null,
        unite: form.unite,
        prix_propose_ht: form.prix_propose_ht ? parseFloat(form.prix_propose_ht) : null,
        conditions: form.conditions?.trim() || null,
        delai_max_jours: form.delai_max_jours || null,
        date_limite: form.date_limite || null,
        zone_geographique: form.zone_geographique,
        rayon_km: form.rayon_km || null,
        statut: form.statut,
        updated_at: new Date().toISOString(),
      };
      if (editing.mode === "create") {
        payload.created_by = auth.user?.id;
        const r = await supabase.from("marketplace_offres").insert(payload);
        if (r.error) throw r.error;
      } else {
        const r = await supabase.from("marketplace_offres").update(payload).eq("id", editing.data.id);
        if (r.error) throw r.error;
      }
      setEditing(null);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  async function repondre(o) {
    const msg = prompt(`Réponds à l'offre "${o.libelle}" :\n(prix négocié optionnel à mettre dans la conditions)`);
    if (!msg?.trim()) return;
    try {
      await supabase.from("marketplace_offres").update({
        magasin_repondeur_id: magasinCtx.magasinId,
        message_repondeur: msg,
        statut: "en_negociation",
      }).eq("id", o.id);
      await supabase.from("marketplace_messages").insert({
        offre_id: o.id, user_id: auth.user?.id, magasin_id: magasinCtx.magasinId, message: msg,
      });
      await reload();
      alert("✓ Réponse envoyée. Le magasin émetteur a été notifié.");
    } catch (e) { alert("Erreur : " + e.message); }
  }

  const filtered = offres.filter(o => {
    if (filterType && o.type_offre !== filterType) return false;
    if (filterUrgence && o.urgence !== filterUrgence) return false;
    if (filterStatut && o.statut !== filterStatut) return false;
    return true;
  });

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <PageHead icon="ti-shopping-cart-plus" title="Marketplace inter-magasins" subtitle="Réassorts urgents · Échanges entre magasins fournisseurs" />
            <Btn variant="primary" icon="ti-plus" onClick={openCreate}>Nouvelle offre</Btn>
          </div>

          {/* Bandeau */}
          <Panel style={{ background: "rgba(122,111,176,.08)", borderLeft: "4px solid #7a6fb0" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <i className="ti ti-info-circle" style={{ color: "#7a6fb0", fontSize: 22, marginTop: 2 }} />
              <div style={{ fontSize: 12.5, color: "#5a6878", lineHeight: 1.6 }}>
                <b>Marketplace = réassorts urgents inter-magasins.</b><br/>
                • <b>Demande</b> : j'ai besoin d'un article rapidement, autres magasins peuvent répondre<br/>
                • <b>Offre</b> : j'ai un surstock que je peux vendre/transférer à un autre magasin<br/>
                Le workflow : Création → Négociation → Acceptation → Transfert effectif via tournée
              </div>
            </div>
          </Panel>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { v: "toutes", lbl: "🌐 Toutes" },
                { v: "mes-offres", lbl: "📤 Mes offres" },
                { v: "demandes-vers-moi", lbl: "📥 Demandes reçues" },
              ].map(t => (
                <button key={t.v} onClick={() => setTab(t.v)} style={{
                  padding: "8px 16px", border: "none",
                  borderTopLeftRadius: 8, borderTopRightRadius: 8,
                  background: tab === t.v ? "#fff" : "rgba(255,255,255,.5)",
                  color: tab === t.v ? "#7a6fb0" : "#5a6878",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  borderBottom: tab === t.v ? "3px solid #7a6fb0" : "3px solid transparent",
                }}>{t.lbl}</button>
              ))}
            </div>
            {/* 0.62.0 : toggle vue liste/carte */}
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { v: "liste", ic: "ti-list", lbl: "Liste" },
                { v: "carte", ic: "ti-map-2", lbl: "Carte" },
              ].map(m => (
                <button key={m.v} onClick={() => setViewMode(m.v)} style={{
                  padding: "6px 12px", border: "1px solid #cfd8e0",
                  background: viewMode === m.v ? "#7a6fb0" : "#fff",
                  color: viewMode === m.v ? "#fff" : "#5a6878",
                  borderRadius: 6, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}><i className={`ti ${m.ic}`} /> {m.lbl}</button>
              ))}
            </div>
          </div>

          {/* Filtres */}
          <Panel style={{ marginTop: 0, borderTopLeftRadius: 0 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}>
                <option value="">Tous types</option>
                <option value="demande">📥 Demandes</option>
                <option value="offre">📤 Offres</option>
              </select>
              <select value={filterUrgence} onChange={(e) => setFilterUrgence(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}>
                <option value="">Toutes urgences</option>
                {Object.entries(URGENCES).map(([v, u]) => <option key={v} value={v}>{u.ic} {u.lbl}</option>)}
              </select>
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}>
                <option value="">Tous statuts</option>
                {Object.entries(STATUTS).map(([v, s]) => <option key={v} value={v}>{s.lbl}</option>)}
              </select>
            </div>

            {/* Liste offres */}
            <h3 style={{ margin: "0 0 12px", color: "#7a6fb0" }}>📦 Offres ({filtered.length})</h3>
            {viewMode === "carte" ? (
              <MarketplaceMap offres={filtered.filter(o => o.point_lat && o.point_lng)} onSelect={openView} />
            ) : loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
            : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-shopping-cart-off" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 10 }} />
                Aucune offre. <Btn variant="ghost" onClick={openCreate}>Créer la 1ère</Btn>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,360px))", gap: 12, justifyContent: "start" }}>
                {filtered.map(o => {
                  const urg = URGENCES[o.urgence] || URGENCES.normale;
                  const st = STATUTS[o.statut] || STATUTS.active;
                  const isMine = o.magasin_emetteur_id === magasinCtx.magasinId;
                  const magEm = magasins.find(m => m.id === o.magasin_emetteur_id);
                  return (
                    <div key={o.id} onClick={() => openView(o)} style={{
                      background: "#fff", border: `1px solid ${urg.col}33`, borderLeft: `4px solid ${urg.col}`,
                      borderRadius: 10, padding: 14, cursor: "pointer",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                            <span style={{ padding: "2px 6px", background: o.type_offre === "demande" ? "rgba(239,159,39,.15)" : "rgba(94,160,90,.15)", color: o.type_offre === "demande" ? "#EF9F27" : "#5aa05a", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                              {o.type_offre === "demande" ? "📥 Demande" : "📤 Offre"}
                            </span>
                            <span style={{ fontSize: 11 }}>{urg.ic}</span>
                            {isMine && <span style={{ padding: "2px 6px", background: "#142131", color: "#fff", borderRadius: 3, fontSize: 9, fontWeight: 700 }}>👤 Moi</span>}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#142131" }}>{o.libelle}</div>
                          {magEm && <div style={{ fontSize: 11, color: "#8a98a8" }}>🏬 {magEm.nom}{magEm.ville && ` (${magEm.ville})`}</div>}
                        </div>
                        <span style={{ padding: "2px 6px", borderRadius: 4, background: `${st.col}15`, color: st.col, fontSize: 10, fontWeight: 700 }}>{st.lbl}</span>
                      </div>
                      <div style={{ marginTop: 6, padding: 8, background: "#fafbfc", borderRadius: 6, fontSize: 11.5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        <div>📦 {o.quantite} {o.unite}</div>
                        {o.prix_propose_ht && <div style={{ color: "#5aa05a", fontWeight: 700 }}>💰 {parseFloat(o.prix_propose_ht).toFixed(2)} €</div>}
                        {o.delai_max_jours && <div>⏱ {o.delai_max_jours}j max</div>}
                        {o.rayon_km && <div>📍 {o.rayon_km} km</div>}
                      </div>
                      {/* Actions */}
                      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                        {!isMine && o.statut === "active" && (
                          <Btn variant="primary" icon="ti-message" onClick={(e) => { e.stopPropagation(); repondre(o); }} style={{ flex: 1, fontSize: 11 }}>
                            💬 Répondre
                          </Btn>
                        )}
                        {/* 0.62.0 : Chat temps réel */}
                        {(o.statut === "en_negociation" || isMine) && (
                          <Btn variant="ghost" icon="ti-messages" onClick={(e) => { e.stopPropagation(); setChatOffre(o); }} style={{ fontSize: 11 }}>
                            💬 Chat
                          </Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Modal édition */}
          {editing && (
            <Modal title={editing.mode === "create" ? "Nouvelle offre marketplace" : editing.data?.libelle}
              onClose={() => setEditing(null)}
              footer={<>
                <Btn variant="ghost" onClick={() => setEditing(null)}>Fermer</Btn>
                {(editing.mode === "create" || editing.data?.magasin_emetteur_id === magasinCtx.magasinId) && (
                  <Btn variant="primary" icon="ti-device-floppy" onClick={save}>{saving ? "..." : "Enregistrer"}</Btn>
                )}
              </>}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="fld">
                  <label>Type *</label>
                  <select value={form.type_offre} onChange={(e) => setForm({...form, type_offre: e.target.value})}>
                    <option value="demande">📥 Demande (je cherche)</option>
                    <option value="offre">📤 Offre (je vends/transfère)</option>
                  </select>
                </div>
                <div className="fld">
                  <label>Urgence</label>
                  <select value={form.urgence} onChange={(e) => setForm({...form, urgence: e.target.value})}>
                    {Object.entries(URGENCES).map(([v, u]) => <option key={v} value={v}>{u.ic} {u.lbl}</option>)}
                  </select>
                </div>
              </div>
              <div className="fld">
                <label>Description article *</label>
                <input value={form.libelle} onChange={(e) => setForm({...form, libelle: e.target.value})} placeholder="Ex: Pansements hydrocolloïdes 10x10" autoFocus />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="fld"><label>Quantité</label><input type="number" value={form.quantite} onChange={(e) => setForm({...form, quantite: e.target.value})} /></div>
                <div className="fld"><label>Unité</label><select value={form.unite} onChange={(e) => setForm({...form, unite: e.target.value})}><option>unité</option><option>boîte</option><option>carton</option><option>palette</option></select></div>
                <div className="fld"><label>Prix HT (€)</label><input type="number" step="0.01" value={form.prix_propose_ht} onChange={(e) => setForm({...form, prix_propose_ht: e.target.value})} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="fld"><label>Délai max (j)</label><input type="number" value={form.delai_max_jours} onChange={(e) => setForm({...form, delai_max_jours: e.target.value})} /></div>
                <div className="fld"><label>Zone</label><select value={form.zone_geographique} onChange={(e) => setForm({...form, zone_geographique: e.target.value})}><option value="locale">Locale</option><option value="regionale">Régionale</option><option value="nationale">Nationale</option></select></div>
                <div className="fld"><label>Rayon km</label><input type="number" value={form.rayon_km} onChange={(e) => setForm({...form, rayon_km: e.target.value})} /></div>
              </div>
              <div className="fld"><label>Conditions / Description complète</label><textarea value={form.conditions} onChange={(e) => setForm({...form, conditions: e.target.value})} rows={3} placeholder="Précisions sur le produit, dates de péremption, conditionnement, etc." /></div>
              <div className="fld">
                <label>Statut</label>
                <select value={form.statut} onChange={(e) => setForm({...form, statut: e.target.value})}>
                  {Object.entries(STATUTS).map(([v, s]) => <option key={v} value={v}>{s.lbl}</option>)}
                </select>
              </div>
              {editing.mode === "view" && editing.data?.message_repondeur && (
                <div style={{ marginTop: 12, padding: 10, background: "rgba(122,111,176,.08)", borderLeft: "3px solid #7a6fb0", borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: "#7a6fb0", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 4 }}>💬 Réponse magasin</div>
                  <div style={{ fontSize: 12.5, color: "#5a6878", fontStyle: "italic" }}>{editing.data.message_repondeur}</div>
                </div>
              )}
            </Modal>
          )}
          {/* 0.62.0 : Modal chat temps réel */}
          {chatOffre && (
            <div onClick={() => setChatOffre(null)} style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            }}>
              <MarketplaceChat offre={chatOffre} magasinId={magasinCtx.magasinId} onClose={() => setChatOffre(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// 0.62.0 : MarketplaceMap — carte Leaflet avec marqueurs urgence
// =============================================================
function MarketplaceMap({ offres, onSelect }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || typeof window === "undefined") return;
    let map;
    (async () => {
      if (!window.L) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
        await new Promise((res) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          s.onload = res;
          document.head.appendChild(s);
        });
      }
      const L = window.L;
      ref.current.innerHTML = "";
      map = L.map(ref.current).setView([46.5, 2.5], 6); // France centre
      L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap, © CartoDB", maxZoom: 19,
      }).addTo(map);

      const bounds = [];
      offres.forEach(o => {
        const lat = parseFloat(o.point_lat || 0);
        const lng = parseFloat(o.point_lng || 0);
        if (!lat || !lng) return;
        const col = o.urgence === "critique" ? "#e35d5b" : o.urgence === "urgent" ? "#EF9F27" : "#5a8f8f";
        const icon = L.divIcon({
          html: `<div style="
            width: 32px; height: 32px; border-radius: 16px;
            background: ${col}; color: #fff; display: flex; align-items: center; justify-content: center;
            font-size: 14px; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); cursor: pointer;
          ">${o.type_offre === "demande" ? "📥" : "📤"}</div>`,
          className: "", iconSize: [32, 32], iconAnchor: [16, 16],
        });
        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: Quicksand, sans-serif; min-width: 200px">
            <div style="font-weight: 700; font-size: 13px; color: #142131">${o.libelle}</div>
            <div style="font-size: 11px; color: #5a6878; margin-top: 4px">
              ${o.quantite} ${o.unite || ""} · ${o.prix_propose_ht ? parseFloat(o.prix_propose_ht).toFixed(2) + " €" : ""}
            </div>
            <button onclick="window.__mktSelect && window.__mktSelect('${o.id}')" style="
              margin-top: 8px; padding: 4px 10px; background: ${col}; color: #fff;
              border: none; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 700;
            ">Voir détails</button>
          </div>
        `);
        bounds.push([lat, lng]);
      });
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40] });

      // Hook global pour bouton popup
      window.__mktSelect = (id) => { const o = offres.find(x => x.id === id); if (o) onSelect(o); };
    })();

    return () => { if (map) map.remove(); };
  }, [offres]);

  if (!offres.length) {
    return <div style={{ padding: 40, textAlign: "center", color: "#8a98a8", background: "#fafbfc", borderRadius: 8 }}>
      <i className="ti ti-map-off" style={{ fontSize: 36, opacity: 0.3, display: "block", marginBottom: 8 }} />
      Aucune offre avec géolocalisation. Renseigne le point_lat/point_lng dans tes offres.
    </div>;
  }

  return <div ref={ref} style={{ width: "100%", height: 500, borderRadius: 8, overflow: "hidden", border: "1px solid #e3e9ee" }} />;
}
