"use client";
// =============================================================
//  app/components/IconPicker.js (0.58.47)
//
//  Sélecteur d'icône avec palette Tabler organisée par catégorie.
//  Utilisé pour les tags matériel, étiquettes patient, annonces.
//
//  Props:
//   - value: string (nom de l'icône, ex: "ti-tag")
//   - onChange: (newIcon: string) => void
//   - color: couleur d'accent (pour la sélection)
//   - allowEmpty: bool (défaut: true) — autorise pas d'icône (= ti-tag par défaut)
// =============================================================

import { useState } from "react";

// Catalogue d'icônes Tabler organisé par catégorie pertinente PSAD/médical/dashboard
export const ICON_CATALOG = {
  "Tags & marqueurs": ["ti-tag", "ti-bookmark", "ti-star", "ti-flag", "ti-pin", "ti-heart"],
  "Statut & état": ["ti-check", "ti-x", "ti-alert-triangle", "ti-alert-circle", "ti-info-circle", "ti-help-circle", "ti-shield-check", "ti-shield-x"],
  "Médical & soins": ["ti-stethoscope", "ti-heartbeat", "ti-medical-cross", "ti-pill", "ti-vaccine", "ti-bandage", "ti-mask", "ti-emergency-bed", "ti-wheelchair"],
  "Matériel & équipement": ["ti-armchair-2", "ti-bed", "ti-tools", "ti-screwdriver", "ti-settings", "ti-package", "ti-box", "ti-barcode", "ti-device-tablet"],
  "Urgence & priorité": ["ti-bolt", "ti-flame", "ti-clock-hour-3", "ti-hourglass-high", "ti-urgent", "ti-fire-extinguisher"],
  "Communication": ["ti-bell", "ti-mail", "ti-phone", "ti-message-circle", "ti-megaphone", "ti-news"],
  "Personnes": ["ti-user", "ti-users", "ti-user-circle", "ti-user-plus", "ti-user-check", "ti-user-star", "ti-baby-carriage"],
  "Lieux": ["ti-home", "ti-building", "ti-building-hospital", "ti-building-warehouse", "ti-door", "ti-map-pin"],
  "Documents": ["ti-file-text", "ti-file-check", "ti-files", "ti-clipboard", "ti-clipboard-list", "ti-receipt", "ti-certificate"],
  "Symboles": ["ti-circle-filled", "ti-square-filled", "ti-triangle-filled", "ti-rosette", "ti-sparkles", "ti-crown", "ti-rocket", "ti-target"],
};

// Liste plate de toutes les icônes (pour validation rapide)
export const ALL_ICONS = Object.values(ICON_CATALOG).flat();

// Icône par défaut si aucune choisie
export const DEFAULT_ICON = "ti-tag";

// 0.58.48 : auto-suggestion d'icône depuis le libellé du tag
//   Renvoie l'icône la mieux suggérée OU null si aucun mot-clé reconnu.
//   Utilise un dict mot-clé → icône, et matche les mots du libellé.
const SUGGESTION_KEYWORDS = {
  // Médical
  "ti-stethoscope": ["stetho", "consult", "examen", "diagnos", "auscult"],
  "ti-heartbeat": ["cardiaque", "coeur", "cardio", "ecg"],
  "ti-medical-cross": ["medical", "soin", "infirm", "secour"],
  "ti-pill": ["medicament", "traitement", "médicament", "comprime", "pill", "drug"],
  "ti-vaccine": ["vaccin", "injection", "piqure", "seringue"],
  "ti-bandage": ["pansement", "cicatris", "plaie", "bandage", "blessure"],
  "ti-mask": ["masque", "protection", "covid", "fp2"],
  "ti-emergency-bed": ["hospital", "hospitalis", "urgence", "samu"],
  "ti-wheelchair": ["fauteuil", "mobilité", "mobilite", "handicap", "vph", "roulant"],
  // Matériel
  "ti-armchair-2": ["fauteuil", "chaise", "assise"],
  "ti-bed": ["lit", "lit médical", "couchage"],
  "ti-tools": ["maintenance", "outil", "réparation", "reparation", "depannage", "sav"],
  "ti-screwdriver": ["installation", "montage", "demontage"],
  "ti-settings": ["réglage", "reglage", "config", "paramétrage", "calibration"],
  "ti-package": ["livraison", "colis", "expédition", "expedition", "livre"],
  "ti-box": ["stock", "inventaire", "carton"],
  "ti-barcode": ["code-barre", "barcode", "scan", "gs1", "traçabilité", "tracabilite"],
  // Urgence
  "ti-bolt": ["urgent", "critique", "express", "priorité", "priorite", "rapide"],
  "ti-flame": ["incendie", "feu", "brulure"],
  "ti-clock-hour-3": ["retard", "delais", "délai", "tard"],
  "ti-hourglass-high": ["attente", "patient", "long"],
  "ti-urgent": ["urgent", "immediat", "immédiat", "sos"],
  "ti-fire-extinguisher": ["securite", "sécurité", "extincteur"],
  // Communication
  "ti-bell": ["alerte", "notification", "rappel", "alert"],
  "ti-mail": ["mail", "email", "courriel", "message"],
  "ti-phone": ["telephone", "téléphone", "appel", "tel"],
  "ti-megaphone": ["annonce", "communication", "diffusion"],
  // Personnes
  "ti-user-star": ["vip", "important", "prioritaire", "client clé", "client cle"],
  "ti-user-plus": ["nouveau", "nouveau patient", "inscription", "création", "creation"],
  "ti-user-check": ["validé", "valide", "actif", "consentement"],
  "ti-baby-carriage": ["pédiatrie", "pediatrie", "enfant", "bebe", "bébé", "nourrisson"],
  // Lieux
  "ti-building-hospital": ["hôpital", "hopital", "clinique", "centre"],
  "ti-building-warehouse": ["dépôt", "depot", "entrepot", "entrepôt", "stockage"],
  "ti-map-pin": ["adresse", "localisation", "lieu", "position"],
  // Documents
  "ti-file-check": ["validé", "valide", "approuvé", "approuve", "ok"],
  "ti-clipboard": ["fiche", "dossier", "formulaire"],
  "ti-clipboard-list": ["liste", "checklist", "bilan", "contrôle", "controle"],
  "ti-receipt": ["facture", "devis", "bef"],
  "ti-certificate": ["certificat", "agrément", "agrement", "qualification"],
  // Symboles
  "ti-star": ["favori", "prefere", "préféré", "top"],
  "ti-rocket": ["lancement", "nouveau", "boost"],
  "ti-target": ["objectif", "but", "cible"],
  "ti-crown": ["premium", "vip", "important"],
  // Statut
  "ti-check": ["ok", "fait", "terminé", "termine", "complet"],
  "ti-shield-check": ["sous garantie", "garantie", "protégé", "protege", "sécurisé", "securise"],
  "ti-shield-x": ["hors garantie", "expiré", "expire"],
  "ti-alert-triangle": ["attention", "warning", "vigilance"],
  "ti-alert-octagon": ["danger", "interdit", "critique"],
  "ti-flag": ["signalé", "signale", "flaggé", "marque", "marqué"],
  "ti-heart": ["coeur", "preferé", "préféré", "favori"],
};

export function suggestIcon(label) {
  if (!label || typeof label !== "string") return null;
  const normalized = label.toLowerCase().trim();
  // Match longest keyword first (pour "sous garantie" > "garantie")
  const entries = Object.entries(SUGGESTION_KEYWORDS).flatMap(([icon, keywords]) =>
    keywords.map(kw => ({ icon, kw, len: kw.length }))
  );
  entries.sort((a, b) => b.len - a.len);
  for (const { icon, kw } of entries) {
    if (normalized.includes(kw)) return icon;
  }
  return null;
}

export default function IconPicker({ value, onChange, color = "#185FA5", allowEmpty = true, suggestFor = null }) {
  const [query, setQuery] = useState("");
  // 0.58.48 : suggestion auto basée sur le libellé du tag (prop suggestFor)
  const suggested = suggestFor ? suggestIcon(suggestFor) : null;
  // Filtre les icônes selon la query
  const filteredCatalog = (() => {
    if (!query.trim()) return ICON_CATALOG;
    const q = query.toLowerCase();
    const result = {};
    for (const [cat, icons] of Object.entries(ICON_CATALOG)) {
      const matching = icons.filter(i => i.toLowerCase().includes(q) || cat.toLowerCase().includes(q));
      if (matching.length > 0) result[cat] = matching;
    }
    return result;
  })();
  const noResults = Object.keys(filteredCatalog).length === 0;

  return (
    <div>
      {/* 0.58.48 : suggestion auto si suggestFor passé et match trouvé */}
      {suggested && suggested !== value && (
        <div style={{
          marginBottom: 10,
          padding: "6px 10px",
          background: `linear-gradient(135deg, ${color}15, ${color}05)`,
          border: `1px solid ${color}30`,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 12,
        }}>
          <i className="ti ti-sparkles" style={{ color, fontSize: 14 }} />
          <span style={{ flex: 1, color: "#5a6878" }}>
            Suggestion : <b style={{ color }}><i className={`ti ${suggested}`} /> {suggested}</b>
          </span>
          <button
            type="button"
            onClick={() => onChange(suggested)}
            style={{
              background: color,
              color: "#fff",
              border: "none",
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Utiliser
          </button>
        </div>
      )}
      {/* Champ recherche */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8a98a8", fontSize: 14 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une icône (ex : bell, alert, user)…"
          style={{
            width: "100%",
            padding: "8px 10px 8px 32px",
            border: "1px solid #e3e9ee",
            borderRadius: 8,
            fontSize: 12.5,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            type="button"
            aria-label="Effacer"
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#8a98a8", cursor: "pointer", fontSize: 14, padding: 4 }}
          >
            <i className="ti ti-x" />
          </button>
        )}
      </div>

      {/* Bouton "Aucune icône" si autorisé */}
      {allowEmpty && (
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              padding: "4px 10px",
              border: !value ? `2px solid ${color}` : "1px solid #e3e9ee",
              background: !value ? color + "15" : "#fff",
              color: !value ? color : "#5a6878",
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: !value ? 700 : 500,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
            title="Pas d'icône spécifique (utilisera l'icône par défaut)"
          >
            <i className="ti ti-ban" /> Aucune icône
          </button>
        </div>
      )}

      {/* Catalogue */}
      <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid #e3e9ee", borderRadius: 8, padding: 8, background: "#fafbfc" }}>
        {noResults ? (
          <p style={{ textAlign: "center", color: "#8a98a8", fontSize: 12.5, padding: 16, margin: 0 }}>
            <i className="ti ti-mood-empty" style={{ fontSize: 24, display: "block", marginBottom: 6 }} />
            Aucune icône trouvée pour "{query}"
          </p>
        ) : (
          Object.entries(filteredCatalog).map(([category, icons]) => (
            <div key={category} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, color: "#8a98a8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                {category}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {icons.map((icon) => {
                  const isSelected = value === icon;
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => onChange(icon)}
                      title={icon}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        border: isSelected ? `2px solid ${color}` : "1px solid #e3e9ee",
                        background: isSelected ? color + "15" : "#fff",
                        color: isSelected ? color : "#5a6878",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        transition: "all 120ms",
                        fontFamily: "inherit",
                        boxShadow: isSelected ? `0 2px 8px ${color}40` : "none",
                      }}
                    >
                      <i className={`ti ${icon}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
