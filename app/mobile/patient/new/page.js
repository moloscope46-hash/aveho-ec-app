"use client";
// =============================================================
//  /mobile/patient/new — Assistant création patient (3 étapes)
// =============================================================
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import MobileSubHeader from "../../../components/MobileSubHeader";

export default function MobileNewPatientPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({
    civilite: "",
    nom: "",
    prenom: "",
    nom_jeune_fille: "",
    date_naissance: "",
    lieu_naissance: "",
    telephone: "",
    email: "",
    adresse: "",
    code_postal: "",
    ville: "",
    contact_urgence_nom: "",
    contact_urgence_telephone: "",
    contact_urgence_lien: "",
    medecin_traitant: "",
    medecin_traitant_telephone: "",
    allergies: "",
    regime_alimentaire: "",
    gir: "",
    mobilite: "",
    // 0.58.95 : retirés (peuvent causer 400 si colonnes absentes en DB)
    // etat: "Présent",  → présent dans SQL 0.58.81 seulement
    // statut_sejour: "En cours",
    // 0.58.85 : affectation
    etablissement_id: "",
    batiment_id: "",
    service_id: "",
    chambre_id: "",
    // 0.59.1 : collaborateur référent + pathologie principale
    collaborateur_id: "",
    pathologie_id: "",
  });

  // 0.58.85 : refs pour sélecteurs cascade
  const [etablissements, setEtablissements] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);
  const [chambres, setChambres] = useState([]);
  // 0.59.1 : ajout collaborateurs (filtré par service) + pathologies + chambres avec statut
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [pathologies, setPathologies] = useState([]);
  const [chambresOccupees, setChambresOccupees] = useState(new Set()); // ids chambres avec patient présent
  // 0.59.7 : pathologies rattachées au service sélectionné
  const [pathologiesServiceIds, setPathologiesServiceIds] = useState(new Set());

  // 0.59.7 : charger les pathologies du service quand service_id change
  useEffect(() => {
    if (!form.service_id) { setPathologiesServiceIds(new Set()); return; }
    (async () => {
      try {
        const r = await supabase.from("services_pathologies").select("pathologie_id").eq("service_id", form.service_id);
        setPathologiesServiceIds(new Set((r.data || []).map(x => x.pathologie_id)));
      } catch { setPathologiesServiceIds(new Set()); }
    })();
  }, [form.service_id]);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
      const [etabs, bats, svcs, chs, collabs, paths, patientsActifs] = await Promise.all([
        tryFetch(supabase.from("etablissements").select("id, nom").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("batiments").select("id, nom, etablissement_id").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("services").select("id, nom").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("chambres").select("id, nom, service_id").eq("structure_id", auth.structureId).limit(500)),
        // 0.59.1 : collaborateurs avec rôle + service via vue v_collaborateurs (fallback membres_structure)
        tryFetch(supabase.from("v_collaborateurs").select("user_id, prenom, nom, role_professionnel, service_id").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("pathologies").select("id, nom, icone, couleur, code").eq("structure_id", auth.structureId).eq("actif", true).order("nom")),
        // 0.59.1 : chambres occupées (patient avec chambre_id non null)
        tryFetch(supabase.from("patients").select("chambre_id").eq("structure_id", auth.structureId).not("chambre_id", "is", null)),
      ]);
      setEtablissements(etabs);
      setBatiments(bats);
      setServices(svcs);
      setChambres(chs);
      setCollaborateurs(collabs);
      setPathologies(paths);
      setChambresOccupees(new Set(patientsActifs.map(p => p.chambre_id).filter(Boolean)));
      // Pré-remplissage avec l'établissement courant si l'utilisateur n'a accès qu'à un seul
      if (etabs.length === 1) {
        setForm(f => ({ ...f, etablissement_id: etabs[0].id }));
      } else if (auth.etabId) {
        setForm(f => ({ ...f, etablissement_id: auth.etabId }));
      }
    })();
  }, [auth.ready, auth.structureId, auth.etabId]);

  // Filtres cascade
  const filteredBatiments = form.etablissement_id
    ? batiments.filter(b => b.etablissement_id === form.etablissement_id)
    : batiments;
  const filteredServices = form.batiment_id
    ? services.filter(s => s.batiment_id === form.batiment_id || s.batiment_id == null)
    : services;
  const filteredChambres = form.service_id
    ? chambres.filter(c => c.service_id === form.service_id)
    : chambres;

  function next() {
    // 0.59.9 : validation 5 étapes
    if (step === 1 && !form.nom?.trim()) {
      setSaveError("⚠ Le nom est obligatoire");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (step === 2 && !form.etablissement_id) {
      setSaveError("⚠ L'établissement est obligatoire pour passer à l'étape suivante");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaveError("");
    setStep(Math.min(step + 1, 5));
  }
  function prev() { setStep(Math.max(step - 1, 1)); }

  async function save() {
    setSaveError("");
    if (!form.nom?.trim()) { setSaveError("Le nom est obligatoire"); return; }
    setBusy(true);
    try {
      // 0.58.95 : INSERT défensif - 2 niveaux pour gérer si SQL 0.58.81/85 pas appliqués
      const fullPayload = {
        structure_id: auth.structureId,
        etablissement_id: form.etablissement_id || auth.etabId || null,
        chambre_id: form.chambre_id || null,
        ...form,
        gir: form.gir ? parseInt(form.gir, 10) : null,
        created_by: auth.user?.id,
      };
      delete fullPayload.batiment_id;
      delete fullPayload.service_id;
      console.log("[Patient/new] Payload complet:", fullPayload);

      let r = await supabase.from("patients").insert(fullPayload).select("id").single();
      if (r.error) {
        console.warn("[Patient/new] Tentative complète échouée:", r.error);
        // Niveau 2 : payload minimal avec chambre_id (si colonne existe)
        const minPayload = {
          structure_id: auth.structureId,
          etablissement_id: form.etablissement_id || auth.etabId || null,
          chambre_id: form.chambre_id || null,
          nom: form.nom,
          prenom: form.prenom || null,
          date_naissance: form.date_naissance || null,
          created_by: auth.user?.id,
        };
        console.log("[Patient/new] Retente minimal:", minPayload);
        r = await supabase.from("patients").insert(minPayload).select("id").single();
        if (r.error) {
          // 0.59.4 : Niveau 3 ULTRA-MINIMAL (juste les champs absolument requis)
          // Si chambre_id n'existe pas (PGRST204), on retire et retente
          console.warn("[Patient/new] Niveau 2 échoué, tentative ULTRA-minimal:", r.error);
          const ultraMin = {
            structure_id: auth.structureId,
            nom: form.nom,
            prenom: form.prenom || null,
            created_by: auth.user?.id,
          };
          console.log("[Patient/new] Retente ULTRA-minimal:", ultraMin);
          r = await supabase.from("patients").insert(ultraMin).select("id").single();
          if (r.error) {
            console.error("[Patient/new] Erreur même en ULTRA-minimal:", r.error);
            if (r.error.code === "PGRST204") throw new Error(`Colonne absente : ${r.error.message}. Applique fix-missing-columns-0.59.4.sql dans Supabase SQL Editor.`);
            if (r.error.code === "42703") throw new Error(`Colonne inexistante : ${r.error.message}. Applique fix-missing-columns-0.59.4.sql.`);
            if (r.error.code === "42501") throw new Error("RLS bloque l'insert. Vérifie ta policy 'patients'.");
            if (r.error.code === "23502") throw new Error(`Champ obligatoire manquant : ${r.error.details || r.error.message}`);
            if (r.error.code === "23503") throw new Error(`FK invalide : ${r.error.details || r.error.message}`);
            throw new Error(`${r.error.message} (code: ${r.error.code || "?"})`);
          }
          alert("⚠ Patient créé en mode ULTRA-minimal (juste nom/prénom).\n\nApplique fix-missing-columns-0.59.4.sql dans Supabase pour activer chambre/service/médecin/etc.");
        } else {
          alert("Patient créé avec les champs basiques.\n\nApplique fix-missing-columns-0.59.4.sql pour activer tous les champs.");
        }
      }
      console.log("[Patient/new] Patient créé id=", r.data?.id);
      // Redirection vers QR/bracelet du nouveau patient
      router.push(`/patients/${r.data.id}/qr`);
    } catch (e) {
      console.error("[Patient/new] Catch:", e);
      setSaveError(e.message || "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  if (!auth.ready) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #142131 0%, #050a14 100%)",
      fontFamily: "Quicksand, sans-serif",
      paddingBottom: 100,
      color: "#fff",
    }}>
      <MobileSubHeader title="Nouveau patient" icon="ti-user-plus" color="#C9867F" />

      {/* 0.59.9 : Stepper visuel 5 VRAIES étapes avec icônes */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 4 }}>
          {[
            { n: 1, ic: "ti-id", lbl: "Identité" },
            { n: 2, ic: "ti-building", lbl: "Affectation" },
            { n: 3, ic: "ti-phone", lbl: "Contact" },
            { n: 4, ic: "ti-stethoscope", lbl: "Médical" },
            { n: 5, ic: "ti-check", lbl: "Validation" },
          ].map((s, idx) => {
            const reached = step >= s.n;
            const isCurrent = step === s.n;
            return (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative" }}>
                {idx > 0 && <div style={{ position: "absolute", left: "-50%", top: 14, width: "100%", height: 2, background: reached ? "#C9867F" : "rgba(255,255,255,.10)" }} />}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: reached ? "#C9867F" : "rgba(255,255,255,.10)",
                  color: reached ? "#fff" : "#8a98a8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, zIndex: 1,
                  border: isCurrent ? "2px solid #fff" : "none",
                  boxShadow: isCurrent ? "0 0 0 3px rgba(255,255,255,.20)" : "none",
                  cursor: reached ? "pointer" : "default",
                  transition: "all 200ms",
                }}
                onClick={() => { if (reached) setStep(s.n); }}>
                  <i className={`ti ${s.ic}`} />
                </div>
                <div style={{ fontSize: 9, color: reached ? "#fff" : "#8a98a8", marginTop: 3, fontWeight: isCurrent ? 700 : 500, textAlign: "center" }}>
                  {s.lbl}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ color: "#bfe6e6", fontSize: 12.5, marginBottom: 14, textAlign: "center", fontWeight: 600 }}>
          Étape {step} / 5 · {step === 1 ? "Identité" : step === 2 ? "Affectation + Médecin" : step === 3 ? "Coordonnées + Urgence" : step === 4 ? "Médical complet" : "Récapitulatif & validation"}
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* 0.59.1 : Erreur de validation affichée en haut quel que soit l'étape */}
        {saveError && step < 5 && (
          <div style={{ background: "rgba(227,93,91,.12)", border: "1px solid #e35d5b", borderRadius: 10, padding: 10, color: "#fff", fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>
            <i className="ti ti-alert-triangle" style={{ color: "#e35d5b" }} /> {saveError}
          </div>
        )}
        {/* ÉTAPE 1 — IDENTITÉ */}
        {step === 1 && (
          <Section title="Identité" icon="ti-id" color="#C9867F">
            <Field label="Civilité">
              <div style={{ display: "flex", gap: 6 }}>
                {["M.", "Mme", "Dr"].map(c => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, civilite: c })} style={btnRadio(form.civilite === c, "#C9867F")}>{c}</button>
                ))}
              </div>
            </Field>
            <Field label="Nom *" required>
              <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value.toUpperCase() })} placeholder="DUPONT" style={inputStyle} autoFocus />
            </Field>
            <Field label="Prénom">
              <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} placeholder="Marie" style={inputStyle} />
            </Field>
            <Field label="Nom de jeune fille">
              <input value={form.nom_jeune_fille} onChange={e => setForm({ ...form, nom_jeune_fille: e.target.value.toUpperCase() })} placeholder="MARTIN" style={inputStyle} />
            </Field>
            <Field label="Date de naissance">
              <input type="date" value={form.date_naissance} onChange={e => setForm({ ...form, date_naissance: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Lieu de naissance">
              <input value={form.lieu_naissance} onChange={e => setForm({ ...form, lieu_naissance: e.target.value })} placeholder="Paris" style={inputStyle} />
            </Field>
          </Section>
        )}

        {/* ÉTAPE 2 — AFFECTATION (étab/bât/service/chambre + matériel + médecin/pathologie) */}
        {step === 2 && (
          <>
          <Section title="Affectation" icon="ti-building" color="#185FA5">
            {/* 0.59.1 : Établissement OBLIGATOIRE (affiché même si 1 seul, pour validation) */}
            <Field label="Établissement *" required>
              <select value={form.etablissement_id} onChange={e => setForm({ ...form, etablissement_id: e.target.value, batiment_id: "", service_id: "", chambre_id: "" })}
                style={{ ...inputStyle, borderColor: form.etablissement_id ? "#5aa05a" : "#e35d5b" }}>
                <option value="">— Choisir l'établissement —</option>
                {etablissements.map(et => <option key={et.id} value={et.id}>{et.nom}</option>)}
              </select>
              {!form.etablissement_id && <div style={{ fontSize: 10.5, color: "#e35d5b", marginTop: 3 }}>⚠ Obligatoire pour créer le patient</div>}
            </Field>
            {filteredBatiments.length > 0 && (
              <Field label="Bâtiment">
                <select value={form.batiment_id} onChange={e => setForm({ ...form, batiment_id: e.target.value, service_id: "", chambre_id: "" })} style={inputStyle}>
                  <option value="">— Aucun —</option>
                  {filteredBatiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                </select>
              </Field>
            )}
            {filteredServices.length > 0 && (
              <Field label="Service">
                <select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value, chambre_id: "", collaborateur_id: "" })} style={inputStyle}>
                  <option value="">— Aucun —</option>
                  {filteredServices.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </Field>
            )}
            {/* 0.59.1 : Chambres avec affichage statut dispo/occupée */}
            {filteredChambres.length > 0 && (
              <Field label={`Chambre ${form.service_id ? `(${filteredChambres.filter(c => !chambresOccupees.has(c.id)).length} dispo / ${filteredChambres.length})` : ""}`}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 6, maxHeight: 220, overflowY: "auto", padding: 4 }}>
                  {filteredChambres.map(c => {
                    const occupee = chambresOccupees.has(c.id);
                    const selected = form.chambre_id === c.id;
                    return (
                      <button key={c.id} type="button"
                        onClick={() => !occupee && setForm({ ...form, chambre_id: selected ? "" : c.id })}
                        disabled={occupee && !selected}
                        style={{
                          padding: "10px 6px",
                          background: selected ? "#5aa05a" : occupee ? "rgba(227,93,91,.10)" : "#fff",
                          color: selected ? "#fff" : occupee ? "#e35d5b" : "#142131",
                          border: `2px solid ${selected ? "#5aa05a" : occupee ? "rgba(227,93,91,.30)" : "#cfd8e0"}`,
                          borderRadius: 8, cursor: occupee && !selected ? "not-allowed" : "pointer",
                          fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                          opacity: occupee && !selected ? 0.6 : 1,
                          textAlign: "center",
                        }}
                        title={occupee ? "Chambre occupée" : "Chambre disponible"}
                      >
                        <div>{c.nom}</div>
                        <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.8, marginTop: 2 }}>
                          {selected ? "✓ Choisie" : occupee ? "⊘ Occupée" : "✓ Dispo"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          </Section>

          {/* 0.59.2 : Matériel installé dans la chambre + recherche article pour ajouter au panier */}
          {form.chambre_id && (
            <ChambreMaterielSection
              supabase={supabase}
              chambreId={form.chambre_id}
              structureId={auth.structureId}
              chambreNom={chambres.find(c => c.id === form.chambre_id)?.nom}
            />
          )}

          {/* 0.59.1 : Section collaborateur référent + pathologie */}
          {(collaborateurs.length > 0 || pathologies.length > 0) && (
            <Section title="Médecin & Pathologie" icon="ti-stethoscope" color="#7a6fb0">
              {pathologies.length > 0 && (
                <Field label={`Pathologie principale ${form.service_id && pathologiesServiceIds.size > 0 ? `(★ = recommandée pour ce service)` : ""}`}>
                  <select value={form.pathologie_id} onChange={e => setForm({ ...form, pathologie_id: e.target.value })} style={inputStyle}>
                    <option value="">— Aucune —</option>
                    {/* 0.59.7 : Pathologies du service en haut avec ★, puis groupe "autres" */}
                    {(() => {
                      if (!form.service_id || pathologiesServiceIds.size === 0) {
                        return pathologies.map(p => <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ""}{p.nom}</option>);
                      }
                      const reco = pathologies.filter(p => pathologiesServiceIds.has(p.id));
                      const autres = pathologies.filter(p => !pathologiesServiceIds.has(p.id));
                      return (
                        <>
                          {reco.length > 0 && (
                            <optgroup label="★ Pathologies de ce service">
                              {reco.map(p => <option key={p.id} value={p.id}>★ {p.code ? `[${p.code}] ` : ""}{p.nom}</option>)}
                            </optgroup>
                          )}
                          {autres.length > 0 && (
                            <optgroup label="Autres pathologies">
                              {autres.map(p => <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ""}{p.nom}</option>)}
                            </optgroup>
                          )}
                        </>
                      );
                    })()}
                  </select>
                </Field>
              )}
              {collaborateurs.length > 0 && (
                <Field label={`Collaborateur référent ${form.service_id ? "(filtré par service)" : ""}`}>
                  <select value={form.collaborateur_id} onChange={e => setForm({ ...form, collaborateur_id: e.target.value })} style={inputStyle}>
                    <option value="">— Aucun —</option>
                    {collaborateurs
                      .filter(c => !form.service_id || c.service_id === form.service_id || !c.service_id)
                      .map(c => {
                        const role = c.role_professionnel ? ` (${c.role_professionnel})` : "";
                        return (
                          <option key={c.user_id} value={c.user_id}>
                            {`${c.prenom || ""} ${c.nom || ""}`.trim() || "Sans nom"}{role}
                          </option>
                        );
                      })}
                  </select>
                  {form.service_id && collaborateurs.filter(c => c.service_id === form.service_id).length === 0 && (
                    <div style={{ fontSize: 10.5, color: "#EF9F27", marginTop: 3 }}>
                      ⚠ Aucun collaborateur rattaché à ce service. Va dans <a href="/collaborateurs" style={{ color: "#185FA5" }}>/collaborateurs</a> pour en assigner.
                    </div>
                  )}
                </Field>
              )}
            </Section>
          )}
          </>
        )}

        {/* ÉTAPE 3 — COORDONNÉES + URGENCE */}
        {step === 3 && (
          <>
            <Section title="Coordonnées" icon="ti-phone" color="#5aa05a">
              <Field label="Téléphone personnel">
                <input type="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="06 12 34 56 78" style={inputStyle} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.fr" style={inputStyle} />
              </Field>
              <Field label="Adresse">
                <input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} placeholder="12 rue de la Paix" style={inputStyle} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
                <Field label="CP">
                  <input value={form.code_postal} onChange={e => setForm({ ...form, code_postal: e.target.value })} placeholder="75011" style={{ ...inputStyle, fontFamily: "Consolas, monospace" }} />
                </Field>
                <Field label="Ville">
                  <input value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })} placeholder="Paris" style={inputStyle} />
                </Field>
              </div>
            </Section>
            <Section title="Contact d'urgence" icon="ti-alert-triangle" color="#e35d5b">
              <Field label="Nom contact">
                <input value={form.contact_urgence_nom} onChange={e => setForm({ ...form, contact_urgence_nom: e.target.value })} placeholder="DUPONT Pierre" style={inputStyle} />
              </Field>
              <Field label="Téléphone">
                <input type="tel" value={form.contact_urgence_telephone} onChange={e => setForm({ ...form, contact_urgence_telephone: e.target.value })} placeholder="06 12 34 56 78" style={inputStyle} />
              </Field>
              <Field label="Lien">
                <select value={form.contact_urgence_lien} onChange={e => setForm({ ...form, contact_urgence_lien: e.target.value })} style={inputStyle}>
                  <option value="">—</option>
                  <option>Conjoint</option><option>Enfant</option><option>Parent</option>
                  <option>Frère/Sœur</option><option>Tuteur</option><option>Autre</option>
                </select>
              </Field>
            </Section>
          </>
        )}

        {/* ÉTAPE 4 — MÉDICAL */}
        {step === 4 && (
          <Section title="Informations médicales" icon="ti-stethoscope" color="#7a6fb0">
            <Field label="Médecin traitant">
              <input value={form.medecin_traitant} onChange={e => setForm({ ...form, medecin_traitant: e.target.value })} placeholder="Dr Lambert" style={inputStyle} />
            </Field>
            <Field label="Téléphone médecin">
              <input type="tel" value={form.medecin_traitant_telephone} onChange={e => setForm({ ...form, medecin_traitant_telephone: e.target.value })} placeholder="01 23 45 67 89" style={inputStyle} />
            </Field>
            <Field label="GIR (1-6)">
              <div style={{ display: "flex", gap: 4 }}>
                {[1,2,3,4,5,6].map(n => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, gir: n })} style={{
                    ...btnRadio(form.gir === n, "#7a6fb0"),
                    width: 40, padding: "8px 0",
                  }}>{n}</button>
                ))}
              </div>
            </Field>
            <Field label="Mobilité">
              <select value={form.mobilite} onChange={e => setForm({ ...form, mobilite: e.target.value })} style={inputStyle}>
                <option value="">—</option>
                <option>Autonome</option><option>Assistance</option>
                <option>Fauteuil</option><option>Alité</option>
              </select>
            </Field>
            <Field label="Allergies">
              <input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="Pénicilline, latex..." style={inputStyle} />
            </Field>
            <Field label="Régime alimentaire">
              <input value={form.regime_alimentaire} onChange={e => setForm({ ...form, regime_alimentaire: e.target.value })} placeholder="Sans sel, mixé..." style={inputStyle} />
            </Field>
          </Section>
        )}

        {/* ÉTAPE 5 — RÉCAP & VALIDATION */}
        {step === 5 && (
          <Section title="Récapitulatif" icon="ti-check" color="#5aa05a">
            <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ color: "#bfe6e6", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Patient à créer</div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>
                {form.civilite && <span>{form.civilite} </span>}
                {form.nom} {form.prenom}
              </div>
              {form.nom_jeune_fille && <div style={{ color: "#bfe6e6", fontSize: 12 }}>née {form.nom_jeune_fille}</div>}
              {form.date_naissance && <div style={{ color: "#bfe6e6", fontSize: 12, marginTop: 4 }}>📅 {form.date_naissance}</div>}
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {form.telephone && <Badge color="#5aa05a">☎ {form.telephone}</Badge>}
                {form.contact_urgence_telephone && <Badge color="#e35d5b">🚨 Urgence</Badge>}
                {form.gir && <Badge color="#7a6fb0">GIR {form.gir}</Badge>}
                {form.allergies && <Badge color="#c0392b">⚠ Allergies</Badge>}
              </div>
            </div>
            <div style={{ background: "rgba(124,200,200,.08)", borderRadius: 10, padding: 14, fontSize: 12, color: "#bfe6e6", lineHeight: 1.5 }}>
              <i className="ti ti-info-circle" /> Après création, tu seras redirigé vers la page <b>QR bracelet</b> pour imprimer le bracelet d'identification du patient (formats A4 fiche ou A6 bracelet).
            </div>
            {/* 0.58.95 : feedback erreur */}
            {saveError && (
              <div style={{ marginTop: 12, background: "rgba(227,93,91,.16)", border: "1px solid #e35d5b", borderRadius: 10, padding: 12, color: "#fff", fontSize: 12.5, fontWeight: 600 }}>
                <i className="ti ti-alert-triangle" style={{ color: "#e35d5b" }} /> {saveError}
              </div>
            )}
          </Section>
        )}
      </div>

      {/* Footer navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(20,33,49,.95)", backdropFilter: "blur(14px)",
        borderTop: "1px solid rgba(255,255,255,.08)",
        padding: "12px 16px", display: "flex", gap: 10,
      }}>
        <button onClick={prev} disabled={step === 1} style={{
          background: "rgba(255,255,255,.08)", color: "#fff",
          border: "1px solid rgba(255,255,255,.16)",
          padding: "12px 18px", borderRadius: 10, cursor: step === 1 ? "default" : "pointer",
          fontFamily: "inherit", fontSize: 13, fontWeight: 600,
          opacity: step === 1 ? 0.4 : 1,
        }}>
          <i className="ti ti-chevron-left" /> Retour
        </button>
        {step < 5 ? (
          <button onClick={next} style={{
            flex: 1, background: "linear-gradient(135deg, #C9867F, #b3756e)",
            color: "#fff", border: "none",
            padding: "12px 18px", borderRadius: 10, cursor: "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700,
          }}>
            Suivant <i className="ti ti-chevron-right" />
          </button>
        ) : (
          <button onClick={save} disabled={busy || !form.nom} style={{
            flex: 1, background: "linear-gradient(135deg, #5aa05a, #4a8a4a)",
            color: "#fff", border: "none",
            padding: "12px 18px", borderRadius: 10, cursor: busy ? "wait" : "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700,
            opacity: (busy || !form.nom) ? 0.6 : 1,
          }}>
            {busy ? "Création..." : <>✓ Créer & imprimer bracelet</>}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, color, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.04)", borderRadius: 14,
      padding: "16px 16px", marginBottom: 12,
      borderLeft: `4px solid ${color}`,
    }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, color, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
        <i className={`ti ${icon}`} /> {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, color: "#bfe6e6", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
        {label} {required && <span style={{ color: "#e35d5b" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600,
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>{children}</span>
  );
}

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 10,
  color: "#fff",
  fontFamily: "inherit",
  fontSize: 14,
};

function btnRadio(active, color) {
  return {
    padding: "8px 14px",
    background: active ? color : "rgba(255,255,255,.06)",
    color: active ? "#fff" : "#bfe6e6",
    border: `1px solid ${active ? color : "rgba(255,255,255,.14)"}`,
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 13, fontWeight: 600,
    cursor: "pointer",
  };
}

// =============================================================
// 0.59.2 : Composant matériel installé dans la chambre + recherche article
// =============================================================
function ChambreMaterielSection({ supabase, chambreId, structureId, chambreNom }) {
  const [materiels, setMateriels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!chambreId) return;
    (async () => {
      try {
        // 0.59.4 : Niveau 1 avec chambre_id + structure_id
        let r = await supabase
          .from("materiels")
          .select("id, libelle, num_serie, num_parc, etat, photo_url")
          .eq("chambre_id", chambreId)
          .eq("structure_id", structureId)
          .limit(50);
        if (r.error) {
          // Niveau 2 : juste chambre_id (sans structure_id si pas de cette colonne)
          console.warn("[Chambre] Fallback sans structure_id:", r.error?.message);
          r = await supabase.from("materiels").select("id, libelle, num_serie, num_parc, etat, photo_url").eq("chambre_id", chambreId).limit(50);
        }
        setMateriels(r.data || []);
      } catch (e) {
        setMateriels([]);
      } finally { setLoading(false); }
    })();
  }, [chambreId]);

  useEffect(() => {
    if (!showSearch) return;
    (async () => {
      // 0.59.4 : tente avec structure_id, fallback sans
      let r = await supabase
        .from("articles")
        .select("id, libelle, code, photo_url, prix_vente_ht, type_article")
        .eq("structure_id", structureId)
        .limit(100);
      if (r.error) {
        console.warn("[Articles] Fallback sans structure_id:", r.error?.message);
        r = await supabase.from("articles").select("id, libelle, code, photo_url, prix_vente_ht, type_article").limit(100);
      }
      setArticles(r.data || []);
    })();
  }, [showSearch]);

  function addToCart(article) {
    try {
      const raw = localStorage.getItem("aveho_ec_cart");
      const items = raw ? JSON.parse(raw) : [];
      const existing = items.find(i => i.id === article.id);
      if (existing) {
        existing.qte = (existing.qte || 1) + 1;
      } else {
        items.push({
          id: article.id,
          libelle: article.libelle,
          code: article.code,
          photo_url: article.photo_url,
          prix_vente_ht: article.prix_vente_ht,
          qte: 1,
          chambre_id: chambreId,
          chambre_nom: chambreNom,
        });
      }
      localStorage.setItem("aveho_ec_cart", JSON.stringify(items));
      window.dispatchEvent(new Event("av-cart-change"));
      alert(`✓ "${article.libelle}" ajouté au panier`);
    } catch (e) { alert("Erreur : " + e.message); }
  }

  const searchLow = search.trim().toLowerCase();
  const filteredArticles = searchLow
    ? articles.filter(a =>
        (a.libelle || "").toLowerCase().includes(searchLow) ||
        (a.code || "").toLowerCase().includes(searchLow)
      )
    : articles.slice(0, 30);

  return (
    <div style={{
      background: "rgba(124,200,200,.06)",
      borderLeft: "4px solid #7CC8C8",
      borderRadius: 10,
      padding: 14,
      marginTop: 10,
      color: "#142131",
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#7CC8C8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <i className="ti ti-armchair-2" /> Matériel installé dans {chambreNom || "la chambre"}
      </div>
      {loading ? (
        <div style={{ color: "#5a6878", fontSize: 12 }}>Chargement...</div>
      ) : materiels.length === 0 ? (
        <div style={{ color: "#5a6878", fontSize: 12 }}>Aucun matériel rattaché à cette chambre.</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {materiels.map(m => (
            <span key={m.id} style={{
              padding: "4px 10px", background: "#fff", border: "1px solid #cfd8e0",
              borderRadius: 6, fontSize: 11, color: "#142131",
            }}>
              <i className="ti ti-armchair-2" style={{ color: "#7CC8C8" }} /> {m.libelle}
              {m.num_serie && <span style={{ color: "#8a98a8", marginLeft: 4, fontFamily: "Consolas,monospace" }}>· {m.num_serie}</span>}
            </span>
          ))}
        </div>
      )}
      <button onClick={() => setShowSearch(!showSearch)} style={{
        marginTop: 10,
        background: showSearch ? "rgba(20,33,49,.06)" : "linear-gradient(135deg,#5aa05a,#4a8a4a)",
        color: showSearch ? "#142131" : "#fff",
        border: "none", padding: "8px 14px", borderRadius: 8,
        fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
      }}>
        <i className={`ti ${showSearch ? "ti-x" : "ti-shopping-cart-plus"}`} /> {showSearch ? "Fermer la recherche" : "+ Ajouter un article au panier"}
      </button>

      {showSearch && (
        <div style={{ marginTop: 10, background: "#fff", border: "1px solid #cfd8e0", borderRadius: 8, padding: 10 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un article..."
            style={{ width: "100%", padding: "8px 10px", background: "#fafbfc", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 12 }}
            autoFocus
          />
          <div style={{ maxHeight: 240, overflowY: "auto", marginTop: 8 }}>
            {filteredArticles.length === 0 ? (
              <div style={{ padding: 12, textAlign: "center", color: "#8a98a8", fontSize: 11 }}>
                {searchLow ? "Aucun résultat" : "Tape pour chercher (ou affiche les 30 premiers)"}
              </div>
            ) : (
              filteredArticles.map(a => (
                <div key={a.id} style={{
                  display: "flex", gap: 8, alignItems: "center",
                  padding: "6px 8px", borderBottom: "1px solid #f0f3f6", fontSize: 11.5,
                }}>
                  <i className="ti ti-package" style={{ color: "#7CC8C8" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#142131" }}>{a.libelle}</div>
                    {a.code && <div style={{ fontFamily: "Consolas,monospace", color: "#8a98a8", fontSize: 10 }}>{a.code}</div>}
                  </div>
                  {a.prix_vente_ht && <span style={{ color: "#5aa05a", fontWeight: 700, fontSize: 11 }}>{parseFloat(a.prix_vente_ht).toFixed(2)} €</span>}
                  <button onClick={() => addToCart(a)} style={{
                    background: "linear-gradient(135deg,#5aa05a,#4a8a4a)", color: "#fff",
                    border: "none", padding: "5px 10px", borderRadius: 6,
                    fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>
                    <i className="ti ti-plus" /> Ajouter
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
