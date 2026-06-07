"use client";
// =============================================================
//  /magasin/droits — Admin droits EC ↔ magasin (0.60.4)
//  Configure qui peut commander/SAV/transférer via quel magasin
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";

export default function DroitsMagasinPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [etabs, setEtabs] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [droits, setDroits] = useState([]);   // tous les droits existants
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.structureId || magasinCtx.loading) return;
    reload();
  }, [auth.ready, auth.structureId, magasinCtx.loading]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    // Si user magasin, on filtre sur SON magasin uniquement
    let magasinsQuery = supabase.from("magasins").select("id, nom, ville").eq("structure_id", auth.structureId).order("nom");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) {
      magasinsQuery = magasinsQuery.eq("id", magasinCtx.magasinId);
    }
    let droitsQuery = supabase.from("etablissements_magasins_droits").select("*").eq("structure_id", auth.structureId);
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) {
      droitsQuery = droitsQuery.eq("magasin_id", magasinCtx.magasinId);
    }
    const [ets, mags, drs] = await Promise.all([
      tryFetch(supabase.from("etablissements").select("id, nom, ville, finess").eq("structure_id", auth.structureId).order("nom")),
      tryFetch(magasinsQuery),
      tryFetch(droitsQuery),
    ]);
    setEtabs(ets);
    setMagasins(mags);
    setDroits(drs);
    setLoading(false);
  }

  function getDroit(etabId, magasinId) {
    return droits.find(d => d.etablissement_id === etabId && d.magasin_id === magasinId);
  }

  async function toggleDroit(etab, magasin, key) {
    setSaving(true);
    const existing = getDroit(etab.id, magasin.id);
    try {
      if (existing) {
        // Update : toggle la valeur
        const newVal = !existing[key];
        const r = await supabase.from("etablissements_magasins_droits")
          .update({ [key]: newVal })
          .eq("id", existing.id);
        if (r.error) throw r.error;
      } else {
        // Insert : crée avec ce droit activé, autres par défaut
        const payload = {
          etablissement_id: etab.id,
          magasin_id: magasin.id,
          structure_id: auth.structureId,
          droit_commande: key === "droit_commande" ? true : false,
          droit_sav: key === "droit_sav" ? true : false,
          droit_transfert: key === "droit_transfert" ? true : false,
          created_by: auth.user?.id,
        };
        const r = await supabase.from("etablissements_magasins_droits").insert(payload);
        if (r.error) throw r.error;
      }
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  async function applyDefaults(magasin) {
    if (!confirm(`Appliquer les droits par défaut (commande+SAV) à tous les ${etabs.length} établissements pour "${magasin.nom}" ?`)) return;
    setSaving(true);
    try {
      const inserts = [];
      const updates = [];
      etabs.forEach(e => {
        const existing = getDroit(e.id, magasin.id);
        if (existing) {
          updates.push(supabase.from("etablissements_magasins_droits")
            .update({ droit_commande: true, droit_sav: true })
            .eq("id", existing.id));
        } else {
          inserts.push({
            etablissement_id: e.id,
            magasin_id: magasin.id,
            structure_id: auth.structureId,
            droit_commande: true,
            droit_sav: true,
            droit_transfert: false,
            created_by: auth.user?.id,
          });
        }
      });
      if (inserts.length > 0) await supabase.from("etablissements_magasins_droits").insert(inserts);
      await Promise.all(updates);
      await reload();
      alert("✓ Droits par défaut appliqués");
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  const content = (
    <>
      <PageHead icon="ti-shield-lock" title="Droits EC ↔ Magasins" subtitle="Configure qui peut commander/SAV/transférer via quel magasin" />

      {magasinCtx.isUserMagasin && (
        <Panel style={{ background: "rgba(94,143,143,.08)", borderLeft: "4px solid #5a8f8f" }}>
          <div style={{ fontSize: 12.5, color: "#5a6878" }}>
            <i className="ti ti-shield" style={{ color: "#5a8f8f" }} /> Vue cantonnée : tu ne vois que les droits de <b>ton magasin</b>.
          </div>
        </Panel>
      )}

      {loading ? (
        <Panel><div style={{ padding: 30, textAlign: "center" }}>Chargement...</div></Panel>
      ) : magasins.length === 0 ? (
        <Panel>
          <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
            <i className="ti ti-building-warehouse" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 10 }} />
            Aucun magasin défini. Crée des magasins d'abord dans /magasins/nouveau.
          </div>
        </Panel>
      ) : etabs.length === 0 ? (
        <Panel>
          <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
            Aucun établissement défini.
          </div>
        </Panel>
      ) : (
        magasins.map(magasin => (
          <Panel key={magasin.id} style={{ marginTop: 12, borderLeft: "4px solid #5a8f8f" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ margin: 0, color: "#5a8f8f", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-building-warehouse" /> {magasin.nom}
                {magasin.ville && <span style={{ fontSize: 11, color: "#8a98a8", fontWeight: 500 }}>· {magasin.ville}</span>}
              </h3>
              {!magasinCtx.isUserMagasin && (
                <Btn variant="ghost" icon="ti-wand" onClick={() => applyDefaults(magasin)} disabled={saving}>Tout activer (commande+SAV)</Btn>
              )}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#fafbfc" }}>
                    <th style={thStyle}>Établissement</th>
                    <th style={{ ...thStyle, textAlign: "center", width: 120 }}>📦 Commande</th>
                    <th style={{ ...thStyle, textAlign: "center", width: 120 }}>🛠 SAV</th>
                    <th style={{ ...thStyle, textAlign: "center", width: 120 }}>🔄 Transfert</th>
                  </tr>
                </thead>
                <tbody>
                  {etabs.map(etab => {
                    const droit = getDroit(etab.id, magasin.id);
                    return (
                      <tr key={etab.id} style={{ borderTop: "1px solid #f0f3f6" }}>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ fontWeight: 600, color: "#142131" }}>{etab.nom}</div>
                          {etab.ville && <div style={{ fontSize: 10.5, color: "#8a98a8" }}>{etab.ville}{etab.finess && ` · ${etab.finess}`}</div>}
                        </td>
                        <td style={{ textAlign: "center", padding: "8px 10px" }}>
                          <ToggleDroit on={droit?.droit_commande} color="#EF9F27" onClick={() => toggleDroit(etab, magasin, "droit_commande")} disabled={saving} />
                        </td>
                        <td style={{ textAlign: "center", padding: "8px 10px" }}>
                          <ToggleDroit on={droit?.droit_sav} color="#e35d5b" onClick={() => toggleDroit(etab, magasin, "droit_sav")} disabled={saving} />
                        </td>
                        <td style={{ textAlign: "center", padding: "8px 10px" }}>
                          <ToggleDroit on={droit?.droit_transfert} color="#7a6fb0" onClick={() => toggleDroit(etab, magasin, "droit_transfert")} disabled={saving} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        ))
      )}
    </>
  );

  // Si user magasin, on affiche avec la sidebar magasin
  if (magasinCtx.isUserMagasin) {
    return (
      <div className="page-shell">
        <TopBar cartCount={cart.count} auth={auth} />
        <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
          <MagasinSidebar />
          <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        {content}
      </div>
    </div>
  );
}

function ToggleDroit({ on, color, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 44, height: 24, borderRadius: 12,
      background: on ? color : "#cfd8e0",
      border: "none", position: "relative", cursor: disabled ? "wait" : "pointer",
      transition: "background 200ms",
    }}>
      <span style={{
        position: "absolute", top: 2, left: on ? 22 : 2,
        width: 20, height: 20, borderRadius: 10, background: "#fff",
        transition: "left 200ms",
      }} />
    </button>
  );
}

const thStyle = {
  textAlign: "left", padding: "8px 10px",
  fontSize: 10.5, color: "#5a6878", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700,
};
