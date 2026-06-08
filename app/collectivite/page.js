"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import { KpiRow } from "../kpis";
import Crud from "../crud";

export default function Collectivite() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [fiche, setFiche] = useState(null);
  const [form, setForm] = useState({});
  const [etabs, setEtabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");

  async function load() {
    const [{ data: st }, { data: es }] = await Promise.all([
      supabase.from("structures").select("*").eq("id", auth.structureId).maybeSingle(),
      supabase.from("etablissements").select("*").order("nom"),
    ]);
    setFiche(st); setForm(st || {}); setEtabs(es || []);
    setLoading(false);
  }
  useEffect(() => { if (auth.ready && auth.structureId) load(); }, [auth.ready]);

  async function saveFiche() {
    const fields = ["raison_sociale", "siret", "finess_juridique", "forme_juridique", "adresse", "code_postal", "ville", "telephone", "email"];
    const payload = {}; fields.forEach((f) => payload[f] = form[f] ?? null);
    await supabase.from("structures").update(payload).eq("id", auth.structureId);
    setSavedMsg("Fiche enregistrée."); setTimeout(() => setSavedMsg(""), 2500);
  }

  if (!auth.ready) return null;

  const F = (k, label, ph) => (
    <div className="fld"><label>{label}</label>
      <input value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={ph || ""} />
    </div>
  );

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="COLLECTIVITÉ PROPRIÉTAIRE" title="Fiche collectivité" sub={auth.structureNom} />
        <KpiRow tiles={[
          { label: "Établissements", value: etabs.length, icon: "ti-buildings", color: "#185FA5" },
          { label: "Actifs", value: etabs.filter((e) => e.actif !== false).length, icon: "ti-circle-check", color: "#5aa05a" },
          { label: "Capacité totale", value: etabs.reduce((s, e) => s + (e.capacite || 0), 0) + " lits", icon: "ti-bed", color: "#7CC8C8" },
        ]} />

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel> : (
          <>
            <Panel style={{ marginBottom: 18 }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 17 }}>Informations sociales</h2>
              {savedMsg && <div className="ok">{savedMsg}</div>}
              <div className="fld-row">{F("raison_sociale", "Raison sociale")}{F("forme_juridique", "Forme juridique", "Public, Association…")}</div>
              <div className="fld-row">{F("siret", "SIRET")}{F("finess_juridique", "FINESS juridique")}</div>
              {F("adresse", "Adresse")}
              <div className="fld-row">{F("code_postal", "Code postal")}{F("ville", "Ville")}</div>
              <div className="fld-row">{F("telephone", "Téléphone")}{F("email", "Email")}</div>
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <button className="btn-save" onClick={saveFiche}>Enregistrer la fiche</button>
              </div>
            </Panel>

            <PageHead small title="Mes établissements" sub="Créez et gérez les établissements de la collectivité" />
            <Crud
              structureId={auth.structureId}
              table="etablissements"
              title="Nouvel établissement"
              onData={setEtabs}
              columns={[
                { key: "nom", label: "Établissement" },
                { key: "type", label: "Type" },
                { key: "finess", label: "FINESS" },
                { key: "ville", label: "Ville" },
                { key: "capacite", label: "Capacité", render: (r) => r.capacite ? `${r.capacite} lits` : "—" },
                { key: "actif", label: "Statut", render: (r) => <span className={`statut ${r.actif !== false ? "s-livree" : "s-encours2"}`}>{r.actif !== false ? "Actif" : "Inactif"}</span> },
              ]}
              fields={[
                { key: "nom", label: "Nom de l'établissement", required: true },
                { key: "type", label: "Type", type: "select", options: [
                  { value: "Hôpital", label: "Hôpital" }, { value: "EHPAD", label: "EHPAD" },
                  { value: "Foyer", label: "Foyer" }, { value: "Clinique", label: "Clinique" }, { value: "SSR", label: "SSR" },
                ] },
                { key: "finess", label: "FINESS géographique" },
                { key: "siret", label: "SIRET" },
                { key: "adresse", label: "Adresse" },
                { key: "code_postal", label: "Code postal" },
                { key: "ville", label: "Ville" },
                { key: "telephone", label: "Téléphone" },
                { key: "email", label: "Email" },
                { key: "capacite", label: "Capacité (lits)", type: "number" },
              ]}
            />
            <p style={{ color: "#9fb6c2", fontSize: 12, marginTop: 10 }}>
              <i className="ti ti-info-circle" /> Les utilisateurs se rattachent aux établissements depuis la page Utilisateurs. Le sélecteur en haut permet de basculer d'établissement.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
