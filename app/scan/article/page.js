"use client";
// =============================================================
//  /scan/article — Entrée stock via scan code-barre (0.58.69)
//
//  Workflow :
//   1. Scan caméra (réutilise QrScanner basé html5-qrcode)
//   2. Décodage du code (EAN13 / GS1-128 / CODE128)
//   3. Recherche dans articles par code_barre / code_barres_alt
//   4. Si GS1-128, extraction automatique du lot / série / péremption
//   5. Formulaire de validation entrée stock (quantité, notes)
//   6. Insert dans stock_mouvements (et création matériel si série)
// =============================================================

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import BackButton from "../../components/BackButton";
import { safeInsertMateriels } from "../../../lib/materiels";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { toast } from "../../components/ui-premium";
import { detectBarcodeType, parseGS1, formatGS1Date, isValidEan13 } from "../../../lib/barcode";
import { safeInsert } from "../../../lib/safeWrite";
import QrScanner from "../../QrScanner";

export default function ScanArticlePage() {
  return (
    <Suspense fallback={null}>
      <ScanArticleInner />
    </Suspense>
  );
}

function ScanArticleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetArticleId = searchParams?.get("article_id");
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [step, setStep] = useState("scan");  // "scan" | "form" | "done"
  const [scanResult, setScanResult] = useState(null);
  const [article, setArticle] = useState(null);
  const [searching, setSearching] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [form, setForm] = useState({
    type: "entree",
    quantite: 1,
    lot: "",
    num_serie: "",
    date_peremption: "",
    notes: "",
    reference_externe: "",
    create_materiel: false,
  });
  const [busy, setBusy] = useState(false);
  const [recentScans, setRecentScans] = useState([]);

  // Si on a un article_id en preset (depuis fiche article), charger direct
  useEffect(() => {
    if (presetArticleId && auth.ready) {
      (async () => {
        const { data } = await supabase.from("articles").select("*").eq("id", presetArticleId).maybeSingle();
        if (data) {
          setArticle(data);
          setStep("form");
          // Pré-remplir create_materiel si l'article gère série/lot
          setForm(f => ({ ...f, create_materiel: data.gere_serie || data.gere_lot }));
        }
      })();
    }
  }, [presetArticleId, auth.ready]);

  async function handleScan({ text }) {
    setScanResult(text);
    await findArticle(text);
  }

  async function findArticle(code) {
    setSearching(true);
    try {
      const type = detectBarcodeType(code);
      let cleanCode = code;
      let gs1 = {};

      // Si GS1-128, parser pour extraire GTIN + lot + série + péremption
      if (type === "GS1-128") {
        gs1 = parseGS1(code);
        if (gs1.gtin) {
          // Le GTIN-14 contient l'EAN13 → on prend les 13 derniers chiffres après le checksum
          cleanCode = gs1.gtin.length === 14 ? gs1.gtin.slice(1) : gs1.gtin;
        }
        // Pré-remplir le formulaire avec ce qu'on a extrait
        setForm(f => ({
          ...f,
          lot: gs1.lot || f.lot,
          num_serie: gs1.serie || f.num_serie,
          date_peremption: gs1.peremption ? formatGS1Date(gs1.peremption) || f.date_peremption : f.date_peremption,
        }));
      }

      // Recherche dans la table articles
      // 1) match exact sur code_barre
      let { data: arts, error } = await supabase
        .from("articles")
        .select("*")
        .eq("structure_id", auth.structureId)
        .eq("code_barre", cleanCode)
        .limit(1);
      if (error) throw error;
      let found = arts?.[0];

      // 2) si rien, essai sur code_lpp
      if (!found && /^\d{4,10}$/.test(cleanCode)) {
        const r = await supabase.from("articles").select("*").eq("structure_id", auth.structureId).eq("code_lpp", cleanCode).limit(1);
        found = r.data?.[0];
      }

      // 3) si rien, essai dans code_barres_alt (array)
      if (!found) {
        const r = await supabase.from("articles").select("*").eq("structure_id", auth.structureId).contains("code_barres_alt", [cleanCode]).limit(1);
        found = r.data?.[0];
      }

      if (found) {
        setArticle(found);
        setStep("form");
        setForm(f => ({ ...f, create_materiel: found.gere_serie || found.gere_lot }));
        toast.success(`Article trouvé : ${found.libelle}`);
        // Historique scan (en mémoire)
        setRecentScans(prev => [{ code: cleanCode, libelle: found.libelle, at: new Date().toISOString() }, ...prev.slice(0, 4)]);
      } else {
        toast.error(`Aucun article ne correspond à "${cleanCode}". Vérifie que le code-barres est bien renseigné dans la fiche article.`);
        // Permettre quand même de créer un article rapide
        if (confirm(`Aucun article avec le code "${cleanCode}".\n\nVoulez-vous créer un nouvel article rapidement (vous compléterez les infos après) ?`)) {
          router.push(`/articles?new=1&code_barre=${encodeURIComponent(cleanCode)}`);
        }
      }
    } catch (e) {
      console.error("[scan] findArticle:", e);
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  }

  async function submitEntry() {
    if (!article) return;
    if (!form.quantite || parseFloat(form.quantite) <= 0) {
      toast.error("Quantité invalide");
      return;
    }
    if (article.gere_serie && !form.num_serie && form.create_materiel) {
      toast.error("Cet article est tracé par série. Saisis le numéro de série ou décoche 'Créer matériel'.");
      return;
    }
    if (article.gere_lot && !form.lot && form.create_materiel) {
      toast.error("Cet article est tracé par lot. Saisis le numéro de lot ou décoche 'Créer matériel'.");
      return;
    }
    setBusy(true);
    try {
      const userEmail = auth.user?.email || null;
      // 1) Insert mouvement de stock
      const mvtPayload = {
        structure_id: auth.structureId,
        etablissement_id: auth.etabId || null,
        article_id: article.id,
        type: form.type,
        quantite: parseFloat(form.quantite),
        lot: form.lot || null,
        num_serie: form.num_serie || null,
        date_peremption: form.date_peremption || null,
        notes: form.notes || null,
        reference_externe: form.reference_externe || null,
        source: "scan_barcode",
        prix_achat_unitaire: article.prix_achat_ht || null,
        user_id: auth.user?.id || null,
        user_email: userEmail,
      };
      const { error: mvtErr } = await safeInsert(supabase, "stock_mouvements", mvtPayload, { userId: auth.user?.id });
      if (mvtErr && !/does not exist|42P01/i.test(mvtErr.message || "")) {
        throw mvtErr;
      }

      // 2) Si demandé + qté = 1 + série/lot fournis → créer matériel
      if (form.create_materiel && parseFloat(form.quantite) >= 1) {
        const nb = Math.floor(parseFloat(form.quantite));
        const matPayloads = [];
        for (let i = 0; i < nb; i++) {
          matPayloads.push({
            structure_id: auth.structureId,
            etablissement_id: auth.etabId || null,
            article_id: article.id,
            libelle: article.libelle,
            num_serie: nb === 1 ? (form.num_serie || null) : null,
            num_lot: form.lot || null,
            date_peremption: form.date_peremption || null,
            etat: "Disponible",
          });
        }
        try {
          // 0.58.71 : helper avec strip auto des colonnes absentes (article_id, udi_*, immo_*)
          const { error: matErr, stripped } = await safeInsertMateriels(supabase, matPayloads);
          if (matErr) console.warn("[scan] insert matériels:", matErr.message);
          if (stripped?.article_id) console.warn("[scan] article_id non lié (SQL 0.58.67 absent)");
        } catch (e) { console.warn("[scan] matériel exception:", e?.message); }
      }

      toast.success(`Entrée stock validée : +${form.quantite} ${article.libelle}`);
      setStep("done");
    } catch (e) {
      console.error("[scan] submit:", e);
      toast.error(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setBusy(false);
    }
  }

  function resetScan() {
    setStep("scan");
    setScanResult(null);
    setArticle(null);
    setForm({ type: "entree", quantite: 1, lot: "", num_serie: "", date_peremption: "", notes: "", reference_externe: "", create_materiel: false });
    setManualCode("");
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap" style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 8 }}><BackButton /></div>
        <PageHead small title="Scan code-barres" sub="Entrée stock article par scan caméra ou GS1-128" />

        {/* Étape scan */}
        {step === "scan" && (
          <>
            <Panel style={{ marginBottom: 14 }}>
              <div style={{ aspectRatio: "4/3", background: "#000", borderRadius: 10, overflow: "hidden", position: "relative" }}>
                <QrScanner
                  onResult={handleScan}
                  onError={(e) => toast.error(e)}
                  active={!searching && !article}
                  autoStop={true}
                  formats="all"
                  requireUserStart={true}
                />
                {searching && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#7CC8C8" }}>
                    <div style={{ fontSize: 36, animation: "spin 1.2s linear infinite" }}>⏳</div>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>Recherche de l'article...</div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(124,200,200,.10)", border: "1px solid rgba(124,200,200,.30)", borderRadius: 8, fontSize: 12, color: "#1c5454" }}>
                <i className="ti ti-info-circle" /> Vise un code-barres EAN13, GS1-128, CODE128 ou DATAMATRIX. Pour les codes GS1-128, le lot/série/péremption sont auto-détectés.
              </div>
            </Panel>

            {/* Saisie manuelle fallback */}
            <Panel>
              <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="ti ti-keyboard" /> Ou saisie manuelle
              </h3>
              <form onSubmit={(e) => { e.preventDefault(); if (manualCode.trim()) findArticle(manualCode.trim()); }} style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Tape ou colle un code-barres"
                  style={{ flex: 1, padding: "9px 12px", border: "1px solid #e3e9ee", borderRadius: 8, fontSize: 14, fontFamily: "Consolas, monospace" }}
                />
                <button type="submit" disabled={!manualCode.trim() || searching} style={{
                  background: "linear-gradient(135deg, #185FA5, #134e87)",
                  color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  opacity: !manualCode.trim() || searching ? 0.5 : 1,
                }}>
                  <i className="ti ti-search" /> Chercher
                </button>
              </form>
            </Panel>

            {recentScans.length > 0 && (
              <Panel style={{ marginTop: 14 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 12, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <i className="ti ti-history" /> Scans récents (cette session)
                </h3>
                {recentScans.map((s, i) => (
                  <div key={i} style={{ padding: "6px 10px", borderBottom: i < recentScans.length - 1 ? "1px solid #f0f3f6" : "none", display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                    <span><code style={{ background: "transparent", color: "#185FA5", padding: 0 }}>{s.code}</code> · {s.libelle}</span>
                    <span style={{ color: "#8a98a8", fontSize: 10.5 }}>{new Date(s.at).toLocaleTimeString("fr-FR")}</span>
                  </div>
                ))}
              </Panel>
            )}
          </>
        )}

        {/* Étape formulaire */}
        {step === "form" && article && (
          <Panel>
            {/* Header article reconnu */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, padding: "10px 12px", background: "linear-gradient(135deg, rgba(90,160,90,.10), #fff)", borderLeft: "3px solid #5aa05a", borderRadius: 8 }}>
              <i className="ti ti-circle-check" style={{ color: "#5aa05a", fontSize: 28 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#5aa05a", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Article identifié</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#142131" }}>{article.libelle}</div>
                <div style={{ fontSize: 11, color: "#5a6878", marginTop: 2 }}>
                  {article.reference && <code style={{ background: "transparent", padding: 0, color: "#185FA5" }}>{article.reference}</code>}
                  {article.code_barre && <span> · <code style={{ background: "transparent", padding: 0 }}>{article.code_barre}</code></span>}
                  {article.unite && <span> · {article.unite}</span>}
                </div>
              </div>
              <button onClick={resetScan} style={{ background: "transparent", border: "1px solid #cfd8e0", color: "#5a6878", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-x" /> Annuler
              </button>
            </div>

            {/* Type de mouvement */}
            <div className="fld">
              <label>Type de mouvement</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { v: "entree", lbl: "Entrée", icon: "ti-arrow-down", color: "#5aa05a" },
                  { v: "sortie", lbl: "Sortie", icon: "ti-arrow-up", color: "#e35d5b" },
                  { v: "ajustement", lbl: "Ajustement", icon: "ti-edit", color: "#EF9F27" },
                  { v: "retour", lbl: "Retour", icon: "ti-arrow-back", color: "#7a6fb0" },
                ].map(t => (
                  <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v })} style={{
                    background: form.type === t.v ? `linear-gradient(135deg, ${t.color}, ${t.color}cc)` : "transparent",
                    color: form.type === t.v ? "#fff" : t.color,
                    border: `1.5px solid ${t.color}`,
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    <i className={`ti ${t.icon}`} /> {t.lbl}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Quantité *</label>
                <input type="number" min="1" step="1" value={form.quantite} onChange={(e) => setForm({ ...form, quantite: e.target.value })} style={{ fontFamily: "Consolas, monospace", fontSize: 16, fontWeight: 700 }} />
              </div>
              <div className="fld">
                <label>Référence externe (BL, facture)</label>
                <input value={form.reference_externe} onChange={(e) => setForm({ ...form, reference_externe: e.target.value })} placeholder="BL-2026-001" />
              </div>
            </div>

            {/* Tracabilité dynamique selon flags article */}
            {(article.gere_lot || article.gere_serie || article.gere_peremption) && (
              <>
                <h4 style={{ margin: "12px 0 8px", fontSize: 12, color: "#7a4f15", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #f0d59f", paddingBottom: 4 }}>
                  <i className="ti ti-search" /> Tracabilité
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {article.gere_lot && (
                    <div className="fld">
                      <label>🏷 Numéro de lot {article.gere_lot && "*"}</label>
                      <input value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} placeholder="LOT-A-1234" style={{ fontFamily: "Consolas, monospace" }} />
                    </div>
                  )}
                  {article.gere_serie && (
                    <div className="fld">
                      <label>🔢 N° série {article.gere_serie && parseInt(form.quantite || 0) === 1 && "*"}</label>
                      <input value={form.num_serie} onChange={(e) => setForm({ ...form, num_serie: e.target.value })} placeholder="S/N-001" style={{ fontFamily: "Consolas, monospace" }} />
                    </div>
                  )}
                  {article.gere_peremption && (
                    <div className="fld">
                      <label>⏱ Date de péremption</label>
                      <input type="date" value={form.date_peremption} onChange={(e) => setForm({ ...form, date_peremption: e.target.value })} />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="fld">
              <label>Notes (optionnel)</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Commentaires sur ce mouvement" />
            </div>

            {/* Create materiel checkbox */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: form.create_materiel ? "rgba(124,200,200,.10)" : "#fafbfc", border: `1px solid ${form.create_materiel ? "#7CC8C8" : "#e3e9ee"}`, borderRadius: 8, cursor: "pointer", marginTop: 10 }}>
              <input type="checkbox" checked={form.create_materiel} onChange={(e) => setForm({ ...form, create_materiel: e.target.checked })} />
              <div>
                <b style={{ fontSize: 13 }}>📦 Créer aussi {parseInt(form.quantite || 1)} matériel(s) physique(s)</b>
                <div style={{ fontSize: 11, color: "#5a6878" }}>Génère {parseInt(form.quantite || 1)} entrée(s) dans l'inventaire matériel avec le S/N et lot fournis</div>
              </div>
            </label>

            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={resetScan}>Annuler</Btn>
              <Btn variant="primary" icon="ti-check" onClick={submitEntry} disabled={busy}>
                {busy ? "Enregistrement…" : `Valider (+${form.quantite || 0})`}
              </Btn>
            </div>
          </Panel>
        )}

        {/* Étape done */}
        {step === "done" && article && (
          <Panel>
            <div style={{ textAlign: "center", padding: "20px 10px" }}>
              <div style={{ width: 80, height: 80, margin: "0 auto 14px", borderRadius: "50%", background: "linear-gradient(135deg, #5aa05a, #4a8a4a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(90,160,90,.30)" }}>
                <i className="ti ti-check" style={{ color: "#fff", fontSize: 44 }} />
              </div>
              <h2 style={{ margin: "0 0 6px", color: "#142131" }}>Mouvement enregistré ✓</h2>
              <p style={{ color: "#5a6878", margin: "0 0 18px", fontSize: 14 }}>
                {form.type === "entree" ? "+" : "-"}{form.quantite} <b>{article.libelle}</b>
                {form.lot && <span style={{ display: "block", fontSize: 12, marginTop: 4 }}>Lot : <code style={{ background: "transparent", padding: 0 }}>{form.lot}</code></span>}
                {form.num_serie && <span style={{ display: "block", fontSize: 12 }}>S/N : <code style={{ background: "transparent", padding: 0 }}>{form.num_serie}</code></span>}
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <Btn variant="primary" icon="ti-scan" onClick={resetScan}>Nouveau scan</Btn>
                <Btn variant="ghost" icon="ti-eye" onClick={() => router.push(`/article/${article.id}`)}>Voir fiche article</Btn>
                <Btn variant="ghost" icon="ti-package" onClick={() => router.push("/materiels")}>Voir inventaire</Btn>
              </div>
            </div>
          </Panel>
        )}
      </div>
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
