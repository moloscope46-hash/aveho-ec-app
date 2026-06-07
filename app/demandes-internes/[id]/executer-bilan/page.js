"use client";
// =============================================================
//  /demandes-internes/[id]/executer-bilan — Exécution bilan SAV (0.60.4)
//  Magasin saisit les résultats des 5 points + photos + commentaires
//  + génère rapport PDF imprimable
// =============================================================
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import { useViewMode } from "../../../../lib/useViewMode";
import { useMagasinContext } from "../../../../lib/useMagasinContext";
import TopBar from "../../../TopBar";
import { useCart } from "../../../useCart";
import { PageHead, Panel, Btn } from "../../../ui";
import BackButton from "../../../components/BackButton";

const RESULTAT_OPTIONS = [
  { v: "OK", l: "✓ OK", col: "#5aa05a" },
  { v: "KO", l: "✗ KO", col: "#e35d5b" },
  { v: "NA", l: "— N/A", col: "#8a98a8" },
];

export default function ExecuterBilanPage() {
  const router = useRouter();
  const { id } = useParams();
  const supabase = createClient();
  const auth = useAuth();
  const viewMode = useViewMode();
  const magasinCtx = useMagasinContext();
  const cart = useCart();

  const [di, setDi] = useState(null);
  const [bilan, setBilan] = useState(null);
  const [points, setPoints] = useState([]);
  const [article, setArticle] = useState(null);
  const [results, setResults] = useState({});  // { point_id: { resultat, valeur_mesure, commentaire, photo_url } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !auth.ready) return;
    (async () => {
      const tryFetch = async (q) => { try { const r = await q; return r.data; } catch { return null; } };
      const diData = await tryFetch(supabase.from("demandes_internes").select("*").eq("id", id).single());
      setDi(diData);
      if (diData?.bilan_sav_id) {
        const [bilanData, ptsData, artData, prevExec] = await Promise.all([
          tryFetch(supabase.from("bilans_sav").select("*").eq("id", diData.bilan_sav_id).single()),
          (async () => { try { const r = await supabase.from("bilans_sav_points").select("*").eq("bilan_id", diData.bilan_sav_id).order("ordre"); return r.data || []; } catch { return []; } })(),
          diData.article_concerne_id ? tryFetch(supabase.from("articles").select("libelle, code, reference").eq("id", diData.article_concerne_id).single()) : null,
          (async () => { try { const r = await supabase.from("sav_executions").select("*").eq("demande_id", id); return r.data || []; } catch { return []; } })(),
        ]);
        setBilan(bilanData);
        setPoints(ptsData);
        setArticle(artData);
        // Pré-remplir avec les exécutions précédentes
        const map = {};
        prevExec.forEach(e => {
          map[e.point_id] = {
            resultat: e.resultat,
            valeur_mesure: e.valeur_mesure,
            commentaire: e.commentaire,
            photo_url: e.photo_url,
          };
        });
        setResults(map);
      }
      setLoading(false);
    })();
  }, [id, auth.ready]);

  function setResult(pointId, key, val) {
    setResults({
      ...results,
      [pointId]: { ...(results[pointId] || {}), [key]: val },
    });
  }

  async function saveAll() {
    if (!confirm("Enregistrer les résultats du bilan ?\nLes résultats existants seront remplacés.")) return;
    setSaving(true);
    try {
      // Supprime les exécutions précédentes
      await supabase.from("sav_executions").delete().eq("demande_id", id);
      // Insère les nouvelles
      const rows = points
        .filter(p => results[p.id] && (results[p.id].resultat || results[p.id].valeur_mesure || results[p.id].commentaire))
        .map(p => ({
          demande_id: id,
          bilan_id: bilan.id,
          point_id: p.id,
          resultat: results[p.id].resultat || null,
          valeur_mesure: results[p.id].valeur_mesure ?? null,
          commentaire: results[p.id].commentaire || null,
          photo_url: results[p.id].photo_url || null,
          executed_at: new Date().toISOString(),
          executed_by: auth.user?.id,
        }));
      if (rows.length > 0) {
        const r = await supabase.from("sav_executions").insert(rows);
        if (r.error) throw r.error;
      }
      // MAJ statut DI : "validee" + livree_at
      await supabase.from("demandes_internes").update({
        statut: "validee",
        validee_at: new Date().toISOString(),
        validee_par: auth.user?.id,
      }).eq("id", id);
      // Notif EC
      try {
        if (di?.created_by && di.created_by !== auth.user?.id) {
          await supabase.from("notifications").insert({
            user_id: di.created_by,
            structure_id: di.structure_id,
            type: "di",
            titre: `Bilan SAV ${di.numero || ""} exécuté`,
            message: `Le bilan ${bilan.nom} a été effectué (${rows.length} points contrôlés). Consulte le rapport.`,
            url: `/demandes-internes/${id}`,
            lu: false,
          });
        }
      } catch {}
      alert("✓ Bilan enregistré");
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  function genererRapport() {
    // Génère un rapport PDF imprimable
    imprimerRapportSav({ di, bilan, points, results, article, auth });
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Chargement...</div>;

  if (!di || !bilan) {
    return (
      <div className="page-shell">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="page-content"><BackButton />
          <Panel><div style={{ padding: 40, textAlign: "center", color: "#e35d5b" }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 40, display: "block", marginBottom: 8 }} />
            DI ou bilan introuvable. Cette page n'est disponible que pour les DI de type SAV avec un bilan rattaché.
          </div></Panel>
        </div>
      </div>
    );
  }

  const obligatoiresOK = points.filter(p => p.est_obligatoire).every(p => results[p.id]?.resultat || results[p.id]?.valeur_mesure != null);
  const completed = points.filter(p => results[p.id]?.resultat || results[p.id]?.valeur_mesure != null).length;

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${bilan.couleur || "#5a8f8f"}22, ${bilan.couleur || "#5a8f8f"}08)`,
          borderLeft: `4px solid ${bilan.couleur || "#5a8f8f"}`,
          borderRadius: 12, padding: 20, marginBottom: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 56, height: 56, background: `${bilan.couleur || "#5a8f8f"}33`, color: bilan.couleur || "#5a8f8f", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
              <i className={`ti ${bilan.icone || "ti-clipboard-check"}`} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, color: "#5a6878", textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>
                Exécution bilan SAV · DI {di.numero || di.id?.substring(0,8)}
              </div>
              <h1 style={{ margin: "4px 0", fontSize: 22, color: "#142131" }}>{bilan.nom}</h1>
              {article && <div style={{ fontSize: 13, color: "#5a6878" }}>📦 {article.libelle}{article.code && ` (${article.code})`}</div>}
              {di.panne_description && <div style={{ marginTop: 6, padding: 8, background: "rgba(227,93,91,.10)", borderRadius: 6, fontSize: 12, color: "#c0392b" }}>
                <b>Panne signalée :</b> {di.panne_description}
              </div>}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: bilan.couleur || "#5a8f8f", fontFamily: "Consolas,monospace" }}>{completed}/{points.length}</div>
              <div style={{ fontSize: 10.5, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 1 }}>Points OK</div>
            </div>
          </div>
        </div>

        {/* Liste des points à contrôler */}
        <Panel>
          <h3 style={{ margin: "0 0 12px", color: bilan.couleur || "#5a8f8f" }}>📋 Points de contrôle ({points.length})</h3>
          {points.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Aucun point défini pour ce bilan.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {points.map((p, i) => (
                <PointControleCard
                  key={p.id}
                  point={p}
                  index={i + 1}
                  result={results[p.id] || {}}
                  onChange={(key, val) => setResult(p.id, key, val)}
                />
              ))}
            </div>
          )}
        </Panel>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Btn variant="ghost" icon="ti-arrow-left" onClick={() => router.push(`/demandes-internes/${id}`)}>Retour à la DI</Btn>
          <Btn variant="ghost" icon="ti-printer" onClick={genererRapport} disabled={completed === 0}>
            🖨 Rapport PDF
          </Btn>
          <Btn variant="primary" icon="ti-device-floppy" onClick={saveAll} disabled={saving || !obligatoiresOK}>
            {saving ? "..." : !obligatoiresOK ? "⚠ Points obligatoires manquants" : "✓ Valider le bilan"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function PointControleCard({ point, index, result, onChange }) {
  const isMesure = point.type_controle === "mesure";
  const isTexte = point.type_controle === "texte";
  const isPhoto = point.type_controle === "photo";
  const isOuiNon = !isMesure && !isTexte && !isPhoto;

  // Validation mesure
  const valNum = parseFloat(result.valeur_mesure);
  const horsPlage = isMesure && !isNaN(valNum) && (
    (point.valeur_min != null && valNum < point.valeur_min) ||
    (point.valeur_max != null && valNum > point.valeur_max)
  );

  const filled = result.resultat || result.valeur_mesure != null;

  return (
    <div style={{
      background: filled ? (horsPlage ? "rgba(227,93,91,.08)" : "rgba(94,160,90,.08)") : "#fafbfc",
      border: `2px solid ${filled ? (horsPlage ? "#e35d5b" : "#5aa05a") : "#e3e9ee"}`,
      borderRadius: 10, padding: 14,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: filled ? (horsPlage ? "#e35d5b" : "#5aa05a") : "#5a8f8f",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 14, flexShrink: 0,
        }}>{index}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: "#142131", fontSize: 14 }}>
            {point.libelle}
            {point.est_obligatoire && <span style={{ color: "#e35d5b", marginLeft: 4 }}>*</span>}
          </div>
          {point.description && <div style={{ fontSize: 12, color: "#5a6878" }}>{point.description}</div>}
          {isMesure && (point.valeur_min != null || point.valeur_max != null) && (
            <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 2 }}>
              Plage attendue : {point.valeur_min != null ? `${point.valeur_min}` : "—"} à {point.valeur_max != null ? `${point.valeur_max}` : "—"} {point.unite || ""}
            </div>
          )}
        </div>
      </div>

      {/* Inputs selon type */}
      <div style={{ paddingLeft: 42 }}>
        {isOuiNon && (
          <div style={{ display: "flex", gap: 6 }}>
            {RESULTAT_OPTIONS.map(opt => (
              <button key={opt.v} onClick={() => onChange("resultat", result.resultat === opt.v ? null : opt.v)} style={{
                flex: 1, padding: "10px 14px",
                background: result.resultat === opt.v ? opt.col : "#fff",
                color: result.resultat === opt.v ? "#fff" : opt.col,
                border: `2px solid ${opt.col}`,
                borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>{opt.l}</button>
            ))}
          </div>
        )}
        {isMesure && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" step="any" value={result.valeur_mesure ?? ""}
              onChange={(e) => onChange("valeur_mesure", e.target.value === "" ? null : parseFloat(e.target.value))}
              placeholder={`Mesure${point.valeur_min != null ? ` (min ${point.valeur_min}` : ""}${point.valeur_max != null ? `, max ${point.valeur_max}` : ""}${point.valeur_min != null || point.valeur_max != null ? ")" : ""}`}
              style={{ flex: 1, padding: "10px 12px", border: `1px solid ${horsPlage ? "#e35d5b" : "#cfd8e0"}`, borderRadius: 8, fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}
            />
            {point.unite && <span style={{ fontSize: 13, fontWeight: 600, color: "#5a6878", minWidth: 40 }}>{point.unite}</span>}
            {horsPlage && <span style={{ color: "#e35d5b", fontSize: 11, fontWeight: 700 }}>⚠ HORS PLAGE</span>}
          </div>
        )}
        {isTexte && (
          <textarea value={result.commentaire || ""} onChange={(e) => onChange("commentaire", e.target.value)}
            rows={2} placeholder="Observation..."
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
          />
        )}
        {isPhoto && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={result.photo_url || ""} onChange={(e) => onChange("photo_url", e.target.value)}
              placeholder="URL de la photo (intégration upload à venir)"
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 12.5 }}
            />
            {result.photo_url && <img src={result.photo_url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} onError={(e) => e.target.style.display = "none"} />}
          </div>
        )}

        {/* Commentaire complémentaire (sauf pour type texte) */}
        {!isTexte && (
          <input value={result.commentaire || ""} onChange={(e) => onChange("commentaire", e.target.value)}
            placeholder="Commentaire (optionnel)"
            style={{ marginTop: 8, width: "100%", padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", fontSize: 12, color: "#5a6878" }}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================
// Génération rapport SAV PDF (window.print)
// =============================================================
function imprimerRapportSav({ di, bilan, points, results, article, auth }) {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) { alert("Bloque les popups pour ouvrir le rapport"); return; }
  const dateStr = new Date().toLocaleDateString("fr-FR");
  const heureStr = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const numero = `RAP-SAV-${new Date().toISOString().slice(0,10).replace(/-/g, "")}-${di.id?.substring(0,4)}`;
  const nbKO = points.filter(p => results[p.id]?.resultat === "KO").length;
  const nbOK = points.filter(p => results[p.id]?.resultat === "OK").length;
  const nbNA = points.filter(p => results[p.id]?.resultat === "NA").length;
  const nbMesures = points.filter(p => p.type_controle === "mesure" && results[p.id]?.valeur_mesure != null).length;
  const verdict = nbKO > 0 ? { l: "🔴 NON CONFORME", col: "#e35d5b" } : nbOK + nbMesures > 0 ? { l: "🟢 CONFORME", col: "#5aa05a" } : { l: "⚠ INCOMPLET", col: "#EF9F27" };

  const pointsHTML = points.map((p, i) => {
    const r = results[p.id] || {};
    const valNum = parseFloat(r.valeur_mesure);
    const horsPlage = p.type_controle === "mesure" && !isNaN(valNum) && (
      (p.valeur_min != null && valNum < p.valeur_min) ||
      (p.valeur_max != null && valNum > p.valeur_max)
    );
    const resColor = r.resultat === "OK" ? "#5aa05a" : r.resultat === "KO" ? "#e35d5b" : "#8a98a8";
    return `
      <tr style="border-bottom:1px solid #e3e9ee">
        <td style="padding:10px;font-weight:700;color:#5a8f8f;text-align:center;width:30px">${i+1}</td>
        <td style="padding:10px">
          <div style="font-weight:700">${p.libelle}${p.est_obligatoire ? ' <span style="color:#e35d5b">*</span>' : ""}</div>
          ${p.description ? `<div style="font-size:11px;color:#5a6878">${p.description}</div>` : ""}
        </td>
        <td style="padding:10px;text-align:center">
          ${p.type_controle === "mesure"
            ? (r.valeur_mesure != null ? `<b style="font-family:Consolas,monospace;color:${horsPlage ? "#e35d5b" : "#142131"}">${r.valeur_mesure} ${p.unite || ""}</b>${horsPlage ? '<br><span style="color:#e35d5b;font-size:10px;font-weight:700">HORS PLAGE</span>' : ""}` : '<span style="color:#8a98a8">—</span>')
            : `<span style="color:${resColor};font-weight:700">${r.resultat || "—"}</span>`}
        </td>
        <td style="padding:10px;font-size:11px;color:#5a6878">${r.commentaire || ""}</td>
      </tr>
    `;
  }).join("");

  w.document.write(`
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport SAV ${numero}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Quicksand','Segoe UI',sans-serif;color:#142131;padding:30px;background:#fff;font-size:13px;line-height:1.5}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #142131;padding-bottom:18px;margin-bottom:20px}
  .logo{font-size:36px;font-weight:600;letter-spacing:3px;color:#142131}
  .logo span{color:#7CC8C8}
  .doc-info{text-align:right}
  .doc-info h1{font-size:22px;font-weight:700;margin-bottom:6px;color:#5a8f8f}
  .doc-info .num{font-family:Consolas,monospace;font-size:14px;background:#5a8f8f;color:#fff;padding:4px 10px;border-radius:4px;display:inline-block}
  .verdict{background:${verdict.col};color:#fff;padding:14px 20px;border-radius:8px;margin-bottom:20px;font-size:18px;font-weight:700;text-align:center;letter-spacing:1.5px}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;background:#fafbfc;padding:16px;border-radius:8px}
  .meta-block h3{font-size:11px;color:#7CC8C8;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:6px}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .stat-card{background:#fafbfc;border-left:4px solid;border-radius:8px;padding:10px;text-align:center}
  .stat-card .val{font-size:24px;font-weight:700;font-family:Consolas,monospace}
  .stat-card .lbl{font-size:10px;color:#5a6878;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  th{background:#5a8f8f;color:#fff;padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700}
  .panne{background:rgba(227,93,91,.08);border-left:3px solid #e35d5b;padding:12px;border-radius:6px;margin-bottom:14px}
  .panne h4{font-size:11px;color:#e35d5b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;font-weight:700}
  .signatures{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:40px}
  .sign-box{border:1px solid #cfd8e0;border-radius:8px;padding:14px;min-height:100px}
  .sign-box h4{font-size:11px;color:#5a6878;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
  footer{margin-top:40px;padding-top:16px;border-top:1px solid #e3e9ee;text-align:center;font-size:10.5px;color:#8a98a8}
  @media print {body{padding:15mm} .no-print{display:none}}
</style></head><body>
<div class="header">
  <div>
    <div class="logo">a<span>v</span>eho</div>
    <div style="font-size:10.5;color:#5a6878;letter-spacing:1px;text-transform:uppercase;margin-top:2px">Service Après-Vente · Rapport de bilan</div>
  </div>
  <div class="doc-info">
    <h1>RAPPORT SAV</h1>
    <div class="num">${numero}</div>
    <div style="font-size:11.5px;color:#5a6878;margin-top:6px">Émis le ${dateStr} à ${heureStr}</div>
  </div>
</div>

<div class="verdict">${verdict.l}</div>

<div class="meta-grid">
  <div class="meta-block">
    <h3>📋 RÉFÉRENCE DI</h3>
    <p style="font-weight:700">${di.numero || "DI-" + di.id?.substring(0,8)}</p>
    <p style="font-size:11px;color:#5a6878">Émise le ${new Date(di.created_at).toLocaleDateString("fr-FR")}</p>
    ${di.priorite === "urgente" ? '<p style="font-size:11px;color:#e35d5b;font-weight:700;margin-top:2px">🔥 Priorité urgente</p>' : ""}
  </div>
  <div class="meta-block">
    <h3>📦 ARTICLE CONCERNÉ</h3>
    <p style="font-weight:700">${article?.libelle || "—"}</p>
    ${article?.code || article?.reference ? `<p style="font-family:Consolas,monospace;font-size:11px;color:#5a6878">${article.reference || article.code}</p>` : ""}
  </div>
</div>

${di.panne_description ? `
<div class="panne">
  <h4>⚠ Panne signalée par l'EC</h4>
  <p style="font-size:12.5px">${di.panne_description}</p>
</div>
` : ""}

<div style="margin-bottom:14px">
  <h3 style="font-size:14px;color:#5a8f8f;font-weight:700;margin-bottom:4px">🩺 Bilan effectué : ${bilan.nom}</h3>
  ${bilan.code ? `<p style="font-family:Consolas,monospace;font-size:11px;color:#8a98a8">${bilan.code}</p>` : ""}
  ${bilan.description ? `<p style="font-size:12.5px;color:#5a6878;margin-top:4px">${bilan.description}</p>` : ""}
</div>

<div class="stats">
  <div class="stat-card" style="border-color:#5aa05a"><div class="val" style="color:#5aa05a">${nbOK}</div><div class="lbl">OK</div></div>
  <div class="stat-card" style="border-color:#e35d5b"><div class="val" style="color:#e35d5b">${nbKO}</div><div class="lbl">KO</div></div>
  <div class="stat-card" style="border-color:#185FA5"><div class="val" style="color:#185FA5">${nbMesures}</div><div class="lbl">Mesures</div></div>
  <div class="stat-card" style="border-color:#8a98a8"><div class="val" style="color:#8a98a8">${nbNA}</div><div class="lbl">N/A</div></div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:30px;text-align:center">#</th>
      <th>Point de contrôle</th>
      <th style="width:140px;text-align:center">Résultat</th>
      <th>Commentaire</th>
    </tr>
  </thead>
  <tbody>
    ${pointsHTML}
  </tbody>
</table>

<div class="signatures">
  <div class="sign-box">
    <h4>✍ Technicien magasin</h4>
    <p style="font-size:12px;margin-top:4px">${auth.user?.email || "—"}</p>
    <p style="color:#8a98a8;font-size:10.5px">Le ${dateStr} à ${heureStr}</p>
  </div>
  <div class="sign-box">
    <h4>✍ Validation EC</h4>
    <p style="color:#8a98a8;font-style:italic;font-size:11px;margin-top:20px">À signer à la réception</p>
  </div>
</div>

<footer>
  Rapport SAV ${numero} · Aveho · Imprimé le ${dateStr} à ${heureStr}<br>
  Référence DI : ${di.numero || di.id}
</footer>

<div class="no-print" style="margin-top:30px;text-align:center">
  <button onclick="window.print()" style="background:#5a8f8f;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Quicksand,sans-serif">
    🖨 Imprimer / Enregistrer en PDF
  </button>
</div>

<script>setTimeout(() => window.print(), 500);</script>
</body></html>
  `);
  w.document.close();
}
