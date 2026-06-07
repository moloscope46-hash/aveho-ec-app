"use client";
// =============================================================
//  /demandes-internes/[id] — Détail DI (0.59.6)
//  Si mode magasin : boutons Valider / Refuser + génération BL
// =============================================================
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useViewMode } from "../../../lib/useViewMode";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { Panel, Btn } from "../../ui";
import BackButton from "../../components/BackButton";
import { SignatureCanvas } from "../../components/SignatureCanvas";

const STATUTS = {
  nouvelle:  { lbl: "Nouvelle",      col: "#EF9F27", ic: "ti-inbox" },
  en_attente: { lbl: "En attente",   col: "#EF9F27", ic: "ti-clock" },
  validee:   { lbl: "Validée",       col: "#5aa05a", ic: "ti-check" },
  refusee:   { lbl: "Refusée",       col: "#e35d5b", ic: "ti-x" },
  livree:    { lbl: "Livrée",        col: "#185FA5", ic: "ti-truck-delivery" },
  cloturee:  { lbl: "Clôturée",      col: "#7a6fb0", ic: "ti-circle-check" },
  // 0.60.6 : statuts spécifiques transferts
  en_preparation: { lbl: "En préparation", col: "#EF9F27", ic: "ti-package" },
  en_transit:     { lbl: "En transit",     col: "#185FA5", ic: "ti-truck" },
  livre:          { lbl: "Livré",          col: "#5aa05a", ic: "ti-check-bold" },
};

export default function DemandeInterneDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const supabase = createClient();
  const auth = useAuth();
  const viewMode = useViewMode();
  const cart = useCart();
  const [di, setDi] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [refusReason, setRefusReason] = useState("");
  const [showRefus, setShowRefus] = useState(false);
  // 0.59.9 : modal création article rapide depuis ligne DI
  const [createArticleFor, setCreateArticleFor] = useState(null);

  useEffect(() => {
    if (!id || !auth.ready) return;
    reload();
  }, [id, auth.ready]);

  async function reload() {
    setLoading(true);
    try {
      const tryFetch = async (q) => { try { const r = await q; return r.data; } catch { return null; } };
      const [diData, lignesData] = await Promise.all([
        tryFetch(supabase.from("demandes_internes").select("*").eq("id", id).single()),
        tryFetch(supabase.from("demandes_internes_lignes").select("*, articles(libelle, code, reference)").eq("demande_id", id)),
      ]);
      setDi(diData);
      setLignes(lignesData || []);
    } finally { setLoading(false); }
  }

  async function valider() {
    if (!confirm("Valider cette DI ?\nElle sera marquée comme validée et le BL pourra être généré.")) return;
    setActionInProgress(true);
    try {
      const r = await supabase.from("demandes_internes").update({
        statut: "validee",
        validee_at: new Date().toISOString(),
        validee_par: auth.user?.id,
      }).eq("id", id);
      if (r.error) throw r.error;
      // 0.59.7 : créer notification côté EC (createur de la DI)
      try {
        if (di?.created_by && di.created_by !== auth.user?.id) {
          await supabase.from("notifications").insert({
            user_id: di.created_by,
            structure_id: di.structure_id,
            type: "di",
            titre: `DI ${di.numero || "DI"} validée`,
            message: `Le magasin a validé ta demande. Génération du BL en cours.`,
            url: `/demandes-internes/${id}`,
            lu: false,
          });
        }
      } catch (e) { console.warn("[Notif]", e); }
      await reload();
      alert("✓ DI validée");
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally { setActionInProgress(false); }
  }

  async function refuser() {
    if (!refusReason.trim()) {
      alert("Indique un motif de refus");
      return;
    }
    setActionInProgress(true);
    try {
      const r = await supabase.from("demandes_internes").update({
        statut: "refusee",
        motif_refus: refusReason,
        refusee_at: new Date().toISOString(),
        refusee_par: auth.user?.id,
      }).eq("id", id);
      if (r.error) throw r.error;
      // 0.59.7 : notif refus
      try {
        if (di?.created_by && di.created_by !== auth.user?.id) {
          await supabase.from("notifications").insert({
            user_id: di.created_by,
            structure_id: di.structure_id,
            type: "di",
            titre: `DI ${di.numero || "DI"} refusée`,
            message: `Motif : ${refusReason}`,
            url: `/demandes-internes/${id}`,
            lu: false,
          });
        }
      } catch (e) { console.warn("[Notif]", e); }
      await reload();
      setShowRefus(false);
      setRefusReason("");
      alert("DI refusée");
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setActionInProgress(false); }
  }

  async function genererBL() {
    if (!confirm("Générer le bon de livraison pour cette DI ?\n\nUne fenêtre d'impression s'ouvrira ensuite.")) return;
    setActionInProgress(true);
    try {
      const numero = di.numero_bl || `BL-${new Date().toISOString().slice(0,10).replace(/-/g, "")}-${Math.floor(Math.random() * 1000)}`;
      // Tente INSERT BL si table existe + update DI
      try {
        const r = await supabase.from("bons_livraison").insert({
          structure_id: auth.structureId,
          demande_id: id,
          numero,
          statut: "emis",
          date_emission: new Date().toISOString(),
          created_by: auth.user?.id,
        });
        if (r.error && r.error.code !== "42P01") console.warn("[BL]", r.error);
      } catch (e) { console.warn("[BL]", e); }

      await supabase.from("demandes_internes").update({
        statut: "livree",
        livree_at: new Date().toISOString(),
        numero_bl: numero,
      }).eq("id", id);

      // 0.59.8 : notification EC
      try {
        if (di?.created_by && di.created_by !== auth.user?.id) {
          await supabase.from("notifications").insert({
            user_id: di.created_by,
            structure_id: di.structure_id,
            type: "di",
            titre: `BL ${numero} émis`,
            message: `Le magasin a livré ta DI. Confirme la réception une fois reçue.`,
            url: `/demandes-internes/${id}`,
            lu: false,
          });
        }
      } catch {}

      await reload();
      // 0.59.8 : ouvrir fenêtre impression BL
      imprimerBL({ numero, di, lignes, auth });
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setActionInProgress(false); }
  }

  // 0.59.8 : Bouton "Confirmer réception" côté EC pour clôturer DI livrée
  async function confirmerReception() {
    if (!confirm("Confirmer la réception de cette DI ?\nElle sera marquée comme clôturée.")) return;
    setActionInProgress(true);
    try {
      const r = await supabase.from("demandes_internes").update({
        statut: "cloturee",
        cloturee_at: new Date().toISOString(),
        recue_at: new Date().toISOString(),
        recue_par: auth.user?.id,
      }).eq("id", id);
      if (r.error) throw r.error;
      // Notifier le magasin
      try {
        if (di?.validee_par && di.validee_par !== auth.user?.id) {
          await supabase.from("notifications").insert({
            user_id: di.validee_par,
            structure_id: di.structure_id,
            type: "di",
            titre: `DI ${di.numero || ""} réceptionnée`,
            message: `L'EC a confirmé la réception.`,
            url: `/demandes-internes/${id}`,
            lu: false,
          });
        }
      } catch {}
      await reload();
      alert("✓ Réception confirmée — DI clôturée");
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setActionInProgress(false); }
  }

  // 0.60.6 : Workflow transferts (preparation → en_transit → livre)
  async function changerStatutTransfert(newStatut, label) {
    if (!confirm(`Marquer ce transfert comme ${label} ?`)) return;
    setActionInProgress(true);
    try {
      const updates = { statut: newStatut };
      const now = new Date().toISOString();
      if (newStatut === "en_preparation") { updates.transfert_preparation_at = now; updates.transfert_preparation_par = auth.user?.id; }
      else if (newStatut === "en_transit") { updates.transfert_transit_at = now; updates.transfert_transit_par = auth.user?.id; }
      else if (newStatut === "livre") { updates.transfert_livre_at = now; updates.transfert_livre_par = auth.user?.id; updates.livree_at = now; }
      const r = await supabase.from("demandes_internes").update(updates).eq("id", id);
      if (r.error) throw r.error;
      // Notif EC
      try {
        if (di?.created_by && di.created_by !== auth.user?.id) {
          await supabase.from("notifications").insert({
            user_id: di.created_by,
            structure_id: di.structure_id,
            type: "di",
            titre: `Transfert ${di.numero || ""} ${label.toLowerCase()}`,
            message: `Statut mis à jour : ${label}`,
            url: `/demandes-internes/${id}`,
            lu: false,
          });
        }
      } catch {}
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setActionInProgress(false); }
  }

  // 0.60.6 : Validation rapport SAV côté EC (avec signature)
  async function validerRapportSav(signature, commentaire, signatureImageBase64) {
    if (!signature?.trim()) { alert("Nom requis"); return; }
    setActionInProgress(true);
    try {
      let signatureUrl = null;
      // 0.61.1 : Upload signature dessinée vers Supabase Storage
      if (signatureImageBase64) {
        try {
          // Convertir base64 en Blob
          const res = await fetch(signatureImageBase64);
          const blob = await res.blob();
          const fileName = `sig-${id}-${Date.now()}.png`;
          const { error: upErr } = await supabase.storage.from("sav-photos").upload(fileName, blob, {
            cacheControl: "3600", upsert: false, contentType: "image/png",
          });
          if (!upErr) {
            const { data: pub } = supabase.storage.from("sav-photos").getPublicUrl(fileName);
            signatureUrl = pub.publicUrl;
          }
        } catch (e) { console.warn("[signature upload]", e); }
      }

      const r = await supabase.from("demandes_internes").update({
        rapport_sav_valide_par_ec: auth.user?.id,
        rapport_sav_validee_at: new Date().toISOString(),
        rapport_sav_signature: signature.trim(),
        rapport_sav_signature_url: signatureUrl,
        rapport_sav_commentaire_ec: commentaire?.trim() || null,
        statut: "cloturee",
        cloturee_at: new Date().toISOString(),
      }).eq("id", id);
      if (r.error) throw r.error;
      // Notif magasin
      try {
        if (di?.validee_par && di.validee_par !== auth.user?.id) {
          await supabase.from("notifications").insert({
            user_id: di.validee_par,
            structure_id: di.structure_id,
            type: "di",
            titre: `Rapport SAV ${di.numero || ""} validé`,
            message: `Validé par ${signature}. ${commentaire ? "Commentaire : " + commentaire : ""}`,
            url: `/demandes-internes/${id}`,
            lu: false,
          });
        }
      } catch {}
      await reload();
      alert("✓ Rapport SAV validé et signé. DI clôturée.");
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setActionInProgress(false); }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Chargement...</div>;
  if (!di) return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content"><BackButton /><Panel><div style={{ padding: 40, textAlign: "center" }}>DI introuvable</div></Panel></div>
    </div>
  );

  const statut = STATUTS[di.statut] || { lbl: di.statut || "?", col: "#8a98a8", ic: "ti-help" };

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${statut.col}22, ${statut.col}08)`,
          borderLeft: `4px solid ${statut.col}`,
          borderRadius: 12, padding: 20, marginBottom: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 56, height: 56, background: `${statut.col}33`, color: statut.col, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
              <i className={`ti ${statut.ic}`} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ margin: "0 0 4px", fontSize: 22, color: "#142131" }}>
                DI {di.numero || di.id?.substring(0, 8)}
              </h1>
              <div style={{ fontSize: 12.5, color: "#5a6878" }}>
                Créée le {new Date(di.created_at).toLocaleString("fr-FR")}
              </div>
            </div>
            <span style={{
              padding: "6px 14px", borderRadius: 8,
              background: statut.col, color: "#fff",
              fontWeight: 700, fontSize: 12,
            }}>{statut.lbl}</span>
          </div>
        </div>

        {/* 0.59.8 : Actions EC — Confirmer réception si DI livrée */}
        {/* 0.60.6 : Validation rapport SAV côté EC (sur DI SAV validée non encore signée) */}
        {viewMode.ready && viewMode.isEC && di.type_demande === "sav" && di.statut === "validee" && !di.rapport_sav_validee_at && (
          <ValidationRapportSavPanel di={di} onValider={validerRapportSav} actionInProgress={actionInProgress} />
        )}

        {/* 0.60.6 : Rapport SAV déjà validé côté EC — affichage info */}
        {viewMode.ready && di.rapport_sav_validee_at && (
          <Panel style={{ background: "rgba(90,160,90,.08)", borderLeft: "4px solid #5aa05a" }}>
            <h3 style={{ margin: "0 0 6px", color: "#5aa05a", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-shield-check" /> Rapport SAV validé
            </h3>
            <div style={{ fontSize: 12.5, color: "#5a6878" }}>
              ✍ Signé par <b>{di.rapport_sav_signature}</b> le {new Date(di.rapport_sav_validee_at).toLocaleString("fr-FR")}
            </div>
            {di.rapport_sav_commentaire_ec && (
              <div style={{ marginTop: 8, padding: 8, background: "#fff", borderRadius: 6, fontSize: 12, color: "#142131" }}>
                💬 {di.rapport_sav_commentaire_ec}
              </div>
            )}
          </Panel>
        )}

        {/* 0.60.5 : Actions EC — Confirmer réception si DI livrée (mais pas SAV ni Transfert) */}
        {viewMode.ready && viewMode.isEC && di.statut === "livree" && di.type_demande !== "sav" && (
          <Panel style={{ background: "rgba(24,95,165,.06)", borderLeft: "4px solid #185FA5" }}>
            <h3 style={{ margin: "0 0 10px", color: "#185FA5", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-package" /> Actions Espace Collectivité
            </h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Btn variant="primary" icon="ti-check-bold" onClick={confirmerReception} disabled={actionInProgress}>
                {actionInProgress ? "..." : "✓ Confirmer la réception"}
              </Btn>
              <Btn variant="ghost" icon="ti-printer" onClick={() => imprimerBL({ numero: di.numero_bl, di, lignes, auth })}>
                Voir / Réimprimer BL
              </Btn>
              <span style={{ color: "#185FA5", fontSize: 12, fontWeight: 600 }}>
                {di.numero_bl ? `📦 BL : ${di.numero_bl}` : "BL en cours"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#5a6878", marginTop: 8, fontStyle: "italic" }}>
              Une fois la réception confirmée, la DI sera marquée comme clôturée.
            </div>
          </Panel>
        )}

        {/* Actions magasin */}
        {viewMode.ready && viewMode.isMagasin && (
          <Panel style={{ background: "rgba(94,143,143,.06)", borderLeft: "4px solid #5a8f8f" }}>
            <h3 style={{ margin: "0 0 10px", color: "#5a8f8f", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-tool" /> Actions magasin
            </h3>
            {di.statut === "nouvelle" || di.statut === "en_attente" || !di.statut ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Btn variant="primary" icon="ti-check" onClick={valider} disabled={actionInProgress}>
                  {actionInProgress ? "..." : "Valider la DI"}
                </Btn>
                <Btn variant="ghost" icon="ti-x" onClick={() => setShowRefus(!showRefus)} disabled={actionInProgress}>
                  Refuser
                </Btn>
              </div>
            ) : di.statut === "validee" ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {di.type_demande === "sav" ? (
                  <>
                    <Btn variant="primary" icon="ti-clipboard-check" onClick={() => router.push(`/demandes-internes/${id}/executer-bilan`)} disabled={actionInProgress}>
                      Exécuter le bilan SAV
                    </Btn>
                    <span style={{ padding: "8px 12px", color: "#5aa05a", fontSize: 12, fontWeight: 600 }}>
                      ✓ DI validée — bilan à exécuter
                    </span>
                  </>
                ) : di.type_demande === "transfert" ? (
                  <>
                    <Btn variant="primary" icon="ti-package" onClick={() => changerStatutTransfert("en_preparation", "En préparation")} disabled={actionInProgress}>
                      Démarrer préparation
                    </Btn>
                    <span style={{ padding: "8px 12px", color: "#5aa05a", fontSize: 12, fontWeight: 600 }}>
                      ✓ Transfert validé — à préparer
                    </span>
                  </>
                ) : (
                  <>
                    <Btn variant="primary" icon="ti-truck-delivery" onClick={genererBL} disabled={actionInProgress}>
                      {actionInProgress ? "..." : "Générer le BL"}
                    </Btn>
                    <span style={{ padding: "8px 12px", color: "#5aa05a", fontSize: 12, fontWeight: 600 }}>
                      ✓ DI validée — prête à livrer
                    </span>
                  </>
                )}
              </div>
            ) : di.statut === "en_preparation" ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Btn variant="primary" icon="ti-truck" onClick={() => changerStatutTransfert("en_transit", "En transit")} disabled={actionInProgress}>
                  Marquer en transit
                </Btn>
                <span style={{ padding: "8px 12px", color: "#EF9F27", fontSize: 12, fontWeight: 600 }}>
                  📦 Préparation en cours
                </span>
              </div>
            ) : di.statut === "en_transit" ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Btn variant="primary" icon="ti-check-bold" onClick={() => changerStatutTransfert("livre", "Livré")} disabled={actionInProgress}>
                  Confirmer livraison
                </Btn>
                <span style={{ padding: "8px 12px", color: "#185FA5", fontSize: 12, fontWeight: 600 }}>
                  🚛 Marchandises en transit
                </span>
              </div>
            ) : di.statut === "livree" ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Btn variant="ghost" icon="ti-printer" onClick={() => imprimerBL({ numero: di.numero_bl, di, lignes, auth })} disabled={actionInProgress}>
                  Réimprimer BL
                </Btn>
                {di.numero_bl && <span style={{ color: "#185FA5", fontSize: 12, fontWeight: 600 }}>📦 BL : <code>{di.numero_bl}</code></span>}
              </div>
            ) : (
              <div style={{ color: "#5a6878", fontSize: 12.5 }}>
                Statut <b>{statut.lbl}</b> — pas d'action disponible
                {di.motif_refus && <div style={{ marginTop: 6, color: "#e35d5b" }}>Motif refus : {di.motif_refus}</div>}
                {di.numero_bl && <div style={{ marginTop: 6, color: "#185FA5" }}>BL : <code>{di.numero_bl}</code></div>}
              </div>
            )}

            {showRefus && (
              <div style={{ marginTop: 12, padding: 12, background: "#fff", border: "1px solid #e35d5b", borderRadius: 8 }}>
                <label style={{ display: "block", fontSize: 12, color: "#c0392b", fontWeight: 700, marginBottom: 6 }}>
                  Motif de refus *
                </label>
                <textarea value={refusReason} onChange={(e) => setRefusReason(e.target.value)} rows={3} autoFocus
                  placeholder="Article indisponible, quantité insuffisante, etc."
                  style={{ width: "100%", padding: "8px 12px", background: "#fafbfc", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Btn variant="ghost" onClick={() => { setShowRefus(false); setRefusReason(""); }}>Annuler</Btn>
                  <Btn variant="primary" icon="ti-x" onClick={refuser} disabled={actionInProgress}>Confirmer refus</Btn>
                </div>
              </div>
            )}
          </Panel>
        )}

        {/* Détails DI */}
        <Panel style={{ marginTop: 12 }}>
          <h3 style={{ margin: "0 0 12px", color: "#185FA5" }}>Détails</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, fontSize: 13 }}>
            {di.priorite && <Info lbl="Priorité" val={di.priorite} />}
            {di.depot_destination_id && <Info lbl="Dépôt destination" val={di.depot_destination_id.substring(0, 8) + "..."} />}
            {di.magasin_id && <Info lbl="Magasin" val={di.magasin_id.substring(0, 8) + "..."} />}
            <Info lbl="Nombre lignes" val={lignes.length} />
            {di.commentaire && <div style={{ gridColumn: "1 / -1" }}><Info lbl="Commentaire" val={di.commentaire} /></div>}
          </div>
        </Panel>

        {/* Lignes */}
        <Panel style={{ marginTop: 12 }}>
          <h3 style={{ margin: "0 0 12px", color: "#185FA5" }}>Articles demandés ({lignes.length})</h3>
          {lignes.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Aucune ligne</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {lignes.map(l => {
                const isOrphan = !l.article_id && (l.libelle || l.code);
                return (
                  <div key={l.id} style={{
                    background: "#fff",
                    border: `1px solid ${isOrphan ? "#EF9F27" : "#e3e9ee"}`,
                    borderLeft: `3px solid ${isOrphan ? "#EF9F27" : "#185FA5"}`,
                    borderRadius: 8, padding: 10,
                    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                  }}>
                    <i className={`ti ${isOrphan ? "ti-package-off" : "ti-package"}`} style={{ color: isOrphan ? "#EF9F27" : "#185FA5", fontSize: 20 }} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 600, color: "#142131" }}>
                        {l.articles?.libelle || l.libelle || <em style={{ color: "#8a98a8" }}>Article sans nom</em>}
                      </div>
                      {(l.articles?.reference || l.articles?.code || l.code) && <div style={{ fontFamily: "Consolas,monospace", fontSize: 11, color: "#8a98a8" }}>{l.articles?.reference || l.articles?.code || l.code}</div>}
                      {isOrphan && (
                        <div style={{ fontSize: 11, color: "#d48820", marginTop: 3, fontStyle: "italic" }}>
                          ⚠ Article non rattaché au catalogue
                        </div>
                      )}
                    </div>
                    <span style={{ padding: "4px 12px", background: "#fafbfc", border: "1px solid #cfd8e0", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                      {l.quantite_demandee || 0} {l.unite || "u"}
                    </span>
                    {/* 0.59.9 : bouton créer article si orphelin et user magasin */}
                    {isOrphan && viewMode.isMagasin && (
                      <button onClick={() => setCreateArticleFor(l)} style={{
                        background: "linear-gradient(135deg,#5a8f8f,#477676)", color: "#fff",
                        border: "none", padding: "6px 12px", borderRadius: 6,
                        fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                      }}>
                        <i className="ti ti-plus" /> Créer article
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* 0.59.9 : Modal création article rapide depuis ligne DI */}
        {createArticleFor && (
          <CreateArticleQuickModal
            ligne={createArticleFor}
            supabase={supabase}
            structureId={auth.structureId}
            userId={auth.user?.id}
            onClose={() => setCreateArticleFor(null)}
            onCreated={async (articleId) => {
              // Lier la ligne à l'article créé
              await supabase.from("demandes_internes_lignes")
                .update({ article_id: articleId })
                .eq("id", createArticleFor.id);
              setCreateArticleFor(null);
              await reload();
              alert("✓ Article créé et rattaché à la ligne");
            }}
          />
        )}
      </div>
    </div>
  );
}

// 0.60.6 : Panel validation rapport SAV côté EC avec signature
function ValidationRapportSavPanel({ di, onValider, actionInProgress }) {
  const [show, setShow] = useState(false);
  const [signature, setSignature] = useState("");
  const [signatureCanvas, setSignatureCanvas] = useState(null); // base64 PNG
  const [commentaire, setCommentaire] = useState("");

  return (
    <Panel style={{ background: "rgba(94,143,143,.06)", borderLeft: "4px solid #5a8f8f" }}>
      <h3 style={{ margin: "0 0 8px", color: "#5a8f8f", display: "flex", alignItems: "center", gap: 8 }}>
        <i className="ti ti-clipboard-check" /> Validation du rapport SAV
      </h3>
      <div style={{ fontSize: 12.5, color: "#5a6878", marginBottom: 10 }}>
        Le magasin a exécuté le bilan SAV. Vérifie le rapport et valide-le pour clôturer la DI.
      </div>
      {!show ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="primary" icon="ti-shield-check" onClick={() => setShow(true)}>
            Valider et signer le rapport
          </Btn>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #5a8f8f", borderRadius: 8, padding: 12 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, color: "#5a6878", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
              ✍ Nom du validateur *
            </label>
            <input value={signature} onChange={(e) => setSignature(e.target.value)} autoFocus
              placeholder="Prénom Nom"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 14, fontWeight: 600 }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, color: "#5a6878", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
              ✍ Signature manuscrite
            </label>
            <SignatureCanvas onChange={setSignatureCanvas} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, color: "#5a6878", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
              💬 Commentaire (optionnel)
            </label>
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={2}
              placeholder="Observations éventuelles..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 12.5, resize: "vertical" }} />
          </div>
          <div style={{ fontSize: 11, color: "#8a98a8", marginBottom: 10, fontStyle: "italic" }}>
            En validant, tu certifies avoir consulté le rapport et accepté les conclusions. La DI sera clôturée.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => { setShow(false); setSignature(""); setCommentaire(""); setSignatureCanvas(null); }}>Annuler</Btn>
            <Btn variant="primary" icon="ti-check" onClick={() => onValider(signature, commentaire, signatureCanvas)} disabled={actionInProgress || !signature.trim()}>
              ✓ Valider et signer
            </Btn>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Info({ lbl, val }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "#8a98a8", textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>{lbl}</div>
      <div style={{ fontSize: 13, color: "#142131", fontWeight: 600 }}>{val}</div>
    </div>
  );
}

// =============================================================
// 0.59.8 : Génération BL imprimable (window.print → PDF)
// =============================================================
function imprimerBL({ numero, di, lignes, auth }) {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) { alert("Bloque les popups pour ouvrir le BL"); return; }
  const dateStr = new Date().toLocaleDateString("fr-FR");
  const heureStr = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const lignesHTML = lignes.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#8a98a8;padding:20px">Aucune ligne</td></tr>`
    : lignes.map((l, i) => `
        <tr style="border-bottom:1px solid #e3e9ee">
          <td style="padding:8px;font-family:Consolas,monospace;color:#8a98a8">${i+1}</td>
          <td style="padding:8px;font-family:Consolas,monospace">${l.articles?.code || l.code || l.articles?.reference || "—"}</td>
          <td style="padding:8px;font-weight:600">${l.articles?.libelle || l.libelle || "Article ?"}</td>
          <td style="padding:8px;text-align:center;font-weight:700">${l.quantite_demandee || 0} ${l.unite || "u"}</td>
          <td style="padding:8px;text-align:center;color:#5aa05a;font-weight:700">${l.quantite_validee || l.quantite_demandee || 0}</td>
        </tr>
      `).join("");

  w.document.write(`
<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8">
<title>BL ${numero}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Quicksand','Segoe UI',sans-serif;color:#142131;padding:30px;background:#fff;font-size:13px;line-height:1.5}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #142131;padding-bottom:18px;margin-bottom:20px}
  .logo{font-size:36px;font-weight:600;letter-spacing:3px;color:#142131}
  .logo span{color:#7CC8C8}
  .doc-info{text-align:right}
  .doc-info h1{font-size:22px;font-weight:700;margin-bottom:6px}
  .doc-info .num{font-family:Consolas,monospace;font-size:14px;background:#142131;color:#fff;padding:4px 10px;border-radius:4px;display:inline-block}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;background:#fafbfc;padding:16px;border-radius:8px}
  .meta-block h3{font-size:11px;color:#7CC8C8;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:6px}
  .meta-block p{font-size:13px;color:#142131}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  th{background:#142131;color:#fff;padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700}
  th:nth-child(4), th:nth-child(5){text-align:center}
  .totaux{margin-top:20px;padding:12px;background:#142131;color:#fff;border-radius:8px;display:flex;justify-content:space-between;font-size:14px}
  .signatures{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:50px}
  .sign-box{border:1px solid #cfd8e0;border-radius:8px;padding:14px;min-height:120px}
  .sign-box h4{font-size:11px;color:#5a6878;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
  .sign-box .name{font-size:12px;color:#142131;margin-bottom:4px}
  .sign-box .date{font-size:11px;color:#8a98a8}
  footer{margin-top:40px;padding-top:16px;border-top:1px solid #e3e9ee;text-align:center;font-size:10.5px;color:#8a98a8}
  .qr-placeholder{display:inline-block;width:80px;height:80px;background:repeating-linear-gradient(45deg,#142131 0,#142131 4px,#fff 4px,#fff 8px);border:2px solid #142131;border-radius:8px;margin-top:8px}
  @media print {body{padding:15mm} .no-print{display:none}}
</style>
</head><body>
<div class="header">
  <div>
    <div class="logo">a<span>v</span>eho</div>
    <div style="font-size:10.5;color:#5a6878;letter-spacing:1px;text-transform:uppercase;margin-top:2px">Magasin · Bon de livraison</div>
  </div>
  <div class="doc-info">
    <h1>BON DE LIVRAISON</h1>
    <div class="num">${numero}</div>
    <div style="font-size:11.5px;color:#5a6878;margin-top:6px">Émis le ${dateStr} à ${heureStr}</div>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-block">
    <h3>📥 DESTINATAIRE</h3>
    <p><b>${auth.structureId ? "Structure EC" : "—"}</b></p>
    ${di.depot_destination_id ? `<p style="font-size:11px;color:#5a6878;margin-top:4px">Dépôt destination · <code>${di.depot_destination_id.substring(0, 8)}</code></p>` : ""}
  </div>
  <div class="meta-block">
    <h3>📋 RÉFÉRENCE DI</h3>
    <p><b>${di.numero || "DI-" + di.id?.substring(0,8)}</b></p>
    <p style="font-size:11px;color:#5a6878;margin-top:4px">DI émise le ${new Date(di.created_at).toLocaleDateString("fr-FR")}</p>
    ${di.priorite ? `<p style="font-size:11px;color:#EF9F27;font-weight:700;margin-top:2px">Priorité ${di.priorite}</p>` : ""}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:40px">#</th>
      <th style="width:140px">Code</th>
      <th>Désignation</th>
      <th style="width:80px">Qté demandée</th>
      <th style="width:80px">Qté livrée</th>
    </tr>
  </thead>
  <tbody>
    ${lignesHTML}
  </tbody>
</table>

<div class="totaux">
  <span>Total lignes : <b>${lignes.length}</b></span>
  <span>Total quantité : <b>${lignes.reduce((s, l) => s + (parseFloat(l.quantite_demandee) || 0), 0)} unités</b></span>
</div>

${di.commentaire ? `
<div style="background:#fafbfc;border-left:3px solid #185FA5;padding:10px 14px;margin-top:14px;border-radius:6px">
  <div style="font-size:10.5px;color:#185FA5;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Commentaire</div>
  <div style="font-size:12.5px;color:#142131">${di.commentaire}</div>
</div>
` : ""}

<div class="signatures">
  <div class="sign-box">
    <h4>✍ Émetteur (magasin)</h4>
    <div class="name">${auth.user?.email || "—"}</div>
    <div class="date">Le ${dateStr}</div>
    <div class="qr-placeholder"></div>
  </div>
  <div class="sign-box">
    <h4>✍ Réception (EC)</h4>
    <div style="color:#8a98a8;font-style:italic;font-size:11px;margin-top:30px">À signer à la réception</div>
  </div>
</div>

<footer>
  Bon de livraison ${numero} · Aveho · Imprimé le ${dateStr} à ${heureStr}<br>
  Document généré automatiquement. Référence DI : ${di.numero || di.id}
</footer>

<div class="no-print" style="margin-top:30px;text-align:center">
  <button onclick="window.print()" style="background:#142131;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Quicksand,sans-serif">
    🖨 Imprimer / Enregistrer en PDF
  </button>
</div>

<script>setTimeout(() => window.print(), 500);</script>
</body></html>
  `);
  w.document.close();
}

// =============================================================
// 0.59.9 : Modal création article rapide depuis ligne DI
// =============================================================
function CreateArticleQuickModal({ ligne, supabase, structureId, userId, onClose, onCreated }) {
  const [form, setForm] = useState({
    libelle: ligne.libelle || ligne.articles?.libelle || "",
    code: ligne.code || ligne.articles?.code || "",
    reference: "",
    famille: "",
    unite: ligne.unite || "unité",
    est_catalogue_magasin: true,  // Pré-coché car créé depuis le magasin
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (!form.libelle?.trim()) { setError("Le libellé est obligatoire"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        structure_id: structureId,
        libelle: form.libelle.trim(),
        code: form.code?.trim() || null,
        reference: form.reference?.trim() || null,
        famille: form.famille?.trim() || null,
        unite: form.unite || "unité",
        est_catalogue_magasin: !!form.est_catalogue_magasin,
        actif: true,
        created_by: userId,
      };
      const r = await supabase.from("articles").insert(payload).select("id").single();
      if (r.error) throw r.error;
      onCreated(r.data.id);
    } catch (e) {
      setError(`${e.message} (${e.code || "?"})`);
    } finally { setSaving(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: 20,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: 24, maxWidth: 500, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,.3)", color: "#142131",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#5a8f8f" }}>
            <i className="ti ti-package-plus" /> Créer un article catalogue
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, color: "#8a98a8", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ fontSize: 12.5, color: "#5a6878", marginBottom: 14 }}>
          Cet article sera ajouté au catalogue magasin Aveho et rattaché à la ligne de la DI.
        </div>

        {error && (
          <div style={{ background: "rgba(227,93,91,.10)", border: "1px solid #e35d5b", borderRadius: 8, padding: 10, marginBottom: 12, color: "#c0392b", fontSize: 12.5, fontWeight: 600 }}>
            <i className="ti ti-alert-triangle" /> {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Fld label="Libellé *" required>
            <input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} autoFocus
              placeholder="Tubulure perfusion 100ml..."
              style={inputStyleLight} />
          </Fld>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Fld label="Référence interne">
              <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value.toUpperCase() })} placeholder="REF-001" style={{ ...inputStyleLight, fontFamily: "Consolas,monospace" }} />
            </Fld>
            <Fld label="Code produit">
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CIP, EAN..." style={{ ...inputStyleLight, fontFamily: "Consolas,monospace" }} />
            </Fld>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Fld label="Famille">
              <input value={form.famille} onChange={(e) => setForm({ ...form, famille: e.target.value })} placeholder="Perfusion, oxygène..." style={inputStyleLight} />
            </Fld>
            <Fld label="Unité">
              <select value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} style={inputStyleLight}>
                <option value="unité">Unité</option>
                <option value="boîte">Boîte</option>
                <option value="lot">Lot</option>
                <option value="paquet">Paquet</option>
                <option value="ml">ml</option>
                <option value="L">Litre</option>
                <option value="kg">kg</option>
                <option value="m">Mètre</option>
              </select>
            </Fld>
          </div>
          <label style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: 12, borderRadius: 8,
            background: form.est_catalogue_magasin ? "rgba(94,143,143,.10)" : "#fafbfc",
            border: `2px solid ${form.est_catalogue_magasin ? "#5a8f8f" : "#e3e9ee"}`,
            cursor: "pointer",
          }}>
            <input type="checkbox" checked={!!form.est_catalogue_magasin}
              onChange={(e) => setForm({ ...form, est_catalogue_magasin: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: "#5a8f8f" }} />
            <div style={{ flex: 1, fontSize: 12.5 }}>
              <div style={{ fontWeight: 700, color: form.est_catalogue_magasin ? "#5a8f8f" : "#142131" }}>
                <i className="ti ti-building-warehouse" /> Article du catalogue magasin
              </div>
              <div style={{ fontSize: 11, color: "#5a6878" }}>
                Recommandé : permet aux EC de référencer cet article dans leurs DI futures
              </div>
            </div>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onClose} style={btnGhost}>Annuler</button>
          <button onClick={create} disabled={saving} style={btnPrimary}>
            <i className="ti ti-device-floppy" /> {saving ? "Création..." : "Créer et rattacher"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Fld({ label, required, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "#5a6878", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>
        {label}{required && <span style={{ color: "#e35d5b" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyleLight = {
  width: "100%", padding: "9px 12px",
  background: "#fafbfc", border: "1px solid #cfd8e0", borderRadius: 8,
  fontFamily: "inherit", fontSize: 13, color: "#142131",
};
const btnGhost = {
  padding: "9px 18px", background: "#fff", color: "#5a6878",
  border: "1px solid #cfd8e0", borderRadius: 8,
  fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnPrimary = {
  padding: "9px 18px", background: "linear-gradient(135deg,#5a8f8f,#477676)", color: "#fff",
  border: "none", borderRadius: 8,
  fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
