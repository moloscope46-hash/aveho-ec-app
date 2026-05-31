"use client";
// =============================================================
//  useLibelles (Alpha 0.4)
//  Charge les libellés métier personnalisés de la collectivité
//  (depuis structures.parametres) et expose un helper lbl() pour
//  remplacer dynamiquement "Patient" -> "Résident", etc.
//
//  Usage :
//    const { lbl } = useLibelles(auth.structureId);
//    <h2>Nos {lbl("patient", "patients")}</h2>
//    -> affiche "Nos résidents" si l'EHPAD a configuré le libellé
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "./supabase";

const DEFAULTS = {
  patient: "Patient", patients: "Patients", PATIENT: "PATIENT",
  chambre: "Chambre", chambres: "Chambres",
  materiel: "Matériel", materiels: "Matériel",
  service: "Service", services: "Services",
};

export function useLibelles(structureId) {
  const supabase = createClient();
  const [params, setParams] = useState({});

  useEffect(() => {
    if (!structureId) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("structures").select("parametres").eq("id", structureId).maybeSingle();
      if (active) setParams((data && data.parametres) || {});
    })();
    return () => { active = false; };
  }, [structureId]);

  /**
   * Retourne le libellé personnalisé d'une clé, ou la valeur par défaut.
   * @param {string} key - ex: "patient", "patients", "chambre"
   * @param {string} fallback - libellé par défaut si rien de personnalisé
   */
  function lbl(key, fallback) {
    const k = key.toLowerCase();
    // les clés stockées en base sont au singulier minuscule (libelle_patient)
    const base = k.replace(/s$/, "");
    const custom = params[`libelle_${base}`];
    if (!custom) return fallback || DEFAULTS[key] || key;
    // si l'utilisateur a saisi un singulier mais qu'on demande le pluriel : on ajoute "s"
    if (k.endsWith("s") && !custom.endsWith("s")) return custom + "s";
    // si tout en majuscules est demandé
    if (key === key.toUpperCase()) return custom.toUpperCase();
    return custom;
  }

  return { lbl, params };
}
