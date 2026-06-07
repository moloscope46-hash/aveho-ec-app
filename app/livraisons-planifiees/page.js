"use client";
// =============================================================
//  /livraisons-planifiees — Vue commune EC + Magasin (0.62.22)
//  Liste toutes les livraisons + tournées planifiées.
//  L'étab peut valider la réception → génère un bon de réception.
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useMagasinContext } from "../../lib/useMagasinContext";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

const STATUT_META = {
  planifiee:  { col: "#EF9F27", lbl: "📅 Planifiée" },
  a_faire:    { col: "#7a6fb0", lbl: "⏳ À faire" },
  en_cours:   { col: "#185FA5", lbl: "🚛 En cours" },
  livree:     { col: "#5aa05a", lbl: "✓ Livrée (à valider)" },
  receptionnee: { col: "#5aa05a", lbl: "✅ Réceptionnée" },
  refusee:    { col: "#e35d5b", lbl: "⊘ Refusée" },
  annulee:    { col: "#8a98a8", lbl: "⊘ Annulée" },
};

const TYPE_META = {
  tournee:    { col: "#185FA5", ic: "ti-route", lbl: "Tournée" },
  livraison:  { col: "#EF9F27", ic: "ti-truck", lbl: "Livraison DI" },
  transfert:  { col: "#7a6fb0", ic: "ti-transfer", lbl: "Transfert" },
  sav:        { col: "#e35d5b", ic: "ti-tool", lbl: "SAV" },
  maintenance:{ col: "#185FA5", ic: "ti-wrench", lbl: "Maintenance" },
};

export default function LivraisonsPlanifieesPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [tournees, setTournees] = useState([]);
  const [transferts, setTransferts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("toutes");  // toutes | a_recevoir | en_cours | livrees
  const [validModal, setValidModal] = useState(null);
  const [validForm, setValidForm] = useState({});
  const [validating, setValidating] = useState(false);

  // Permissions
  const isMagasin = magasinCtx.isUserMagasin;
  const peutValider = !isMagasin;  // Seul l'étab valide la réception

  useEffect(() => {
    if (!auth.ready) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch (e) { console.warn(e); return []; } };

    // 1. Tournées
    let tq = supabase.from("tournees")
      .select("*, vehicules_magasin(immatriculation, marque, modele), magasins(nom, ville)")
      .order("date_tournee", { ascending: false })
      .limit(100);
    if (isMagasin && magasinCtx.magasinId) tq = tq.eq("magasin_id", magasinCtx.magasinId);
    // Côté étab : cantonnement par etablissement_ids des étapes (TODO via JOIN)
    const trns = await tryFetch(tq);
    setTournees(trns);

    // 2. Transferts
    let xq = supabase.from("transferts")
      .select("*, depots:depot_destination_id(nom, etablissement_id, etablissements(nom, ville))")
      .order("created_at", { ascending: false })
      .limit(100);
    if (isMagasin && magasinCtx.magasinId) xq = xq.eq("magasin_emetteur_id", magasinCtx.magasinId);
    // Côté étab : filtre par étab via depot.etablissement_id  (TODO précision avec rattachements)
    const trs = await tryFetch(xq);
    setTransferts(trs);

    setLoading(false);
  }

  // Convertit en liste plate normalisée
  const items = [
    ...tournees.map(t => ({
      kind: "tournee", id: t.id, ref: t.numero, libelle: t.nom,
      date: t.date_tournee, statut: t.statut,
      magasin: t.magasins?.nom, vehicule: t.vehicules_magasin?.immatriculation,
      nb_etapes: t.nb_etapes, raw: t,
    })),
    ...transferts.map(t => ({
      kind: "transfert", id: t.id, ref: t.numero, libelle: `${t.quantite || ""} u → ${t.depots?.nom || "?"}`,
      date: t.created_at?.slice(0, 10), statut: t.statut,
      magasin: t.magasin_emetteur_id, vehicule: null,
      destination: t.depots?.etablissements?.nom,
      raw: t,
    })),
  ];

  const filteredItems = items.filter(it => {
    if (filter === "a_recevoir") return ["livree", "a_faire", "en_cours"].includes(it.statut);
    if (filter === "en_cours") return it.statut === "en_cours";
    if (filter === "livrees") return ["livree", "receptionnee"].includes(it.statut);
    return true;
  });

  function openValidation(item) {
    setValidForm({
      commentaire: "",
      conforme: true,
      anomalies: "",
      signataire: auth.user?.email || "",
    });
    setValidModal(item);
  }

  async function valider() {
    if (!validModal) return;
    setValidating(true);
    try {
      // 1. Mettre à jour statut de l'item d'origine
      if (validModal.kind === "tournee") {
        await supabase.from("tournees").update({ statut: "receptionnee" }).eq("id", validModal.id);
      } else if (validModal.kind === "transfert") {
        await supabase.from("transferts").update({ statut: "receptionne" }).eq("id", validModal.id);
      }
      // 2. Créer le bon de réception
      const numero = `BR-${Date.now().toString().slice(-8)}`;
      const payload = {
        numero,
        type_source: validModal.kind,
        source_id: validModal.id,
        etablissement_id: auth.etabId,
        structure_id: auth.structureId,
        conforme: validForm.conforme,
        commentaire: validForm.commentaire || null,
        anomalies: validForm.anomalies || null,
        signataire_email: validForm.signataire || null,
        receptionne_par: auth.user?.id,
        receptionne_le: new Date().toISOString(),
        statut: validForm.conforme ? "valide" : "litige",
      };
      const r = await supabase.from("bons_reception").insert(payload);
      if (r.error && r.error.code === "42P01") {
        alert("⚠ La table bons_reception n'existe pas encore. Lance migration-0.62.22-livraisons-bons-reception.sql");
      } else if (r.error) {
        throw r.error;
      }
      setValidModal(null);
      alert(`✓ Réception ${numero} validée${validForm.conforme ? " (conforme)" : " (litige)"}. Stock à mettre à jour manuellement pour l'instant.`);
      await reload();
    } catch (e) {
      console.error("[validation]", e);
      alert("❌ " + e.message);
    } finally { setValidating(false); }
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px" }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-truck" title="Livraisons planifiées" subtitle={isMagasin ? "Vue magasin — tournées émises" : "Vue étab — valider les réceptions"} />
        </div>

        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 4, border: "1px solid #cfd8e0", borderRadius: 6, overflow: "hidden", width: "fit-content" }}>
            {[
              { v: "toutes", l: "Toutes" },
              { v: "a_recevoir", l: "À recevoir" },
              { v: "en_cours", l: "En cours" },
              { v: "livrees", l: "Livrées" },
            ].map(f => (
              <button key={f.v} onClick={() => setFilter(f.v)} style={{
                padding: "6px 14px", background: filter === f.v ? "#185FA5" : "#fff",
                color: filter === f.v ? "#fff" : "#5a6878", border: "none",
                fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>{f.l}</button>
            ))}
          </div>
        </Panel>

        <Panel style={{ marginTop: 12 }}>
          {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement…</div>
            : filteredItems.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-truck-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              Aucune livraison.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredItems.map(it => {
                const stat = STATUT_META[it.statut] || { col: "#8a98a8", lbl: it.statut };
                const typeMeta = TYPE_META[it.kind] || TYPE_META.tournee;
                return (
                  <div key={`${it.kind}-${it.id}`} style={{
                    background: "#fff", border: "1px solid #e3e9ee",
                    borderLeft: `4px solid ${typeMeta.col}`,
                    borderRadius: 8, padding: 10,
                    display: "grid",
                    gridTemplateColumns: "auto 90px 1fr 100px 120px 120px",
                    gap: 10, alignItems: "center",
                  }}>
                    <i className={`ti ${typeMeta.ic}`} style={{ color: typeMeta.col, fontSize: 20 }} />
                    <span style={{ padding: "2px 6px", background: `${typeMeta.col}15`, color: typeMeta.col, borderRadius: 4, fontSize: 10, fontWeight: 700, textAlign: "center" }}>{typeMeta.lbl}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#142131" }}>{it.libelle || it.ref}</div>
                      <div style={{ fontSize: 10.5, color: "#8a98a8" }}>
                        {it.ref}
                        {it.destination && <> · → {it.destination}</>}
                        {it.nb_etapes && <> · {it.nb_etapes} étape(s)</>}
                        {it.vehicule && <> · {it.vehicule}</>}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#5a6878" }}>{it.date ? new Date(it.date).toLocaleDateString("fr-FR") : "—"}</div>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: `${stat.col}1A`, color: stat.col, border: `1px solid ${stat.col}40`, fontSize: 11, fontWeight: 700, textAlign: "center" }}>{stat.lbl}</span>
                    <div>
                      {peutValider && ["livree", "a_faire", "en_cours"].includes(it.statut) ? (
                        <button onClick={() => openValidation(it)} style={{
                          background: "linear-gradient(135deg,#5aa05a,#4a8a4a)", color: "#fff",
                          border: "none", padding: "5px 12px", borderRadius: 6,
                          fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                          width: "100%",
                        }}>
                          <i className="ti ti-circle-check" /> Valider réception
                        </button>
                      ) : (
                        <button onClick={() => router.push(it.kind === "tournee" ? `/magasin/tournees/${it.id}` : `/transferts/${it.id}`)} style={{
                          background: "transparent", color: "#185FA5",
                          border: "1px solid #cfd8e0", padding: "5px 12px", borderRadius: 6,
                          fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                          width: "100%",
                        }}>
                          <i className="ti ti-eye" /> Voir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Modal validation réception */}
        {validModal && (
          <Modal open={!!validModal} onClose={() => setValidModal(null)} kind="patient"
            title={`Valider réception — ${validModal.ref || validModal.libelle}`}
            actions={
              <>
                <Btn variant="ghost" onClick={() => setValidModal(null)}>Annuler</Btn>
                <Btn variant="primary" onClick={valider} disabled={validating}>{validating ? "Validation…" : "Valider la réception"}</Btn>
              </>
            }>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: 10, background: "rgba(94,160,90,.08)", borderLeft: "3px solid #5aa05a", borderRadius: 6, fontSize: 12, color: "#5a6878" }}>
                ✓ Cette action génère un <b>bon de réception</b> et passe le statut à "Réceptionné".
              </div>

              <label style={{ fontSize: 12, color: "#5a6878" }}>
                <input type="checkbox" checked={validForm.conforme} onChange={(e) => setValidForm({ ...validForm, conforme: e.target.checked })} /> <b>Livraison conforme</b> (qualité OK, quantités OK)
              </label>

              {!validForm.conforme && (
                <label style={{ fontSize: 12, color: "#5a6878" }}>
                  <b>Anomalies constatées</b>
                  <textarea value={validForm.anomalies} onChange={(e) => setValidForm({ ...validForm, anomalies: e.target.value })} placeholder="Articles manquants, casse, qualité…" style={{ width: "100%", padding: "8px 10px", marginTop: 4, border: "1px solid #e35d5b", borderRadius: 6, fontFamily: "inherit", fontSize: 13, minHeight: 70 }} />
                </label>
              )}

              <label style={{ fontSize: 12, color: "#5a6878" }}>
                <b>Commentaire</b>
                <textarea value={validForm.commentaire} onChange={(e) => setValidForm({ ...validForm, commentaire: e.target.value })} placeholder="Heure exacte, contact, conditions…" style={{ width: "100%", padding: "8px 10px", marginTop: 4, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13, minHeight: 50 }} />
              </label>

              <label style={{ fontSize: 12, color: "#5a6878" }}>
                <b>Signataire</b> (email)
                <input value={validForm.signataire} onChange={(e) => setValidForm({ ...validForm, signataire: e.target.value })} style={{ width: "100%", padding: "8px 10px", marginTop: 4, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }} />
              </label>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
