"use client";
// =============================================================
//  /sav/nouvelle — Création demande SAV côté EC (0.60.0)
//  EC choisit article → bilan rattaché → magasin → décrit la panne
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import BackButton from "../../components/BackButton";

const PRIORITES = [
  { v: "normale", l: "Normale",  col: "#185FA5" },
  { v: "urgente", l: "🔥 Urgente", col: "#e35d5b" },
];

export default function NouvelleSavPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [form, setForm] = useState({
    article_concerne_id: "",
    materiel_concerne_id: "",
    bilan_sav_id: "",
    magasin_id: "",
    priorite: "normale",
    panne_description: "",
    commentaire: "",
  });
  const [articles, setArticles] = useState([]);
  const [bilans, setBilans] = useState([]);
  const [bilansForArticle, setBilansForArticle] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
      const [arts, bils, mags] = await Promise.all([
        tryFetch(supabase.from("articles").select("id, libelle, code, reference, article_magasin_id, est_catalogue_magasin").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("bilans_sav").select("id, nom, code, couleur, icone, duree_estimee_min").eq("actif", true)),
        tryFetch(supabase.from("magasins").select("id, nom").order("nom")),
      ]);
      setArticles(arts);
      setBilans(bils);
      setMagasins(mags);
    })();
  }, [auth.ready, auth.structureId]);

  // Quand article choisi → charger les bilans rattachés
  useEffect(() => {
    if (!form.article_concerne_id) { setBilansForArticle([]); return; }
    (async () => {
      try {
        const article = articles.find(a => a.id === form.article_concerne_id);
        // Récupérer les bilans rattachés à l'article OU à son article catalogue magasin
        const articleIds = [form.article_concerne_id];
        if (article?.article_magasin_id) articleIds.push(article.article_magasin_id);
        const r = await supabase.from("bilans_sav_articles").select("bilan_id").in("article_id", articleIds);
        const bilanIds = new Set((r.data || []).map(x => x.bilan_id));
        const matchingBilans = bilans.filter(b => bilanIds.has(b.id));
        setBilansForArticle(matchingBilans);
      } catch { setBilansForArticle([]); }
    })();
  }, [form.article_concerne_id, articles, bilans]);

  async function submit() {
    setError("");
    if (!form.article_concerne_id) { setError("⚠ Sélectionne un article concerné"); return; }
    if (!form.bilan_sav_id) { setError("⚠ Sélectionne un bilan SAV"); return; }
    if (!form.panne_description?.trim()) { setError("⚠ Décris la panne ou le problème observé"); return; }
    setSaving(true);
    try {
      const numero = `SAV-${new Date().toISOString().slice(0,10).replace(/-/g, "")}-${Math.floor(Math.random() * 1000)}`;
      const r = await supabase.from("demandes_internes").insert({
        structure_id: auth.structureId,
        type_demande: "sav",
        numero,
        statut: "nouvelle",
        priorite: form.priorite,
        article_concerne_id: form.article_concerne_id,
        bilan_sav_id: form.bilan_sav_id,
        magasin_id: form.magasin_id || null,
        panne_description: form.panne_description.trim(),
        commentaire: form.commentaire?.trim() || null,
        created_by: auth.user?.id,
      }).select("id").single();
      if (r.error) throw r.error;
      alert(`✓ Demande SAV ${numero} envoyée au magasin.`);
      router.push(`/demandes-internes/${r.data.id}`);
    } catch (e) {
      setError(`${e.message} (code: ${e.code || "?"})`);
    } finally { setSaving(false); }
  }

  const articleChoisi = articles.find(a => a.id === form.article_concerne_id);

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />
        <PageHead icon="ti-tool" title="Nouvelle demande SAV" subtitle="Demande d'intervention sur un article : panne, bilan, contrôles" />

        {error && (
          <Panel style={{ background: "rgba(227,93,91,.10)", borderLeft: "4px solid #e35d5b" }}>
            <div style={{ color: "#c0392b", fontWeight: 600 }}>
              <i className="ti ti-alert-triangle" /> {error}
            </div>
          </Panel>
        )}

        <Panel>
          <h3 style={{ margin: "0 0 12px", color: "#e35d5b" }}>1. Article concerné *</h3>
          <select value={form.article_concerne_id} onChange={(e) => setForm({ ...form, article_concerne_id: e.target.value, bilan_sav_id: "" })}
            style={selectStyle}>
            <option value="">— Choisir l'article —</option>
            {articles.map(a => <option key={a.id} value={a.id}>{a.libelle}{a.reference || a.code ? ` (${a.reference || a.code})` : ""}</option>)}
          </select>
          {articleChoisi && (
            <div style={{ marginTop: 8, padding: 10, background: "rgba(24,95,165,.08)", borderRadius: 6, fontSize: 12 }}>
              <i className="ti ti-package" style={{ color: "#185FA5" }} /> <b>{articleChoisi.libelle}</b>
              {articleChoisi.article_magasin_id && <span style={{ marginLeft: 8, color: "#5aa05a" }}>✓ Rattaché au catalogue magasin</span>}
            </div>
          )}
        </Panel>

        {form.article_concerne_id && (
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 8px", color: "#5a8f8f" }}>2. Bilan SAV *</h3>
            <p style={{ fontSize: 12, color: "#5a6878", marginBottom: 10 }}>
              {bilansForArticle.length > 0
                ? `${bilansForArticle.length} bilan${bilansForArticle.length > 1 ? "s" : ""} rattaché${bilansForArticle.length > 1 ? "s" : ""} à cet article :`
                : "Aucun bilan spécifiquement rattaché à cet article. Choisis un bilan parmi tous les disponibles."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
              {(bilansForArticle.length > 0 ? bilansForArticle : bilans).map(b => {
                const selected = form.bilan_sav_id === b.id;
                return (
                  <div key={b.id} onClick={() => setForm({ ...form, bilan_sav_id: b.id })} style={{
                    background: selected ? `${b.couleur || "#5a8f8f"}22` : "#fff",
                    border: `2px solid ${selected ? (b.couleur || "#5a8f8f") : "#e3e9ee"}`,
                    borderRadius: 10, padding: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <i className={`ti ${b.icone || "ti-clipboard-check"}`} style={{ color: b.couleur || "#5a8f8f", fontSize: 22 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>{b.nom}</div>
                      {b.code && <div style={{ fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8" }}>{b.code}</div>}
                      {b.duree_estimee_min && <div style={{ fontSize: 10.5, color: "#5a6878" }}>⏱ {b.duree_estimee_min} min</div>}
                    </div>
                    {selected && <i className="ti ti-check" style={{ color: b.couleur || "#5a8f8f", fontSize: 18 }} />}
                  </div>
                );
              })}
            </div>
            {bilans.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: "#8a98a8", fontSize: 12 }}>
                Aucun bilan SAV n'est défini. Le magasin doit d'abord créer des bilans dans /magasin/bilans-sav.
              </div>
            )}
          </Panel>
        )}

        <Panel style={{ marginTop: 12 }}>
          <h3 style={{ margin: "0 0 8px", color: "#7a6fb0" }}>3. Description de la panne *</h3>
          <textarea value={form.panne_description} onChange={(e) => setForm({ ...form, panne_description: e.target.value })}
            rows={4}
            placeholder="Décris ce qui ne fonctionne pas, depuis quand, dans quelles conditions..."
            style={{ ...selectStyle, fontFamily: "inherit", resize: "vertical" }} />
        </Panel>

        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <h3 style={{ margin: "0 0 8px", color: "#EF9F27" }}>Priorité</h3>
              <div style={{ display: "flex", gap: 6 }}>
                {PRIORITES.map(p => (
                  <button key={p.v} type="button" onClick={() => setForm({ ...form, priorite: p.v })} style={{
                    flex: 1, padding: "8px 12px",
                    background: form.priorite === p.v ? p.col : "#fff",
                    color: form.priorite === p.v ? "#fff" : "#5a6878",
                    border: `2px solid ${form.priorite === p.v ? p.col : "#e3e9ee"}`,
                    borderRadius: 8, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  }}>{p.l}</button>
                ))}
              </div>
            </div>
            {magasins.length > 0 && (
              <div>
                <h3 style={{ margin: "0 0 8px", color: "#185FA5" }}>Magasin destinataire</h3>
                <select value={form.magasin_id} onChange={(e) => setForm({ ...form, magasin_id: e.target.value })} style={selectStyle}>
                  <option value="">— Auto —</option>
                  {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <h3 style={{ margin: "0 0 8px", color: "#5a6878", fontSize: 13 }}>Commentaire libre (optionnel)</h3>
            <textarea value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })}
              rows={2} placeholder="Notes complémentaires..."
              style={{ ...selectStyle, fontFamily: "inherit", resize: "vertical" }} />
          </div>
        </Panel>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, gap: 10 }}>
          <Btn variant="ghost" onClick={() => router.back()}>Annuler</Btn>
          <Btn variant="primary" icon="ti-send" onClick={submit}>{saving ? "Envoi..." : "Envoyer la demande SAV"}</Btn>
        </div>
      </div>
    </div>
  );
}

const selectStyle = {
  width: "100%", padding: "10px 12px",
  background: "#fafbfc", border: "1px solid #cfd8e0", borderRadius: 8,
  fontFamily: "inherit", fontSize: 13, color: "#142131",
};
