"use client";
// =============================================================
//  /onboarding — Wizard d'onboarding nouveau collaborateur (0.58.14)
//
//  4 étapes :
//   1. Identité     — nom, prénom, email
//   2. Rôle         — Select premium (admin / manager / utilisateur / lecture-seule)
//   3. Permissions  — Combobox tags (droits granulaires)
//   4. Invitation   — récap + bouton "Envoyer l'invitation"
//
//  Utilise les composants premium : Stepper / Stepper.Body / Stepper.Footer,
//  Select, Combobox, toast, Dialog, PageHero.
// =============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { Panel } from "../ui";
import {
  PageHero,
  Stepper,
  Select,
  Combobox,
  Avatar,
  toast,
  Dialog,
} from "../components/ui-premium";

const STEPS = [
  { id: "identite",    label: "Identité",    sub: "Nom & email" },
  { id: "role",        label: "Rôle",        sub: "Profil de base" },
  { id: "permissions", label: "Permissions", sub: "Droits granulaires" },
  { id: "invitation",  label: "Invitation",  sub: "Récap & envoi" },
];

const ROLES = [
  { value: "admin",       label: "Administrateur",   icon: "ti-shield-check",  desc: "Accès complet à tous les paramètres", iconColor: "#C9867F" },
  { value: "manager",     label: "Manager",          icon: "ti-users-group",   desc: "Peut créer/modifier les utilisateurs et patients", iconColor: "#185FA5" },
  { value: "utilisateur", label: "Utilisateur",      icon: "ti-user",          desc: "Accès standard aux modules métier" },
  { value: "lecture",     label: "Lecture seule",    icon: "ti-eye",           desc: "Consultation uniquement, aucune modification", iconColor: "#8a98a8" },
];

const PERMISSIONS = [
  { value: "patients_read",  label: "Patients — lecture",      icon: "ti-eye",         iconColor: "#185FA5" },
  { value: "patients_write", label: "Patients — modification", icon: "ti-edit",        iconColor: "#185FA5" },
  { value: "patients_delete",label: "Patients — suppression",  icon: "ti-trash",       iconColor: "#C9867F" },
  { value: "materiel_read",  label: "Matériel — lecture",      icon: "ti-eye",         iconColor: "#5aa05a" },
  { value: "materiel_write", label: "Matériel — modification", icon: "ti-edit",        iconColor: "#5aa05a" },
  { value: "interventions",  label: "Interventions — gestion", icon: "ti-tools",       iconColor: "#e35d5b" },
  { value: "transferts",     label: "Transferts — gestion",    icon: "ti-transfer",    iconColor: "#2a5a5a" },
  { value: "stats",          label: "Statistiques — accès",    icon: "ti-chart-bar",   iconColor: "#7a6fb0" },
  { value: "exports",        label: "Exports — autorisé",      icon: "ti-download",    iconColor: "#EF9F27" },
];

export default function OnboardingPage() {
  const supabase = createClient();
  const auth = useAuth();
  const router = useRouter();
  const cart = useCart();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // États du wizard
  const [identity, setIdentity] = useState({ nom: "", prenom: "", email: "" });
  const [role, setRole] = useState("utilisateur");
  const [permissions, setPermissions] = useState([
    "patients_read",
    "materiel_read",
    "interventions",
  ]);

  function canGoNext() {
    if (step === 0) {
      // Identité : nom + email valide requis
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email);
      return identity.nom.trim().length > 1 && emailOk;
    }
    if (step === 1) return !!role;
    if (step === 2) return permissions.length > 0;
    return true;
  }

  async function handleSubmit() {
    setBusy(true);
    try {
      // Appel à la fonction edge invite-user
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: identity.email,
          nom: identity.nom,
          prenom: identity.prenom,
          role,
          permissions,
          structure_id: auth.structureId,
        },
      });
      if (error) throw error;
      toast.success("Invitation envoyée à " + identity.email);
      // Redirection vers la liste des utilisateurs après 1s
      setTimeout(() => router.push("/utilisateurs"), 1000);
    } catch (e) {
      toast.error("Erreur envoi invitation : " + (e?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    // Si l'utilisateur a déjà saisi quelque chose, demander confirmation
    if (identity.nom || identity.email) {
      const ok = await Dialog.confirm({
        title: "Abandonner l'onboarding ?",
        message: "Les informations saisies seront perdues.",
        danger: true,
      });
      if (!ok) return;
    }
    router.push("/utilisateurs");
  }

  const roleSelected = ROLES.find((r) => r.value === role);

  return (
    <div className="bg-dark">
      <TopBar cart={cart} />
      <div className="wrap">
        <PageHero
          icon="ti-user-plus"
          eyebrow="ONBOARDING"
          title="Nouveau collaborateur"
          subtitle="Création guidée d'un compte avec rôle, permissions et invitation par email"
          variant="violet"
          breadcrumbs={[
            { label: "Accueil", href: "/accueil" },
            { label: "Utilisateurs", href: "/utilisateurs" },
            { label: "Nouveau" },
          ]}
        />

        <Panel style={{ marginTop: 16 }}>
          {/* Barre de progression */}
          <Stepper
            active={step}
            steps={STEPS}
            onStepClick={setStep}
          />

          {/* Contenu de l'étape avec animation */}
          <Stepper.Body active={step}>
            {/* ÉTAPE 1 — Identité */}
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 520, margin: "0 auto", padding: "12px 0" }}>
                <h2 style={{ margin: 0, fontSize: 17, color: "#142131" }}>
                  Informations de base
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#6c7a89" }}>
                  Renseigne le nom et l&apos;email du nouveau collaborateur. L&apos;invitation sera envoyée à cette adresse.
                </p>

                <div className="fld">
                  <label>Nom</label>
                  <input
                    type="text"
                    value={identity.nom}
                    onChange={(e) => setIdentity({ ...identity, nom: e.target.value })}
                    placeholder="DUPONT"
                    autoFocus
                  />
                </div>

                <div className="fld">
                  <label>Prénom (optionnel)</label>
                  <input
                    type="text"
                    value={identity.prenom}
                    onChange={(e) => setIdentity({ ...identity, prenom: e.target.value })}
                    placeholder="Jean"
                  />
                </div>

                <div className="fld">
                  <label>Email professionnel</label>
                  <input
                    type="email"
                    value={identity.email}
                    onChange={(e) => setIdentity({ ...identity, email: e.target.value })}
                    placeholder="jean.dupont@etablissement.fr"
                  />
                </div>

                {/* Preview avatar */}
                {(identity.nom || identity.prenom) && (
                  <div style={{
                    marginTop: 6,
                    padding: 14,
                    background: "linear-gradient(135deg, #f4f7fa 0%, #fff 100%)",
                    border: "1px dashed #e3e9ee",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}>
                    <Avatar name={`${identity.prenom} ${identity.nom}`.trim() || identity.email} size={42} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#142131" }}>
                        {`${identity.prenom} ${identity.nom}`.trim() || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "#8a98a8" }}>
                        {identity.email || "Aucun email"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ÉTAPE 2 — Rôle */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 520, margin: "0 auto", padding: "12px 0" }}>
                <h2 style={{ margin: 0, fontSize: 17, color: "#142131" }}>
                  Profil d&apos;accès
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#6c7a89" }}>
                  Sélectionne le rôle qui définira le niveau d&apos;accès global du collaborateur.
                </p>

                <Select
                  value={role}
                  onChange={setRole}
                  fullWidth
                  size="lg"
                  options={ROLES}
                />

                {roleSelected && (
                  <div style={{
                    marginTop: 6,
                    padding: 14,
                    background: "linear-gradient(135deg, rgba(124,200,200,.10) 0%, transparent 100%)",
                    border: "1px solid rgba(124,200,200,.30)",
                    borderRadius: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <i className={`ti ${roleSelected.icon}`} style={{ fontSize: 22, color: roleSelected.iconColor || "#185FA5" }} />
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#142131" }}>
                        {roleSelected.label}
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#4a5868", lineHeight: 1.5 }}>
                      {roleSelected.desc}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ÉTAPE 3 — Permissions */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600, margin: "0 auto", padding: "12px 0" }}>
                <h2 style={{ margin: 0, fontSize: 17, color: "#142131" }}>
                  Permissions granulaires
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#6c7a89" }}>
                  Affine les droits d&apos;accès. Tu peux ajouter ou retirer des permissions par-dessus le rôle de base.
                </p>

                <Combobox
                  values={permissions}
                  onChange={setPermissions}
                  options={PERMISSIONS}
                  placeholder="Ajouter des permissions…"
                  searchable
                />

                <div style={{
                  fontSize: 12,
                  color: "#8a98a8",
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <i className="ti ti-info-circle" />
                  {permissions.length} permission{permissions.length > 1 ? "s" : ""} active{permissions.length > 1 ? "s" : ""}
                </div>
              </div>
            )}

            {/* ÉTAPE 4 — Invitation (récap) */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560, margin: "0 auto", padding: "12px 0" }}>
                <h2 style={{ margin: 0, fontSize: 17, color: "#142131" }}>
                  Récapitulatif
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#6c7a89" }}>
                  Vérifie les informations puis envoie l&apos;invitation. Un email sera transmis au collaborateur avec un lien pour activer son compte.
                </p>

                {/* Récap card */}
                <div style={{
                  padding: 18,
                  background: "#fff",
                  border: "1px solid #e3e9ee",
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}>
                  {/* En-tête avec avatar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, borderBottom: "1px solid #f4f7fa" }}>
                    <Avatar name={`${identity.prenom} ${identity.nom}`.trim() || identity.email} size={52} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#142131" }}>
                        {`${identity.prenom} ${identity.nom}`.trim() || "—"}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#6c7a89", marginTop: 2 }}>
                        {identity.email}
                      </div>
                    </div>
                  </div>

                  {/* Rôle */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <i className={`ti ${roleSelected?.icon || "ti-user"}`} style={{ fontSize: 18, color: roleSelected?.iconColor || "#185FA5", width: 24 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px" }}>Rôle</div>
                      <div style={{ fontSize: 13.5, color: "#142131", fontWeight: 600, marginTop: 2 }}>{roleSelected?.label || role}</div>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <i className="ti ti-shield-check" style={{ fontSize: 18, color: "#5aa05a", width: 24, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px" }}>
                        Permissions ({permissions.length})
                      </div>
                      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {permissions.map((p) => {
                          const opt = PERMISSIONS.find((x) => x.value === p);
                          return (
                            <span key={p} style={{
                              fontSize: 11.5,
                              padding: "3px 9px",
                              background: "rgba(124,200,200,.15)",
                              border: "1px solid rgba(124,200,200,.30)",
                              borderRadius: 99,
                              color: "#142131",
                              fontWeight: 500,
                            }}>
                              {opt?.label || p}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: "10px 14px",
                  background: "linear-gradient(135deg, #e7f0fa, #fff)",
                  border: "1px solid #bdd9ef",
                  borderRadius: 10,
                  fontSize: 12.5,
                  color: "#185FA5",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <i className="ti ti-mail" />
                  Un email d&apos;activation sera envoyé à <b style={{ marginLeft: 4 }}>{identity.email}</b>
                </div>
              </div>
            )}
          </Stepper.Body>

          {/* Actions précédent / suivant / valider */}
          <Stepper.Footer
            active={step}
            total={STEPS.length}
            onPrev={() => setStep(Math.max(0, step - 1))}
            onNext={() => setStep(Math.min(STEPS.length - 1, step + 1))}
            onSubmit={handleSubmit}
            nextDisabled={!canGoNext()}
            busy={busy}
            submitLabel="Envoyer l'invitation"
          />

          {/* Bouton annuler discret */}
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button
              onClick={handleCancel}
              style={{
                background: "transparent",
                border: "none",
                color: "#8a98a8",
                fontFamily: "inherit",
                fontSize: 12,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Annuler et revenir à la liste
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
