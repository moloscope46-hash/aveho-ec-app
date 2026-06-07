"use client";
// =============================================================
//  /magasin/profil — Profil du user magasin (0.60.2)
//  Vue dédiée magasin : info user + magasin rattaché + agence
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";

export default function ProfilMagasinPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState({ di_traitees: 0, sav_traites: 0, articles: 0 });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.user?.id) return;
    (async () => {
      const r = await supabase.from("membres_structure")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (r.data) {
        setMe(r.data);
        setForm({ prenom: r.data.prenom || "", nom: r.data.nom || "", telephone: r.data.telephone || "", notes: r.data.notes || "" });
      }

      // Stats
      if (magasinCtx.magasinId) {
        const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
        const [dis, arts] = await Promise.all([
          tryFetch(supabase.from("demandes_internes").select("id, type_demande, statut, validee_par, refusee_par").eq("magasin_id", magasinCtx.magasinId)),
          tryFetch(supabase.from("articles").select("id").eq("est_catalogue_magasin", true)),
        ]);
        setStats({
          di_traitees: dis.filter(d => (d.type_demande || "di") === "di" && (d.validee_par === auth.user.id || d.refusee_par === auth.user.id)).length,
          sav_traites: dis.filter(d => d.type_demande === "sav" && (d.validee_par === auth.user.id || d.refusee_par === auth.user.id)).length,
          articles: arts.length,
        });
      }
    })();
  }, [auth.ready, auth.user?.id, magasinCtx.magasinId]);

  async function saveProfil() {
    setSaving(true);
    try {
      const r = await supabase.from("membres_structure").update({
        prenom: form.prenom?.trim() || null,
        nom: form.nom?.trim() || null,
        telephone: form.telephone?.trim() || null,
        notes: form.notes?.trim() || null,
      }).eq("user_id", auth.user.id);
      if (r.error) throw r.error;
      setMe({ ...me, ...form });
      setEditing(false);
      alert("✓ Profil mis à jour");
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <PageHead icon="ti-user-circle" title="Mon profil" subtitle="Vue magasin · ton compte + magasin rattaché" />

          {/* Card profil user */}
          <Panel style={{ borderLeft: "4px solid #5a8f8f" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#5a8f8f" }}>👤 Identité</h3>
              <Btn variant="ghost" icon={editing ? "ti-x" : "ti-edit"} onClick={() => setEditing(!editing)}>
                {editing ? "Annuler" : "Modifier"}
              </Btn>
            </div>
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Prénom</label><input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></div>
                  <div className="fld"><label>Nom</label><input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
                </div>
                <div className="fld"><label>Téléphone</label><input type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
                <div className="fld"><label>Notes personnelles</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
                <Btn variant="primary" icon="ti-device-floppy" onClick={saveProfil}>{saving ? "..." : "Enregistrer"}</Btn>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                <Info lbl="Nom complet" val={`${me?.prenom || ""} ${me?.nom || ""}`.trim() || "—"} />
                <Info lbl="Email" val={auth.user?.email || "—"} />
                <Info lbl="Téléphone" val={me?.telephone || "—"} />
                <Info lbl="Rôle" val="🏬 Utilisateur Magasin" />
                <Info lbl="Compte créé" val={me?.created_at ? new Date(me.created_at).toLocaleDateString("fr-FR") : "—"} />
              </div>
            )}
          </Panel>

          {/* Card magasin rattaché */}
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #185FA5" }}>
            <h3 style={{ margin: "0 0 12px", color: "#185FA5" }}>🏬 Magasin rattaché</h3>
            {magasinCtx.loading ? (
              <div style={{ color: "#5a6878" }}>Chargement...</div>
            ) : magasinCtx.magasin ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  <Info lbl="Nom du magasin" val={magasinCtx.magasin.nom} />
                  <Info lbl="Code interne" val={magasinCtx.magasin.code || "—"} />
                  <Info lbl="Ville" val={magasinCtx.magasin.ville || "—"} />
                  <Info lbl="Code postal" val={magasinCtx.magasin.code_postal || "—"} />
                  <Info lbl="Téléphone" val={magasinCtx.magasin.telephone || "—"} />
                  <Info lbl="Email" val={magasinCtx.magasin.email || "—"} />
                  <Info lbl="Responsable" val={magasinCtx.magasin.responsable || "—"} />
                  <Info lbl="Statut" val={magasinCtx.magasin.actif !== false ? "✓ Actif" : "⊘ Inactif"} />
                </div>
                {magasinCtx.magasin.adresse && (
                  <div style={{ marginTop: 8, padding: 10, background: "#fafbfc", borderRadius: 8, fontSize: 12, color: "#5a6878" }}>
                    📍 {magasinCtx.magasin.adresse}
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 20, background: "rgba(239,159,39,.10)", borderRadius: 8, color: "#d48820" }}>
                ⚠ Tu n'es pas encore rattaché à un magasin. Demande à un admin EC.
              </div>
            )}
          </Panel>

          {/* Card agence rattachée */}
          {magasinCtx.etablissement && (
            <Panel style={{ marginTop: 12, borderLeft: "4px solid #7a6fb0" }}>
              <h3 style={{ margin: "0 0 12px", color: "#7a6fb0" }}>🏥 Agence rattachée au magasin</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                <Info lbl="Agence" val={magasinCtx.etablissement.nom} />
                <Info lbl="Ville" val={magasinCtx.etablissement.ville || "—"} />
                {magasinCtx.etablissement.finess && <Info lbl="FINESS" val={magasinCtx.etablissement.finess} />}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#5a6878", fontStyle: "italic" }}>
                Tu verras uniquement les DI/SAV/transferts envoyés à ton magasin par cette agence.
              </div>
            </Panel>
          )}

          {/* Stats */}
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#5a8f8f" }}>📊 Mon activité</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 220px))", gap: 10, justifyContent: "start" }}>
              <StatBox lbl="DI traitées" val={stats.di_traitees} color="#EF9F27" icon="ti-truck-loading" />
              <StatBox lbl="SAV traités" val={stats.sav_traites} color="#e35d5b" icon="ti-tool" />
              <StatBox lbl="Articles catalogue" val={stats.articles} color="#185FA5" icon="ti-package" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Info({ lbl, val }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "#8a98a8", textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>{lbl}</div>
      <div style={{ fontSize: 13.5, color: "#142131", fontWeight: 600 }}>{val}</div>
    </div>
  );
}

function StatBox({ lbl, val, color, icon }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
      borderRadius: 10, padding: 14,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 26 }} />
      <div>
        <div style={{ fontSize: 10.5, color, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>{lbl}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#142131", fontFamily: "Consolas,monospace" }}>{val}</div>
      </div>
    </div>
  );
}
