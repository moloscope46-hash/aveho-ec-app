"use client";
// =============================================================
//  /magasin/receptions/[id] — Détail réception ligne par ligne (0.62.65)
//  Scan code-barres + saisie lot/série/qté/conformité par ligne + photos preuve
// =============================================================
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import TopBar from "../../../TopBar";
import { useCart } from "../../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../../ui";
import BackButton from "../../../components/BackButton";

const CONFORMITES = [
  { v: "conforme",     l: "✓ Conforme",            c: "#5aa05a" },
  { v: "qte_partielle", l: "△ Quantité partielle",  c: "#EF9F27" },
  { v: "casse",        l: "💥 Casse",              c: "#e35d5b" },
  { v: "mauvaise_ref", l: "✗ Mauvaise référence",  c: "#c0392b" },
  { v: "perimee",      l: "⏰ Périmée",            c: "#7a3030" },
];

export default function ReceptionDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [commande, setCommande] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [fournisseur, setFournisseur] = useState(null);
  const [bl, setBl] = useState({ numero_bl: "", date_reception: new Date().toISOString().split("T")[0], notes: "" });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const scanInputRef = useRef(null);

  useEffect(() => { if (auth.ready && id) reload(); }, [auth.ready, id]);

  async function reload() {
    setLoading(true);
    try {
      // Charger commande
      const cmd = await supabase.from("commandes_fournisseurs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setCommande(cmd.data);

      // Charger fournisseur séparément (FK PostgREST safety)
      if (cmd.data?.fournisseur_id) {
        const f = await supabase.from("fournisseurs")
          .select("id, raison_sociale, contact_nom, contact_email")
          .eq("id", cmd.data.fournisseur_id)
          .maybeSingle();
        setFournisseur(f.data);
      }

      // Charger lignes
      const lg = await supabase.from("commandes_fournisseurs_lignes")
        .select("*")
        .eq("commande_id", id)
        .order("position");

      // Enrichir avec état réception (init si pas encore)
      const enriched = (lg.data || []).map(l => ({
        ...l,
        _qte_recue: l.quantite_recue || 0,
        _lot: "",
        _serie: "",
        _peremption: "",
        _fabrication: "",
        _conformite: "conforme",
        _observation: "",
        _expanded: false,
      }));
      setLignes(enriched);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const stats = useMemo(() => {
    const totalLignes = lignes.length;
    const completes = lignes.filter(l => l._qte_recue >= l.quantite).length;
    const partielles = lignes.filter(l => l._qte_recue > 0 && l._qte_recue < l.quantite).length;
    const nonRecues = lignes.filter(l => l._qte_recue === 0).length;
    const anomalies = lignes.filter(l => l._conformite !== "conforme" && l._qte_recue > 0).length;
    const progress = totalLignes > 0 ? Math.round((completes / totalLignes) * 100) : 0;
    return { totalLignes, completes, partielles, nonRecues, anomalies, progress };
  }, [lignes]);

  function updateLigne(idx, patch) {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  function quickFill(idx) {
    const l = lignes[idx];
    updateLigne(idx, { _qte_recue: l.quantite, _conformite: "conforme", _expanded: true });
  }

  function focusScan() {
    setScanModalOpen(true);
    setTimeout(() => scanInputRef.current?.focus(), 200);
  }

  function handleScan() {
    const code = scanInput.trim().toLowerCase();
    if (!code) return;
    // Trouve la ligne par référence_fournisseur ou désignation
    const idx = lignes.findIndex(l => 
      (l.reference_fournisseur || "").toLowerCase().includes(code) ||
      (l.designation || "").toLowerCase().includes(code)
    );
    if (idx >= 0) {
      const l = lignes[idx];
      updateLigne(idx, { _qte_recue: Math.min(l._qte_recue + 1, l.quantite), _expanded: true });
      setScanInput("");
      // Beep visuel
      const el = document.getElementById(`ligne-${idx}`);
      if (el) {
        el.style.transition = "background 300ms";
        el.style.background = "rgba(94,160,90,.2)";
        setTimeout(() => el.style.background = "", 600);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      alert("Aucune ligne ne correspond à ce code");
    }
  }

  async function uploadPhoto(file) {
    if (!file) return;
    try {
      const path = `receptions/${id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("sav-photos").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("sav-photos").getPublicUrl(path);
      setPhotos(p => [...p, { url: data.publicUrl, path, name: file.name }]);
    } catch (e) { alert("Erreur upload : " + e.message); }
  }

  async function validate() {
    if (!bl.numero_bl?.trim()) { alert("N° BL fournisseur requis"); return; }
    setBusy(true);
    try {
      // 1. Créer le BL fournisseur
      const blPayload = {
        numero_bl: bl.numero_bl.trim(),
        commande_id: id,
        fournisseur_id: commande.fournisseur_id,
        magasin_id: commande.magasin_id,
        date_reception: bl.date_reception,
        recu_par: auth.user?.id,
        conforme: stats.anomalies === 0,
        anomalies: lignes.filter(l => l._conformite !== "conforme").map(l => `${l.designation}: ${CONFORMITES.find(c => c.v === l._conformite)?.l}${l._observation ? ` (${l._observation})` : ""}`).join(" · ") || null,
        photos: photos.map(p => p.url),
        notes: bl.notes,
      };
      const blRes = await supabase.from("bons_livraison_fournisseurs").insert(blPayload).select().maybeSingle();
      if (blRes.error) throw blRes.error;

      // 2. Créer les lignes de réception
      const ligneRows = lignes.filter(l => l._qte_recue > 0).map(l => ({
        bl_id: blRes.data.id,
        commande_ligne_id: l.id,
        article_id: l.article_id,
        designation: l.designation,
        quantite_recue: l._qte_recue,
        numero_lot: l._lot || null,
        numero_serie: l._serie || null,
        date_peremption: l._peremption || null,
        date_fabrication: l._fabrication || null,
        conforme: l._conformite === "conforme",
        observation: l._observation || (l._conformite !== "conforme" ? CONFORMITES.find(c => c.v === l._conformite)?.l : null),
      }));
      if (ligneRows.length > 0) {
        await supabase.from("bons_livraison_lignes").insert(ligneRows);
      }

      // 3. Mettre à jour les quantites_recue dans les lignes de commande
      for (const l of lignes) {
        if (l._qte_recue > 0) {
          await supabase.from("commandes_fournisseurs_lignes")
            .update({ quantite_recue: (l.quantite_recue || 0) + l._qte_recue })
            .eq("id", l.id);
        }
      }

      // 4. Mettre à jour le statut de la commande
      const totalCmd = lignes.reduce((s, l) => s + l.quantite, 0);
      const totalRecuApres = lignes.reduce((s, l) => s + (l.quantite_recue || 0) + l._qte_recue, 0);
      const newStatut = totalRecuApres >= totalCmd ? "recue" : "partiellement_recue";
      await supabase.from("commandes_fournisseurs").update({
        statut: newStatut,
        date_livraison_effective: bl.date_reception,
      }).eq("id", id);

      alert("Réception enregistrée ✓");
      router.push("/magasin/receptions");
    } catch (e) { alert("Erreur : " + e.message); }
    setBusy(false);
  }

  if (!auth.ready) return null;
  if (loading) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="page-content" style={{ padding: 20 }}>
          <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Chargement…</div>
        </div>
      </div>
    );
  }

  if (!commande) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="page-content" style={{ padding: 20 }}>
          <BackButton />
          <Panel><div style={{ padding: 20, textAlign: "center", color: "#e35d5b" }}>Commande introuvable</div></Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 1200 }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-package-import" title={`Réception BC ${commande.numero}`}
            subtitle={fournisseur ? fournisseur.raison_sociale : "Fournisseur"}
            color="#185FA5" />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={focusScan} style={{
              background: "linear-gradient(135deg, #7a6fb0, #5e4a8c)",
              color: "#fff", border: "none", padding: "10px 16px", borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <i className="ti ti-scan" /> Scanner code-barres
            </button>
            <Btn variant="primary" icon="ti-check" onClick={validate} disabled={busy}>
              {busy ? "Validation..." : "Valider la réception"}
            </Btn>
          </div>
        </div>

        {/* Progression visuelle */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 12 }}>
            <KpiSmall label="Lignes" value={stats.totalLignes} color="#142131" icon="ti-list" />
            <KpiSmall label="Complètes" value={stats.completes} color="#5aa05a" icon="ti-check" />
            <KpiSmall label="Partielles" value={stats.partielles} color="#EF9F27" icon="ti-arrows-vertical" />
            <KpiSmall label="Non reçues" value={stats.nonRecues} color="#8a98a8" icon="ti-package-off" />
            <KpiSmall label="Anomalies" value={stats.anomalies} color="#e35d5b" icon="ti-alert-triangle" />
          </div>
          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 10, background: "#eef1f4", borderRadius: 5, overflow: "hidden" }}>
              <div style={{
                width: `${stats.progress}%`, height: "100%",
                background: stats.progress === 100 ? "linear-gradient(90deg, #5aa05a, #4a8a4a)" : "linear-gradient(90deg, #185FA5, #7CC8C8)",
                transition: "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: stats.progress === 100 ? "#5aa05a" : "#185FA5" }}>{stats.progress}%</span>
          </div>
        </Panel>

        {/* Header BL */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 11, color: "#5a6878", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>N° BL fournisseur *</span>
              <input value={bl.numero_bl} onChange={(e) => setBl({ ...bl, numero_bl: e.target.value })}
                placeholder="BL-2026-001234"
                style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "Consolas, monospace", marginTop: 4 }} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 11, color: "#5a6878", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Date réception</span>
              <input type="date" value={bl.date_reception} onChange={(e) => setBl({ ...bl, date_reception: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
            </label>
          </div>
        </Panel>

        {/* Lignes */}
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {lignes.map((l, idx) => {
            const conf = CONFORMITES.find(c => c.v === l._conformite) || CONFORMITES[0];
            const isComplete = l._qte_recue >= l.quantite;
            const isPartial = l._qte_recue > 0 && l._qte_recue < l.quantite;
            const isAnomalie = l._conformite !== "conforme" && l._qte_recue > 0;
            return (
              <div key={l.id} id={`ligne-${idx}`} style={{
                background: "#fff",
                border: `1px solid ${isComplete ? "#5aa05a40" : isPartial ? "#EF9F2740" : isAnomalie ? "#e35d5b40" : "#eef1f4"}`,
                borderLeft: `4px solid ${isComplete ? "#5aa05a" : isPartial ? "#EF9F27" : isAnomalie ? "#e35d5b" : "#c0d0d8"}`,
                borderRadius: 10, padding: 12,
                transition: "all 200ms",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>{l.designation}</div>
                    {l.reference_fournisseur && (
                      <div style={{ fontSize: 11.5, color: "#8a98a8", fontFamily: "Consolas, monospace" }}>Réf: {l.reference_fournisseur}</div>
                    )}
                    <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 2 }}>
                      <i className="ti ti-package" /> Commandé : <b>{l.quantite}</b> × {l.prix_unitaire_ht ? `${l.prix_unitaire_ht.toFixed(2)} € HT` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => updateLigne(idx, { _qte_recue: Math.max(0, l._qte_recue - 1), _expanded: true })}
                      style={qtyBtn()}>−</button>
                    <input type="number" value={l._qte_recue} min={0} max={l.quantite}
                      onChange={(e) => updateLigne(idx, { _qte_recue: Math.max(0, Math.min(l.quantite, parseInt(e.target.value) || 0)), _expanded: true })}
                      style={{ width: 60, padding: "6px 4px", textAlign: "center", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 14, fontWeight: 700 }} />
                    <span style={{ fontSize: 12, color: "#8a98a8" }}>/ {l.quantite}</span>
                    <button onClick={() => updateLigne(idx, { _qte_recue: Math.min(l.quantite, l._qte_recue + 1), _expanded: true })}
                      style={qtyBtn()}>+</button>
                    <button onClick={() => quickFill(idx)} title="Tout reçu conforme"
                      style={{ padding: "6px 10px", background: "rgba(94,160,90,.12)", color: "#5aa05a", border: "1px solid #5aa05a40", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      <i className="ti ti-check" /> Tout OK
                    </button>
                  </div>
                  <button onClick={() => updateLigne(idx, { _expanded: !l._expanded })}
                    style={{ padding: 6, background: "transparent", border: "none", cursor: "pointer", color: "#8a98a8" }}>
                    <i className={`ti ti-chevron-${l._expanded ? "up" : "down"}`} style={{ fontSize: 18 }} />
                  </button>
                </div>

                {l._expanded && l._qte_recue > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f4f7fa", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                    <label>
                      <span style={{ fontSize: 10.5, color: "#5a6878", fontWeight: 600, textTransform: "uppercase" }}>N° Lot</span>
                      <input value={l._lot} onChange={(e) => updateLigne(idx, { _lot: e.target.value })}
                        placeholder="LOT123"
                        style={{ width: "100%", padding: 6, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "Consolas, monospace", fontSize: 12, marginTop: 2 }} />
                    </label>
                    <label>
                      <span style={{ fontSize: 10.5, color: "#5a6878", fontWeight: 600, textTransform: "uppercase" }}>N° Série</span>
                      <input value={l._serie} onChange={(e) => updateLigne(idx, { _serie: e.target.value })}
                        placeholder="SN-456"
                        style={{ width: "100%", padding: 6, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "Consolas, monospace", fontSize: 12, marginTop: 2 }} />
                    </label>
                    <label>
                      <span style={{ fontSize: 10.5, color: "#5a6878", fontWeight: 600, textTransform: "uppercase" }}>Péremption</span>
                      <input type="date" value={l._peremption} onChange={(e) => updateLigne(idx, { _peremption: e.target.value })}
                        style={{ width: "100%", padding: 6, border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12, marginTop: 2 }} />
                    </label>
                    <label>
                      <span style={{ fontSize: 10.5, color: "#5a6878", fontWeight: 600, textTransform: "uppercase" }}>Fabrication</span>
                      <input type="date" value={l._fabrication} onChange={(e) => updateLigne(idx, { _fabrication: e.target.value })}
                        style={{ width: "100%", padding: 6, border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12, marginTop: 2 }} />
                    </label>
                    <label style={{ gridColumn: "span 2" }}>
                      <span style={{ fontSize: 10.5, color: "#5a6878", fontWeight: 600, textTransform: "uppercase" }}>Conformité</span>
                      <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                        {CONFORMITES.map(c => (
                          <button key={c.v} type="button" onClick={() => updateLigne(idx, { _conformite: c.v })}
                            style={{
                              padding: "4px 8px",
                              background: l._conformite === c.v ? c.c : "#fafbfc",
                              color: l._conformite === c.v ? "#fff" : c.c,
                              border: `1px solid ${l._conformite === c.v ? c.c : c.c + "40"}`,
                              borderRadius: 5, fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, cursor: "pointer",
                            }}>
                            {c.l}
                          </button>
                        ))}
                      </div>
                    </label>
                    {l._conformite !== "conforme" && (
                      <label style={{ gridColumn: "1 / -1" }}>
                        <span style={{ fontSize: 10.5, color: "#5a6878", fontWeight: 600, textTransform: "uppercase" }}>Observation anomalie</span>
                        <input value={l._observation} onChange={(e) => updateLigne(idx, { _observation: e.target.value })}
                          placeholder="Détails..."
                          style={{ width: "100%", padding: 6, border: "1px solid #e35d5b40", borderRadius: 6, fontFamily: "inherit", fontSize: 12, marginTop: 2 }} />
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Photos */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "#5a6878", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
            <i className="ti ti-camera" /> Photos de preuve (BL, casse, anomalies...)
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {photos.map((p, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={p.url} alt={p.name} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #e3e9ee" }} />
                <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#e35d5b", color: "#fff", border: "none", cursor: "pointer", fontSize: 12 }}>×</button>
              </div>
            ))}
            <label style={{ width: 80, height: 80, border: "2px dashed #c0d0d8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#8a98a8" }}>
              <i className="ti ti-plus" style={{ fontSize: 24 }} />
              <input type="file" accept="image/*" capture="environment" onChange={(e) => uploadPhoto(e.target.files?.[0])} style={{ display: "none" }} />
            </label>
          </div>
        </Panel>

        <Panel style={{ marginTop: 12 }}>
          <label>
            <span style={{ fontSize: 11, color: "#5a6878", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Notes complémentaires</span>
            <textarea value={bl.notes} onChange={(e) => setBl({ ...bl, notes: e.target.value })}
              rows={2} placeholder="Optionnel..."
              style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
          </label>
        </Panel>

        {/* Modal scan */}
        <Modal open={scanModalOpen} onClose={() => setScanModalOpen(false)} title="Scanner un code-barres" kind="default" size="sm"
          footer={<Btn variant="ghost" onClick={() => setScanModalOpen(false)}>Fermer</Btn>}>
          <div style={{ padding: "10px 0" }}>
            <p style={{ fontSize: 13, color: "#5a6878", marginBottom: 10 }}>
              💡 Connecte ton scanner USB ou tape le code-barres/référence ci-dessous puis appuie sur Entrée. La ligne sera incrémentée automatiquement.
            </p>
            <input
              ref={scanInputRef}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScan(); } }}
              placeholder="Code-barres ou référence..."
              style={{ width: "100%", padding: 12, border: "2px solid #7a6fb0", borderRadius: 8, fontSize: 16, fontFamily: "Consolas, monospace", textAlign: "center" }}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: "#8a98a8", textAlign: "center" }}>
              <i className="ti ti-keyboard" /> Entrée pour valider · ESC pour fermer
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function qtyBtn() {
  return {
    width: 28, height: 28, borderRadius: 6,
    background: "#f4f7fa", border: "1px solid #e3e9ee", color: "#5a6878",
    cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 700,
  };
}

function KpiSmall({ label, value, color, icon }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`,
      borderRadius: 10, padding: "8px 12px",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 20 }} />
      <div>
        <div style={{ fontSize: 10, color: "#8a98a8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}
