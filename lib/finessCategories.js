// =============================================================
//  finessCategories.js
//  Alpha 0.55.5 — Catégories FINESS utiles au secteur médical/Aveho
//
//  Codes officiels de la nomenclature FINESS (champ `categ_code`).
//  Liste sélectionnée des catégories pertinentes pour un PSAD/FBM/EC.
//
//  Source : doc Atlasanté + référentiel FINESS_Catégories_d'établissements_V3
// =============================================================

// Groupes de catégories — chaque groupe contient plusieurs codes FINESS
// On peut filtrer côté serveur via categ_code__in=355,500,600...
export const FINESS_CATEGORIES_GROUPS = {
  ehpad: {
    label: "EHPAD / EHPA",
    icon: "ti-building-community",
    color: "#7a6fb0",
    codes: [
      { code: "500", label: "EHPAD" },
      { code: "501", label: "EHPA" },
      { code: "202", label: "Résidence Autonomie" },
    ],
  },
  hopitaux: {
    label: "Hôpitaux & Cliniques",
    icon: "ti-building-hospital",
    color: "#185FA5",
    codes: [
      { code: "355", label: "Centre Hospitalier (CH)" },
      { code: "365", label: "Hôpital Régional (CHR)" },
      { code: "366", label: "CHU - Universitaire" },
      { code: "356", label: "Centre Hospitalier Spécialisé" },
      { code: "362", label: "Hôpital local" },
      { code: "365", label: "Hôpital Privé / Clinique" },
      { code: "411", label: "Maison de santé pluri-professionnelle" },
    ],
  },
  usld: {
    label: "USLD",
    icon: "ti-bed",
    color: "#1c5454",
    codes: [
      { code: "354", label: "Unité de Soins Longue Durée" },
    ],
  },
  handicap: {
    label: "Handicap (MAS, FAM, IME, SESSAD…)",
    icon: "ti-accessible",
    color: "#EF9F27",
    codes: [
      { code: "255", label: "MAS - Maison d'Accueil Spécialisée" },
      { code: "437", label: "FAM - Foyer d'Accueil Médicalisé" },
      { code: "183", label: "IME - Institut Médico-Éducatif" },
      { code: "186", label: "ITEP" },
      { code: "182", label: "IEM - Institut d'Éducation Motrice" },
      { code: "188", label: "Établissement pour Polyhandicapés" },
      { code: "190", label: "Établissement Expérimental Enfants Handicapés" },
      { code: "402", label: "SESSAD" },
      { code: "246", label: "Foyer de Vie" },
      { code: "395", label: "SAMSAH" },
      { code: "446", label: "SAVS" },
      { code: "249", label: "EAM" },
      { code: "381", label: "ESAT" },
    ],
  },
  ssr_psy: {
    label: "SSR & Psychiatrie",
    icon: "ti-heartbeat",
    color: "#e35d5b",
    codes: [
      { code: "292", label: "Centre SSR (Soins de Suite et Réadaptation)" },
      { code: "660", label: "Centre Médico-Psychologique" },
      { code: "344", label: "Établissement Psychiatrique" },
    ],
  },
  domicile: {
    label: "HAD / SSIAD / Soins à domicile",
    icon: "ti-home-heart",
    color: "#5aa05a",
    codes: [
      { code: "354", label: "HAD - Hospitalisation à Domicile" },
      { code: "354", label: "SSIAD - Services de Soins Infirmiers À Domicile" },
      { code: "446", label: "SPASAD" },
    ],
  },
  pharma_lpp: {
    label: "Pharmacies & Matériel médical (LPP)",
    icon: "ti-medical-cross",
    color: "#c0392b",
    codes: [
      { code: "620", label: "Pharmacie d'Officine" },
      { code: "619", label: "Pharmacie à Usage Intérieur (PUI)" },
      { code: "3201", label: "Commerce Biens à Usage Médical (LPP)" },
      { code: "3299", label: "Loueurs Matériel Médical" },
    ],
  },
  formation: {
    label: "Formation (IFSI, IFAS…)",
    icon: "ti-school",
    color: "#5e4a8c",
    codes: [
      { code: "455", label: "IFSI / IFAS" },
      { code: "456", label: "Centre de Formation Préparant aux Professions de Santé" },
    ],
  },
  enfance: {
    label: "Petite enfance (MECS, AED…)",
    icon: "ti-baby-bottle",
    color: "#7CC8C8",
    codes: [
      { code: "175", label: "MECS - Maison d'Enfants à Caractère Social" },
      { code: "176", label: "Pouponnière à Caractère Social" },
    ],
  },
  social: {
    label: "Social (CHRS, foyers…)",
    icon: "ti-users-group",
    color: "#8a98a8",
    codes: [
      { code: "214", label: "CHRS" },
      { code: "246", label: "Foyer de Travailleurs Migrants" },
      { code: "257", label: "Résidence Sociale" },
    ],
  },
};

// Liste plate utilisée par le proxy pour valider un filtre
export const ALL_CODES = Object.values(FINESS_CATEGORIES_GROUPS).flatMap(g => g.codes.map(c => c.code));
