"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /parametres/voiture — Configuration mode voiture / CarPlay
//  Toggle catégories visibles + Aperçu CarPlay
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, HiTechIconBox, ModernModal, ModalBtn } from "../../components/ui-premium";

const COLOR = "#7a6fb0";

const ALL_CATEGORIES = [
  { key: "patients",       l: "Patients",         ic: "ti-user",              c: "#7a6fb0", perm: "voiture_patients" },
  { key: "etablissements", l: "Établissements",   ic: "ti-building-hospital", c: "#C9867F", perm: "voiture_etablissements" },
  { key: "magasins",       l: "Magasins",         ic: "ti-building-store",    c: "#185FA5", perm: "voiture_magasins" },
  { key: "pharmacies",     l: "Pharmacies",       ic: "ti-medical-cross",     c: "#5aa05a", perm: "voiture_pharmacies" },
  { key: "rpps",           l: "Partenaires RPPS", ic: "ti-stethoscope",       c: "#C9867F", perm: "voiture_rpps" },
  { key: "fournisseurs",   l: "Fournisseurs",     ic: "ti-truck",             c: "#5e4a8c", perm: "voiture_fournisseurs" },
  { key: "had",            l: "Patients HAD",     ic: "ti-home-heart",        c: "#185FA5", perm: "voiture_had" },
  { key: "tournee",        l: "Tournée en cours", ic: "ti-route",             c: "#EF9F27", perm: "voiture_tournee" },
  { key: "tournees_jour",  l: "Tournées du jour", ic: "ti-calendar-route",    c: "#185FA5", perm: "voiture_tournees_jour" },
  { key: "di_urgentes",    l: "DI urgentes",      ic: "ti-bell-ringing",      c: "#D45E5E", perm: "voiture_di_urgentes" },
  { key: "infirmieres",    l: "Infirmières",      ic: "ti-stethoscope",       c: "#C9867F", perm: "voiture_infirmieres" },
  { key: "visites_inf",    l: "Visites IDE",      ic: "ti-clipboard-pulse",   c: "#7CC8C8", perm: "voiture_visites_inf" },
];

export default function ParametrageVoiturePage() {
  const supabase = createClient();
  const auth = useAuth();
  const [config, setConfig] = useState({
    categories_visibles: ALL_CATEGORIES.map(c => c.key),
    tts_active: false,
    wakelock_active: true,
    affichage_compact: false,
    show_only_today: false,
  });
  const [showApercu, setShowApercu] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (auth.ready) load(); }, [auth.ready]);

  async function load() {
    const r = await supabase.from("carplay_config")
      .select("*")
      .eq("structure_id", auth.structureId)
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (r.data) setConfig({ ...config, ...r.data });
  }

  async function save() {
    setSaving(true);
    const payload = {
      structure_id: auth.structureId,
      user_id: auth.userId,
      categories_visibles: config.categories_visibles,
      tts_active: config.tts_active,
      wakelock_active: config.wakelock_active,
      affichage_compact: config.affichage_compact,
      show_only_today: config.show_only_today,
      updated_at: new Date().toISOString(),
    };
    const r = await supabase.from("carplay_config").upsert(payload, { onConflict: "structure_id,user_id" });
    if (r.error) alert(r.error.message);
    else alert("✓ Configuration sauvegardée");
    setSaving(false);
  }

  function toggleCat(key) {
    setConfig(c => ({
      ...c,
      categories_visibles: c.categories_visibles.includes(key)
        ? c.categories_visibles.filter(k => k !== key)
        : [...c.categories_visibles, key],
    }));
  }

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-steering-wheel"
        title="Paramétrage mode voiture"
        subtitle="Configuration affichage Android Auto / Apple CarPlay"
        actions={
          <>
            <button onClick={() => setShowApercu(true)} style={{
              padding: "10px 16px", borderRadius: 10,
              background: "rgba(255,255,255,.10)", color: "#fff",
              border: "1px solid rgba(255,255,255,.20)",
              fontFamily: "Quicksand", fontWeight: 700, fontSize: 12,
              cursor: "pointer", marginRight: 8,
            }}>
              <i className="ti ti-device-mobile" /> Aperçu CarPlay
            </button>
            <button onClick={save} disabled={saving} style={{
              padding: "10px 18px", borderRadius: 10,
              background: `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)`,
              color: "#fff", border: "none",
              fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
              cursor: saving ? "wait" : "pointer",
              boxShadow: `0 4px 12px ${COLOR}50`,
            }}>
              <i className="ti ti-check" /> {saving ? "Sauvegarde..." : "Enregistrer"}
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
          {/* COLONNE GAUCHE : Catégories */}
          <div>
            <ModernCard color={COLOR} variant="default" padding={16} style={{ marginBottom: 16 }}>
              <h3 style={{ color: "#fff", margin: "0 0 6px", fontSize: 15, fontWeight: 800 }}>
                <i className="ti ti-list-check" style={{ color: COLOR, marginRight: 8 }} />
                Catégories visibles ({config.categories_visibles.length} / {ALL_CATEGORIES.length})
              </h3>
              <p style={{ color: "rgba(255,255,255,.55)", margin: "0 0 14px", fontSize: 12 }}>
                Coche les catégories à afficher dans le mode voiture. L'ordre suivra celui de la liste ci-dessous.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {ALL_CATEGORIES.map(cat => {
                  const checked = config.categories_visibles.includes(cat.key);
                  return (
                    <label key={cat.key} style={{
                      padding: "10px 12px",
                      background: checked ? `${cat.c}15` : "rgba(255,255,255,.03)",
                      border: `1px solid ${checked ? cat.c + "40" : "rgba(255,255,255,.06)"}`,
                      borderRadius: 10,
                      display: "flex", alignItems: "center", gap: 10,
                      cursor: "pointer",
                      fontFamily: "Quicksand",
                      transition: "all 150ms",
                    }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCat(cat.key)}
                        style={{ accentColor: cat.c, width: 16, height: 16, cursor: "pointer" }} />
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${cat.c}30`, color: cat.c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                        <i className={`ti ${cat.ic}`} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{cat.l}</div>
                        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 9, fontFamily: "monospace" }}>{cat.perm}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </ModernCard>

            {/* Options */}
            <ModernCard color={COLOR} variant="default" padding={16}>
              <h3 style={{ color: "#fff", margin: "0 0 14px", fontSize: 15, fontWeight: 800 }}>
                <i className="ti ti-settings" style={{ color: COLOR, marginRight: 8 }} />
                Options de conduite
              </h3>
              <ToggleOption label="🔊 Annonces vocales (Text-to-Speech)" desc="Annonce vocale du prochain arrêt en français"
                checked={config.tts_active} onChange={(v) => setConfig({ ...config, tts_active: v })} color="#5aa05a" />
              <ToggleOption label="🔆 Empêcher la mise en veille (Wake-lock)" desc="L'écran reste allumé pendant la conduite"
                checked={config.wakelock_active} onChange={(v) => setConfig({ ...config, wakelock_active: v })} color="#EF9F27" />
              <ToggleOption label="📱 Affichage compact" desc="Cards plus petites pour voir plus d'éléments"
                checked={config.affichage_compact} onChange={(v) => setConfig({ ...config, affichage_compact: v })} color="#7CC8C8" />
              <ToggleOption label="📅 Aujourd'hui seulement" desc="Ne montrer que les éléments du jour"
                checked={config.show_only_today} onChange={(v) => setConfig({ ...config, show_only_today: v })} color="#185FA5" />
            </ModernCard>
          </div>

          {/* COLONNE DROITE : Aperçu mini */}
          <div>
            <ModernCard color={COLOR} variant="default" padding={14}>
              <h4 style={{ color: "#fff", margin: "0 0 10px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="ti ti-eye" /> Aperçu live
              </h4>
              <MiniApercu config={config} />
              <button onClick={() => setShowApercu(true)} style={{
                marginTop: 10, width: "100%",
                padding: "10px", borderRadius: 10,
                background: "linear-gradient(135deg, #185FA5, #0d4585)",
                color: "#fff", border: "none",
                fontFamily: "Quicksand", fontWeight: 700, fontSize: 12,
                cursor: "pointer",
              }}>
                <i className="ti ti-maximize" /> Aperçu plein écran
              </button>
            </ModernCard>
          </div>
        </div>

        {/* MODAL APERÇU CarPlay */}
        <ModernModal
          open={showApercu}
          onClose={() => setShowApercu(false)}
          color="#185FA5" icon="ti-device-mobile"
          title="Aperçu CarPlay / Android Auto"
          size="xl"
        >
          <div style={{
            background: "linear-gradient(135deg, #0c1726, #142131)",
            borderRadius: 16,
            padding: 24,
            border: "4px solid #2a3a52",
            boxShadow: "inset 0 0 0 8px #0c1726, 0 20px 60px rgba(0,0,0,.5)",
            minHeight: 380,
            position: "relative",
          }}>
            {/* Mock screen */}
            <div style={{ color: "#fff", fontFamily: "Quicksand, sans-serif" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,.10)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ti ti-steering-wheel" style={{ fontSize: 24, color: "#7a6fb0" }} />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Mode Voiture</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{config.categories_visibles.length} catégories</div>
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {/* Catégories chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {ALL_CATEGORIES.filter(c => config.categories_visibles.includes(c.key)).map(cat => (
                  <div key={cat.key} style={{
                    padding: "8px 12px",
                    background: `${cat.c}25`, color: "#fff",
                    border: `1px solid ${cat.c}50`,
                    borderRadius: 10,
                    fontSize: 12, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    <i className={`ti ${cat.ic}`} style={{ color: cat.c }} />
                    {cat.l}
                  </div>
                ))}
              </div>

              {/* Sample card */}
              <div style={{
                padding: 16, borderRadius: 12,
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(122,111,176,.30)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #7a6fb0, #5e4a8c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    <i className="ti ti-user" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>Patient Exemple</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}><i className="ti ti-map-pin" /> Saint-Céré</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  <BtnMock ic="ti-phone-call" l="Appeler" c="#5aa05a" />
                  <BtnMock ic="ti-map-pin"     l="GPS"     c="#185FA5" />
                  <BtnMock ic="ti-message-circle" l="SMS"  c="#7CC8C8" />
                </div>
              </div>

              {/* Indicateurs activés */}
              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                {config.tts_active && <Chip ic="ti-volume" l="TTS" c="#5aa05a" />}
                {config.wakelock_active && <Chip ic="ti-bulb-filled" l="Wake-lock" c="#EF9F27" />}
                {config.affichage_compact && <Chip ic="ti-minimize" l="Compact" c="#7CC8C8" />}
              </div>
            </div>
          </div>
        </ModernModal>
      </PageShell>
    </>
  );
}

function ToggleOption({ label, desc, checked, onChange, color }) {
  return (
    <label style={{
      padding: "10px 12px", marginBottom: 6,
      background: checked ? `${color}10` : "transparent",
      border: `1px solid ${checked ? color + "30" : "rgba(255,255,255,.06)"}`,
      borderRadius: 10,
      display: "flex", alignItems: "center", gap: 10,
      cursor: "pointer",
    }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: color, width: 18, height: 18, cursor: "pointer" }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>{desc}</div>
      </div>
    </label>
  );
}

function MiniApercu({ config }) {
  return (
    <div style={{
      padding: 8,
      borderRadius: 10,
      background: "#0c1726",
      border: "2px solid #2a3a52",
      minHeight: 160,
    }}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {ALL_CATEGORIES.filter(c => config.categories_visibles.includes(c.key)).slice(0, 6).map(cat => (
          <div key={cat.key} style={{
            padding: "3px 6px",
            background: `${cat.c}20`, color: cat.c,
            border: `1px solid ${cat.c}40`,
            borderRadius: 6, fontSize: 8, fontWeight: 700,
            fontFamily: "Quicksand",
          }}>
            <i className={`ti ${cat.ic}`} /> {cat.l}
          </div>
        ))}
        {config.categories_visibles.length > 6 && (
          <div style={{ padding: "3px 6px", color: "rgba(255,255,255,.4)", fontSize: 8 }}>
            +{config.categories_visibles.length - 6}
          </div>
        )}
      </div>
    </div>
  );
}

function BtnMock({ ic, l, c }) {
  return (
    <div style={{
      padding: "8px 4px", borderRadius: 8,
      background: `${c}15`, color: "#fff",
      border: `1px solid ${c}30`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      fontSize: 10, fontWeight: 700,
    }}>
      <i className={`ti ${ic}`} style={{ fontSize: 16, color: c }} />
      {l}
    </div>
  );
}

function Chip({ ic, l, c }) {
  return (
    <span style={{
      background: `${c}25`, color: c,
      border: `1px solid ${c}50`,
      padding: "3px 8px", borderRadius: 8,
      fontSize: 10, fontWeight: 700,
    }}>
      <i className={`ti ${ic}`} /> {l}
    </span>
  );
}
