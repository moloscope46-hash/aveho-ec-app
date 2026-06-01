// =============================================================
//  app/patient/page.js (Alpha 0.55.54)
//
//  Redirect : /patient (singulier, sans id) → /patients (liste)
//  Évite la page blanche / 404 si quelqu'un tape l'URL nue.
// =============================================================
import { redirect } from "next/navigation";

export default function PatientIndex() {
  redirect("/patients");
}
