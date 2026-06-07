"use client";
// =============================================================
//  /magasin/etablissements/nouveau — Création EC client côté magasin (0.62.13)
//  Si l'étab existe déjà → propose rattachement (notif au propriétaire EC)
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import { useMagasinContext } from "../../../../lib/useMagasinContext";
import TopBar from "../../../TopBar";
import { useCart } from "../../../useCart";
import { PageHead, Panel, Btn } from "../../../ui";
import { MagasinSidebar } from "../../../components/MagasinSidebar";
import { geocoderAdresse } from "../../../../lib/geoloc";

export default function NouvelEtabMagasinPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [form, setForm] = useState({
    nom: "", adresse: "", code_postal: "", ville: "",
    siret: "", finess: "", telephone: "", email: "",
    type: "EHPAD", notes: "",
  });
  const [step, setStep] = useState("form");           // form | found | created | rattachee
  const [etabExistant, setEtabExistant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function chercherEtCreer() {
    if (!form.nom.trim()) { setErr("Nom obligatoire"); return; }
    setErr("");
    setSaving(true);
    try {
      // 1. Recherche d'un étab existant par nom + ville/CP/SIRET/FINESS
      const candidats = [];
      const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
      if (form.siret) candidats.push(...await tryFetch(supabase.from("etablissements").select("*").eq("siret", form.siret)));
      if (form.finess) candidats.push(...await tryFetch(supabase.from("etablissements").select("*").eq("finess", form.finess)));
      if (form.nom) {
        const r = await tryFetch(supabase.from("etablissements").select("*").ilike("nom", `%${form.nom.trim()}%`));
        candidats.push(...r);
      }
      // Dédup par id
      const dedup = Object.values(Object.fromEntries(candidats.map(c => [c.id, c])));
      // Match : exact siret/finess OU (nom proche ET ville/CP même)
      const matchExact = dedup.find(c =>
        (form.siret && c.siret === form.siret) ||
        (form.finess && c.finess === form.finess) ||
        (c.nom?.toLowerCase().trim() === form.nom.toLowerCase().trim() &&
          (!form.ville || c.ville?.toLowerCase() === form.ville.toLowerCase()))
      );
      if (matchExact) {
        setEtabExistant(matchExact);
        setStep("found");
        setSaving(false);
        return;
      }
      // 2. Pas d'étab → on crée
      // Géocoder
      let lat = null, lng = null;
      try {
        const adr = [form.adresse, form.code_postal, form.ville].filter(Boolean).join(", ");
        if (adr.length > 5) {
          const g = await geocoderAdresse(adr);
          if (g) { lat = g.lat; lng = g.lng; }
        }
      } catch {}

      const payload = {
        nom: form.nom.trim(),
        adresse: form.adresse || null,
        code_postal: form.code_postal || null,
        ville: form.ville || null,
        siret: form.siret || null,
        finess: form.finess || null,
        telephone: form.telephone || null,
        email: form.email || null,
        type: form.type || null,
        latitude: lat,
        longitude: lng,
        structure_id: auth.structureId,
        est_partenaire: true,
        created_by: auth.user?.id,
      };
      const r = await supabase.from("etablissements").insert(payload).select().single();
      if (r.error) throw r.error;

      // 3. Auto-créer le rattachement magasin → étab
      if (magasinCtx.magasinId && r.data?.id) {
        await supabase.from("magasins_rattachements").insert({
          magasin_id: magasinCtx.magasinId,
          etablissement_id: r.data.id,
          actif: true,
          notes: form.notes || "Créé depuis l'espace magasin",
          created_by: auth.user?.id,
        });
      }
      setStep("created");
    } catch (e) {
      console.error("[etab create]", e);
      setErr(e.message || JSON.stringify(e));
    } finally {
      setSaving(false);
    }
  }

  async function demanderRattachement() {
    if (!etabExistant || !magasinCtx.magasinId) return;
    setSaving(true);
    try {
      // Créer un rattachement EN ATTENTE
      const r = await supabase.from("magasins_rattachements").insert({
        magasin_id: magasinCtx.magasinId,
        etablissement_id: etabExistant.id,
        actif: false,  // false = en attente de validation EC
        notes: `[Demande pending] ${form.notes || ""}`,
        created_by: auth.user?.id,
      }).select().single();
      if (r.error) throw r.error;

      // Notifier les membres de l'étab + son admin
      try {
        const membres = await supabase.from("membres_structure")
          .select("user_id")
          .eq("structure_id", etabExistant.structure_id);
        const notifs = (membres.data || []).map(m => ({
          user_id: m.user_id,
          type: "demande_rattachement_magasin",
          titre: `🔗 Demande de rattachement d'un magasin`,
          message: `Un magasin demande à intervenir dans votre établissement "${etabExistant.nom}". Acceptez ou refusez la demande.`,
          url: `/etablissement?etab=${etabExistant.id}&tab=magasins`,
          lue: false,
        }));
        if (notifs.length > 0) await supabase.from("notifications").insert(notifs);
      } catch (e) { console.warn("[notif demande]", e); }
      setStep("rattachee");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px", maxWidth: 720 }}>
          <PageHead icon="ti-building-hospital" title="Nouvel établissement client" subtitle="Créer ou rattacher un EC à mon magasin" />

          {/* Étape : formulaire */}
          {step === "form" && (
            <Panel style={{ marginTop: 12 }}>
              {err && <div style={{ padding: 10, background: "rgba(227,93,91,.10)", borderLeft: "3px solid #e35d5b", borderRadius: 6, color: "#e35d5b", fontSize: 12, marginBottom: 12 }}>❌ {err}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}><b>Nom de l'établissement *</b>
                  <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="EHPAD Les Mimosas, Hôpital Saint-Pierre…" style={inputStyle} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Type
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                    <option value="EHPAD">EHPAD</option>
                    <option value="Hopital">Hôpital</option>
                    <option value="Clinique">Clinique</option>
                    <option value="MAS">MAS / FAM</option>
                    <option value="SSR">SSR</option>
                    <option value="USLD">USLD</option>
                    <option value="Autre">Autre</option>
                  </select>
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>SIRET
                  <input value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} placeholder="14 chiffres" style={inputStyle} />
                </label>
                <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}>Adresse
                  <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="12 rue de la République" style={inputStyle} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Code postal
                  <input value={form.code_postal} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} style={inputStyle} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Ville
                  <input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} style={inputStyle} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>FINESS
                  <input value={form.finess} onChange={(e) => setForm({ ...form, finess: e.target.value })} placeholder="9 chiffres" style={inputStyle} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Téléphone
                  <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} style={inputStyle} />
                </label>
                <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}>Notes
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contact, conditions, particularités…" style={{ ...inputStyle, minHeight: 70 }} />
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={() => router.back()}>Annuler</Btn>
                <Btn variant="primary" onClick={chercherEtCreer} disabled={saving}>
                  {saving ? "Recherche…" : <><i className="ti ti-search" /> Vérifier puis créer</>}
                </Btn>
              </div>
            </Panel>
          )}

          {/* Étape : étab déjà existant → proposer rattachement */}
          {step === "found" && etabExistant && (
            <Panel style={{ marginTop: 12, borderLeft: "4px solid #EF9F27" }}>
              <h3 style={{ margin: "0 0 10px", color: "#EF9F27" }}>
                <i className="ti ti-info-circle" /> Établissement déjà existant
              </h3>
              <div style={{ padding: 12, background: "rgba(239,159,39,.08)", borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: "#142131", fontWeight: 700 }}>{etabExistant.nom}</div>
                {etabExistant.adresse && <div style={{ fontSize: 11.5, color: "#5a6878" }}>{etabExistant.adresse}</div>}
                {(etabExistant.code_postal || etabExistant.ville) && <div style={{ fontSize: 11.5, color: "#5a6878" }}>{etabExistant.code_postal} {etabExistant.ville}</div>}
                {etabExistant.siret && <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 4 }}>SIRET : {etabExistant.siret}</div>}
              </div>
              <div style={{ fontSize: 12.5, color: "#5a6878", lineHeight: 1.6, marginBottom: 14 }}>
                Cet établissement existe déjà dans la base. Tu peux <b>demander un rattachement</b> : une notification sera envoyée aux administrateurs de cet étab. Une fois acceptée, ton magasin pourra y intervenir.
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={() => { setStep("form"); setEtabExistant(null); }}>Retour</Btn>
                <Btn variant="primary" onClick={demanderRattachement} disabled={saving}>
                  {saving ? "Envoi…" : <><i className="ti ti-send" /> Demander le rattachement</>}
                </Btn>
              </div>
            </Panel>
          )}

          {/* Étape : créé */}
          {step === "created" && (
            <Panel style={{ marginTop: 12, borderLeft: "4px solid #5aa05a" }}>
              <h3 style={{ margin: "0 0 10px", color: "#5aa05a" }}>
                <i className="ti ti-circle-check" /> Établissement créé et rattaché à ton magasin
              </h3>
              <div style={{ fontSize: 12.5, color: "#5a6878" }}>
                <b>{form.nom}</b> a été ajouté. Tu peux maintenant intervenir chez eux et créer des tournées.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={() => router.push("/magasin?tab=fournisseurs")}>Voir mes étabs</Btn>
                <Btn variant="primary" onClick={() => { setForm({ nom: "", adresse: "", code_postal: "", ville: "", siret: "", finess: "", telephone: "", email: "", type: "EHPAD", notes: "" }); setStep("form"); }}>Créer un autre</Btn>
              </div>
            </Panel>
          )}

          {/* Étape : demande envoyée */}
          {step === "rattachee" && (
            <Panel style={{ marginTop: 12, borderLeft: "4px solid #7CC8C8" }}>
              <h3 style={{ margin: "0 0 10px", color: "#185FA5" }}>
                <i className="ti ti-send" /> Demande envoyée
              </h3>
              <div style={{ fontSize: 12.5, color: "#5a6878" }}>
                Une demande de rattachement a été envoyée à l'établissement <b>{etabExistant?.nom}</b>. Tu seras notifié dès la validation. Le rattachement apparaîtra en mode "Actif" sur ton onglet 'Périmètre intervention'.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={() => router.push("/magasin/rattachements-perimetre")}>Voir mes rattachements</Btn>
                <Btn variant="primary" onClick={() => { setForm({ nom: "", adresse: "", code_postal: "", ville: "", siret: "", finess: "", telephone: "", email: "", type: "EHPAD", notes: "" }); setStep("form"); setEtabExistant(null); }}>Nouvel établissement</Btn>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px", marginTop: 4,
  border: "1px solid #cfd8e0", borderRadius: 6,
  fontFamily: "inherit", fontSize: 13,
};
