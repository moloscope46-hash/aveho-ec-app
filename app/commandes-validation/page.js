"use client";
// =============================================================
//  /commandes-validation — Validation des commandes côté EC (0.62.28)
//  Workflow 2 étapes : brouillon → a_valider_ec → validee_ec → envoyee_magasin
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

const STATUT_META = {
  brouillon:        { col: "#8a98a8", lbl: "📝 Brouillon" },
  a_valider_ec:     { col: "#EF9F27", lbl: "⏳ À valider" },
  validee_ec:       { col: "#5aa05a", lbl: "✓ Validée" },
  envoyee_magasin:  { col: "#185FA5", lbl: "📤 Envoyée magasin" },
  preparation:      { col: "#c97a2a", lbl: "📦 Préparation magasin" },
  expediee:         { col: "#7a6fb0", lbl: "🚛 Expédiée" },
  livree:           { col: "#5a8f8f", lbl: "✓ Livrée" },
  receptionnee:     { col: "#5aa05a", lbl: "✅ Réceptionnée" },
  rejetee:          { col: "#e35d5b", lbl: "⊘ Rejetée" },
};

export default function CommandesValidationPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [filter, setFilter] = useState("a_valider_ec");
  const [validModal, setValidModal] = useState(null);
  const [commentaire, setCommentaire] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    try {
      // 0.62.48 FIX : pas de jointure PostgREST (FK pas déclarées sur magasins/etablissements)
      // → fetch les commandes seules, puis enrichir avec Map lookup
      const r = await supabase.from("commandes_ec")
        .select("*")
        .eq("structure_id", auth.structureId)
        .order("cree_le", { ascending: false })
        .limit(100);
      if (r.error?.code === "42P01") setTableMissing(true);
      const cmds = r.data || [];
      // Enrichir avec magasins + etablissements en 2 queries séparées
      const magIds = Array.from(new Set(cmds.map(c => c.magasin_id).filter(Boolean)));
      const etabIds = Array.from(new Set(cmds.map(c => c.etablissement_id).filter(Boolean)));
      let magMap = new Map(), etabMap = new Map();
      if (magIds.length > 0) {
        try {
          const rm = await supabase.from("magasins").select("id, nom").in("id", magIds);
          (rm.data || []).forEach(m => magMap.set(m.id, m));
        } catch {}
      }
      if (etabIds.length > 0) {
        try {
          const re = await supabase.from("etablissements").select("id, nom").in("id", etabIds);
          (re.data || []).forEach(e => etabMap.set(e.id, e));
        } catch {}
      }
      const enriched = cmds.map(c => ({
        ...c,
        magasins: c.magasin_id ? magMap.get(c.magasin_id) : null,
        etablissements: c.etablissement_id ? etabMap.get(c.etablissement_id) : null,
      }));
      setCommandes(enriched);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function valider(cmd, action) {
    setBusy(true);
    try {
      if (action === "valider") {
        // Étape 1 : passer en validee_ec
        const upd = await supabase.from("commandes_ec").update({
          statut: "validee_ec",
          validee_ec_par: auth.user?.id,
          validee_ec_le: new Date().toISOString(),
          validee_ec_commentaire: commentaire || null,
        }).eq("id", cmd.id);
        if (upd.error) throw upd.error;

        // Étape 2 : appel RPC pour créer la DI magasin
        const rpc = await supabase.rpc("fn_commande_ec_vers_di", { p_commande_id: cmd.id });
        if (rpc.error) {
          alert("✓ Validée mais erreur création DI : " + rpc.error.message + "\nLance le SQL 0.62.28 d'abord !");
        } else {
          alert(`✓ Commande ${cmd.numero} validée + DI magasin créée (${rpc.data?.substring(0, 8) || "—"})`);
        }
      } else if (action === "rejeter") {
        const upd = await supabase.from("commandes_ec").update({
          statut: "rejetee",
          motif_rejet: commentaire || "Refusée",
        }).eq("id", cmd.id);
        if (upd.error) throw upd.error;
        alert(`Commande ${cmd.numero} rejetée`);
      }
      setValidModal(null);
      setCommentaire("");
      reload();
    } catch (e) {
      alert("❌ " + e.message);
    } finally { setBusy(false); }
  }

  const filtered = filter === "tous" ? commandes : commandes.filter(c => c.statut === filter);

  // Compteurs par statut
  const counts = commandes.reduce((acc, c) => { acc[c.statut] = (acc[c.statut] || 0) + 1; return acc; }, {});

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px" }}>
        <BackButton />
        <PageHead icon="ti-clipboard-check" title="Validation des commandes" subtitle="Workflow 2 étapes · Validation chef de service → DI magasin" />

        {tableMissing && (
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13 }}>
              ⚠ Table <code>commandes_ec</code> manquante. Applique <a href="/sql/migration-0.62.28-commande-ec-vers-magasin.sql" target="_blank" style={{ color: "#185FA5", fontWeight: 700 }}>migration-0.62.28-commande-ec-vers-magasin.sql</a>.
            </div>
          </Panel>
        )}

        {/* Filtre par statut avec compteurs */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button onClick={() => setFilter("tous")} style={{
              padding: "6px 12px", border: filter === "tous" ? "none" : "1px solid #cfd8e0",
              background: filter === "tous" ? "#185FA5" : "#fff",
              color: filter === "tous" ? "#fff" : "#5a6878",
              borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Toutes ({commandes.length})</button>
            {Object.entries(STATUT_META).map(([k, m]) => {
              const n = counts[k] || 0;
              if (n === 0 && filter !== k) return null;
              return (
                <button key={k} onClick={() => setFilter(k)} style={{
                  padding: "6px 12px", border: filter === k ? "none" : `1px solid ${m.col}40`,
                  background: filter === k ? m.col : "#fff",
                  color: filter === k ? "#fff" : m.col,
                  borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}>{m.lbl} ({n})</button>
              );
            })}
          </div>
        </Panel>

        <Panel style={{ marginTop: 12 }}>
          {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement…</div>
            : filtered.length === 0 && !tableMissing ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-clipboard-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              Aucune commande pour ce filtre.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map(c => {
                const meta = STATUT_META[c.statut] || { col: "#8a98a8", lbl: c.statut };
                const canValidate = c.statut === "a_valider_ec";
                return (
                  <div key={c.id} style={{
                    background: "#fff", border: "1px solid #e3e9ee",
                    borderLeft: `4px solid ${meta.col}`,
                    borderRadius: 8, padding: 12,
                    display: "grid", gridTemplateColumns: "120px 1fr 110px 130px 200px", gap: 10, alignItems: "center",
                  }}>
                    <div style={{ fontFamily: "Consolas,monospace", fontSize: 12, fontWeight: 700 }}>{c.numero}</div>
                    <div>
                      <div style={{ fontSize: 12.5, color: "#142131" }}>
                        🏥 <b>{c.etablissements?.nom || "—"}</b>
                        {c.magasins?.nom && <> → 🏬 <b>{c.magasins.nom}</b></>}
                      </div>
                      <div style={{ fontSize: 10.5, color: "#8a98a8" }}>
                        {c.total_lignes || 0} ligne(s)
                        {c.total_ht && <> · {parseFloat(c.total_ht).toFixed(2)} € HT</>}
                        {c.urgence === "urgente" && <span style={{ color: "#e35d5b", marginLeft: 6, fontWeight: 700 }}>🔥 URGENT</span>}
                      </div>
                      {c.notes && <div style={{ fontSize: 10.5, color: "#5a6878", fontStyle: "italic" }}>📝 {c.notes}</div>}
                      {c.motif_rejet && <div style={{ fontSize: 10.5, color: "#e35d5b", fontStyle: "italic" }}>⊘ {c.motif_rejet}</div>}
                    </div>
                    <div style={{ fontSize: 11, color: "#5a6878" }}>{c.cree_le ? new Date(c.cree_le).toLocaleDateString("fr-FR") : "—"}</div>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: `${meta.col}1A`, color: meta.col, border: `1px solid ${meta.col}40`, fontSize: 11, fontWeight: 700, textAlign: "center" }}>{meta.lbl}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {canValidate ? (
                        <>
                          <button onClick={() => { setValidModal({ cmd: c, action: "valider" }); setCommentaire(""); }} style={{
                            flex: 1, background: "linear-gradient(135deg,#5aa05a,#4a8a4a)", color: "#fff",
                            border: "none", padding: "5px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                          }}>✓ Valider</button>
                          <button onClick={() => { setValidModal({ cmd: c, action: "rejeter" }); setCommentaire(""); }} style={{
                            background: "transparent", color: "#e35d5b", border: "1px solid #e35d5b",
                            padding: "5px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                          }}>⊘</button>
                        </>
                      ) : (
                        <button onClick={() => router.push(`/commandes/${c.id}`)} style={{
                          flex: 1, background: "transparent", color: "#185FA5", border: "1px solid #cfd8e0",
                          padding: "5px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        }}>👁 Voir</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Modal validation */}
        {validModal && (
          <Modal open={!!validModal} onClose={() => setValidModal(null)} kind="patient"
            title={validModal.action === "valider" ? `Valider la commande ${validModal.cmd.numero}` : `Rejeter la commande ${validModal.cmd.numero}`}
            actions={
              <>
                <Btn variant="ghost" onClick={() => setValidModal(null)}>Annuler</Btn>
                <Btn variant="primary" onClick={() => valider(validModal.cmd, validModal.action)} disabled={busy}>
                  {busy ? "…" : (validModal.action === "valider" ? "✓ Valider + envoyer au magasin" : "⊘ Rejeter")}
                </Btn>
              </>
            }>
            <div style={{ padding: 10, background: validModal.action === "valider" ? "rgba(94,160,90,.08)" : "rgba(227,93,91,.08)", borderLeft: `3px solid ${validModal.action === "valider" ? "#5aa05a" : "#e35d5b"}`, borderRadius: 6, fontSize: 12, color: "#5a6878", marginBottom: 14 }}>
              {validModal.action === "valider"
                ? "✓ Cette action validera la commande côté étab puis créera automatiquement une DI dans le magasin destinataire (statut 'nouvelle')."
                : "⊘ Cette action rejette la commande définitivement. Le créateur sera notifié du motif."}
            </div>
            <label style={{ fontSize: 12, color: "#5a6878" }}>
              <b>{validModal.action === "valider" ? "Commentaire (optionnel)" : "Motif du rejet *"}</b>
              <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder={validModal.action === "valider" ? "Précisions, instructions spéciales..." : "Pourquoi cette commande est rejetée ?"} style={{ width: "100%", padding: "8px 10px", marginTop: 4, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13, minHeight: 70 }} />
            </label>
          </Modal>
        )}
      </div>
    </div>
  );
}
