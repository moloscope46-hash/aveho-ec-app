// =============================================================
//  app/api/prescriptions/export-csv/route.js (Alpha 0.56.8)
//
//  Export CSV des prescriptions selon les mêmes filtres que
//  /api/prescriptions/search. Retourne un text/csv téléchargeable.
//
//  Limite : 5000 lignes max (pour ne pas exploser la mémoire).
// =============================================================

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function POST(req) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return Response.json({ ok: false, error: "Supabase non configuré" }, { status: 500 });
  }

  let body = {};
  try { body = await req.json(); } catch (_) { /* empty body OK */ }

  const authHeader = req.headers.get("authorization") || "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });

  // Mêmes filtres que /search mais sans pagination, max 5000
  const includeLignes = body.include_lignes === true;

  let query = supabase
    .from("prescriptions")
    .select("*, patients(nom, prenom, numero_dossier), etablissements(nom)");

  if (body.patient_id) query = query.eq("patient_id", body.patient_id);
  if (body.prescripteur_nom) query = query.ilike("prescripteur_nom", `%${body.prescripteur_nom}%`);
  if (body.prescripteur_rpps) query = query.eq("prescripteur_rpps", body.prescripteur_rpps);
  if (body.type_prescription && body.type_prescription !== "all") query = query.eq("type_prescription", body.type_prescription);
  if (body.source_creation && body.source_creation !== "all") query = query.eq("source_creation", body.source_creation);
  if (body.statut && body.statut !== "all") query = query.eq("statut", body.statut);
  if (body.date_debut) query = query.gte("date_prescription", body.date_debut);
  if (body.date_fin) query = query.lte("date_prescription", body.date_fin);
  if (typeof body.rpps_verifie === "boolean") query = query.eq("rpps_verifie", body.rpps_verifie);

  query = query.order("date_prescription", { ascending: false, nullsLast: true }).limit(5000);

  const { data: prescriptions, error } = await query;
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!prescriptions || prescriptions.length === 0) {
    return Response.json({ ok: false, error: "Aucune prescription à exporter" }, { status: 200 });
  }

  // Récupère les lignes si demandé
  let lignesByPresc = {};
  if (includeLignes && prescriptions.length > 0) {
    const ids = prescriptions.map(p => p.id);
    const { data: lignes } = await supabase
      .from("prescriptions_lignes")
      .select("*")
      .in("prescription_id", ids)
      .order("ordre");
    lignesByPresc = (lignes || []).reduce((acc, l) => {
      (acc[l.prescription_id] = acc[l.prescription_id] || []).push(l);
      return acc;
    }, {});
  }

  // Build CSV
  const header = [
    "Date prescription",
    "Patient nom", "Patient prénom", "N° dossier",
    "Établissement",
    "Prescripteur nom", "Prescripteur prénom", "RPPS", "Spécialité",
    "RPPS vérifié", "Source vérif",
    "Type prescription", "Durée", "Renouvelable", "Nb renouvellements",
    "Source création", "Statut",
    "Notes",
  ];
  if (includeLignes) {
    header.push("Médicaments (liste)", "Nb lignes");
  }
  header.push("Date création");

  const rows = prescriptions.map(p => {
    const row = [
      p.date_prescription || "",
      p.patients?.nom || "",
      p.patients?.prenom || "",
      p.patients?.numero_dossier || "",
      p.etablissements?.nom || "",
      p.prescripteur_nom || "",
      p.prescripteur_prenom || "",
      p.prescripteur_rpps || "",
      p.prescripteur_specialite || "",
      p.rpps_verifie ? "OUI" : "non",
      p.rpps_source_verification || "",
      p.type_prescription || "",
      p.duree_traitement || "",
      p.est_renouvelable ? "OUI" : "non",
      p.nb_renouvellements || 0,
      p.source_creation || "",
      p.statut || "",
      p.notes_libres || "",
    ];
    if (includeLignes) {
      const lignes = lignesByPresc[p.id] || [];
      const medsList = lignes.map(l => {
        const parts = [l.medicament_nom];
        if (l.dosage) parts.push(l.dosage);
        if (l.posologie_libre) parts.push(`(${l.posologie_libre})`);
        return parts.join(" ");
      }).join(" | ");
      row.push(medsList, lignes.length);
    }
    row.push(p.created_at ? new Date(p.created_at).toLocaleString("fr-FR") : "");
    return row;
  });

  // CSV avec BOM UTF-8 pour Excel
  const csv = "\uFEFF" + [header, ...rows]
    .map(r => r.map(csvEscape).join(";"))
    .join("\r\n");

  const filename = `prescriptions-archive-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
