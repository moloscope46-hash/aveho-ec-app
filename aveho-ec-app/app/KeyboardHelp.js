"use client";
// =============================================================
//  app/KeyboardHelp.js (Alpha 0.55.27)
//
//  Cheatsheet des raccourcis clavier de l'app.
//  Activé via "?" ou "Shift+/" depuis n'importe quelle page
//  (sauf focus dans un champ texte / textarea / contenteditable).
//
//  Utilise le composant Modal partagé (0.55.26).
// =============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./components/Modal";

// Liste des raccourcis disponibles, organisés par catégorie
const SHORTCUTS = [
  {
    section: "Navigation",
    items: [
      { keys: ["?"], label: "Ouvrir cette aide" },
      { keys: ["Echap"], label: "Fermer une modale / annuler" },
      { keys: ["G", "puis", "A"], label: "Aller à l'accueil" },
      { keys: ["G", "puis", "P"], label: "Aller aux patients" },
      { keys: ["G", "puis", "M"], label: "Aller au matériel" },
      { keys: ["G", "puis", "U"], label: "Aller aux utilisateurs" },
      { keys: ["G", "puis", "L"], label: "Aller au changelog" },
      { keys: ["G", "puis", "S"], label: "Aller au profil (Settings)" },
    ],
  },
  {
    section: "Recherche",
    items: [
      { keys: ["Ctrl", "K"], label: "Recherche globale" },
      { keys: ["/"], label: "Focus barre de recherche" },
    ],
  },
  {
    section: "Modales et listes",
    items: [
      { keys: ["F3"], label: "Match suivant (modale highlight)" },
      { keys: ["Shift", "F3"], label: "Match précédent" },
      { keys: ["N"], label: "Match suivant (alt)" },
      { keys: ["P"], label: "Match précédent (alt)" },
    ],
  },
  {
    section: "Débogage (dev)",
    items: [
      { keys: ["F12"], label: "DevTools navigateur" },
      { keys: ["Console"], label: "__avehoEnableDebug() — active les logs en prod" },
    ],
  },
];

// Renvoie true si le focus est dans un champ saisissable
function isTypingInInput() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

export default function KeyboardHelp() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [gPressed, setGPressed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Ne rien faire si on tape dans un champ
      if (isTypingInInput()) return;
      // "?" pour ouvrir
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Séquence "G puis lettre" pour naviguer
      if (e.key === "g" || e.key === "G") {
        setGPressed(true);
        setTimeout(() => setGPressed(false), 1500); // 1.5s pour appuyer sur la 2e touche
        return;
      }
      if (gPressed) {
        const k = e.key.toLowerCase();
        const map = {
          a: "/accueil",
          p: "/patients",
          m: "/materiel",
          u: "/utilisateurs",
          l: "/changelog",
          s: "/profil",
        };
        if (map[k]) {
          e.preventDefault();
          setGPressed(false);
          router.push(map[k]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gPressed, router]);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Raccourcis clavier"
      subtitle="Appuyez sur ? pour ouvrir cette aide"
      icon="ti-keyboard"
      color="#185FA5"
      maxWidth={620}
    >
      <div style={{ display: "grid", gap: 20 }}>
        {SHORTCUTS.map((sec) => (
          <div key={sec.section}>
            <h3 style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#185FA5",
              margin: "0 0 8px",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}>
              {sec.section}
            </h3>
            <div style={{ display: "grid", gap: 4 }}>
              {sec.items.map((item, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "#f4f7fa",
                  borderRadius: 6,
                  flexWrap: "wrap",
                  gap: 8,
                }}>
                  <span style={{ display: "inline-flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                    {item.keys.map((k, j) => (
                      <span key={j}>
                        {k === "puis" ? (
                          <span style={{ color: "#8a98a8", fontSize: 11, padding: "0 4px" }}>puis</span>
                        ) : (
                          <kbd style={{
                            display: "inline-block",
                            background: "#fff",
                            border: "1px solid #d3d9e0",
                            borderBottom: "2px solid #d3d9e0",
                            borderRadius: 4,
                            padding: "2px 8px",
                            fontSize: 11,
                            fontFamily: "Consolas, Menlo, monospace",
                            color: "#142131",
                            fontWeight: 600,
                            minWidth: 18,
                            textAlign: "center",
                          }}>
                            {k}
                          </kbd>
                        )}
                      </span>
                    ))}
                  </span>
                  <span style={{ fontSize: 12.5, color: "#2a3a48" }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16,
        padding: "10px 12px",
        background: "#eef5fc",
        border: "1px solid #bfd6f0",
        borderRadius: 8,
        fontSize: 11.5,
        color: "#142131",
        lineHeight: 1.5,
      }}>
        <i className="ti ti-info-circle" style={{ color: "#185FA5" }} />{" "}
        Les raccourcis ne fonctionnent pas quand le curseur est dans un champ texte (input, textarea, etc.).
      </div>
    </Modal>
  );
}
