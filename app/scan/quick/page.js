"use client";
// =============================================================
//  /scan/quick — Scan QR matériel + popup actions rapides (0.58.72)
//
//  Quand on scanne un QR collé sur un matériel, on identifie le
//  matériel via son ID et on propose 4 actions :
//   1. 🔧 Demande d'intervention (DI)
//   2. 📦 Retour de location
//   3. 🔄 Échange (changement de matériel)
//   4. 🗑 Mise au rebut
// =============================================================

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { toast } from "../../components/ui-premium";
import BackButton from "../../components/BackButton";
import QrScanner from "../../QrScanner";
import { safeUpdate, safeInsert } from "../../../lib/safeWrite";
import { getEtatMeta } from "../../materiel/[id]/page";

export default function ScanQuickPage() {
  return (
    <Suspense fallback={null}>
      <ScanQuickInner />
    </Suspense>
  );
}

function ScanQuickInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [step, setStep] = useState("scan");        // scan | actions | confirm | done
  const [materiel, setMateriel] = useState(null);
  const [article, setArticle] = useState(null);
  const [patient, setPatient] = useState(null);
  const [locationActive, setLocationActive] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionData, setActionData] = useState({});
  const [busy, setBusy] = useState(false);

  // Pré-rempli via ?m=ID dans l'URL
  const presetMaterielId = searchParams?.get("m");

  useEffect(() => {
    if (presetMaterielId && auth.ready) {
      loadMateriel(presetMaterielId);
    }
  }, [presetMaterielId, auth.ready]);

  async function loadMateriel(id) {
    try {
      const { data, error } = await supabase
        .from("materiels")
        .select("*, patients(id, nom, prenom), depots(id, nom)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("Matériel introuvable");
        setStep("scan");
        return;
      }
      setMateriel(data);
      setPatient(data.patients || null);
      setStep("actions");

      // Charger l'article rattaché si présent
      if (data.article_id) {
        try {
          const { data: a } = await supabase.from("articles").select("id, libelle, reference, louable").eq("id", data.article_id).maybeSingle();
          setArticle(a || null);
        } catch {}
      }

      // Vérifier s'il y a une location active
      try {
        const { data: loc } = await supabase
          .from("materiel_locations")
          .select("*")
          .eq("materiel_id", id)
          .eq("statut", "en_cours")
          .maybeSingle();
        setLocationActive(loc || null);
      } catch { /* table peut-être pas créée */ }
    } catch (e) {
      console.error("[scan-quick] loadMateriel:", e);
      toast.error(e.message);
    }
  }

  // Parser le contenu du QR : peut être "https://.../scan/quick?m=UUID" ou juste l'UUID
  function extractMaterielId(text) {
    if (!text) return null;
    // URL avec query ?m=
    const urlMatch = text.match(/[?&]m=([0-9a-f-]{36})/i);
    if (urlMatch) return urlMatch[1];
    // Juste un UUID
    const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) return uuidMatch[0];
    return null;
  }

  async function handleScan({ text }) {
    const id = extractMaterielId(text);
    if (!id) {
      toast.error("QR non reconnu. Format attendu : URL Aveho ou UUID matériel.");
      return;
    }
    await loadMateriel(id);
  }

  function startAction(actionKey) {
    setSelectedAction(actionKey);
    setActionData({});
    setStep("confirm");
  }

  async function executeAction() {
    if (!materiel || !selectedAction) return;
    setBusy(true);
    try {
      switch (selectedAction) {
        case "di": {
          // Création DI
          const { error } = await safeInsert(supabase, "interventions", {
            structure_id: materiel.structure_id,
            etablissement_id: materiel.etablissement_id,
            materiel_id: materiel.id,
            patient_id: materiel.patient_id || null,
            titre: actionData.titre || `DI ${materiel.libelle || materiel.numero_serie}`,
            description: actionData.description || "",
            statut: "Nouvelle",
            priorite: actionData.priorite || "normale",
            origine: "scan_qr",
          }, { userId: auth.user?.id });
          if (error) throw error;
          toast.success("Demande d'intervention créée");
          break;
        }
        case "retour_loc": {
          if (!locationActive) {
            toast.error("Aucune location active sur ce matériel");
            return;
          }
          // Clôture location + libère le matériel
          const dateFin = new Date().toISOString().slice(0, 10);
          const { error: locErr } = await safeUpdate(supabase, "materiel_locations",
            { date_fin_reelle: dateFin, statut: "terminee", motif_fin: actionData.motif || "Retour client" },
            { id: locationActive.id }, { userId: auth.user?.id });
          if (locErr) throw locErr;
          // Libérer le matériel (etat=Disponible, patient_id=null)
          await safeUpdate(supabase, "materiels",
            { etat: "Disponible", patient_id: null },
            { id: materiel.id }, { userId: auth.user?.id });
          toast.success("Retour de location enregistré, matériel libéré");
          break;
        }
        case "echange": {
          // Créer un mouvement d'échange + suggère création d'un nouveau matériel
          try {
            await supabase.from("materiel_mouvements").insert({
              structure_id: materiel.structure_id,
              etablissement_id: materiel.etablissement_id,
              materiel_id: materiel.id,
              type: "transfert",
              motif: actionData.motif || "Échange matériel",
              notes: actionData.notes || "",
              source: "scan_qr",
              user_id: auth.user?.id,
              user_email: auth.user?.email,
            });
          } catch (_) { /* table peut-être pas créée */ }
          // État → quarantaine en attendant le remplacement
          await safeUpdate(supabase, "materiels",
            { etat: "En quarantaine", notes_etat: `Échange demandé : ${actionData.motif || ""}` },
            { id: materiel.id }, { userId: auth.user?.id });
          toast.success("Échange enregistré, matériel mis en quarantaine");
          break;
        }
        case "rebut": {
          const { error } = await safeUpdate(supabase, "materiels", {
            etat: "Rebut",
            date_rebut: new Date().toISOString().slice(0, 10),
            motif_rebut: actionData.motif || "Mise au rebut via scan QR",
          }, { id: materiel.id }, { userId: auth.user?.id });
          if (error) throw error;
          toast.success("Matériel mis au rebut");
          break;
        }
      }
      setStep("done");
    } catch (e) {
      console.error("[scan-quick] execute:", e);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep("scan");
    setMateriel(null);
    setArticle(null);
    setPatient(null);
    setLocationActive(null);
    setSelectedAction(null);
    setActionData({});
  }

  if (!auth.ready) return null;

  const etatMeta = materiel ? getEtatMeta(materiel.etat) : null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap" style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: 10 }}><BackButton /></div>
        <PageHead small
          title="Scan rapide matériel"
          sub="Scanne le QR collé sur un matériel pour DI, retour location, échange ou rebut"
        />

        {step === "scan" && (
          <Panel style={{ marginBottom: 14 }}>
            <div style={{ aspectRatio: "4/3", background: "#000", borderRadius: 10, overflow: "hidden", position: "relative" }}>
              <QrScanner onResult={handleScan} onError={(e) => toast.error(e)} active={true} autoStop={true} formats="all" requireUserStart={true} />
            </div>
            <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(94,74,140,.10)", border: "1px solid rgba(94,74,140,.30)", borderRadius: 8, fontSize: 12, color: "#5a4a90" }}>
              <i className="ti ti-info-circle" /> Le QR contient l'URL <code style={{ background: "transparent", padding: 0, color: "#5a4a90" }}>{`https://aveho-ec-app.vercel.app/scan/quick?m=ID`}</code> du matériel. Tu peux le générer/imprimer depuis la fiche matériel (onglet UDI → bouton "Générer QR").
            </div>
          </Panel>
        )}

        {step === "actions" && materiel && (
          <Panel>
            {/* Card matériel identifié */}
            <div style={{ display: "flex", gap: 12, padding: "14px 16px", background: "linear-gradient(135deg, rgba(90,160,90,.10), #fff)", borderLeft: `3px solid ${etatMeta?.color || "#5aa05a"}`, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, background: `linear-gradient(135deg, ${etatMeta?.color}, ${etatMeta?.color}cc)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${etatMeta?.icon}`} style={{ color: "#fff", fontSize: 26 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#142131" }}>{materiel.libelle || article?.libelle || "Matériel"}</div>
                <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 3 }}>
                  {materiel.numero_serie && <span>S/N <code style={{ background: "transparent", padding: 0, color: "#7a6fb0" }}>{materiel.numero_serie}</code></span>}
                  {materiel.numero_lot && <span> · Lot <code style={{ background: "transparent", padding: 0, color: "#7CC8C8" }}>{materiel.numero_lot}</code></span>}
                </div>
                <div style={{ fontSize: 11, color: "#5a6878", marginTop: 2 }}>
                  État : <b style={{ color: etatMeta?.color }}>{materiel.etat || "—"}</b>
                  {patient && <span> · 👤 {patient.nom} {patient.prenom}</span>}
                  {locationActive && <span style={{ color: "#EF9F27", fontWeight: 700 }}> · 📅 LOC en cours</span>}
                </div>
              </div>
              <button onClick={() => router.push(`/materiel/${materiel.id}`)} style={{ background: "transparent", border: "1px solid #e3e9ee", padding: "6px 10px", borderRadius: 6, fontSize: 11, color: "#185FA5", cursor: "pointer", fontFamily: "inherit", height: "fit-content" }} title="Ouvrir la fiche complète">
                <i className="ti ti-external-link" /> Fiche
              </button>
            </div>

            <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>
              <i className="ti ti-bolt" /> Que veux-tu faire ?
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <ActionCard
                icon="ti-bug" color="#e35d5b" title="🔧 Demande d'intervention"
                desc="Signaler un problème, panne, demande de maintenance"
                onClick={() => startAction("di")}
              />
              <ActionCard
                icon="ti-arrows-right" color="#EF9F27" title="📦 Retour location"
                desc={locationActive ? "Clôturer la location en cours et libérer" : "Aucune location active"}
                disabled={!locationActive}
                onClick={() => startAction("retour_loc")}
              />
              <ActionCard
                icon="ti-replace" color="#7CC8C8" title="🔄 Échange"
                desc="Échanger ce matériel contre un autre (mise en quarantaine)"
                onClick={() => startAction("echange")}
              />
              <ActionCard
                icon="ti-trash" color="#7f1d1d" title="🗑 Mise au rebut"
                desc="Matériel HS / non récupérable → mise au rebut définitive"
                onClick={() => startAction("rebut")}
              />
            </div>

            <div style={{ marginTop: 14, textAlign: "center" }}>
              <Btn variant="ghost" icon="ti-scan" onClick={reset}>Scanner un autre matériel</Btn>
            </div>
          </Panel>
        )}

        {step === "confirm" && materiel && selectedAction && (
          <Panel>
            <h3 style={{ margin: "0 0 14px", color: "#142131", fontSize: 16 }}>
              {selectedAction === "di" && <>🔧 Créer une demande d'intervention</>}
              {selectedAction === "retour_loc" && <>📦 Confirmer le retour de location</>}
              {selectedAction === "echange" && <>🔄 Demande d'échange</>}
              {selectedAction === "rebut" && <>🗑 Mise au rebut</>}
            </h3>
            <div style={{ padding: "8px 12px", background: "rgba(20,33,49,.04)", borderRadius: 6, fontSize: 12, color: "#5a6878", marginBottom: 14 }}>
              Matériel : <b>{materiel.libelle || materiel.numero_serie}</b>
            </div>

            {selectedAction === "di" && (
              <>
                <ActionField label="Titre de la DI" value={actionData.titre || ""} onChange={(v) => setActionData({ ...actionData, titre: v })} placeholder={`DI ${materiel.libelle || materiel.numero_serie}`} />
                <ActionField label="Description" value={actionData.description || ""} onChange={(v) => setActionData({ ...actionData, description: v })} multiline placeholder="Décris le problème ou la demande..." />
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#5a6878", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Priorité</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["basse", "normale", "haute", "urgente"].map(p => (
                      <button key={p} onClick={() => setActionData({ ...actionData, priorite: p })}
                        style={{
                          flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                          background: actionData.priorite === p ? (p === "urgente" ? "#e35d5b" : p === "haute" ? "#EF9F27" : p === "normale" ? "#185FA5" : "#8a98a8") : "#f5f8fc",
                          color: actionData.priorite === p ? "#fff" : "#5a6878",
                          border: actionData.priorite === p ? "none" : "1px solid #e3e9ee",
                        }}>{p}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedAction === "retour_loc" && locationActive && (
              <>
                <div style={{ padding: "10px 12px", background: "rgba(239,159,39,.10)", borderRadius: 6, fontSize: 12.5, color: "#7a4f15", marginBottom: 12 }}>
                  <b>Location active</b> · Début {new Date(locationActive.date_debut).toLocaleDateString("fr-FR")}
                  {locationActive.date_fin_prevue && ` · Fin prévue ${new Date(locationActive.date_fin_prevue).toLocaleDateString("fr-FR")}`}
                </div>
                <ActionField label="Motif de fin" value={actionData.motif || ""} onChange={(v) => setActionData({ ...actionData, motif: v })} placeholder="Retour client / fin de contrat / résiliation..." />
                <div style={{ padding: "10px 12px", background: "rgba(124,200,200,.10)", borderRadius: 6, fontSize: 11.5, color: "#1c5454", marginBottom: 12 }}>
                  ✓ La location sera clôturée à aujourd'hui<br />
                  ✓ Le matériel passera en état <b>Disponible</b><br />
                  ✓ Le lien patient sera retiré
                </div>
              </>
            )}

            {selectedAction === "echange" && (
              <>
                <ActionField label="Motif d'échange" value={actionData.motif || ""} onChange={(v) => setActionData({ ...actionData, motif: v })} placeholder="Dysfonctionnement / usure / remplacement programmé..." />
                <ActionField label="Notes" value={actionData.notes || ""} onChange={(v) => setActionData({ ...actionData, notes: v })} multiline placeholder="Notes complémentaires..." />
                <div style={{ padding: "10px 12px", background: "rgba(124,200,200,.10)", borderRadius: 6, fontSize: 11.5, color: "#1c5454", marginBottom: 12 }}>
                  ⚠ Le matériel passera en état <b>En quarantaine</b> jusqu'à remplacement effectif
                </div>
              </>
            )}

            {selectedAction === "rebut" && (
              <>
                <ActionField label="Motif de mise au rebut" value={actionData.motif || ""} onChange={(v) => setActionData({ ...actionData, motif: v })} multiline placeholder="HS / non réparable / fin de vie / casse..." />
                <div style={{ padding: "10px 12px", background: "rgba(227,93,91,.10)", borderRadius: 6, fontSize: 11.5, color: "#c0392b", marginBottom: 12, borderLeft: "3px solid #e35d5b" }}>
                  ⚠ Cette action est <b>définitive</b>. Le matériel passera en état <b>Rebut</b> avec la date d'aujourd'hui.
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 14 }}>
              <Btn variant="ghost" onClick={() => setStep("actions")}>Annuler</Btn>
              <Btn variant="primary" icon="ti-check" onClick={executeAction} disabled={busy}>
                {busy ? "..." : "Valider l'action"}
              </Btn>
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
                <Btn variant="primary" icon="ti-scan" onClick={reset}>Nouveau scan</Btn>
                {materiel && <Btn variant="ghost" icon="ti-eye" onClick={() => router.push(`/materiel/${materiel.id}`)}>Voir la fiche</Btn>}
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function ActionCard({ icon, color, title, desc, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#f5f8fc" : `linear-gradient(135deg, ${color}10, #fff)`,
      border: `2px solid ${disabled ? "#e3e9ee" : `${color}40`}`,
      padding: "14px 14px", borderRadius: 10,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
      textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
      opacity: disabled ? 0.5 : 1, transition: "all .15s",
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 20 }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: disabled ? "#8a98a8" : "#142131", marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: "#5a6878", lineHeight: 1.4 }}>{desc}</div>
      </div>
    </button>
  );
}

function ActionField({ label, value, onChange, placeholder, multiline }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "#5a6878", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 80 }} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }} />
      )}
    </div>
  );
}
