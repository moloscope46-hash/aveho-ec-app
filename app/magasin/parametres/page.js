"use client";
// =============================================================
//  /magasin/parametres — Paramètres dédiés magasin (0.60.2)
//  Édition magasin + préférences + notifications
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useViewMode } from "../../../lib/useViewMode";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";

export default function ParamMagasinPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const viewMode = useViewMode();
  const magasinCtx = useMagasinContext();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!magasinCtx.magasin) return;
    setForm({
      nom: magasinCtx.magasin.nom || "",
      code: magasinCtx.magasin.code || "",
      adresse: magasinCtx.magasin.adresse || "",
      code_postal: magasinCtx.magasin.code_postal || "",
      ville: magasinCtx.magasin.ville || "",
      telephone: magasinCtx.magasin.telephone || "",
      email: magasinCtx.magasin.email || "",
      responsable: magasinCtx.magasin.responsable || "",
    });
  }, [magasinCtx.magasin]);

  async function saveMagasin() {
    if (!magasinCtx.magasin) return;
    setSaving(true);
    try {
      const r = await supabase.from("magasins").update({
        nom: form.nom?.trim(),
        code: form.code?.trim() || null,
        adresse: form.adresse?.trim() || null,
        code_postal: form.code_postal?.trim() || null,
        ville: form.ville?.trim() || null,
        telephone: form.telephone?.trim() || null,
        email: form.email?.trim() || null,
        responsable: form.responsable?.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", magasinCtx.magasin.id);
      if (r.error) throw r.error;
      alert("✓ Magasin mis à jour");
      window.location.reload();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <PageHead icon="ti-settings" title="Paramètres magasin" subtitle="Configuration de ton entité magasin + préférences" />

          {!magasinCtx.magasin ? (
            <Panel>
              <div style={{ padding: 30, textAlign: "center", color: "#d48820" }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 40, display: "block", marginBottom: 8 }} />
                Tu n'es rattaché à aucun magasin. Demande à un admin EC.
              </div>
            </Panel>
          ) : (
            <>
              <Panel style={{ borderLeft: "4px solid #5a8f8f" }}>
                <h3 style={{ margin: "0 0 12px", color: "#5a8f8f" }}>🏬 Coordonnées du magasin</h3>
                <div className="fld">
                  <label>Nom du magasin *</label>
                  <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Code interne</label><input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} style={{ fontFamily: "Consolas,monospace" }} /></div>
                  <div className="fld"><label>Responsable</label><input value={form.responsable || ""} onChange={(e) => setForm({ ...form, responsable: e.target.value })} /></div>
                </div>
                <div className="fld"><label>Adresse</label><input value={form.adresse || ""} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
                  <div className="fld"><label>Code postal</label><input value={form.code_postal || ""} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} /></div>
                  <div className="fld"><label>Ville</label><input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Téléphone</label><input type="tel" value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
                  <div className="fld"><label>Email</label><input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <Btn variant="primary" icon="ti-device-floppy" onClick={saveMagasin}>{saving ? "..." : "Enregistrer les coordonnées"}</Btn>
              </Panel>

              <Panel style={{ marginTop: 12 }}>
                <h3 style={{ margin: "0 0 12px", color: "#7a6fb0" }}>⚙ Préférences</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <PrefLine icon="ti-bell" lbl="Notifications cloche" desc="Recevoir les notifs DI et SAV dans la cloche TopBar" defaultOn />
                  <PrefLine icon="ti-mail" lbl="Notifications email" desc="(Pas encore implémenté)" disabled />
                  <PrefLine icon="ti-device-mobile" lbl="Mode mobile par défaut" desc="Atterrir sur /mobile/magasin à la connexion" defaultOn />
                </div>
              </Panel>

              <Panel style={{ marginTop: 12, borderLeft: "4px solid #e35d5b" }}>
                <h3 style={{ margin: "0 0 12px", color: "#e35d5b" }}>🚪 Session</h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn variant="ghost" icon="ti-switch" onClick={() => { viewMode.setMode("ec"); router.push("/collaborateurs"); }}>
                    Repasser en mode EC
                  </Btn>
                  <Btn variant="ghost" icon="ti-logout" onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} style={{ color: "#e35d5b" }}>
                    Se déconnecter
                  </Btn>
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PrefLine({ icon, lbl, desc, defaultOn, disabled }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: 10, background: disabled ? "#fafbfc" : (on ? "rgba(94,143,143,.08)" : "#fff"),
      border: `1px solid ${disabled ? "#e3e9ee" : (on ? "#5a8f8f55" : "#cfd8e0")}`,
      borderRadius: 8, opacity: disabled ? 0.6 : 1,
    }}>
      <i className={`ti ${icon}`} style={{ color: disabled ? "#8a98a8" : (on ? "#5a8f8f" : "#5a6878"), fontSize: 22 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>{lbl}</div>
        <div style={{ fontSize: 11, color: "#5a6878" }}>{desc}</div>
      </div>
      {!disabled && (
        <button onClick={() => setOn(!on)} style={{
          width: 44, height: 24, borderRadius: 12,
          background: on ? "#5a8f8f" : "#cfd8e0",
          border: "none", position: "relative", cursor: "pointer",
          transition: "background 200ms",
        }}>
          <span style={{
            position: "absolute", top: 2, left: on ? 22 : 2,
            width: 20, height: 20, borderRadius: 10, background: "#fff",
            transition: "left 200ms",
          }} />
        </button>
      )}
    </div>
  );
}
