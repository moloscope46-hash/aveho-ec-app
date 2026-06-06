"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import MobileSubHeader from "../../../components/MobileSubHeader";

export default function MobileTransfertDemandePage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const [depots, setDepots] = useState([]);
  const [form, setForm] = useState({ depot_source_id: "", depot_destination_id: "", priorite: "normale", motif: "" });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      const { data } = await supabase.from("depots").select("id, nom, couleur").eq("structure_id", auth.structureId).eq("actif", true).order("nom");
      setDepots(data || []);
    })();
  }, [auth.ready, auth.structureId]);

  async function submit() {
    setSaveError("");
    if (!form.depot_source_id || !form.depot_destination_id) {
      setSaveError("Source et destination obligatoires");
      return;
    }
    if (form.depot_source_id === form.depot_destination_id) {
      setSaveError("Source et destination identiques");
      return;
    }
    setBusy(true);
    try {
      // 0.58.94 : INSERT défensif — tente avec tous les champs puis retombe sur le minimum
      const payloadFull = {
        structure_id: auth.structureId,
        etablissement_id: auth.etabId || null,
        depot_source_id: form.depot_source_id,
        depot_destination_id: form.depot_destination_id,
        priorite: form.priorite,
        motif: form.motif || null,
        statut: "Demandé",
        cree_par_scan: false,
      };
      console.log("[Transfert/demande] Payload:", payloadFull);
      let r = await supabase.from("transferts").insert(payloadFull).select();
      if (r.error) {
        console.warn("[Transfert/demande] Tentative complète échouée:", r.error);
        // Retire les champs potentiellement absents et retente
        const payloadMin = {
          structure_id: auth.structureId,
          etablissement_id: auth.etabId || null,
          depot_source_id: form.depot_source_id,
          depot_destination_id: form.depot_destination_id,
          motif: form.motif || null,
        };
        r = await supabase.from("transferts").insert(payloadMin).select();
        if (r.error) {
          console.error("[Transfert/demande] Payload minimum aussi échoué:", r.error);
          if (r.error.code === "42P01") throw new Error("Table 'transferts' inaccessible. Vérifie le schéma Supabase.");
          if (r.error.code === "23514") throw new Error(`Contrainte CHECK violée : ${r.error.message}. Probablement statut ou priorite invalide.`);
          if (r.error.code === "23502") throw new Error(`Champ obligatoire manquant : ${r.error.details || r.error.message}`);
          if (r.error.code === "42501") throw new Error("RLS bloque l'insert. Vérifie ta policy sur transferts.");
          throw new Error(`${r.error.message} (code: ${r.error.code || "?"})`);
        }
        console.log("[Transfert/demande] Insert minimal OK, certains champs ignorés");
      }
      alert("Demande enregistrée — visible dans la liste /transferts");
      router.push("/transferts");
    } catch (e) {
      setSaveError(e.message || "Erreur inconnue");
    } finally { setBusy(false); }
  }

  if (!auth.ready) return null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #142131 0%, #050a14 100%)", fontFamily: "Quicksand, sans-serif", paddingBottom: 80, color: "#fff" }}>
      <MobileSubHeader title="Faire une demande de transfert" icon="ti-clipboard-list" color="#EF9F27" backTo="/mobile/transfert" />

      <div style={{ padding: 16 }}>
        <div style={{ background: "rgba(239,159,39,.10)", borderLeft: "4px solid #EF9F27", borderRadius: 10, padding: 12, fontSize: 12, color: "#bfe6e6", marginBottom: 14 }}>
          <i className="ti ti-info-circle" /> La demande tombe dans la liste des transferts en statut <b>Demandé</b>. Un responsable la validera.
        </div>

        {/* 0.58.94 : feedback erreur */}
        {saveError && (
          <div style={{ background: "rgba(227,93,91,.12)", border: "1px solid #e35d5b", borderRadius: 10, padding: 12, fontSize: 12.5, color: "#fff", marginBottom: 14, fontWeight: 600 }}>
            <i className="ti ti-alert-triangle" style={{ color: "#e35d5b" }} /> {saveError}
          </div>
        )}

        <Field label="Dépôt source *">
          <select value={form.depot_source_id} onChange={e => setForm({ ...form, depot_source_id: e.target.value })} style={inputStyle}>
            <option value="">— Sélectionner —</option>
            {depots.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
          </select>
        </Field>

        <Field label="Dépôt destination *">
          <select value={form.depot_destination_id} onChange={e => setForm({ ...form, depot_destination_id: e.target.value })} style={inputStyle}>
            <option value="">— Sélectionner —</option>
            {depots.filter(d => d.id !== form.depot_source_id).map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
          </select>
        </Field>

        <Field label="Priorité">
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { v: "normale", lbl: "Normale", c: "#5a6878" },
              { v: "urgente", lbl: "Urgente", c: "#EF9F27" },
              { v: "critique", lbl: "Critique", c: "#e35d5b" },
            ].map(p => (
              <button key={p.v} type="button" onClick={() => setForm({ ...form, priorite: p.v })} style={{
                flex: 1, padding: "10px",
                background: form.priorite === p.v ? p.c : "rgba(255,255,255,.06)",
                color: form.priorite === p.v ? "#fff" : "#bfe6e6",
                border: `1px solid ${form.priorite === p.v ? p.c : "rgba(255,255,255,.14)"}`,
                borderRadius: 10, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}>{p.lbl}</button>
            ))}
          </div>
        </Field>

        <Field label="Motif / commentaire">
          <textarea value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Précise la raison de cette demande..." />
        </Field>

        <button onClick={submit} disabled={busy} style={{
          width: "100%", marginTop: 20,
          background: "linear-gradient(135deg, #EF9F27, #d48820)",
          color: "#fff", border: "none", padding: "14px", borderRadius: 12,
          fontFamily: "inherit", fontWeight: 700, fontSize: 15, cursor: busy ? "wait" : "pointer",
          boxShadow: "0 8px 22px rgba(239,159,39,.30)",
          opacity: busy ? 0.6 : 1,
        }}>
          {busy ? "Envoi..." : "📋 Envoyer la demande"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: "#bfe6e6", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
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
