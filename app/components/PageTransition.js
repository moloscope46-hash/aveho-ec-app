"use client";
// =============================================================
//  PageTransition — Animation de transition entre routes (0.58.10)
//
//  Détecte le changement de pathname via usePathname() et joue
//  une animation fade + slight slide-up sur le contenu.
//
//  Léger (pas de framer-motion) : CSS pur + state React.
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
        willChange: "opacity, transform",
      }}
    >
      {displayed}
    </div>
  );
}
