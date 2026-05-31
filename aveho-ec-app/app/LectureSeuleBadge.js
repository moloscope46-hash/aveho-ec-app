"use client";
// Composant léger qui ajoute l'attribut data-lecture sur le body si mode actif
import { useEffect } from "react";

export default function LectureSeuleBadge() {
  useEffect(() => {
    try {
      if (localStorage.getItem("aveho_lecture_seule") === "1") {
        document.body.setAttribute("data-lecture", "1");
      }
    } catch (_) {}
    return () => document.body.removeAttribute("data-lecture");
  }, []);
  return null;
}
