"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { fmtEur } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";

export default function Panier() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function valider() {
    setErr(""); setMsg("");
    if (!auth.structureId) { setErr("Votre compte n'est rattaché à aucune structure. Voir l'étape 5 du tuto (membres_structure)."); return; }
    if (cart.items.length === 0) { setErr("Panier vide."); return; }
    setBusy(true);
    try {
      const numero = "CMD-" + Math.floor(1000 + Math.random() * 9000);
      const magasin_id = cart.items[0].magasin_id;
      const { data: cmd, error: e1 } = await supabase.from("commandes")
        .insert({ structure_id: auth.structureId, etablissement_id: auth.etabId, magasin_id, numero, statut: "En cours", total: cart.total, created_by: auth.user.id })
        .select().single();
      if (e1) throw e1;
      const lignes = cart.items.map((i) => ({
        commande_id: cmd.id, promotion_id: i.id, libelle: i.titre, prix_unitaire: i.prix, quantite: i.qte,
      }));
      const { error: e2 } = await supabase.from("commande_lignes").insert(lignes);
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
            <StateMsg>Votre panier est vide. <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={() => router.push("/promotions")}>Voir les promotions</a></StateMsg>
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
                      <td style={{ textAlign: "right" }}><i className="ti ti-trash" style={{ color: "#C9867F", cursor: "pointer" }} onClick={() => cart.remove(i.id)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
