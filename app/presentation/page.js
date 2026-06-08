"use client";
// =============================================================
//  /presentation/page.js (0.64.0)
//  Hub TV multi-écrans : navigation par flèches entre les sous-vues.
//
//  Param URL ?screen=di|planning|dashboard|stats (défaut: di)
//  Param URL ?auto=15 → rotation auto toutes les 15s
// =============================================================
import { Suspense } from "react";
import { useRouter } from "next/navigation";

export default function PresentationHubPage() {
  return (
    <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#bfe6e6", fontSize: 18 }}>Chargement…</div>}>
      <PresentationHub />
    </Suspense>
  );
}

function PresentationHub() {
  const router = useRouter();
  // Redirection vers le 1er écran par défaut
  if (typeof window !== "undefined") {
    router.replace("/presentation/interventions");
    return null;
  }
  return null;
}
