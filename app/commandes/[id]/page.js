"use client";
// =============================================================
//  app/commandes/[id]/page.js (0.62.135)
//
//  Page détail d'une commande avec :
//   - Infos générales (numéro, magasin, statut, dates)
//   - Lignes de commande
//   - WorkflowApproval (templates + stepper)
//   - Activité (timeline simplifiée)
// =============================================================

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { toast } from "../../components/ui-premium";
import WorkflowApproval from "../../components/WorkflowApproval";
import LockBanner from "../../components/LockBanner";  /* 0.63.1 */
import { useEditLock } from "../../../lib/useEditLock";  /* 0.63.1 */

const STATUTS_LBL = {
  brouillon: { l: "Brouillon", col: "#8a98a8" },
  envoyee: { l: "Envoyée", col: "#185FA5" },
  partielle: { l: "Réception partielle", col: "#EF9F27" },
  recue: { l: "Reçue", col: "#5aa05a" },
  annulee: { l: "Annulée", col: "#e35d5b" },
};

export default function CommandeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [commande, setCommande] = useState(null);
  // 0.63.1 : Lock anti-collision édition concurrente
  const commandeLock = useEditLock("commande", commande?.id, !!commande?.id);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    if (!params?.id || !auth?.structureId) return;
    setLoading(true);
    try {
      // Fetch commande + magasin
      const { data: c, error: e1 } = await supabase
        .from("commandes")
        .select("*, magasins(nom)")
        .eq("id", params.id)
        .maybeSingle();
      if (e1) throw e1;
      if (!c) { setErr("Commande introuvable"); return; }
      setCommande(c);

      // Fetch lignes
      const { data: lg } = await supabase
        .from("commande_lignes")
        .select("*")
        .eq("commande_id", params.id)
        .order("created_at");
      setLignes(lg || []);
    } catch (e) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [params?.id, auth?.structureId]);

  if (!auth?.user) return <div className="bg-dark"><div style={{ padding: 40, color: "#fff" }}>Authentification…</div></div>;

  if (loading) return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap"><div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Chargement…</div></div>
    </div>
  );

  if (err || !commande) return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <Panel>
          <div style={{ padding: 20, textAlign: "center" }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 30, color: "#e35d5b", display: "block", marginBottom: 8 }} />
            <div style={{ color: "#e35d5b", fontWeight: 700, marginBottom: 12 }}>{err || "Commande introuvable"}</div>
            <Btn variant="primary" onClick={() => router.push("/commandes")}>← Retour aux commandes</Btn>
          </div>
        </Panel>
      </div>
    </div>
  );

  const statutMeta = STATUTS_LBL[commande.statut] || { l: commande.statut, col: "#8a98a8" };
  const totalMontant = lignes.reduce((s, l) => s + ((l.quantite || 1) * (l.prix_unitaire || 0)), 0);

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          icon="ti-truck"
          title={`Commande ${commande.numero}`}
          accent="teal"
          eyebrow="DÉTAIL COMMANDE"
          sub={`Magasin : ${commande.magasins?.nom || "—"} · ${lignes.length} ligne${lignes.length > 1 ? "s" : ""}`}
          actions={<Btn variant="ghost" icon="ti-arrow-left" onClick={() => router.push("/commandes")}>Retour</Btn>}
        />

        {/* 0.63.1 : LockBanner si édition concurrente */}
        {commandeLock?.locked && (
          <LockBanner lockedBy={commandeLock.lockedBy} onTakeover={commandeLock.takeover} resourceLabel="cette commande" />
        )}

        {/* Card infos générales */}
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <InfoBlock label="Numéro" value={commande.numero} icon="ti-hash" col="#185FA5" />
            <InfoBlock label="Magasin" value={commande.magasins?.nom || "—"} icon="ti-building-store" col="#5a8f8f" />
            <InfoBlock label="Statut" value={
              <span style={{
                padding: "3px 10px",
                background: statutMeta.col + "22",
                color: statutMeta.col,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
              }}>{statutMeta.l}</span>
            } icon="ti-flag" col={statutMeta.col} />
            <InfoBlock label="Date création" value={new Date(commande.created_at).toLocaleDateString("fr-FR")} icon="ti-calendar" col="#7CC8C8" />
            {commande.fournisseur && (
              <InfoBlock label="Fournisseur" value={commande.fournisseur} icon="ti-building-warehouse" col="#7a6fb0" />
            )}
            <InfoBlock label="Montant total" value={`${totalMontant.toFixed(2)} €`} icon="ti-currency-euro" col="#EF9F27" highlight />
          </div>
          {commande.motif && (
            <div style={{ marginTop: 12, padding: 10, background: "#fafbfc", borderRadius: 8, fontSize: 12, color: "#5a6878" }}>
              <strong style={{ color: "#142131" }}>Motif :</strong> {commande.motif}
            </div>
          )}
        </Panel>

        {/* Workflow d'approbation */}
        <Panel style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
            <i className="ti ti-stack-2" style={{ color: "#7a6fb0", marginRight: 6 }} />
            Workflow d'approbation
          </h3>
          <WorkflowApproval
            resourceType="commande"
            resourceId={commande.id}
            auth={auth}
            onChange={load}
          />
        </Panel>

        {/* Lignes de commande */}
        <Panel style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: "#142131" }}>
              <i className="ti ti-list" style={{ color: "#185FA5", marginRight: 6 }} />
              Lignes de commande ({lignes.length})
            </h3>
            <div style={{ fontSize: 13, color: "#5a6878" }}>
              Total : <strong style={{ color: "#185FA5", fontSize: 15 }}>{totalMontant.toFixed(2)} €</strong>
            </div>
          </div>
          {lignes.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-package-off" style={{ fontSize: 24, display: "block", marginBottom: 6 }} />
              Aucune ligne dans cette commande
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e3e9ee" }}>
                    <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700 }}>Désignation</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700 }}>Qté</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700 }}>PU</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map(l => (
                    <tr key={l.id} style={{ borderBottom: "1px solid #f0f3f6" }}>
                      <td style={{ padding: "8px 10px", fontSize: 13, color: "#142131", fontWeight: 500 }}>
                        {l.designation}
                        {l.notes && <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 2 }}>{l.notes}</div>}
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: 13, color: "#5a6878", textAlign: "right" }}>{l.quantite || 1}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13, color: "#5a6878", textAlign: "right" }}>{(l.prix_unitaire || 0).toFixed(2)} €</td>
                      <td style={{ padding: "8px 10px", fontSize: 13, color: "#185FA5", textAlign: "right", fontWeight: 700 }}>
                        {((l.quantite || 1) * (l.prix_unitaire || 0)).toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function InfoBlock({ label, value, icon, col, highlight }) {
  return (
    <div style={{
      padding: 12,
      background: highlight ? `linear-gradient(135deg, ${col}18, #fff)` : "#fff",
      border: `1px solid ${highlight ? col + "55" : "#e3e9ee"}`,
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 22, color: col, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 9.5, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 14, color: "#142131", fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}
