"use client";
// =============================================================
//  /inscription/[token] — Alpha 0.55.12
//  Page publique d'activation d'invitation.
//
//  Flow :
//   1. Lit le token via params
//   2. RPC get_invitation_preview(token) → infos pré-remplies
//   3. User saisit mot de passe (avec policy) + complète infos
//   4. supabase.auth.signUp(email, password) — crée auth.users
//   5. RPC accept_invitation(token, user_id, nom, prenom, ...) →
//      crée membres_structure + marque invitation activée
//   6. Edge function welcome-user → mail de bienvenue
//   7. Redirection /accueil (connecté)
// =============================================================
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import PasswordInput from "../../PasswordInput";
import { checkPassword } from "../../../lib/passwordPolicy";

export default function InscriptionPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [err, setErr] = useState("");
  const [step, setStep] = useState("loading"); // loading | form | submitting | done | error
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    mobile: "",
    fonction_detail: "",
    password: "",
    password2: "",
  });

  // 1) Charger l'invitation au mount
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_invitation_preview", { p_token: token });
        if (error) throw error;
        if (!data?.ok) {
          setErr(data?.error || "Invitation invalide");
          setStep("error");
          setLoading(false);
          return;
        }
        setInvitation(data);
        // Pré-remplir le formulaire
        const [prenomGuess, ...rest] = (data.nom_affiche || "").split(" ");
        setForm((f) => ({
          ...f,
          prenom: data.prenom || prenomGuess || "",
          nom: rest.join(" ") || "",
          telephone: data.telephone || "",
          mobile: data.mobile || "",
          fonction_detail: data.fonction_detail || "",
        }));
        setStep("form");
        setLoading(false);
      } catch (e) {
        setErr(e.message || "Erreur de chargement");
        setStep("error");
        setLoading(false);
      }
    })();
  }, [token]);

  // 2) Soumission du formulaire
  async function handleSubmit() {
    setErr("");
    // Validation
    if (!form.nom.trim() || !form.prenom.trim()) {
      setErr("Nom et prénom sont obligatoires");
      return;
    }
    if (form.password !== form.password2) {
      setErr("Les mots de passe ne correspondent pas");
      return;
    }
    const check = checkPassword(form.password);
    if (!check.ok) {
      setErr("Mot de passe non conforme : " + check.problems.join(", "));
      return;
    }

    setStep("submitting");

    try {
      // 3) signUp côté auth (crée auth.users)
      const { data: signupData, error: e1 } = await supabase.auth.signUp({
        email: invitation.email,
        password: form.password,
        options: {
          data: { nom_affiche: `${form.prenom} ${form.nom}`.trim() },
        },
      });
      if (e1) {
        // Si déjà existant, on tente une connexion direct
        if (e1.message?.toLowerCase().includes("already")) {
          const { error: eLogin } = await supabase.auth.signInWithPassword({
            email: invitation.email,
            password: form.password,
          });
          if (eLogin) throw new Error("Cet email a déjà un compte, le mot de passe saisi est incorrect.");
        } else {
          throw e1;
        }
      }

      // Récupérer le user_id après signup
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Impossible de récupérer l'utilisateur après inscription");

      // 4) RPC accept_invitation
      const { data: acc, error: e2 } = await supabase.rpc("accept_invitation", {
        p_token: token,
        p_user_id: user.id,
        p_nom: form.nom,
        p_prenom: form.prenom,
        p_telephone: form.telephone || null,
        p_mobile: form.mobile || null,
        p_fonction_detail: form.fonction_detail || null,
      });
      if (e2) throw e2;
      if (!acc?.ok) throw new Error(acc?.error || "Erreur d'activation");

      // 5) Mail de bienvenue (Edge function, non bloquant)
      try {
        await supabase.functions.invoke("welcome-user", {
          body: {
            email: invitation.email,
            prenom: form.prenom,
            nom: form.nom,
            role: invitation.role_nom,
            structure: invitation.structure_nom,
          },
        });
      } catch (e) {
        console.warn("[Inscription] Mail bienvenue non envoyé :", e);
      }

      setStep("done");
      // Redirection après 3s
      setTimeout(() => router.push("/accueil"), 3000);
    } catch (e) {
      setErr(e.message || "Erreur");
      setStep("form");
    }
  }

  // ----- Rendus -----

  if (loading || step === "loading") {
    return (
      <div style={pageBg}>
        <div style={card}>
          <i className="ti ti-loader-2" style={{ fontSize: 36, color: "#185FA5", animation: "spin 1.2s linear infinite" }} />
          <p style={{ marginTop: 14, color: "#6c7a89" }}>Chargement de votre invitation…</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div style={pageBg}>
        <div style={card}>
          <i className="ti ti-circle-x" style={{ fontSize: 48, color: "#c0392b" }} />
          <h1 style={{ fontSize: 20, color: "#142131", margin: "12px 0 6px" }}>Invitation invalide</h1>
          <p style={{ color: "#c0392b", margin: 0, fontSize: 14 }}>{err}</p>
          <p style={{ color: "#6c7a89", marginTop: 14, fontSize: 13 }}>
            Contactez l'administrateur de votre établissement pour recevoir une nouvelle invitation.
          </p>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={pageBg}>
        <div style={card}>
          <i className="ti ti-circle-check" style={{ fontSize: 56, color: "#2e6f33" }} />
          <h1 style={{ fontSize: 22, color: "#142131", margin: "14px 0 6px" }}>Bienvenue {form.prenom} !</h1>
          <p style={{ color: "#6c7a89", margin: "0 0 14px", fontSize: 14 }}>
            Votre compte est créé. Un email de confirmation vous a été envoyé.
          </p>
          <div style={{ background: "#eef9ef", color: "#2e6f33", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
            Redirection vers l'application…
          </div>
        </div>
      </div>
    );
  }

  // step === "form" ou "submitting"
  const busy = step === "submitting";
  return (
    <div style={pageBg}>
      <div style={{ ...card, maxWidth: 540 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ display: "inline-block", background: "linear-gradient(135deg, #142131, #7CC8C8)", color: "#fff", padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>
            ESPACE COLLECTIVITÉ
          </div>
          <h1 style={{ fontSize: 22, color: "#142131", margin: "12px 0 4px", fontWeight: 700 }}>
            Bienvenue sur Aveho
          </h1>
          <p style={{ color: "#6c7a89", margin: 0, fontSize: 13.5 }}>
            Finalisez votre inscription pour <b>{invitation.structure_nom}</b>
          </p>
        </div>

        {/* Infos invitation */}
        <div style={{ background: "#f4f7fa", border: "1px solid #e3e9ee", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
            <span style={{ color: "#6c7a89" }}>Email</span>
            <b style={{ color: "#142131" }}>{invitation.email}</b>
          </div>
          {invitation.role_nom && (
            <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
              <span style={{ color: "#6c7a89" }}>Rôle</span>
              <b style={{ color: "#185FA5" }}>{invitation.role_nom}</b>
            </div>
          )}
        </div>

        {err && (
          <div style={{ background: "#fce5e0", color: "#7a1f15", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14, border: "1px solid #f0c4be" }}>
            <i className="ti ti-alert-circle" /> {err}
          </div>
        )}

        {/* Formulaire */}
        <div style={{ display: "grid", gap: 12 }}>
          <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Prénom *</label>
              <input className="input" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} disabled={busy} placeholder="Marie" />
            </div>
            <div>
              <label style={labelStyle}>Nom *</label>
              <input className="input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} disabled={busy} placeholder="Dupont" />
            </div>
          </div>

          <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Téléphone fixe</label>
              <input className="input" type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} disabled={busy} placeholder="05 12 34 56 78" />
            </div>
            <div>
              <label style={labelStyle}>Mobile</label>
              <input className="input" type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} disabled={busy} placeholder="06 12 34 56 78" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Fonction détaillée</label>
            <input className="input" value={form.fonction_detail} onChange={(e) => setForm({ ...form, fonction_detail: e.target.value })} disabled={busy} placeholder="Infirmière coordinatrice pôle gériatrie" />
          </div>

          <div style={{ borderTop: "1px solid #e3e9ee", paddingTop: 12 }}>
            <label style={labelStyle}>Choisissez votre mot de passe *</label>
            <PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} disabled={busy} showGenerate />
          </div>

          <div>
            <label style={labelStyle}>Confirmation *</label>
            <PasswordInput value={form.password2} onChange={(v) => setForm({ ...form, password2: v })} disabled={busy} showStrength={false} />
            {form.password2 && form.password !== form.password2 && (
              <p style={{ color: "#c0392b", fontSize: 11.5, margin: "4px 0 0" }}>
                <i className="ti ti-alert-circle" /> Les mots de passe ne correspondent pas
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={busy}
            style={{
              marginTop: 8,
              background: busy ? "#8a98a8" : "linear-gradient(135deg, #142131, #185FA5)",
              color: "#fff",
              border: "none",
              padding: "14px 18px",
              borderRadius: 10,
              fontSize: 14.5,
              fontWeight: 700,
              cursor: busy ? "wait" : "pointer",
              fontFamily: "inherit",
              minHeight: 48,
            }}
          >
            {busy ? <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Création du compte…</> : <><i className="ti ti-user-check" /> Finaliser mon inscription</>}
          </button>
        </div>

        <p style={{ textAlign: "center", color: "#8a98a8", fontSize: 11, marginTop: 16 }}>
          En finalisant votre inscription, vous acceptez les CGU d'Aveho EC.
        </p>
      </div>
    </div>
  );
}

const pageBg = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #142131 0%, #185FA5 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 14px",
  fontFamily: "'Segoe UI', sans-serif",
};

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: "28px 26px",
  maxWidth: 420,
  width: "100%",
  boxShadow: "0 20px 60px rgba(0,0,0,.3)",
  textAlign: "center",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  color: "#6c7a89",
  fontWeight: 600,
  marginBottom: 4,
};
