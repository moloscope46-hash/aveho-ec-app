"use client";
// =============================================================
//  PageTransition — Animation de transition entre routes (0.58.10)
//
//  Détecte le changement de pathname via usePathname() et joue
//  une animation fade + slight slide-up sur le contenu.
//
//  Léger (pas de framer-motion) : CSS pur + state React.
//
//  0.58.19 : BUG FIX CRITIQUE — l'ancien wrapper avait `willChange: 'opacity, transform'`
//  ce qui créait un containing block pour les enfants `position: fixed`. Conséquence :
//  TOUTES les modales, drawers et menus qui sont `position: fixed` étaient en réalité
//  positionnés relativement à PageTransition (pas au viewport). Quand l'user scrollait
//  en bas de page, le menu burger / les popups / les drawers n'étaient plus visibles
//  car positionnés relativement au top du conteneur, hors viewport.
//
//  Fix : willChange n'est plus appliqué (l'animation 280ms est largement optimisée
//  par le navigateur sans cette hint). Le wrapper devient un simple <div> sans
//  propriétés CSS qui créeraient un containing block pour fixed.
// =============================================================

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const [displayed, setDisplayed] = useState(children);
  const [animKey, setAnimKey] = useState(pathname);

  // À chaque changement de route, on rejoue l'animation
  useEffect(() => {
    setAnimKey(pathname);
    setDisplayed(children);
  }, [pathname, children]);

  return (
    <div
      key={animKey}
      style={{
        animation: "av-page-enter 280ms cubic-bezier(.2, .8, .2, 1)",
        // 0.58.19 : pas de willChange (créait containing block sur le wrapper full-app)
        // L'animation reste smooth car elle ne dure que 280ms.
      }}
    >
      {displayed}
    </div>
  );
}
