"use client";
// =============================================================
//  app/components/AdminGuard.js (Alpha 0.57.34)
//
//  Composant qui restreint l'accès à une page aux utilisateurs
//  qui ont le rôle "admin" (au sens systeme="admin" ou nom="Administrateur").
//
//  Usage :
//    "use client";
//    import AdminGuard from "../components/AdminGuard";
//
//    export default function MonAdminPage() {
//      return (
//        <AdminGuard>
//          ... contenu de la page admin ...
//        </AdminGuard>
//      );
//    }
//
//  Pourquoi ? Avant 0.57.34, les 9 pages /admin/* n'avaient AUCUN
//  check de rôle côté client. Même si le RLS Postgres empêche l'accès
//  aux données sensibles, un non-admin pouvait :
//   - Voir l'UI cassée et croire à un bug
//   - Découvrir la structure interne de l'app (noms de tables/routes)
//   - Recevoir des erreurs 401/403 confuses au lieu d'un blocage clair
//
//  Comportements :
//   - auth.ready === false → affiche un loader
//   - auth.role n'est pas admin → message d'accès refusé + bouton retour
//   - auth.role admin → affiche les enfants normalement
// =============================================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/useAuth";

export default function AdminGuard({ children, fallbackUrl = "/accueil" }) {
  const auth = useAuth();
  const router = useRouter();

  // Test d'éligibilité admin (même pattern que parametres-rgpd)
  const isAdmin =
    auth.can?.("gerer_roles") ||
    auth.can?.("manage_collectivite") ||
    auth.role?.systeme === "admin" ||
    auth.role?.nom === "Administrateur";

  // 1) Attente du chargement auth
  if (!auth.ready) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        color: "#6c7a89",
        fontSize: 14,
      }}>
        <div className="spinner" style={{
          width: 24, height: 24, marginRight: 12,
          border: "3px solid #e3e9ee",
          borderTop: "3px solid #185FA5",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}/>
        Chargement…
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // 2) Pas connecté → on laisse useAuth gérer la redirection vers /login
  if (!auth.user) return null;

  // 3) Connecté mais pas admin → message clair + bouton retour
  if (!isAdmin) {
    return (
      <div style={{
        maxWidth: 540,
        margin: "60px auto",
        padding: 28,
        background: "#fff",
        border: "1px solid #e3e9ee",
        borderLeft: "4px solid #c0392b",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(20,33,49,.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <i className="ti ti-shield-lock" style={{ fontSize: 32, color: "#c0392b" }}/>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#142131" }}>
              Accès restreint
            </div>
            <div style={{ fontSize: 13, color: "#6c7a89", marginTop: 2 }}>
              Cette page est réservée aux administrateurs
            </div>
          </div>
        </div>
        <p style={{ color: "#2a3a48", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
          Votre compte ne dispose pas des droits d'administrateur nécessaires pour accéder
          à cette section. Si vous pensez que c'est une erreur, contactez le responsable
          de votre collectivité.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => router.push(fallbackUrl)}
            style={{
              padding: "10px 20px",
              background: "#185FA5",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <i className="ti ti-arrow-left" style={{ marginRight: 6 }}/>
            Retour à l'accueil
          </button>
          <button
            onClick={() => router.push("/profil")}
            style={{
              padding: "10px 20px",
              background: "#fff",
              color: "#185FA5",
              border: "1px solid #185FA5",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <i className="ti ti-user" style={{ marginRight: 6 }}/>
            Mon profil
          </button>
        </div>
      </div>
    );
  }

  // 4) Connecté + admin → on affiche les enfants
  return children;
}
