"use client";
// Page Panier — Panier courant et validation de commande
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { fmtEur } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, IconButton } from "../ui";
// 0.58.49 : migration UI premium
import { EmptyState } from "../components/ui-premium";
import { safeInsert } from "../../lib/safeWrite";
import EquipeSelector from "../components/EquipeSelector";  // 0.58.66

export default function Panier() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  // 0.58.66 : équipe optionnelle pour la commande
  const [equipeId, setEquipeId] = useState(null);

  async function valider() {
    setErr(""); setMsg("");
    if (!auth.structureId) { setErr("Votre compte n'est rattaché à aucune structure. Voir l'étape 5 du tuto (membres_structure)."); return; }
    if (cart.items.length === 0) { setErr("Panier vide."); return; }
    setBusy(true);
    try {
      const numero = "CMD-" + Math.floor(1000 + Math.random() * 9000);
      const magasin_id = cart.items[0].magasin_id;
      const userId = auth.user?.id;
      // Alpha 0.28.0 : UUID client pour permettre l'offline + récupérer l'id même en queue
      const newCmdId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : null;
      const cmdPayload = {
        ...(newCmdId ? { id: newCmdId } : {}),
        structure_id: auth.structureId, etablissement_id: auth.etabId, magasin_id, numero,
        statut: "En cours", total: cart.total, created_by: auth.user.id,
        // 0.58.66 : équipe responsable
        equipe_id: equipeId || null,
      };
      const { data: cmd, error: e1, queued } = await safeInsert(supabase, "commandes", cmdPayload, { userId, returning: true });
      if (e1) throw e1;
      const cmdId = queued ? newCmdId : (cmd?.id || newCmdId);
      const lignes = cart.items.map((i) => ({
        ...(typeof crypto !== "undefined" && crypto.randomUUID ? { id: crypto.randomUUID() } : {}),
        commande_id: cmdId, promotion_id: i.id, libelle: i.titre, prix_unitaire: i.prix, quantite: i.qte,
      }));
      const { error: e2 } = await safeInsert(supabase, "commande_lignes", lignes, { userId });
      if (e2) throw e2;
      cart.clear();
      setMsg(`Commande ${numero} envoyée à votre magasin.`);
      setTimeout(() => router.push("/commandes"), 1200);
    } catch (e) {
      setErr(e.message || "Erreur lors de la validation");
    } finally {
      setBusy(false);
    }
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Mon panier" sub={auth.structureNom ? `Commande pour ${auth.structureNom}` : "—"} />
        <Panel>
          {err && <div className="err">{err}</div>}
          {msg && <div className="ok">{msg}</div>}
          {cart.items.length === 0 ? (
            <EmptyState
              icon="ti-shopping-cart-off"
              title="Votre panier est vide"
              description="Découvrez les promotions et ajoutez des articles à votre panier."
              actionLabel="Voir les promotions"
              onAction={() => router.push("/promotions")}
            />
          ) : (
            <>
              <table>
                <thead><tr><th>Article</th><th>Prix unit.</th><th>Quantité</th><th style={{ textAlign: "right" }}>Total</th><th></th></tr></thead>
                <tbody>
                  {cart.items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.titre}</td>
                      <td>{i.prix} €{i.unite}</td>
                      <td><input className="qte" type="number" min="1" value={i.qte} onChange={(e) => cart.setQte(i.id, parseInt(e.target.value || "1"))} /></td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{fmtEur(i.prix * i.qte)}</td>
                      <td style={{ textAlign: "right" }}><IconButton icon="ti-trash" color="#C9867F" ariaLabel={`Retirer ${i.libelle || "article"} du panier`} onClick={() => cart.remove(i.id)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* 0.58.66 : équipe optionnelle pour la commande */}
              <div style={{ marginTop: 16, padding: "10px 14px", background: "linear-gradient(135deg, rgba(124,200,200,.08), #fff)", border: "1px solid rgba(124,200,200,.25)", borderRadius: 10 }}>
                <EquipeSelector
                  value={equipeId}
                  onChange={(eqId) => setEquipeId(eqId)}
                  structureId={auth.structureId}
                  label="Équipe responsable (optionnel)"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>Total : {fmtEur(cart.total)}</span>
                <button className="btn-primary" style={{ width: "auto", padding: "0 28px" }} onClick={valider} disabled={busy}>
                  {busy ? "Envoi…" : "Valider la commande"}
                </button>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
