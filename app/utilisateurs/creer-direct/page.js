"use client";
// =============================================================
//  /utilisateurs/creer-direct — Création directe d'un utilisateur (0.62.34)
//  → SANS mail d'invitation, retourne identifiant + mot de passe à transmettre
//  Disponible côté étab ET côté magasin
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import BackButton from "../../components/BackButton";

function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < length; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
}

export default function CreerUserDirectPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [form, setForm] = useState({
    type_compte: "etablissement",
    email: "",
    password: generatePassword(12),
    prenom: "",
    nom: "",
    telephone: "",
    fonction_detail: "",
    etablissement_id: "",
    magasin_fournisseur_id: "",
  });
  const [etabs, setEtabs] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      try {
        const [e, m] = await Promise.all([
          supabase.from("etablissements").select("id, nom, ville").eq("structure_id", auth.structureId).order("nom"),
          supabase.from("magasins").select("id, nom, ville").eq("structure_id", auth.structureId).order("nom"),
        ]);
        setEtabs(e.data || []);
        setMagasins(m.data || []);
      } catch (e) { console.warn(e); }
    })();
  }, [auth.ready, auth.structureId]);

  function regenPassword() {
    setForm({ ...form, password: generatePassword(12) });
  }

  async function createUser() {
    setErr("");
    if (!form.email?.trim()) { setErr("Email obligatoire"); return; }
    if (!form.password || form.password.length < 8) { setErr("Mot de passe ≥ 8 caractères"); return; }
    if (form.type_compte === "etablissement" && !form.etablissement_id) { setErr("Sélectionne un établissement"); return; }
    if (form.type_compte === "magasin" && !form.magasin_fournisseur_id) { setErr("Sélectionne un magasin"); return; }

    setCreating(true);
    try {
      // Call edge function
      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const sessionResp = await supabase.auth.getSession();
      const accessToken = sessionResp.data?.session?.access_token || sbKey;

      const resp = await fetch(`${sbUrl}/functions/v1/create-user-direct`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          password: form.password,
          prenom: form.prenom || null,
          nom: form.nom || null,
          telephone: form.telephone || null,
          fonction_detail: form.fonction_detail || null,
          structure_id: auth.structureId,
          etablissement_id: form.type_compte === "etablissement" ? form.etablissement_id : null,
          magasin_fournisseur_id: form.type_compte === "magasin" ? form.magasin_fournisseur_id : null,
          type_compte: form.type_compte,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`);

      setResult(data);
    } catch (e) {
      // Fallback : essayer côté client (peut échouer si pas service_role, mais worth a try)
      try {
        const sup = supabase;
        const { data: userData, error: signupErr } = await sup.auth.signUp({
          email: form.email.toLowerCase().trim(),
          password: form.password,
          options: { data: { prenom: form.prenom, nom: form.nom, created_directly: true } },
        });
        if (signupErr) throw new Error("Edge function échouée et fallback impossible : " + e.message + " · " + signupErr.message + ". Déploie l'edge function : supabase functions deploy create-user-direct");

        // Crée membre
        await sup.from("membres_structure").insert({
          user_id: userData.user?.id,
          structure_id: auth.structureId,
          email: form.email.toLowerCase(),
          prenom: form.prenom, nom: form.nom,
          telephone: form.telephone, fonction_detail: form.fonction_detail,
          etablissement_id: form.type_compte === "etablissement" ? form.etablissement_id : null,
          magasin_fournisseur_id: form.type_compte === "magasin" ? form.magasin_fournisseur_id : null,
          role_professionnel: form.type_compte === "magasin" ? "utilisateur_magasin" : "utilisateur",
          actif: true,
        });
        setResult({ ok: true, email: form.email, password: form.password, user_id: userData.user?.id });
      } catch (e2) {
        setErr(e2.message);
      }
    } finally { setCreating(false); }
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text);
    alert("✓ Copié");
  }

  function reset() {
    setResult(null);
    setForm({
      type_compte: form.type_compte,
      email: "",
      password: generatePassword(12),
      prenom: "", nom: "", telephone: "", fonction_detail: "",
      etablissement_id: "", magasin_fournisseur_id: "",
    });
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 760 }}>
        <BackButton />
        <PageHead icon="ti-user-plus" title="Créer un utilisateur directement" subtitle="Sans mail d'invitation · identifiant + mot de passe à transmettre" />

        {/* Résultat post-création */}
        {result ? (
          <Panel style={{ marginTop: 16, borderLeft: "4px solid #5aa05a", background: "rgba(94,160,90,.05)" }}>
            <h3 style={{ margin: "0 0 12px", color: "#5aa05a" }}>✅ Utilisateur créé avec succès !</h3>
            <p style={{ fontSize: 13, color: "#5a6878", marginBottom: 14 }}>
              <strong>Transmets ces identifiants manuellement</strong> à l'utilisateur (par téléphone, sur place, etc.). Le mot de passe n'apparaîtra plus jamais.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase" }}>URL de connexion</div>
              <code style={{ background: "#fff", border: "1px solid #cfd8e0", padding: "8px 10px", borderRadius: 6, fontSize: 12, fontFamily: "Consolas,monospace" }}>{result.app_url || "https://aveho-ec-app.vercel.app"}</code>
              <button onClick={() => copyToClipboard(result.app_url || "https://aveho-ec-app.vercel.app")} style={btnCopy}>Copier</button>

              <div style={{ fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase" }}>Email</div>
              <code style={{ background: "#fff", border: "1px solid #cfd8e0", padding: "8px 10px", borderRadius: 6, fontSize: 13, fontFamily: "Consolas,monospace", fontWeight: 700 }}>{result.email}</code>
              <button onClick={() => copyToClipboard(result.email)} style={btnCopy}>Copier</button>

              <div style={{ fontSize: 11, fontWeight: 700, color: "#e35d5b", textTransform: "uppercase" }}>Mot de passe</div>
              <code style={{ background: "rgba(227,93,91,.08)", border: "2px solid #e35d5b", padding: "8px 10px", borderRadius: 6, fontSize: 14, fontFamily: "Consolas,monospace", fontWeight: 700, color: "#c0392b" }}>{result.password}</code>
              <button onClick={() => copyToClipboard(result.password)} style={{ ...btnCopy, background: "#e35d5b", color: "#fff" }}>Copier</button>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: "rgba(239,159,39,.08)", borderLeft: "3px solid #EF9F27", borderRadius: 6, fontSize: 12, color: "#5a6878" }}>
              ⚠ <b>Important</b> : conseille au user de changer son mot de passe à la première connexion via <code>/profil</code>. Ce mot de passe est généré aléatoirement et difficile à mémoriser.
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <Btn variant="primary" icon="ti-plus" onClick={reset}>Créer un autre utilisateur</Btn>
              <Btn variant="ghost" icon="ti-list" onClick={() => router.push("/utilisateurs")}>Voir la liste</Btn>
            </div>
          </Panel>
        ) : (
          <Panel style={{ marginTop: 16 }}>
            {err && (
              <div style={{ padding: 10, background: "rgba(227,93,91,.08)", borderLeft: "3px solid #e35d5b", borderRadius: 6, color: "#c0392b", fontSize: 12.5, marginBottom: 14 }}>
                ❌ {err}
              </div>
            )}

            {/* Type de compte */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#5a6878", letterSpacing: 1 }}>Type de compte</label>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button onClick={() => setForm({ ...form, type_compte: "etablissement" })} style={{
                  flex: 1, padding: "12px",
                  background: form.type_compte === "etablissement" ? "linear-gradient(135deg,#185FA5,#0d4a8c)" : "#fff",
                  color: form.type_compte === "etablissement" ? "#fff" : "#185FA5",
                  border: `2px solid #185FA5`, borderRadius: 8,
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>🏥 Établissement</button>
                <button onClick={() => setForm({ ...form, type_compte: "magasin" })} style={{
                  flex: 1, padding: "12px",
                  background: form.type_compte === "magasin" ? "linear-gradient(135deg,#5a8f8f,#3a6f6f)" : "#fff",
                  color: form.type_compte === "magasin" ? "#fff" : "#5a8f8f",
                  border: `2px solid #5a8f8f`, borderRadius: 8,
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>🏬 Magasin</button>
              </div>
            </div>

            {/* Identité */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}><b>Email *</b>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jean.dupont@example.com" style={inp} autoFocus />
              </label>

              <label style={{ fontSize: 12, color: "#5a6878" }}><b>Mot de passe *</b>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ ...inp, marginTop: 0, fontFamily: "Consolas,monospace", fontWeight: 700 }} />
                  <button onClick={regenPassword} title="Regénérer" style={{ padding: "8px 12px", background: "#EF9F27", color: "#fff", border: "none", borderRadius: 6, fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <i className="ti ti-refresh" />
                  </button>
                </div>
              </label>

              <label style={{ fontSize: 12, color: "#5a6878" }}><b>Fonction (optionnel)</b>
                <input value={form.fonction_detail} onChange={(e) => setForm({ ...form, fonction_detail: e.target.value })} placeholder="Aide-soignant, IDE, etc." style={inp} />
              </label>

              <label style={{ fontSize: 12, color: "#5a6878" }}>Prénom
                <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} style={inp} />
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Nom
                <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} style={inp} />
              </label>
              <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}>Téléphone
                <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="06 12 34 56 78" style={inp} />
              </label>
            </div>

            {/* Rattachement selon type */}
            <div style={{ marginTop: 14 }}>
              {form.type_compte === "etablissement" ? (
                <label style={{ fontSize: 12, color: "#5a6878" }}><b>Établissement *</b>
                  <select value={form.etablissement_id} onChange={(e) => setForm({ ...form, etablissement_id: e.target.value })} style={inp}>
                    <option value="">— Sélectionne un établissement —</option>
                    {etabs.map(e => <option key={e.id} value={e.id}>🏥 {e.nom}{e.ville ? ` · ${e.ville}` : ""}</option>)}
                  </select>
                </label>
              ) : (
                <label style={{ fontSize: 12, color: "#5a6878" }}><b>Magasin *</b>
                  <select value={form.magasin_fournisseur_id} onChange={(e) => setForm({ ...form, magasin_fournisseur_id: e.target.value })} style={inp}>
                    <option value="">— Sélectionne un magasin —</option>
                    {magasins.map(m => <option key={m.id} value={m.id}>🏬 {m.nom}{m.ville ? ` · ${m.ville}` : ""}</option>)}
                  </select>
                </label>
              )}
            </div>

            <div style={{ marginTop: 16, padding: 10, background: "rgba(24,95,165,.05)", borderLeft: "3px solid #185FA5", borderRadius: 6, fontSize: 12, color: "#5a6878" }}>
              ℹ <b>Comment ça marche</b> : (1) Le user est créé directement avec email + mot de passe (pas de mail envoyé). (2) Il pourra se connecter immédiatement sur <code>aveho-ec-app.vercel.app</code> avec ces credentials. (3) Tu lui transmets les identifiants manuellement (téléphone, papier, etc.).
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => router.back()}>Annuler</Btn>
              <Btn variant="primary" icon="ti-user-plus" onClick={createUser} disabled={creating}>{creating ? "Création..." : "Créer l'utilisateur"}</Btn>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

const inp = { width: "100%", padding: "8px 10px", marginTop: 4, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13 };
const btnCopy = { background: "#185FA5", color: "#fff", border: "none", borderRadius: 5, padding: "6px 12px", fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer" };
