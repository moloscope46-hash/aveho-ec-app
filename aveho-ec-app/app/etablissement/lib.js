// Logique pure de "Mon établissement" : filtres croisés sur un arbre chargé depuis Supabase.
// Aucune dépendance React ici (testable, réutilisable) — anti-doublon.

// Aplatit l'arbre en lignes {bat,etage,service,chambre,lit,patientId}
export function flatten(tree) {
  const rows = [];
  tree.forEach((b) => b.etages.forEach((e) => e.services.forEach((s) => s.chambres.forEach((c) =>
    c.lits.forEach((l) => rows.push({ bat: b, etage: e, service: s, chambre: c, lit: l, patientId: l.patient_id }))
  ))));
  return rows;
}

// Applique les filtres (st) à l'ensemble des lignes
export function computeRows(rows, st, materiels) {
  return rows.filter((r) => {
    if (st.bat && r.bat.id !== st.bat) return false;
    if (st.etage && r.etage.id !== st.etage) return false;
    if (st.service && r.service.id !== st.service) return false;
    if (st.chambre && r.chambre.id !== st.chambre) return false;
    if (st.patient && r.patientId !== st.patient) return false;
    if (st.materiel) {
      const mat = materiels.find((m) => m.id === st.materiel);
      if (!mat || r.patientId !== mat.patient_id) return false;
    }
    return true;
  });
}

export const kpisFromRows = (rows, materiels, dis) => {
  const lits = rows.length;
  const occ = rows.filter((r) => r.patientId).length;
  const patSet = new Set(rows.filter((r) => r.patientId).map((r) => r.patientId));
  const mat = materiels.filter((m) => patSet.has(m.patient_id)).length;
  const di = dis.filter((d) => d.statut !== "Clôturée" && patSet.has(d.patient_id)).length;
  return { lits, occ, taux: lits ? Math.round((occ / lits) * 100) : 0, patients: patSet.size, mat, di };
};
