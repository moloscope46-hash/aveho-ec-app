"use client";
// =============================================================
//  components/FirstLoginTour.js (0.62.129)
//
//  Auto-démarre un OnboardingTour la PREMIÈRE fois qu'un user
//  se connecte (détection via localStorage + age du compte).
//
//  Étapes par défaut : présentation des éléments clés de l'UI.
//  À monter dans layout.js pour s'appliquer partout.
// =============================================================

import { useEffect, useState } from "react";
import { useAuth } from "../../lib/useAuth";
import OnboardingTour from "./OnboardingTour";

const FIRST_LOGIN_KEY = "av-first-login-tour";

const STEPS = [
  {
    target: ".topbar",
    title: "🎉 Bienvenue dans votre Espace !",
    content: "Cette barre de navigation est votre point de départ. Vous y trouverez l'accès à tous les modules de l'application.",
    position: "bottom",
  },
  {
    target: ".av-rolebadge-icon, [class*='RoleBadge'], button[title^='Notifications']",
    title: "👑 Votre rôle",
    content: "Cliquez sur votre badge de rôle pour gérer les utilisateurs et permissions.",
    position: "bottom",
  },
  {
    target: ".notif-bell-enhanced, button[title='Notifications']",
    title: "🔔 Centre de notifications",
    content: "Toutes les notifications de votre structure sont centralisées ici. 4 onglets : Non lu, Tout, Mes équipes, Archivé.",
    position: "bottom",
  },
  {
    target: ".wrap, main",
    title: "📊 Dashboard personnalisable",
    content: "L'accueil affiche vos KPIs principaux. Vous pouvez personnaliser les widgets selon vos besoins en cliquant sur 'Personnaliser'.",
    position: "top",
  },
  {
    target: "body",
    title: "💡 Raccourci utile",
    content: "Tapez Ctrl+K pour la recherche globale. Échappez avec Shift+Esc pour libérer vos verrous d'édition.",
    position: "center",
  },
  {
    target: "body",
    title: "🚀 Vous êtes prêt(e) !",
    content: "Explorez l'application. Personnalisez votre thème dans Paramètres → Apparence. Bonne découverte !",
    position: "center",
  },
];

export default function FirstLoginTour() {
  const auth = useAuth();
  const [shouldRun, setShouldRun] = useState(false);

  useEffect(() => {
    if (!auth?.user?.id) return;

    try {
      // Vérifie si l'user a déjà vu le tour
      const seen = localStorage.getItem(FIRST_LOGIN_KEY);
      if (seen === "done") return;

      // Vérifie l'age du compte (si > 24h, on suppose qu'il a déjà navigué)
      const createdAt = auth.user.created_at ? new Date(auth.user.created_at) : null;
      const ageHours = createdAt ? (Date.now() - createdAt.getTime()) / 3600000 : 0;

      // Auto-start uniquement si compte < 24h ET pas encore vu
      if (ageHours < 24) {
        // Délai de 1.5s pour laisser l'UI se monter
        const t = setTimeout(() => setShouldRun(true), 1500);
        return () => clearTimeout(t);
      } else {
        // Compte ancien : marquer comme vu, ne pas relancer
        localStorage.setItem(FIRST_LOGIN_KEY, "done");
      }
    } catch {}
  }, [auth?.user?.id, auth?.user?.created_at]);

  if (!shouldRun) return null;

  return (
    <OnboardingTour
      steps={STEPS}
      storageKey={FIRST_LOGIN_KEY}
      autoStart={true}
    />
  );
}
