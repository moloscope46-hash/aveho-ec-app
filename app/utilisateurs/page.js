"use client";
// =============================================================
//  /utilisateurs — page wrapper minimaliste (0.62.97)
//
//  Sans Error Boundary class (suspecte de causer TDZ avec
//  minification Next.js). next/dynamic avec ssr:false = pas
//  de pre-render serveur, pas de TDZ.
// =============================================================
export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";

const UsersInner = dynamicImport(() => import("./_UsersInner"), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #fafbfc, #fff)",
      fontFamily: "Quicksand, sans-serif",
      color: "#5a6878",
    }}>
      <div style={{ textAlign: "center" }}>
        <i className="ti ti-loader-2" style={{
          fontSize: 48,
          color: "#7CC8C8",
          animation: "spin 1s linear infinite",
        }} />
        <div style={{ marginTop: 10, fontSize: 13 }}>Chargement des utilisateurs…</div>
      </div>
    </div>
  ),
});

export default function UtilisateursPage() {
  return <UsersInner />;
}
