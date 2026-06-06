"use client";
// =============================================================
//  /scan/materiel — Scan UDI/GS1 pour matériel existant (0.58.71)
//
//  Use cases :
//   1. Identifier un matériel inconnu en scannant son code-barres
//      → ouvre sa fiche /materiel/[id]
//   2. Mettre à jour les champs UDI d'un matériel donné (?materiel_id=X)
//      → scan + update udi_di + udi_pi + qr_code
//   3. Effectuer une action rapide sur un matériel scanné :
//      changement d'état, transfert, mise au rebut
// =============================================================

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { toast } from "../../components/ui-premium";
import { detectBarcodeType, parseGS1, formatGS1Date, buildUdi, isValidEan13 } from "../../../lib/barcode";
import { materielsHasUdi, materielsHasArticleId } from "../../../lib/materiels";
import { safeUpdate } from "../../../lib/safeWrite";
import QrScanner from "../../QrScanner";
import { ETATS_MATERIEL, getEtatMeta } from "../../materiel/[id]/page";

export default function ScanMaterielPage() {
  return (
    <Suspense fallback={null}>
      <ScanMaterielInner />
    </Suspense>
  );
}

function ScanMaterielInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetMaterielId = searchParams?.get("materiel_id");
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [step, setStep] = useState("scan");       // scan | found | not_found | actions | done
  const [scanResult, setScanResult] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [materiel, setMateriel] = useState(null);
  const [presetMode, setPresetMode] = useState(false);  // true = on enrichit l'UDI d'un matériel existant
  const [manualCode, setManualCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState(null);  // 'update_udi' | 'change_etat' | 'transfert' | 'rebut'
  const [hasUdi, setHasUdi] = useState(false);

  useEffect(() => {
    (async () => {
      const h = await materielsHasUdi(supabase);
      setHasUdi(h);
    })();
  }, []);

  // Mode preset : on enrichit un matériel précis
  useEffect(() => {
    if (presetMaterielId && auth.ready) {
      (async () => {
        const { data } = await supabase.from("materiels").select("*").eq("id", presetMaterielId).maybeSingle();
        if (data) {
          setMateriel(data);
          setPresetMode(true);
          setStep("scan");  // attend qu'on scanne pour update
          toast.success(`Matériel : ${data.libelle || data.numero_serie || "Sans libellé"}. Scanne le code GS1.`);
        }
      })();
    }
  }, [presetMaterielId, auth.ready]);

  async function handleScan({ text }) {
    setScanResult(text);
    const type = detectBarcodeType(text);
    let cleanText = text;
    let p = {};
    if (type === "GS1-128" || /\(\d{2,4}\)/.test(text)) {
      p = parseGS1(text);
      setParsed(p);
    } else {
      p = {};
      setParsed({});
    }
    // Si on est en preset mode → on met juste à jour le matériel existant
    if (presetMode && materiel) {
      await updateMaterielUdi(materiel, text, p);
      return;
    }
    // Sinon, chercher le matériel correspondant
    await findMateriel(cleanText, p);
  }

  async function updateMaterielUdi(mat, rawCode, parsed) {
    setBusy(true);
    try {
      const updates = { qr_code: rawCode };
      if (hasUdi) {
        if (parsed.gtin) {
          const di = parsed.gtin.length === 14 ? parsed.gtin.slice(1) : parsed.gtin;
          updates.udi_di = di;
          const { pi } = buildUdi(parsed);
          if (pi) updates.udi_pi = pi;
        }
      }
      if (parsed.lot) updates.numero_lot = parsed.lot;
      if (parsed.serie) updates.numero_serie = parsed.serie;
      if (parsed.peremption) {
        const iso = formatGS1Date(parsed.peremption);
        if (iso) updates.date_peremption = iso;
      }
      if (rawCode && !mat.code_barre_principal) {
        updates.code_barre_principal = rawCode.replace(/\(\d+\)/g, "").slice(0, 50);
      }
      const { error } = await safeUpdate(supabase, "materiels", updates, { id: mat.id }, { userId: auth.user?.id });
      if (error) throw error;
      toast.success("Matériel mis à jour avec les données UDI scannées");
      setStep("done");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function findMateriel(rawText, p) {
    setSearching(true);
    try {
      // Stratégies de recherche par ordre :
      // 1. Match exact sur qr_code complet (si on a déjà scanné ce même code)
      // 2. Match GTIN parsé → udi_di
      // 3. Match série parsée → numero_serie
      // 4. Match lot parsé → numero_lot (si série pas trouvée)
      // 5. Match code raw → numero_serie ou code_barre_principal
      let found = null;

      if (hasUdi) {
        const r0 = await supabase.from("materiels").select("*").eq("qr_code", rawText).limit(1);
        if (r0.data?.[0]) found = r0.data[0];

        if (!found && p.gtin) {
          const di = p.gtin.length === 14 ? p.gtin.slice(1) : p.gtin;
          // Sur DI + série si possible
          if (p.serie) {
            const r1 = await supabase.from("materiels").select("*").eq("udi_di", di).eq("numero_serie", p.serie).limit(1);
            if (r1.data?.[0]) found = r1.data[0];
          }
          if (!found) {
            const r2 = await supabase.from("materiels").select("*").eq("udi_di", di).limit(5);
            if (r2.data?.length === 1) found = r2.data[0];
          }
        }
      }

      if (!found && p.serie) {
        const r3 = await supabase.from("materiels").select("*").eq("numero_serie", p.serie).limit(1);
        if (r3.data?.[0]) found = r3.data[0];
      }

      if (!found && p.lot && !p.serie) {
        const r4 = await supabase.from("materiels").select("*").eq("numero_lot", p.lot).limit(5);
        if (r4.data?.length === 1) found = r4.data[0];
      }

      if (!found) {
        // Try code raw as serial
        const r5 = await supabase.from("materiels").select("*").eq("numero_serie", rawText.trim()).limit(1);
        if (r5.data?.[0]) found = r5.data[0];
      }

      if (!found && hasUdi) {
        const r6 = await supabase.from("materiels").select("*").eq("code_barre_principal", rawText.trim()).limit(1);
        if (r6.data?.[0]) found = r6.data[0];
      }

      if (found) {
        setMateriel(found);
        setStep("found");
        toast.success(`Matériel trouvé : ${found.libelle || found.numero_serie}`);
      } else {
        setStep("not_found");
      }
    } catch (e) {
      console.error("[scan-materiel]", e);
      toast.error(e.message);
      setStep("not_found");
    } finally {
      setSearching(false);
    }
  }

  function resetScan() {
    setStep("scan");
    setScanResult(null);
    setParsed(null);
    setMateriel(presetMode ? materiel : null);
    setAction(null);
    setManualCode("");
  }

  async function executeAction() {
    if (!materiel || !action) return;
    setBusy(true);
    try {
      if (action.startsWith("etat:")) {
        const newEtat = action.split(":")[1];
        const updates = { etat: newEtat };
        if (newEtat === "Rebut") updates.date_rebut = new Date().toISOString().slice(0, 10);
        const { error } = await safeUpdate(supabase, "materiels", updates, { id: materiel.id }, { userId: auth.user?.id });
        if (error) throw error;
        toast.success(`État changé : ${newEtat}`);
        setStep("done");
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap" style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: 8 }}><BackButton /></div>
        <PageHead small
          title={presetMode ? `Scanner UDI — ${materiel?.libelle || materiel?.numero_serie || "matériel"}` : "Scanner matériel"}
          sub={presetMode
            ? "Scanne le code GS1/UDI pour enrichir la fiche matériel automatiquement"
            : "Scanne un code-barres, QR ou DataMatrix pour identifier ou agir sur un matériel"}
        />

        {step === "scan" && (
          <>
            <Panel style={{ marginBottom: 14 }}>
              <div style={{ aspectRatio: "4/3", background: "#000", borderRadius: 10, overflow: "hidden", position: "relative" }}>
                <QrScanner onResult={handleScan} onError={(e) => toast.error(e)} active={!searching && !busy} autoStop={true} formats="all" requireUserStart={true} />
                {(searching || busy) && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#7CC8C8" }}>
                    <div style={{ fontSize: 36 }}>⏳</div>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{busy ? "Mise à jour..." : "Recherche du matériel..."}</div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(94,74,140,.10)", border: "1px solid rgba(94,74,140,.30)", borderRadius: 8, fontSize: 12, color: "#5a4a90" }}>
                <i className="ti ti-info-circle" /> {presetMode
                  ? "Mode mise à jour : le scan va enrichir UDI-DI, lot, série, péremption + stocker le QR complet"
                  : "Scanne tout type de code (EAN13, GS1-128, DataMatrix UDI). Si GS1-128, le système identifie le matériel via GTIN + série."}
              </div>
            </Panel>

            <Panel>
              <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="ti ti-keyboard" /> Ou saisie manuelle
              </h3>
              <form onSubmit={(e) => { e.preventDefault(); if (manualCode.trim()) handleScan({ text: manualCode.trim() }); }} style={{ display: "flex", gap: 6 }}>
                <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Code-barres, série, GS1..." style={{ flex: 1, padding: "9px 12px", border: "1px solid #e3e9ee", borderRadius: 8, fontSize: 14, fontFamily: "Consolas, monospace" }} />
                <button type="submit" disabled={!manualCode.trim() || searching} style={{
                  background: "linear-gradient(135deg, #5e4a8c, #4a3a70)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: !manualCode.trim() || searching ? 0.5 : 1,
                }}><i className="ti ti-search" /> Chercher</button>
              </form>
            </Panel>
          </>
        )}

        {step === "found" && materiel && (
          <Panel>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, padding: "12px 14px", background: "linear-gradient(135deg, rgba(90,160,90,.10), #fff)", borderLeft: "3px solid #5aa05a", borderRadius: 8 }}>
              <i className="ti ti-circle-check" style={{ color: "#5aa05a", fontSize: 28 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#5aa05a", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Matériel identifié</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#142131" }}>{materiel.libelle || "Sans libellé"}</div>
                <div style={{ fontSize: 11, color: "#5a6878", marginTop: 2 }}>
                  {materiel.numero_serie && <span>S/N <code style={{ background: "transparent", padding: 0, color: "#7a6fb0" }}>{materiel.numero_serie}</code></span>}
                  {materiel.numero_lot && <span> · Lot <code style={{ background: "transparent", padding: 0, color: "#7CC8C8" }}>{materiel.numero_lot}</code></span>}
                  {materiel.etat && <span> · {materiel.etat}</span>}
                </div>
              </div>
            </div>

            <h4 style={{ margin: "12px 0 8px", fontSize: 12, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>Actions rapides</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <Btn variant="primary" icon="ti-eye" onClick={() => router.push(`/materiel/${materiel.id}`)}>Ouvrir la fiche</Btn>
              <Btn variant="ghost" icon="ti-edit" onClick={() => router.push(`/scan/materiel?materiel_id=${materiel.id}`)}>Mettre à jour UDI</Btn>
            </div>

            <h4 style={{ margin: "16px 0 8px", fontSize: 12, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>Changer l'état</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
              {ETATS_MATERIEL.slice(0, 8).map(e => (
                <button key={e.v} onClick={() => setAction(`etat:${e.v}`)} disabled={materiel.etat === e.v} style={{
                  background: materiel.etat === e.v ? "#f0f3f6" : (action === `etat:${e.v}` ? `linear-gradient(135deg, ${e.color}, ${e.color}cc)` : e.tint),
                  color: materiel.etat === e.v ? "#cfd8e0" : (action === `etat:${e.v}` ? "#fff" : e.color),
                  border: `1.5px solid ${materiel.etat === e.v ? "#e3e9ee" : e.color}`,
                  padding: "8px 10px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: materiel.etat === e.v ? "not-allowed" : "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <i className={`ti ${e.icon}`} /> {e.v}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 14, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={resetScan}>Nouveau scan</Btn>
              {action && <Btn variant="primary" icon="ti-check" onClick={executeAction} disabled={busy}>{busy ? "..." : "Valider l'action"}</Btn>}
            </div>

            {parsed && Object.keys(parsed).length > 0 && (
              <div style={{ marginTop: 14, padding: "10px 12px", background: "#fafbfc", borderRadius: 8, border: "1px solid #e3e9ee" }}>
                <div style={{ fontSize: 10.5, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}><i className="ti ti-info-circle" /> Données GS1 décodées</div>
                <table style={{ width: "100%", fontSize: 11, fontFamily: "Consolas, monospace" }}>
                  <tbody>
                    {Object.entries(parsed).filter(([k]) => !k.startsWith("ai_")).map(([k, v]) => (
                      <tr key={k}><td style={{ color: "#8a98a8", paddingRight: 8, width: 110 }}>{k}</td><td style={{ color: "#142131", fontWeight: 600 }}>{v}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {step === "not_found" && (
          <Panel>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, padding: "12px 14px", background: "rgba(227,93,91,.10)", borderLeft: "3px solid #e35d5b", borderRadius: 8 }}>
              <i className="ti ti-alert-triangle" style={{ color: "#e35d5b", fontSize: 28 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#e35d5b", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Matériel non trouvé</div>
                <div style={{ fontSize: 14, color: "#142131" }}>Aucun matériel ne correspond au code scanné.</div>
                <div style={{ fontSize: 11, color: "#5a6878", marginTop: 4, fontFamily: "Consolas, monospace" }}>Code : {scanResult}</div>
              </div>
            </div>
            {parsed?.gtin && (
              <p style={{ fontSize: 12.5, color: "#5a6878", margin: "0 0 12px" }}>
                <i className="ti ti-info-circle" /> Le code scanné contient un GTIN (<code style={{ background: "transparent", padding: 0 }}>{parsed.gtin}</code>). Veux-tu créer un nouveau matériel et l'attacher à l'article correspondant ?
              </p>
            )}
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={resetScan}>Réessayer</Btn>
              <Btn variant="primary" icon="ti-plus" onClick={() => router.push(`/scan/article?code=${encodeURIComponent(scanResult || "")}`)}>Créer matériel (via scan article)</Btn>
            </div>
          </Panel>
        )}

        {step === "done" && (
          <Panel>
            <div style={{ textAlign: "center", padding: "24px 12px" }}>
              <div style={{ width: 80, height: 80, margin: "0 auto 14px", borderRadius: "50%", background: "linear-gradient(135deg, #5aa05a, #4a8a4a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(90,160,90,.30)" }}>
                <i className="ti ti-check" style={{ color: "#fff", fontSize: 44 }} />
              </div>
              <h2 style={{ margin: "0 0 8px", color: "#142131" }}>Action effectuée ✓</h2>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                <Btn variant="primary" icon="ti-scan" onClick={resetScan}>Nouveau scan</Btn>
                {materiel && <Btn variant="ghost" icon="ti-eye" onClick={() => router.push(`/materiel/${materiel.id}`)}>Voir la fiche</Btn>}
                <Btn variant="ghost" icon="ti-package" onClick={() => router.push("/materiels")}>Inventaire</Btn>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
