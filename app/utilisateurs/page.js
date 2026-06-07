"use client";
// =============================================================
//  /utilisateurs — page wrapper (0.62.94)
//
//  Wrapper avec Error Boundary qui catche les erreurs TDZ
//  et affiche un message clair. Le composant principal est
//  chargé dynamiquement via React.lazy pour éviter problèmes
//  Vercel prerender + minification.
// =============================================================
export const dynamic = "force-dynamic";

import { Suspense, lazy, Component } from "react";

// Lazy load du composant principal (pas de pre-render statique)
const UsersInner = lazy(() => import("./_UsersInner"));

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[Utilisateurs ErrorBoundary]", error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          padding: 40,
          fontFamily: "Quicksand, sans-serif",
          background: "linear-gradient(135deg, #fafbfc, #fff)",
        }}>
          <div style={{
            maxWidth: 720, margin: "0 auto",
            background: "#fff", borderRadius: 16, padding: 32,
            border: "2px solid #e35d5b",
            boxShadow: "0 12px 32px rgba(227,93,91,.15)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "linear-gradient(135deg, #e35d5b, #c0392b)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28,
              }}>
                <i className="ti ti-alert-triangle" />
              </div>
              <div>
                <h1 style={{ margin: 0, color: "#c0392b", fontSize: 22 }}>Erreur de chargement</h1>
                <div style={{ fontSize: 13, color: "#5a6878" }}>Page Utilisateurs</div>
              </div>
            </div>

            <div style={{
              padding: 14, background: "#fff3f3", borderRadius: 10,
              fontFamily: "Consolas, monospace", fontSize: 12, color: "#c0392b",
              maxHeight: 200, overflowY: "auto", marginBottom: 18,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {this.state.error?.name}: {this.state.error?.message}
              {this.state.error?.stack && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#8a98a8" }}>
                  {this.state.error.stack.split("\n").slice(0, 8).join("\n")}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => location.reload()} style={{
                padding: "10px 18px", borderRadius: 10,
                background: "linear-gradient(135deg, #185FA5, #7CC8C8)",
                color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
                fontFamily: "inherit", cursor: "pointer",
              }}>
                <i className="ti ti-refresh" /> Recharger
              </button>
              <button onClick={() => history.back()} style={{
                padding: "10px 18px", borderRadius: 10,
                background: "#fff", border: "1px solid #e3e9ee",
                color: "#5a6878", fontSize: 13, fontWeight: 600,
                fontFamily: "inherit", cursor: "pointer",
              }}>
                <i className="ti ti-arrow-left" /> Retour
              </button>
            </div>

            <div style={{ marginTop: 18, padding: 12, background: "#fafbfc", borderRadius: 8, fontSize: 12, color: "#5a6878" }}>
              <strong>💡 Solutions :</strong>
              <ul style={{ margin: "6px 0", paddingLeft: 18 }}>
                <li>Vide le cache navigateur (Ctrl+Shift+R sur PC)</li>
                <li>Désinstalle et réinstalle la PWA sur mobile</li>
                <li>Envoie cette erreur à Claude pour fix précis</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function UtilisateursPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #fafbfc, #fff)",
          fontFamily: "Quicksand, sans-serif", color: "#5a6878",
        }}>
          <div style={{ textAlign: "center" }}>
            <i className="ti ti-loader-2" style={{ fontSize: 48, color: "#7CC8C8", animation: "spin 1s linear infinite" }} />
            <div style={{ marginTop: 10, fontSize: 13 }}>Chargement des utilisateurs…</div>
          </div>
        </div>
      }>
        <UsersInner />
      </Suspense>
    </ErrorBoundary>
  );
}
