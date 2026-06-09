"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";

const COLOR = "#5aa05a";

const TABS = [
  { key: "infos",        l: "Infos",         ic: "ti-info-circle" },
  { key: "equipe",       l: "Équipe",        ic: "ti-users" },
  { key: "casiers",      l: "Casiers",       ic: "ti-box-multiple" },
  { key: "medicaments",  l: "Médicaments",   ic: "ti-pill" },
  { key: "commandes",    l: "Commandes",     ic: "ti-shopping-bag" },
  { key: "mouvements",   l: "Mouvements",    ic: "ti-arrows-exchange" },
];

export default function PharmacieDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const auth = useAuth();
  const id = params.id;

  const [pharmacie, setPharmacie] = useState(null);
  const [pharmaciens, setPharmaciens] = useState([]);
  const [casiers, setCasiers] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("infos");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { if (auth.ready && id) reload(); }, [auth.ready, id]);

  async function reload() {
    setLoading(true);
    try {
      const [p, ph, c, s, cmd, mvt] = await Promise.all([
        supabase.from("pharmacies").select("*").eq("id", id).maybeSingle(),
        supabase.from("pharmaciens").select("*").eq("pharmacie_id", id).order("nom"),
        supabase.from("pharmacie_casiers").select("*").eq("pharmacie_id", id).order("code"),
        supabase.from("pharmacie_stock").select("*, medicament:medicament_id(nom_commercial, dci, dosage), casier:casier_id(code, libelle)").eq("pharmacie_id", id).order("date_peremption"),
        supabase.from("pharmacie_commandes").select("*").eq("pharmacie_id", id).order("date_commande", { ascending: false }).limit(20),
        supabase.from("pharmacie_mouvements").select("*, medicament:medicament_id(nom_commercial)").eq("pharmacie_id", id).order("created_at", { ascending: false }).limit(50),
      ]);
      setPharmacie(p.data);
      setPharmaciens(ph.data || []);
      setCasiers(c.data || []);
      setStocks(s.data || []);
      setCommandes(cmd.data || []);
      setMouvements(mvt.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function addPharmacien() {
    await supabase.from("pharmaciens").insert({
      structure_id: auth.structureId,
      pharmacie_id: id,
      nom: form.nom,
      prenom: form.prenom,
      email: form.email,
      role_pharmacie: form.role_pharmacie || "pharmacien",
      numero_rpps: form.numero_rpps,
      numero_ordre: form.numero_ordre,
      telephone: form.telephone,
      actif: true,
    });
    setModal(null);
    setForm({});
    reload();
  }

  if (loading) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-medical-cross" title="Chargement..."><div /></PageShell>
      </>
    );
  }

  if (!pharmacie) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-alert" title="Pharmacie introuvable">
          <button onClick={() => router.push("/pharmacie")}>← Retour</button>
        </PageShell>
      </>
    );
  }

  // Stats agrégées
  const totalStock = stocks.reduce((acc, s) => acc + (s.quantite || 0), 0);
  const perimant30j = stocks.filter(s => {
    if (!s.date_peremption) return false;
    const days = (new Date(s.date_peremption) - new Date()) / 86400000;
    return days < 30 && s.quantite > 0;
  });
  const cmdActives = commandes.filter(c => ["brouillon", "envoyee", "en_preparation"].includes(c.statut));

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-medical-cross"
        title={pharmacie.nom}
        subtitle={pharmacie.code}
        badge={pharmacie.actif ? "Actif" : "Inactif"}
        actions={
          <button onClick={() => router.push("/pharmacie")} style={{
            padding: "8px 14px", borderRadius: 10,
            background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)",
            fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>← Retour</button>
        }
      >
        {/* KPI bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
          <KpiTile icon="ti-users" color="#7a6fb0" label="Équipe" value={pharmaciens.length} />
          <KpiTile icon="ti-box-multiple" color="#7CC8C8" label="Casiers" value={casiers.length} />
          <KpiTile icon="ti-pill" color={COLOR} label="Articles stock" value={stocks.length} />
          <KpiTile icon="ti-package" color="#5a8f8f" label="Qté totale" value={totalStock} />
          <KpiTile icon="ti-alert-triangle" color={perimant30j.length > 0 ? "#D45E5E" : "#5aa05a"} label="Périmant 30j" value={perimant30j.length} />
          <KpiTile icon="ti-shopping-bag" color="#185FA5" label="Cmd actives" value={cmdActives.length} />
        </div>

        {/* TABS */}
        <ModernCard color={COLOR} variant="default" padding={0} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,.06)", overflowX: "auto" }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "14px 18px",
                background: tab === t.key ? "rgba(90,160,90,.12)" : "transparent",
                border: "none",
                borderBottom: tab === t.key ? `2px solid ${COLOR}` : "2px solid transparent",
                color: tab === t.key ? "#fff" : "rgba(255,255,255,.55)",
                fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "Quicksand", whiteSpace: "nowrap",
                display: "inline-flex", alignItems: "center", gap: 6,
                filter: tab === t.key ? `drop-shadow(0 0 6px ${COLOR})` : "none",
              }}>
                <i className={`ti ${t.ic}`} /> {t.l}
              </button>
            ))}
          </div>
        </ModernCard>

        {/* ONGLET INFOS */}
        {tab === "infos" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <ModernCard color={COLOR} variant="default" icon="ti-id-badge" title="Identification">
              <InfoRow label="Nom" value={pharmacie.nom} />
              <InfoRow label="Code" value={pharmacie.code} />
              <InfoRow label="Type" value={pharmacie.type} />
              <InfoRow label="N° FINESS" value={pharmacie.numero_finess} />
              <InfoRow label="N° Pharmacie" value={pharmacie.numero_pharmacie} />
            </ModernCard>
            <ModernCard color="#7CC8C8" variant="default" icon="ti-map-pin" title="Coordonnées">
              <InfoRow label="Adresse" value={pharmacie.adresse} />
              <InfoRow label="Code postal" value={pharmacie.code_postal} />
              <InfoRow label="Ville" value={pharmacie.ville} />
              <InfoRow label="Téléphone" value={pharmacie.telephone} />
              <InfoRow label="Email" value={pharmacie.email} />
            </ModernCard>
            <ModernCard color="#7a6fb0" variant="default" icon="ti-user-md" title="Pharmacien titulaire" style={{ gridColumn: "1 / -1" }}>
              <InfoRow label="Nom" value={pharmacie.pharmacien_titulaire_nom} />
              <InfoRow label="RPPS" value={pharmacie.pharmacien_titulaire_rpps} />
            </ModernCard>
          </div>
        )}

        {/* ONGLET EQUIPE */}
        {tab === "equipe" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: "#fff", margin: 0 }}>Équipe ({pharmaciens.length})</h3>
              <button onClick={() => { setForm({}); setModal("addPharmacien"); }} style={btnPrim(COLOR)}>
                <i className="ti ti-plus" /> Ajouter un pharmacien
              </button>
            </div>
            {pharmaciens.length === 0 ? (
              <ModernCard color={COLOR}><p style={{ color: "rgba(255,255,255,.5)", margin: 0 }}>Aucun pharmacien rattaché</p></ModernCard>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {pharmaciens.map(p => (
                  <ModernCard key={p.id} color="#7a6fb0" variant="default" padding={14}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "linear-gradient(135deg, #7a6fb0, #5e4a8c)",
                        color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: 16,
                      }}>{(p.prenom || "?")[0]}{(p.nom || "?")[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{p.prenom} {p.nom}</div>
                        <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{p.role_pharmacie}</div>
                        {p.numero_rpps && <div style={{ color: "rgba(255,255,255,.4)", fontSize: 10, marginTop: 2 }}>RPPS {p.numero_rpps}</div>}
                      </div>
                    </div>
                  </ModernCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET CASIERS */}
        {tab === "casiers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: "#fff", margin: 0 }}>Casiers ({casiers.length})</h3>
              <button onClick={() => router.push("/pharmacie/casiers")} style={btnPrim("#7CC8C8")}>
                <i className="ti ti-external-link" /> Gérer tous les casiers
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {casiers.map(c => (
                <ModernCard key={c.id} color={c.est_securise ? "#D45E5E" : c.est_refrigere ? "#185FA5" : "#7CC8C8"} variant="accent" padding={12}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i className={`ti ${c.est_securise ? "ti-lock" : c.est_refrigere ? "ti-snowflake" : "ti-box"}`} style={{ color: c.est_securise ? "#D45E5E" : c.est_refrigere ? "#185FA5" : "#7CC8C8", fontSize: 18, filter: `drop-shadow(0 0 4px ${c.est_securise ? "#D45E5E" : c.est_refrigere ? "#185FA5" : "#7CC8C8"})` }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{c.code}</div>
                      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{c.libelle || c.categorie}</div>
                    </div>
                  </div>
                </ModernCard>
              ))}
            </div>
          </div>
        )}

        {/* ONGLET MEDICAMENTS / STOCK */}
        {tab === "medicaments" && (
          <div>
            <h3 style={{ color: "#fff", marginTop: 0 }}>Stock par médicament ({stocks.length})</h3>
            {stocks.length === 0 ? (
              <ModernCard color={COLOR}><p style={{ color: "rgba(255,255,255,.5)", margin: 0 }}>Aucun stock</p></ModernCard>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stocks.map(s => {
                  const days = s.date_peremption ? Math.floor((new Date(s.date_peremption) - new Date()) / 86400000) : null;
                  const isPerimant = days != null && days < 30;
                  return (
                    <ModernCard key={s.id} color={isPerimant ? "#D45E5E" : COLOR} variant="default" padding={12}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <i className="ti ti-pill" style={{ color: COLOR, fontSize: 20, filter: `drop-shadow(0 0 4px ${COLOR})` }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{s.medicament?.nom_commercial || "—"}</div>
                          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>
                            {s.medicament?.dci} {s.medicament?.dosage && `· ${s.medicament.dosage}`} · Casier {s.casier?.code || "—"}
                          </div>
                          {s.numero_lot && <div style={{ color: "rgba(255,255,255,.4)", fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>Lot {s.numero_lot}</div>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>{s.quantite}</div>
                          {s.date_peremption && (
                            <div style={{ color: isPerimant ? "#D45E5E" : "rgba(255,255,255,.5)", fontSize: 10, fontWeight: 700 }}>
                              Exp: {new Date(s.date_peremption).toLocaleDateString("fr-FR")}
                              {isPerimant && ` (${days}j)`}
                            </div>
                          )}
                        </div>
                      </div>
                    </ModernCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ONGLET COMMANDES */}
        {tab === "commandes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: "#fff", margin: 0 }}>Commandes récentes</h3>
              <button onClick={() => router.push("/pharmacie/commandes")} style={btnPrim("#185FA5")}>
                <i className="ti ti-external-link" /> Toutes les commandes
              </button>
            </div>
            {commandes.length === 0 ? (
              <ModernCard color="#185FA5"><p style={{ color: "rgba(255,255,255,.5)", margin: 0 }}>Aucune commande</p></ModernCard>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {commandes.map(c => (
                  <ModernCard key={c.id} color="#185FA5" variant="default" padding={12}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <i className="ti ti-shopping-bag" style={{ color: "#185FA5", fontSize: 18, filter: "drop-shadow(0 0 4px #185FA5)" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{c.numero}</div>
                        <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{c.type_commande} · {c.date_commande ? new Date(c.date_commande).toLocaleDateString("fr-FR") : "—"}</div>
                      </div>
                      <span style={{ background: "#185FA530", color: "#185FA5", border: "1px solid #185FA560", padding: "3px 10px", borderRadius: 10, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{c.statut}</span>
                    </div>
                  </ModernCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET MOUVEMENTS */}
        {tab === "mouvements" && (
          <div>
            <h3 style={{ color: "#fff", marginTop: 0 }}>Mouvements de stock ({mouvements.length} derniers)</h3>
            {mouvements.length === 0 ? (
              <ModernCard color={COLOR}><p style={{ color: "rgba(255,255,255,.5)", margin: 0 }}>Aucun mouvement</p></ModernCard>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {mouvements.map(m => {
                  const isOut = ["sortie", "perime", "dispense"].includes(m.type_mouvement);
                  return (
                    <div key={m.id} style={{
                      padding: "8px 12px", background: "rgba(255,255,255,.04)",
                      borderRadius: 8, display: "flex", alignItems: "center", gap: 10,
                      borderLeft: `3px solid ${isOut ? "#D45E5E" : "#5aa05a"}`,
                    }}>
                      <i className={`ti ti-arrow-${isOut ? "down" : "up"}`} style={{ color: isOut ? "#D45E5E" : "#5aa05a" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: 12 }}>{m.medicament?.nom_commercial || "—"} · {m.type_mouvement}</div>
                        <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>
                          {new Date(m.created_at).toLocaleString("fr-FR")} {m.user_nom && `· ${m.user_nom}`}
                        </div>
                      </div>
                      <div style={{ color: isOut ? "#D45E5E" : "#5aa05a", fontWeight: 800 }}>{isOut ? "−" : "+"}{m.quantite}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL ajout pharmacien */}
        <ModernModal
          open={modal === "addPharmacien"}
          onClose={() => { setModal(null); setForm({}); }}
          color="#7a6fb0"
          icon="ti-user-plus"
          title="Ajouter un pharmacien"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color="#7a6fb0" icon="ti-check" onClick={addPharmacien} disabled={!form.nom}>Ajouter</ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Nom *"><input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></Field>
            <Field label="Prénom"><input value={form.prenom || ""} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></Field>
            <Field label="Email" full><input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Téléphone"><input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></Field>
            <Field label="Rôle">
              <select value={form.role_pharmacie || "pharmacien"} onChange={(e) => setForm({ ...form, role_pharmacie: e.target.value })}>
                <option value="pharmacien">Pharmacien</option>
                <option value="preparateur">Préparateur</option>
                <option value="adjoint">Pharmacien adjoint</option>
              </select>
            </Field>
            <Field label="RPPS"><input value={form.numero_rpps || ""} onChange={(e) => setForm({ ...form, numero_rpps: e.target.value })} /></Field>
            <Field label="N° Ordre"><input value={form.numero_ordre || ""} onChange={(e) => setForm({ ...form, numero_ordre: e.target.value })} /></Field>
          </div>
        </ModernModal>
      </PageShell>
    </>
  );
}

function KpiTile({ icon, color, value, label }) {
  return (
    <ModernCard color={color} variant="accent" padding={14}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <HiTechIconBox name={icon} color={color} variant="gradient" size={38} />
        <div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{value}</div>
          <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
        </div>
      </div>
    </ModernCard>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>
      <span style={{ color: "rgba(255,255,255,.5)" }}>{label}</span>
      <span style={{ color: "#fff", fontWeight: 600 }}>{value || "—"}</span>
    </div>
  );
}

function btnPrim(color) {
  return {
    padding: "8px 14px", borderRadius: 10,
    background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
    color: "#fff", border: "none",
    fontFamily: "Quicksand", fontWeight: 700, fontSize: 12,
    cursor: "pointer", boxShadow: `0 4px 12px ${color}50`,
    display: "inline-flex", alignItems: "center", gap: 6,
  };
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
