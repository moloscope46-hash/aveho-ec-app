"use client";
// Page Login — Page de connexion (email/mot de passe + magic link)
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

export default function Login() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [mode, setMode] = useState("signin"); // signin | signup
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function submit() {
    setBusy(true); setErr(""); setOk("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pwd });
        if (error) throw error;
        setOk("Compte créé. Vérifie tes mails si la confirmation est activée, puis connecte-toi.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) throw error;
        // Alpha 0.5 : trace de connexion dans audit_log
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const { data: m } = await supabase.from("membres_structure").select("structure_id").limit(1).maybeSingle();
          if (m?.structure_id) {
            await supabase.from("audit_log").insert({
              structure_id: m.structure_id,
              user_id: session?.user?.id,
              user_email: email,
              action: "connexion",
              entite: "session",
              details: { ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : null },
            });
          }
        } catch (_) { /* non-bloquant */ }
        router.push("/vue-globale");
      }
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function magicLink() {
    setBusy(true); setErr(""); setOk("");
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/accueil" : undefined } });
      if (error) throw error;
      setOk("Lien de connexion envoyé par email. Vérifie ta boîte de réception.");
    } catch (e) { setErr(e.message || "Erreur"); } finally { setBusy(false); }
  }

  return (
    <div className="bg-dark login-wrap">
      <div className="login-card">
        <div className="login-left">
          <div className="presente">AVEHO PRÉSENTE</div>
          <div className="logo">a<span className="v">v</span>eho</div>
          <div style={{ fontSize: 9, letterSpacing: 1, opacity: .7 }}>SOFTS &amp; SERVICES</div>
          <h2>L'espace pro<br />du <span className="accent">matériel médical</span></h2>
          <p>Une seule connexion pour les collectivités clientes : gérez vos établissements, votre matériel, votre stock et passez commande à vos magasins Aveho.</p>
          <div className="feat"><span className="fi"><i className="ti ti-building-community" /></span> Multi-établissements : pilotez toute la collectivité</div>
          <div className="feat"><span className="fi"><i className="ti ti-bed" /></span> Plan de l'établissement, lits, patients & matériel</div>
          <div className="feat"><span className="fi"><i className="ti ti-shield-check" /></span> Hébergement HDS · Certifié RGPD</div>
          <div className="version-badge">Version Alpha 0.1</div>
        </div>
        <div className="login-right">
          <h1>Bienvenue 👋</h1>
          <div className="muted">{mode === "signin" ? "Connectez-vous à votre Espace Aveho" : "Créez votre compte"}</div>
          {err && <div className="err">{err}</div>}
          {ok && <div className="ok">{ok}</div>}
          <label>Email professionnel</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cedric@hop01.fr" />
          <label>Mot de passe</label>
          <input className="input" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && submit()} />
          <button className="btn-primary" onClick={submit} disabled={busy || !email || !pwd}>
            {busy ? "..." : mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
            <span style={{ flex: 1, height: 1, background: "#e1e6eb" }} /><span style={{ fontSize: 12, color: "#8a98a8" }}>ou</span><span style={{ flex: 1, height: 1, background: "#e1e6eb" }} />
          </div>
          <button className="btn-magic" onClick={magicLink} disabled={busy || !email}>
            <i className="ti ti-mail-fast" /> Recevoir un lien de connexion
          </button>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#8a98a8" }}>
            {mode === "signin"
              ? <>Pas encore de compte ? <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={() => setMode("signup")}>Créer un compte</a></>
              : <>Déjà un compte ? <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={() => setMode("signin")}>Se connecter</a></>}
          </div>
          {/* Alpha 0.53.0 (BL) : lien mentions légales */}
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "#aaa" }}>
            <a href="/mentions-legales" style={{ color: "#8a98a8", textDecoration: "underline" }}>
              Mentions légales & RGPD
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
