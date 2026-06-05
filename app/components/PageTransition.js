"use client";
// =============================================================
//  PageTransition — Animation de transition entre routes (0.58.10)
//
//  Détecte le changement de pathname via usePathname() et joue
//  une animation fade + slide entre routes.
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
//  0.58.22 : Slide-in/out direction-aware
//   - Détecte forward/back via history
//   - Slide depuis droite si forward, depuis gauche si back
//   - Toujours sans willChange (containing block bug)
//
//  Fix : willChange n'est plus appliqué (l'animation 280ms est largement optimisée
//  par le navigateur sans cette hint). Le wrapper devient un simple <div> sans
//  propriétés CSS qui créeraient un containing block pour fixed.
// =============================================================

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const [displayed, setDisplayed] = useState(children);
  const [animKey, setAnimKey] = useState(pathname);
  const [direction, setDirection] = useState("forward"); // forward | back
  const prevPathRef = useRef(pathname);
  const historyStackRef = useRef([pathname]);

  // À chaque changement de route, détecter direction + rejouer animation
  useEffect(() => {
    if (pathname === prevPathRef.current) {
      // même path, juste rerender children
      setDisplayed(children);
      return;
    }

    // 0.58.22 : détection direction via le stack interne
    const stack = historyStackRef.current;
    const previousIndex = stack.lastIndexOf(pathname);
    let dir = "forward";
    if (previousIndex >= 0 && previousIndex < stack.length - 1) {
      // On revient sur un path déjà visité → back
      dir = "back";
      // Tronquer le stack à ce point
      historyStackRef.current = stack.slice(0, previousIndex + 1);
    } else {
      // Nouvelle route → forward
      historyStackRef.current = [...stack, pathname];
    }
    setDirection(dir);
    setAnimKey(pathname);
    setDisplayed(children);
    prevPathRef.current = pathname;
  }, [pathname, children]);

  // 0.58.22 : 2 animations différentes selon direction
  const animName = direction === "back" ? "av-page-slide-in-left" : "av-page-slide-in-right";

  return (
    <div
      key={animKey}
      style={{
        animation: `${animName} 320ms cubic-bezier(.2, .8, .2, 1)`,
        // 0.58.19 : pas de willChange (créait containing block sur le wrapper full-app)
      }}
    >
      {displayed}
    </div>
  );
}
