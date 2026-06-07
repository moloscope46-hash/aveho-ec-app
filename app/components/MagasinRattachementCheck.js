"use client";
// =============================================================
//  MagasinRattachementCheck — Bandeau diagnostic rattachement (0.62.4)
//  Affiche un encadré rouge si user pas rattaché à un magasin
//  → explique POURQUOI la création échoue
// =============================================================
import { useMagasinContext } from "../../lib/useMagasinContext";

export function MagasinRattachementCheck() {
  const ctx = useMagasinContext();
  if (ctx.loading) return null;

  // OK rattaché
  if (ctx.magasinId) {
    return (
      <div style={{
        padding: "8px 14px", background: "rgba(94,160,90,.10)",
        borderLeft: "3px solid #5aa05a", borderRadius: 6,
        fontSize: 11.5, color: "#5aa05a", fontWeight: 600,
        marginBottom: 10, display: "flex", alignItems: "center", gap: 8,
      }}>
        <i className="ti ti-circle-check" style={{ fontSize: 14 }} />
        Magasin rattaché : <b>{ctx.magasin?.nom || ctx.magasinId.substring(0, 8)}</b>
      </div>
    );
  }

  // PROBLÈME : pas rattaché
  return (
    <div style={{
      padding: "14px 18px", background: "rgba(227,93,91,.10)",
      borderLeft: "4px solid #e35d5b", borderRadius: 8,
      marginBottom: 14, color: "#e35d5b",
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 18 }} /> Tu n'es rattaché à aucun magasin
      </div>
      <div style={{ fontSize: 12.5, color: "#5a6878", lineHeight: 1.6 }}>
        C'est pour ça que tu ne peux <b>rien créer côté magasin</b> : les INSERT échouent car ton <code>magasin_id</code> est <code>null</code>.<br/>
        Pour résoudre : (1) Va sur <a href="/magasins" style={{ color: "#185FA5", fontWeight: 700 }}>/magasins</a> et créé un magasin si tu n'en as pas. (2) Ouvre Supabase SQL Editor et exécute :
      </div>
      <pre style={{
        background: "#142131", color: "#7CC8C8", padding: 10,
        borderRadius: 6, fontSize: 11, marginTop: 8,
        fontFamily: "Consolas,monospace", overflowX: "auto",
      }}>{`-- Rattache ton compte au premier magasin trouvé\nUPDATE membres_structure\nSET magasin_fournisseur_id = (SELECT id FROM magasins LIMIT 1),\n    role_professionnel = 'utilisateur_magasin'\nWHERE user_id = auth.uid();`}</pre>
    </div>
  );
}
