import { logger } from "../../lib/logger";
// =============================================================
//  app/changelog/versions-data.js
//  Historique complet auto-généré depuis les notes HTML
//  Alpha 0.54.0 — Régénération avec versions 0.52.7, 0.52.8, 0.53.0
// =============================================================

export const THEME_LABELS = {
  "rgpd": {
    "lbl": "RGPD & Consents",
    "icon": "ti-shield-lock",
    "color": "#8c2a23"
  },
  "achats": {
    "lbl": "Achats & Commandes",
    "icon": "ti-shopping-cart",
    "color": "#EF9F27"
  },
  "pwa": {
    "lbl": "PWA & Offline",
    "icon": "ti-device-mobile",
    "color": "#5a8f8f"
  },
  "ux": {
    "lbl": "UX & Design",
    "icon": "ti-palette",
    "color": "#7a6fb0"
  },
  "audit": {
    "lbl": "Audit & Logs",
    "icon": "ti-list-search",
    "color": "#5e4a8c"
  },
  "notifications": {
    "lbl": "Notifs & Annonces",
    "icon": "ti-bell",
    "color": "#EF9F27"
  },
  "rls_securite": {
    "lbl": "Sécurité & Droits",
    "icon": "ti-shield",
    "color": "#c0392b"
  },
  "patients": {
    "lbl": "Patients",
    "icon": "ti-user",
    "color": "#185FA5"
  },
  "maintenance": {
    "lbl": "Maintenance & DI",
    "icon": "ti-tool",
    "color": "#1c5454"
  },
  "perf_qualite": {
    "lbl": "Perf & Qualité",
    "icon": "ti-bolt",
    "color": "#EF9F27"
  },
  "realtime": {
    "lbl": "Realtime",
    "icon": "ti-broadcast",
    "color": "#7CC8C8"
  },
  "stats_dashboard": {
    "lbl": "Stats & Dashboards",
    "icon": "ti-chart-pie",
    "color": "#7a6fb0"
  },
  "transferts": {
    "lbl": "Transferts & Logistique",
    "icon": "ti-arrows-exchange",
    "color": "#5aa05a"
  },
  "recherche": {
    "lbl": "Recherche",
    "icon": "ti-search",
    "color": "#185FA5"
  },
  "infrastructure": {
    "lbl": "Infrastructure",
    "icon": "ti-server",
    "color": "#142131"
  },
  "documentation": {
    "lbl": "Documentation",
    "icon": "ti-book",
    "color": "#7CC8C8"
  },
  "geoloc": {
    "lbl": "Géolocalisation",
    "icon": "ti-map-pin",
    "color": "#5aa05a"
  },
  "templates": {
    "lbl": "Templates & Modèles",
    "icon": "ti-template",
    "color": "#7a6fb0"
  },
  "fixes": {
    "lbl": "Fixes & Hotfixes",
    "icon": "ti-bug",
    "color": "#c0392b"
  },
  "offline_pwa": {
    "lbl": "Offline & PWA",
    "icon": "ti-wifi-off",
    "color": "#5a8f8f"
  },
  "geographique": {
    "lbl": "Carte & Géoloc",
    "icon": "ti-map-pin",
    "color": "#185FA5"
  },
  "divers": {
    "lbl": "Divers",
    "icon": "ti-tag",
    "color": "#8a98a8"
  }
};

export const ALL_VERSIONS = [
  {
    "v": "0.56.19",
    "kind": "version",
    "titre": "👁️ Bouton </> sur chaque chantier — voir le code modifié directement dans le changelog",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant CodeViewer (app/changelog/CodeViewer.js ~230 lignes) : popup full-screen qui affiche un snippet de code modifié/ajouté pour un chantier de version. Fond sombre #1e2a3a IDE-like, header avec nom du fichier + badge langage coloré (JS orange, SQL violet, CSS teal, TS bleu), onglets Avant/Après si comparaison disponible, bouton Copier avec feedback ✓ Copié 1.8s, bouton 'Voir sur GitHub' qui ouvre https://github.com/moloscope46-hash/aveho-ec-app/blob/main/<file>, ESC pour fermer",
        "code_snippet": {
          "file": "app/changelog/CodeViewer.js",
          "note": "Composant CodeViewer (extrait)",
          "lang": "js",
          "after": "export default function CodeViewer({ snippet, onClose }) {\n  const [copied, setCopied] = useState(false);\n  const [tab, setTab] = useState(\"after\");\n\n  useEffect(() => {\n    function onEsc(e) { if (e.key === \"Escape\") onClose(); }\n    window.addEventListener(\"keydown\", onEsc);\n    return () => window.removeEventListener(\"keydown\", onEsc);\n  }, [onClose]);\n\n  if (!snippet) return null;\n\n  const lang = snippet.lang || guessLang(snippet.file);\n  const hasBefore = !!snippet.before;\n  const code = tab === \"before\" ? snippet.before : snippet.after;\n\n  return (\n    <div onClick={onClose} style={{ position: \"fixed\", inset: 0, zIndex: 10000, background: \"rgba(20,33,49,.7)\", backdropFilter: \"blur(4px)\" }}>\n      <div onClick={(e) => e.stopPropagation()} style={{ background: \"#1e2a3a\", color: \"#e8edf2\" }}>\n        {/* Header avec fichier + langage */}\n        {/* Onglets Avant/Après */}\n        {/* Code avec coloration syntaxique */}\n        <pre><code dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }} /></pre>\n        {/* Footer : Copier + GitHub + ESC */}\n      </div>\n    </div>\n  );\n}"
        }
      },
      { "code": "FE", "txt": "Coloration syntaxique simple en regex pour JS/TS/SQL/CSS — mots-clés colorés teal #7CC8C8 (const, let, function, return, async, await pour JS / select, from, where, insert, create, function pour SQL), strings violet clair #bfa9e0, nombres orange #EF9F27, commentaires gris italique. Pas de dépendance externe (prism/highlight.js) — léger et rapide",
        "code_snippet": {
          "file": "app/changelog/CodeViewer.js",
          "note": "Coloration syntaxique en regex",
          "lang": "js",
          "after": "function highlightCode(code, lang) {\n  let html = escapeHtml(code);\n\n  // Commentaires\n  if (lang === \"sql\") {\n    html = html.replace(/(--[^\\n]*)/g,\n      '<span style=\"color:#7a8a9a;font-style:italic\">$1</span>');\n  } else {\n    html = html.replace(/(\\/\\/[^\\n]*)/g,\n      '<span style=\"color:#7a8a9a;font-style:italic\">$1</span>');\n  }\n\n  // Strings\n  html = html.replace(/(['\"`])((?:\\\\.|(?!\\1).)*)\\1/g,\n    (m) => `<span style=\"color:#bfa9e0\">${m}</span>`);\n\n  // Mots-clés selon langage\n  const keywords = lang === \"sql\"\n    ? [\"select\", \"from\", \"where\", \"create\", \"function\", ...]\n    : [\"const\", \"let\", \"function\", \"return\", \"async\", \"await\", ...];\n  const kwRegex = new RegExp(`\\\\b(${keywords.join(\"|\")})\\\\b`, \"g\");\n  html = html.replace(kwRegex,\n    '<span style=\"color:#7CC8C8;font-weight:600\">$1</span>');\n\n  // Nombres\n  html = html.replace(/\\b(\\d+(\\.\\d+)?)\\b/g,\n    '<span style=\"color:#EF9F27\">$1</span>');\n\n  return html;\n}"
        }
      },
      { "code": "FE", "txt": "Bouton </> intégré sur chaque chantier dans app/changelog/page.js — petit, monospace, fond sombre #1a2434 / texte teal #7CC8C8, hover scale(1.05). Visible UNIQUEMENT pour les chantiers qui ont un champ code_snippet (sinon caché). Le clic sur le bouton arrête la propagation pour ne pas déclencher l'ouverture de la note. Le clic sur le texte du chantier garde son comportement actuel (ouvre la note HTML)",
        "code_snippet": {
          "file": "app/changelog/page.js",
          "note": "Bouton </> avec stopPropagation + ouverture popup",
          "lang": "js",
          "after": "{hasCode && (\n  <button\n    onClick={(e) => {\n      e.stopPropagation();\n      setCodeSnippet(c.code_snippet);\n    }}\n    title=\"Voir le code modifié\"\n    style={{\n      background: \"#1a2434\",\n      color: \"#7CC8C8\",\n      border: \"none\",\n      padding: \"2px 7px\",\n      borderRadius: 4,\n      cursor: \"pointer\",\n      fontFamily: \"Consolas, monospace\",\n      fontSize: 10.5,\n      fontWeight: 700,\n      transition: \"all .15s\",\n    }}\n    onMouseEnter={(e) => {\n      e.currentTarget.style.background = \"#2a3a4e\";\n      e.currentTarget.style.transform = \"scale(1.05)\";\n    }}\n    onMouseLeave={(e) => {\n      e.currentTarget.style.background = \"#1a2434\";\n      e.currentTarget.style.transform = \"scale(1)\";\n    }}\n  >\n    <i className=\"ti ti-code\" /> {\"</>\"}\n  </button>\n)}"
        }
      },
      { "code": "FE", "txt": "Structure des chantiers étendue : chaque chantier peut désormais avoir un champ optionnel code_snippet = { file: 'chemin', note: 'description courte', lang: 'js|sql|css|ts', before: 'code avant (optionnel)', after: 'code après / ajouté' }. Si only after → la popup montre directement le code ajouté. Si before+after → onglets Avant/Après dans la popup. Format rétrocompatible (le champ est optionnel, les anciennes versions sans code_snippet n'affichent juste pas de bouton </>)" },
      { "code": "FE", "txt": "Versions 0.56.17 et 0.56.18 enrichies rétroactivement avec leurs code_snippet sur les chantiers principaux. 0.56.17 : fix hydration mounted state + retrait template_libelle. 0.56.18 : CoordonneesPanel, IdRow+copyToClipboard, chargement caisse+mutuelle parallèle, fix ContactActions cp" },
      { "code": "AI", "txt": "+12 tests Vitest : CodeViewer (8 : composant exporté, ESC ferme, onglets before/after, copy avec feedback, lien GitHub construit, coloration syntaxique JS/SQL, badge langage), Intégration changelog (4 : import, état codeSnippet, bouton </> conditionnel sur hasCode, stopPropagation au clic). Total 2216 tests verts (vs 2204)" }
    ],
    "themes": ["feature", "ui_ux", "developer", "changelog"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.19.html",
    "sqlFile": null
  },
  {
    "v": "0.56.18",
    "kind": "version",
    "titre": "📞 Coordonnées & contacts complets sur la fiche patient — boutons GPS/Tel/Mail partout",
    "chantiers": [
      { "code": "FE", "txt": "Nouvelle Panel 'Coordonnées & contacts' sur /patient/[id] (entre le header et les KPIs) regroupant TOUTES les coordonnées du patient et de ses contacts avec boutons d'action (tel/mail/GPS/web) via le composant ContactActions existant. 6 sections en grille auto-fit (280px min) : (1) Patient — téléphone portable + fixe + email + adresse, (2) Contact d'urgence — nom complet + lien de parenté + téléphone, (3) Personne de confiance — nom + téléphone, (4) Médecin traitant — nom + RPPS + téléphone, (5) Caisse — nom + type + code organisme + adresse, (6) Mutuelle — raison sociale + type + AMC + adresse",
        "code_snippet": {
          "file": "app/patient/[id]/page.js",
          "note": "Composant CoordonneesPanel (extrait)",
          "lang": "js",
          "after": "function CoordonneesPanel({ pat, caisseInfo, mutuelleInfo }) {\n  if (!pat) return null;\n\n  // Entité patient construite à partir des colonnes \"patients\"\n  const patientEntity = {\n    telephone: pat.telephone_portable || pat.telephone_fixe,\n    email: pat.email,\n    adresse: pat.adresse,\n    code_postal: pat.code_postal,\n    ville: pat.ville,\n  };\n\n  return (\n    <div style={{ background: \"#fff\", border: \"1px solid #e3e9ee\", borderRadius: 12, padding: \"16px 18px\", marginTop: 14 }}>\n      <h2><i className=\"ti ti-address-book\" /> Coordonnées & contacts</h2>\n\n      <div style={{ display: \"grid\", gridTemplateColumns: \"repeat(auto-fit, minmax(280px, 1fr))\", gap: 12 }}>\n        {/* Patient */}\n        <CoordRow icon=\"ti-user\" color=\"#185FA5\" label=\"Patient\" entity={patientEntity} />\n        {/* Urgence */}\n        {pat.contact_urgence_telephone && (\n          <CoordRow icon=\"ti-alert-triangle\" color=\"#c0392b\"\n            label={`Urgence : ${pat.contact_urgence_nom}`}\n            entity={{ telephone: pat.contact_urgence_telephone }} />\n        )}\n        {/* Caisse */}\n        {caisseInfo && (\n          <CoordRow icon=\"ti-shield-check\" color=\"#185FA5\"\n            label={`Caisse : ${caisseInfo.nom}`}\n            entity={caisseInfo} />\n        )}\n        {/* Mutuelle */}\n        {mutuelleInfo && (\n          <CoordRow icon=\"ti-heart-handshake\" color=\"#7a6fb0\"\n            label={`Mutuelle : ${mutuelleInfo.raison_sociale}`}\n            entity={mutuelleInfo} />\n        )}\n      </div>\n    </div>\n  );\n}"
        }
      },
      { "code": "FE", "txt": "Sous-section 'Identifiants administratifs' avec 4 lignes (dossier, IPP, N° Sécurité Sociale, N° Adhérent mutuelle). Chaque identifiant a un bouton 'Copier' qui utilise navigator.clipboard et affiche un feedback visuel transitoire (changement texte 'Copié !' 1.5s). Le N° SS et le N° adhérent sont affichés en police monospace pour lisibilité",
        "code_snippet": {
          "file": "app/patient/[id]/page.js",
          "note": "Composant IdRow + copyToClipboard",
          "lang": "js",
          "after": "function copyToClipboard(text, label) {\n  if (!text) return;\n  try {\n    navigator.clipboard?.writeText(text);\n    // Feedback visuel sur le bouton (change 1.5s puis revient)\n    const btn = document.activeElement;\n    if (btn?.tagName === \"BUTTON\") {\n      const old = btn.innerHTML;\n      btn.innerHTML = '<i class=\"ti ti-check\"></i> Copié !';\n      setTimeout(() => { btn.innerHTML = old; }, 1500);\n    }\n  } catch {}\n}\n\nfunction IdRow({ icon, label, value, onCopy, mono }) {\n  return (\n    <div style={{ display: \"flex\", alignItems: \"center\", gap: 8 }}>\n      <i className={`ti ${icon}`} />\n      <div style={{ flex: 1 }}>\n        <div>{label}</div>\n        <div style={{ fontFamily: mono ? \"'Consolas', monospace\" : \"inherit\" }}>{value}</div>\n      </div>\n      <button onClick={onCopy} title=\"Copier\">\n        <i className=\"ti ti-copy\" /> Copier\n      </button>\n    </div>\n  );\n}"
        }
      },
      { "code": "FE", "txt": "Composants internes CoordRow (ligne coordonnée avec borderLeft coloré + ContactActions size='sm') et IdRow (identifiant administratif avec bouton Copier). Affichage conditionnel intelligent : la Panel n'apparaît pas s'il n'y a rien à afficher, et chaque section n'apparaît que si elle a au moins une donnée à montrer" },
      { "code": "FE", "txt": "Chargement caisse + mutuelle en parallèle après le chargement du patient (Promise.all) — quand p.caisse_id ou p.mutuelle_id présent, on fetch la table correspondante avec select * pour avoir toutes les coordonnées. Pas de RPC nécessaire (lecture directe), donc résistant aux bugs RPC. Ajout de useState pour caisseInfo + mutuelleInfo",
        "code_snippet": {
          "file": "app/patient/[id]/page.js",
          "note": "Chargement parallèle caisse + mutuelle",
          "lang": "js",
          "after": "// 0.56.18 : charger en parallèle caisse + mutuelle si le patient en a une\nconst promises = [];\nif (p?.caisse_id) {\n  promises.push(\n    supabase.from(\"caisses_assurance_maladie\").select(\"*\")\n      .eq(\"id\", p.caisse_id).single()\n      .then(r => setCaisseInfo(r.data || null))\n  );\n}\nif (p?.mutuelle_id) {\n  promises.push(\n    supabase.from(\"mutuelles\").select(\"*\")\n      .eq(\"id\", p.mutuelle_id).single()\n      .then(r => setMutuelleInfo(r.data || null))\n  );\n}\nawait Promise.all(promises);\nsetLoading(false);"
        }
      },
      { "code": "BUG", "txt": "Composant ContactActions : ajout fallback entity.cp || entity.code_postal pour l'affichage de l'adresse. Les tables mutuelles et caisses_assurance_maladie utilisent toutes les deux 'cp' (pas 'code_postal'), donc le bouton GPS qui construit l'adresse depuis adresse+code_postal+ville fonctionne maintenant correctement avec ces 2 référentiels santé",
        "code_snippet": {
          "file": "app/ContactActions.js",
          "note": "Fallback cp ↔ code_postal pour le GPS",
          "lang": "js",
          "before": "const adresse = [entity.adresse, entity.code_postal, entity.ville].filter(Boolean).join(\", \");",
          "after": "// 0.56.18 : fallback cp ↔ code_postal\n// (mutuelles utilisent cp, caisses utilisent cp aussi)\nconst cp = entity.cp || entity.code_postal;\nconst adresse = [entity.adresse, cp, entity.ville].filter(Boolean).join(\", \");"
        }
      },
      { "code": "BUG", "txt": "Retrait définitif de c.template_libelle du rendu des consentements RGPD (déjà retiré du select en 0.56.17 mais l'affichage restait, ce qui ne causait pas d'erreur car undefined mais polluait). Faudra une jointure vers consentements_templates dans une future version pour avoir le libellé" },
      { "code": "AI", "txt": "+18 tests Vitest : panel CoordonneesPanel (15 : import ContactActions, état caisseInfo+mutuelleInfo, chargement parallèle, composant intégré, sections patient/urgence/confiance/médecin/caisse/mutuelle, identifiants admin avec IdRow+ti-copy, copyToClipboard, CoordRow borderLeft, template_libelle retiré), ContactActions cp fallback (2 : entity.cp||entity.code_postal, commentaire). Total 2204 tests verts (vs 2186)" }
    ],
    "themes": ["feature", "ui_ux", "patient", "contacts", "accessibility"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.18.html",
    "sqlFile": null
  },
  {
    "v": "0.56.17",
    "kind": "version",
    "titre": "🐛 Fix hydration React #418/#423 sur FAB + colonne template_libelle inexistante",
    "chantiers": [
      { "code": "BUG", "txt": "Erreurs React #418 et #423 (hydration mismatch) sur toutes les pages depuis l'introduction de FloatingActionBar en 0.56.16. Cause : le composant utilisait <style jsx> qui génère des classes hash différentes entre le rendu SSR et CSR — quand le composant est rendu via un layout serveur Next.js, les styles streamés ne matchent pas ceux du client. Crash hydration → React doit recover en re-rendant tout (#423) après le mismatch (#418)" },
      { "code": "FE", "txt": "FloatingActionBar (app/FloatingActionBar.js) : suppression complète du bloc <style jsx>, déplacement de tous les @keyframes et de la classe .fab-bar vers app/globals.css. Ajout d'un état React mounted (useState false → useEffect setMounted(true)) avec early return null si !mounted. Cette double protection (CSS globale + render différé) garantit qu'aucune divergence SSR/CSR n'apparaît à l'hydratation",
        "code_snippet": {
          "file": "app/FloatingActionBar.js",
          "note": "État mounted pour éviter hydration mismatch SSR/CSR",
          "lang": "js",
          "before": "export default function FloatingActionBar() {\n  const router = useRouter();\n  const pathname = usePathname();\n  const [openMenu, setOpenMenu] = useState(null);\n\n  if (isHidden) return null;\n\n  return (\n    <>\n      <style jsx>{`\n        .fab-bar { ... }\n      `}</style>\n      ...\n    </>\n  );\n}",
          "after": "export default function FloatingActionBar() {\n  const router = useRouter();\n  const pathname = usePathname();\n  const [openMenu, setOpenMenu] = useState(null);\n  const [mounted, setMounted] = useState(false);\n\n  // 0.56.17 : éviter les hydration mismatch SSR/CSR\n  // — on attend le mount côté client avant de rendre la barre\n  // (sinon erreurs React #418/#423)\n  useEffect(() => {\n    setMounted(true);\n  }, []);\n\n  if (isHidden || !mounted) return null;\n\n  // Plus de <style jsx> — CSS déplacé dans globals.css\n  return (\n    <>\n      <div className=\"fab-bar\">...</div>\n    </>\n  );\n}"
        }
      },
      { "code": "BUG", "txt": "Erreur 400 sur /rest/v1/consentements_rgpd?select=...,template_libelle — la colonne template_libelle n'existe pas dans la table consentements_rgpd. Fix : retrait de template_libelle du select dans app/patient/[id]/page.js. La table doit avoir une jointure vers consentements_templates pour récupérer le libellé, à implémenter dans une future version si nécessaire",
        "code_snippet": {
          "file": "app/patient/[id]/page.js",
          "note": "Retrait colonne inexistante template_libelle",
          "lang": "js",
          "before": "supabase.from(\"consentements_rgpd\")\n  .select(\"id, date_signature, a_consenti, date_expiration, template_libelle\")\n  .eq(\"patient_id\", patId)\n  .order(\"date_signature\", { ascending: false }),",
          "after": "// 0.56.17 : template_libelle n'existe pas en base (colonne fantôme)\nsupabase.from(\"consentements_rgpd\")\n  .select(\"id, date_signature, a_consenti, date_expiration\")\n  .eq(\"patient_id\", patId)\n  .order(\"date_signature\", { ascending: false }),"
        }
      },
      { "code": "AI", "txt": "+8 tests Vitest : FloatingActionBar (3 : pas de style jsx, mounted state, commentaire 0.56.17), CSS globals (3 : keyframes, .fab-bar avec safe-area, media queries 640/768), consentements fix (2 : select sans template_libelle, colonnes utiles gardées). 3 tests 0.56.16 ajustés pour la nouvelle organisation CSS. Total 2186 tests verts (vs 2178)" }
    ],
    "themes": ["bugfix", "hydration", "ssr", "react"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.17.html",
    "sqlFile": null
  },
  {
    "v": "0.56.16",
    "kind": "version",
    "titre": "✨ Barre d'actions flottante en bas (mobile + desktop) — Scan / Mon étab / Commande",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant FloatingActionBar (app/FloatingActionBar.js ~370 lignes) : barre d'actions flottante centrée en bas de l'écran avec 3 bulles principales — Scan/OCR (violet #5a4a90, ouvre popup 4 options), Mon étab (bleu #185FA5, raccourci direct vers /etablissement/fiche), Commande (orange #EF9F27, ouvre popup 3 options). Design glassmorphism avec backdrop-filter blur(14px), border-radius 999px (capsule), ombres douces multi-couches, animation d'entrée pop-in cubic-bezier(0.34, 1.56, 0.64, 1) — apparition spring-style à l'arrivée sur la page" },
      { "code": "FE", "txt": "Popup central avec backdrop semi-transparent + blur léger, slide-in depuis le bas avec animation spring. Header coloré avec gradient et bouton X. Liste d'actions cliquables avec hover background gris, icône colorée dans un carré arrondi (color22 background), label + sous-titre descriptif, chevron à droite. Fermeture par : clic backdrop, touche ESC, navigation, ou bouton X" },
      { "code": "FE", "txt": "Bulle Scan ouvre 4 actions : Créer un patient (bulletin OCR vert), Lire ordonnance (prescription OCR violet), Scanner code-barre (bleu), Scanner QR code (violet clair). Bulle Commande ouvre 3 actions : Voir mon panier (rouge), Mes commandes (teal), Achats (orange). Chaque action a une icône, un label court, et un sous-titre descriptif explicatif" },
      { "code": "FE", "txt": "Responsive et accessible : safe-area-inset-bottom pour iPhones avec encoche (env(safe-area-inset-bottom)), gap+padding réduits sur écrans < 640px, role='navigation' + aria-label sur la barre, role='dialog' + aria-label sur les popups, bouton fermer avec aria-label='Fermer', support clavier (ESC ferme la popup), title attribut sur les bulles pour tooltip hover. Tap effect mousedown→scale 0.92 puis retour normal. État actif (popup ouverte) avec translateY(-3px) scale(1.05) + ombre élargie de la couleur de la bulle" },
      { "code": "FE", "txt": "Masquée intelligemment sur /login, /inscription, /presentation (pas de pollution sur les pages où elle n'a pas de sens). useEffect qui ferme automatiquement la popup au changement de route (usePathname). Z-index 998 pour le backdrop, 999 pour la barre et les popups, donc toujours au-dessus du contenu sans recouvrir les modales critiques" },
      { "code": "FE", "txt": "CSS globals.css ajusté : .wrap desktop padding-bottom passe de 60px à 110px, mobile de 90px à 130px pour laisser la place à la FAB sans recouvrir le contenu en bas de page (notamment les boutons d'action en bas de formulaires longs)" },
      { "code": "FE", "txt": "Layout principal (app/layout.js) : import + mount <FloatingActionBar /> après BiometricOptInModal. Composant client (useState/useEffect/useRouter/usePathname) qui s'hydrate après les autres helpers globaux (DialogsHost, AlertToast, etc.)" },
      { "code": "AI", "txt": "+21 tests Vitest : composant FloatingActionBar (16 : exports, 3 bulles, 4 actions Scan, 3 actions Commande, routes correctes, masquage HIDDEN_PATHS, ESC ferme, backdrop blur, animations, safe-area, glassmorphism, responsive 640px, état actif, accessibilité role+aria), Layout intégration (2 : import, mount), CSS padding (3 : desktop 110px, mobile 130px). Total 2178 tests verts (vs 2157)" }
    ],
    "themes": ["feature", "ui_ux", "mobile", "accessibility", "navigation"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.16.html",
    "sqlFile": null
  },
  {
    "v": "0.56.15",
    "kind": "version",
    "titre": "🎯 Module Équipes + TopBar workflow métier 6 sections",
    "chantiers": [
      { "code": "SQL", "txt": "Module équipes COMPLET (supabase/aveho-PATCH-vers-0.56.15.sql) : 3 tables — (1) equipes(id, structure_id, batiment_id nullable, nom, description, couleur, est_par_defaut, archive, audit) avec 4 RLS policies multi-tenant + 2 index, (2) equipes_membres(equipe_id, user_id, role_dans_equipe IN responsable|membre, added_at, added_by) avec PK composite + 4 RLS, (3) equipes_services(equipe_id, service_id) avec PK composite + 4 RLS. Trigger trg_create_default_team qui crée auto 'Équipe {batiment.nom}' à chaque INSERT batiments. 3 RPC SECURITY DEFINER : equipes_avec_stats(p_batiment_id), equipe_detail(p_equipe_id), mes_equipes()" },
      { "code": "FE", "txt": "Nouvelle page /equipes ~250 lignes : liste filtrable par bâtiment + recherche texte, groupée par bâtiment avec compteur, modale de création avec input couleur picker (input type='color'), badge 'PAR DÉFAUT' avec icône étoile pour les équipes auto-créées, affichage stats (nb_membres + nb_services + 3 premiers noms services). Archivage soft (update archive=true)" },
      { "code": "FE", "txt": "Nouvelle page /equipe/[id] ~330 lignes : header gradient à la couleur de l'équipe avec icône users-group, gestion membres avec liste candidats (exclus de l'équipe), toggle responsable ↔ membre via bouton crown EF9F27, suppression avec confirmation, gestion services rattachés (avec hiérarchie bâtiment > étage affichée pour aider le choix), composants ContactActions pour les actions mail" },
      { "code": "FE", "txt": "TopBar réorganisée en 6 sections workflow métier dans l'ordre : Mon espace → Collectivité → Scan → Commande → Livraison → Administratif → Administration. Anciennes sections Établissement/Stock/Groupement fusionnées dans Collectivité (toute la hiérarchie : groupement → étabs → équipes → patients → matériel → stock → RPPS). Achats déplacé dans Commande (cohérence workflow). Maintenance/Calendrier/TV regroupés dans Livraison avec Interventions/Transferts. Section Administratif regroupe TOUT le quotidien admin (RGPD, stats, signalements, paramètres) tandis qu'Administration est réservé au tech (utilisateurs, audit, logs, performances, admin RPPS/référentiels)" },
      { "code": "FE", "txt": "Entrée /equipes ajoutée dans Collectivité avec icône ti-users-group couleur violet #5a4a90 (cohérente avec la palette Aveho)" },
      { "code": "AI", "txt": "+34 tests Vitest sur __tests__/v056-15-equipes-topbar.test.js : SQL module équipes (10), Page /equipes (7), Page /equipe/[id] (7), TopBar refonte (10). 1 test 0.55.46 ajusté pour le renommage 'Outils scan' → 'Scan'. Total 2157 tests verts (vs 2123)" }
    ],
    "themes": ["feature", "equipes", "topbar", "workflow", "ui_ux"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.15.html",
    "sqlFile": "aveho-PATCH-vers-0.56.15.sql"
  },
  {
    "v": "0.56.14",
    "kind": "version",
    "titre": "🎨 Login bio toujours visible · Dump RPPS lien direct · Google Reviews diagnostic enrichi",
    "chantiers": [
      { "code": "FE", "txt": "Page /login refonte des boutons biométriques : les 2 boutons (Détection faciale + Empreinte) sont DÉSORMAIS TOUJOURS visibles si WebAuthn est supporté, avec état grisé + tooltip explicatif si non utilisable. 3 raisons possibles de désactivation : (1) navigateur ne supporte pas, (2) email pas encore renseigné, (3) méthode pas activée pour cet email — connecte-toi d'abord avec mot de passe puis active dans ton profil. Couleur grise #d3d9e0, cursor not-allowed, message d'info en petit sous le label, attribut title= pour tooltip natif. Le bouton garde son icône (ti-face-id violet / ti-fingerprint bleu)" },
      { "code": "FE", "txt": "Nouveau composant BioButton réutilisable (dans app/login/page.js) avec props method/icon/label/busy/bioAvailable/enabled/email/onClick/color qui gère tout l'état (chevron > visible si actif, info-circle visible si grisé). Plus lisible pour le user qui voit clairement les 2 options même s'il les a pas activées" },
      { "code": "FE", "txt": "Page /admin/rpps-dump : ajout d'un panneau bleu 'Liens directs ANS' avec 2 boutons cliquables. Bouton 1 : 'Ouvrir la page d'extractions ANS' (bleu) → ouvre annuaire.sante.fr/web/site-pro/extractions-publiques dans un nouvel onglet. Bouton 2 : 'Télécharger PS_LibreAcces (CSV ZIP)' (vert) → lance directement le téléchargement du fichier ZIP via l'URL portlet ANS (telechargerCNOM). Note explicative en italique : ZIP ~150 Mo compressé, CSV ~500 Mo décompressé" },
      { "code": "BE", "txt": "Route /api/google-reviews/sync : diagnostic d'erreur enrichi. Parse le JSON du body d'erreur (au lieu de juste afficher la string brute). Ajoute un champ 'hint' avec un message d'aide contextuel : (1) si erreur mentionne API_KEY → 'Variable GOOGLE_PLACES_API_KEY non configurée côté Edge Function. Va dans Supabase → Settings → Edge Functions → Secrets et ajoute-la', (2) si 404/not_found → 'L'Edge Function n'est peut-être pas déployée. Lance : supabase functions deploy sync-google-reviews', (3) si timeout → 'Lance avec etablissement_id spécifique pour tester'. Retour structuré { ok: false, error, hint, raw } pour debug" },
      { "code": "FE", "txt": "Page /admin/avis-google : affichage du hint en sous-bloc italique avec icône ti-bulb sous le message d'erreur. Permet à l'utilisateur de comprendre immédiatement quoi faire pour corriger (au lieu de devoir interpréter un message technique brut)" },
      { "code": "AI", "txt": "+14 tests Vitest : Login BioButton (4 : composant défini, méthode face+empreinte toujours rendues, 3 raisons grisé, état disabled visuels), Dump RPPS (3 : panel liens, lien extractions, lien CSV ZIP), Google Reviews diagnostic (5 : parse JSON, hints API_KEY/deploy/timeout, retour structuré), Affichage hint (2). Total 2123 tests verts (vs 2109)" }
    ],
    "themes": ["ui_ux", "bugfix", "biometric", "rpps", "google"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.14.html",
    "sqlFile": null
  },
  {
    "v": "0.56.13",
    "kind": "version",
    "titre": "🐛 Fix renvoyer invitation (inviteLink manquant) + colonnes caisses (type_caisse + cp)",
    "chantiers": [
      { "code": "BUG", "txt": "Bouton 'Renvoyer' sur la liste des utilisateurs renvoyait 400 (inviteLink manquant). La fonction relancerInvitation appelait supabase.functions.invoke('invite-user') sans inclure le lien d'inscription dans le body, alors que l'Edge Function le valide en obligatoire. Fix : reconstruction de l'inviteLink depuis i.token (déjà chargé par le select * sur invitations) avec window.location.origin + /inscription/{token}" },
      { "code": "FE", "txt": "relancerInvitation enrichie : gestion propre du retour error/data avec lecture du context.body pour afficher le détail Resend si erreur. Ne crash plus silencieusement en alert générique" },
      { "code": "BUG", "txt": "Table caisses_assurance_maladie : 2 colonnes mal nommées en 0.56.4 — la colonne s'appelle 'type_caisse' (pas 'type') et 'cp' (pas 'code_postal'). Mêmes types d'erreur que pour mutuelles (cf 0.56.12). Le SELECT * passait mais les INSERT/UPDATE plantaient et la RPC patient_dashboard_summary échouait silencieusement sur le type" },
      { "code": "FE", "txt": "Page /admin/referentiels-sante : affichage caisses utilise item.type_caisse || item.type (fallback). Init création caisse utilise type_caisse: 'CPAM' au lieu de type. Form select caisse écrit dans entity.type_caisse. Field code postal pour caisses unifié sur cp (les 2 tables utilisent cp en réalité). fillFromBAN simplifié : un seul set avec cp pour les 2 tables" },
      { "code": "BE", "txt": "Route /api/caisses : POST insère type_caisse + cp avec mapping depuis les anciens noms (rétrocompat). PUT remappe automatiquement {type} → {type_caisse} et {code_postal} → {cp} via destructuring const { id, code_postal, type, ...rest } = body" },
      { "code": "SQL", "txt": "Patch 0.56.10 re-corrigé (livré en outputs) : RPC patient_dashboard_summary — (select type from caisses_assurance_maladie...) devient (select type_caisse from caisses_assurance_maladie...). Sans ce fix, le dashboard patient affichait NULL pour le type de la caisse" },
      { "code": "AI", "txt": "+14 tests Vitest : relancerInvitation (4 : inviteLink construit, passé dans body, gestion détail erreur, commentaire), Page caisses (5 : init type_caisse, affichage, set type_caisse, set cp, fillFromBAN unifié), API caisses (4 : POST type_caisse+cp, PUT remap, destructuring), SQL (1). Total 2109 tests verts (vs 2095)" }
    ],
    "themes": ["bugfix", "edge_function", "caisses", "colonnes"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.13.html",
    "sqlFile": null
  },
  {
    "v": "0.56.12",
    "kind": "version",
    "titre": "🐛 Fix colonnes table mutuelles · raison_sociale au lieu de nom · cp au lieu de code_postal · type_organisme au lieu de type",
    "chantiers": [
      { "code": "BUG", "txt": "Erreur 400 Bad Request sur GET /rest/v1/mutuelles?order=nom.asc : la table mutuelles n'a PAS de colonne 'nom' — elle s'appelle 'raison_sociale'. Les autres colonnes diffèrent aussi : 'cp' au lieu de 'code_postal', 'type_organisme' au lieu de 'type'. Cela causait un crash silencieux sur la page /admin/referentiels-sante onglet Mutuelles et faisait planter le dashboard patient" },
      { "code": "FE", "txt": "Page /admin/referentiels-sante : helper getNom(item) qui résout nom||raison_sociale selon ce qui est présent. Query .order('raison_sociale') au lieu de .order('nom') pour les mutuelles (gardé 'nom' pour caisses). Init du formulaire de création utilise raison_sociale + type_organisme pour onglet mutuelles. Validation save() vérifie le bon champ selon l'onglet. Filtre items et affichage liste utilisent getNom. Affichage code postal : item.code_postal || item.cp. Affichage type mutuelle : item.type_organisme || item.type" },
      { "code": "FE", "txt": "EditModal mutuelles : label 'Raison sociale *' au lieu de 'Nom *' avec set('raison_sociale', v). Type select utilise type_organisme. 2 nouveaux champs ajoutés visibles dans la modale mutuelles : 'Nom court' (diminutif usuel comme 'Harmonie') et 'Code organisme' (code_orgcomp). Champ Code postal utilise 'cp' pour mutuelles, 'code_postal' pour caisses. fillFromBAN remappe en cp pour mutuelles uniquement" },
      { "code": "BE", "txt": "Route /api/mutuelles : POST accepte body.raison_sociale OU body.nom (fallback rétrocompatible). Payload insère raison_sociale + type_organisme + cp avec mapping depuis les anciens noms. PUT remappe automatiquement : si body contient {nom} il devient {raison_sociale}, {code_postal} → {cp}, {type} → {type_organisme}. Extraction propre via destructuring const { id, nom, code_postal, type, ...rest } = body" },
      { "code": "SQL", "txt": "Patch 0.56.10 corrigé (livré en outputs) : RPC patient_dashboard_summary corrigée — la sous-requête (select nom from mutuelles where id = v_patient.mutuelle_id) devient (select raison_sociale from mutuelles...). Sans ce fix, le dashboard patient affichait 'Non renseignée' pour la mutuelle même si le patient en avait une" },
      { "code": "AI", "txt": "+17 tests Vitest : Page referentiels (12 : getNom helper, order raison_sociale, init création, validation save, filtre, affichage liste, label EditModal, type_organisme+nom_court+code_orgcomp, cp/code_postal, affichage cp, affichage type, fillFromBAN mapping), API mutuelles (4 : POST accepte raison_sociale, payload mapping, PUT remap, destructuring), SQL 0.56.10 (1 : select raison_sociale). 1 test 0.56.4 ajusté. Total 2095 tests verts (vs 2078)" }
    ],
    "themes": ["bugfix", "mutuelles", "colonnes", "mapping"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.12.html",
    "sqlFile": null
  },
  {
    "v": "0.56.11",
    "kind": "version",
    "titre": "🔧 Patch correctif · CORS Edge Function invite-user · scanner QR cleanup robuste · Service Worker sans faux 503 · safe SQL groupements",
    "chantiers": [
      { "code": "BE", "txt": "Edge Function invite-user (supabase/functions/invite-user/index.ts) : ajout complet du support CORS. Constantes CORS_HEADERS (Access-Control-Allow-Origin: *, Methods POST+OPTIONS, Headers authorization+apikey+content-type+x-client-info, Max-Age 86400). Handler OPTIONS preflight retourne 204 + CORS. JSON_HEADERS combine Content-Type + CORS_HEADERS et est appliqué sur les 6+ réponses client (RESEND_KEY manquant, inviteLink manquant, email manquant, erreur Resend, succès, exception 500). Status 405 Method not allowed retourne aussi CORS_HEADERS. Sans ce fix, l'app Vercel ne pouvait plus inviter d'utilisateurs (preflight refusé)" },
      { "code": "FE", "txt": "Composant QrScanner (app/QrScanner.js) : cleanup useEffect robuste pour html5-qrcode. Le bug 'NotFoundError: removeChild' + 'Cannot clear while scan is ongoing' + 'AbortError: play() interrupted' venait du fait que le cleanup tentait stop().then(clear()) alors que html5-qrcode était dans un état intermédiaire (STATE_STARTING par exemple). Désormais : on appelle scanner.getState?.() avant d'agir, on stoppe uniquement si STATE_SCANNING (2) ou STATE_PAUSED (3), sinon clear direct (idempotent). 3 endroits corrigés : cleanup useEffect + callback autoStop dans onResult + switchCamera" },
      { "code": "FE", "txt": "Service Worker (public/sw.js) networkFirst : ne retourne plus 503 si le serveur répond avec un statut inhabituel mais cohérent (404, 500, etc.). Avant : on attendait res.ok pour retourner res, sinon fallback offline. Désormais : on retourne res quelle que soit son ok (le navigateur saura quoi faire d'un 404 par exemple). Le fallback offline n'arrive qu'en cas de vraie panne réseau (throw). Cela évite les 'qr:1 503 Offline' qui apparaissaient quand le SW interceptait des transitions Next" },
      { "code": "SQL", "txt": "Patch 0.56.7 mis à jour en version SAFE (livré en outputs) : détection conditionnelle de la table groupements via to_regclass('public.groupements'). Si la table existe, RPC complète. Sinon, RPC créée en stub vide qui retourne 0 résultat (la page admin affichera l'onglet Groupements vide mais sans erreur). Index GIN trigramme aussi conditionnel. RPC ignorer_doublon avec execute dynamique + raise si table absente quand cible='groupement'. Permet de jouer le patch même sur les schémas où la hiérarchie groupements n'est pas implémentée" },
      { "code": "SQL", "txt": "Patches 0.56.8 et 0.56.10 corrigés (livrés en outputs) : remplacement de max(uuid) qui n'existe pas en PostgreSQL. Pour récupérer le medecin_prescripteur_id / prescripteur_prenom / prescripteur_rpps / prescripteur_specialite associé à un groupe, on utilise désormais une sous-requête (select ... from prescriptions where lower(prescripteur_nom)=key and X is not null order by date_prescription desc nulls last limit 1) qui récupère la valeur de la prescription la plus récente. Plus propre et cohérent que max() qui était choisi au hasard" },
      { "code": "AI", "txt": "+16 tests Vitest : Edge Function CORS (7 : constantes, OPTIONS 204, headers preflight, methods, JSON_HEADERS combine, 6+ usages, 405 with CORS), QrScanner cleanup (6 : getState check, states 2/3, stop.then.clear, autoStop protégé, switchCamera protégé, commentaire 0.56.11), SW networkFirst (3). 4 tests des versions précédentes ajustés (max remplacé par sous-requête, archive conditionnel). Total 2078 tests verts (vs 2062)" }
    ],
    "themes": ["bugfix", "cors", "edge_function", "scanner_qr", "service_worker"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.11.html",
    "sqlFile": null
  },
  {
    "v": "0.56.10",
    "kind": "version",
    "titre": "🩺 Dashboard santé patient · vue consolidée prescriptions + médecins + droits sécu/mutuelle + alertes contextuelles · 4 RPC agrégées",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.10 : 4 nouvelles RPC SECURITY DEFINER pour la vue consolidée santé du patient. Toutes vérifient l'accès via membres_structure avant de retourner quoi que ce soit. patient_dashboard_summary(p_patient_id) renvoie 17 champs agrégés (total prescriptions/actives, total médicaments + uniques avec DCI fallback, total médecins, dernière prescription date, count renouvelables, flags ALD/C2S/AME/tiers_payant, droits secu/mutuelle fin + jours_avant_fin calculés, caisse + mutuelle noms)" },
      { "code": "SQL", "txt": "RPC patient_dashboard_medicaments_actifs : liste des médicaments actuellement prescrits (statut active), dédupliqués par DCI préférée fallback nom commercial via row_number() partition. Retourne pour chaque médicament le dernier dosage + posologie + date + nb_prescriptions (count over partition) + flag est_dci_fournie + commentaire (ALD, à jeun, etc.)" },
      { "code": "SQL", "txt": "RPC patient_dashboard_medecins : liste agrégée des médecins qui ont prescrit pour ce patient, groupés par nom case-insensitive. Récupère via sous-requêtes les ville/téléphone/email depuis medecins_prescripteurs si lié via medecin_prescripteur_id (0.56.5). bool_or sur rpps_verifie pour le badge global. Tri par dernière_date desc nulls last" },
      { "code": "SQL", "txt": "RPC patient_dashboard_alertes : génère 5 types d'alertes contextuelles avec 3 niveaux de sévérité (critique/warning/info). expiration_secu et expiration_mutuelle critique si expiré, warning si <= 30 jours, avec jours_restants calculés. ald_sans_commentaire info si ALD = true mais ald_commentaire vide. no_caisse warning si caisse_id null. renouvellement info si prescriptions actives renouvelables et date > 60 jours" },
      { "code": "FE", "txt": "Nouvelle page /patient/[id]/dashboard : appel des 4 RPC en parallèle au load. Header gradient bleu marine avec avatar initiales + nom + âge calculé + n° dossier + date naissance + sexe + n° sécu, + boutons retour 'Éditer la fiche' et 'Vue matériel'. Section alertes contextuelles ambré en haut si > 0, composant AlerteRow avec 3 niveaux visuels distincts (rouge critique / ambré warning / bleu info) + badge sévérité en pill" },
      { "code": "FE", "txt": "Dashboard : 5 KPI cards (Prescriptions total mis en évidence violet + actives en sub, Médicaments uniques + nb lignes, Médecins prescripteurs distincts, Renouvelables, Dernière ordonnance date). Section 'Statut administratif' avec 3 StatutCards côte à côte : Caisse (avec badge MANQUANT rouge si null), Mutuelle (Tiers payant actif noté), Régimes spéciaux (Pills ALD rouge / C2S ambré / AME violet ou message vide italique + commentaire ALD si renseigné)" },
      { "code": "FE", "txt": "Dashboard : StatutCard affiche les droits jusqu'au + jours restants colorés selon urgence (rouge expirés / ambré <= 30 jours / vert ok). MedicamentRow avec dosage en code mono violet + forme + badges DCI vert + Renouvelable vert + ×N si plusieurs prescriptions + posologie italique + commentaire ambré ALD. MedecinRow avec badge Vérifié vert si RPPS validé + spécialité pill violet + ville + ContactActions (tel/mail/GPS) intégrés" },
      { "code": "FE", "txt": "Dashboard : bouton 'Scanner une ordonnance' violet en haut de la section médicaments qui redirige vers /scan/prescription?patient_id=... avec pré-sélection. Bouton 'Voir toutes les prescriptions' en bas qui redirige vers /patient/[id]/edit?tab=prescriptions. Empty states italiques si pas de données" },
      { "code": "FE", "txt": "Bouton 'Dashboard santé' (ti-clipboard-heart) ajouté sur la fiche patient /patient/[id]/page.js juste avant 'Édition complète'. Permet d'accéder rapidement à la vue consolidée santé depuis la vue 360° matériel existante" },
      { "code": "AI", "txt": "+40 tests Vitest : SQL summary (8 : function security definer, accès, compteurs, flags admin, jours calcul, sous-requêtes caisse/mutuelle, DCI fallback, renouvelables), SQL medicaments_actifs (6 : function exists, row_number dedupe, filtre active, group DCI/nom upper, dernier dosage/posologie/date, window count, est_dci_fournie), SQL medecins (5 : function exists, group lower, bool_or, sous-requêtes ville/tel/email, tri desc nulls last), SQL alertes (6 : 5 types, 3 sévérités, sécu expiré/warning, ald commentaire, no_caisse, renouvelable > 60j), Page dashboard (14 : exists, 4 RPC parallèles, header avatar + âge, 2 boutons retour, alertes conditionnelles, 5 KPI, StatutCard 3 sections, badge expiration coloré, AlerteRow 3 niveaux, MedicamentRow DCI+dosage+renouvelable, MedecinRow ContactActions, scan pre-fill, voir prescriptions tab, ALD commentaire), Bouton fiche patient (1). Total 2062 tests verts (vs 2022)" }
    ],
    "themes": ["patient", "dashboard", "ui_ux", "stats", "alertes"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.10.html",
    "sqlFile": "aveho-PATCH-vers-0.56.10.sql"
  },
  {
    "v": "0.56.9",
    "kind": "version",
    "titre": "🔀 Fusion automatique des doublons · découverte FK dynamique via information_schema · merge léger des champs vides · rollback avec snapshot",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.9 : table doublons_fusions historique des fusions (structure_id, cible etablissement/groupement/medecin, gagnant_id + label, perdant_id + label, perdant_snapshot jsonb pour rollback complet, fk_migrees jsonb détaillant chaque table+colonne+nb_rows, nb_rows_migrees total, fusionne_par auth.uid, raison, created_at, et 4 champs rollback : rollback_at, rollback_par, rollback_raison, est_rollbacke). 3 index (struct+date, perdant_id, gagnant_id). 3 RLS isolant par structure" },
      { "code": "SQL", "txt": "RPC preview_fusion_doublon(cible, gagnant_id, perdant_id) : découverte DYNAMIQUE de toutes les FK pointant vers la table cible via information_schema.referential_constraints + table_constraints + key_column_usage. Pour chaque FK, compte le nb de rows pointant vers le perdant et retourne table_name + column_name + nb_rows + delete_rule. Filtre les FK à 0 rows. Permet à l'UI d'afficher un preview avant fusion (transparence + confiance)" },
      { "code": "SQL", "txt": "RPC fusionner_doublon(cible, gagnant_id, perdant_id, raison, merge_champs=true) : (1) valide gagnant≠perdant + même structure + accès user, (2) snapshot du perdant via to_jsonb pour rollback, (3) découvre FK dynamiquement (même logique que preview), (4) pour chaque FK : UPDATE source SET col=gagnant WHERE col=perdant, gère unique_violation en DELETE (cas tables pivot), (5) si merge_champs=true : coalesce des champs vides du gagnant avec ceux du perdant pour etablissements (siret, finess, adresse, cp, ville, tel, email, capacite) + medecins (rpps, prenom, civilite, profession, specialite, raison_sociale, finess, adresse, cp, ville, tel, email, coords, est_verifie OR, source_verification), (6) DELETE perdant, (7) INSERT trace dans doublons_fusions avec snapshot + fk_migrees détaillé + nb_rows_migrees total, (8) DELETE doublons_ignores pointant vers perdant (devenu obsolète)" },
      { "code": "SQL", "txt": "RPC rollback_fusion(fusion_id, raison) : (1) vérifie fusion existe + utilisateur autorisé + pas déjà rollbackée, (2) recrée le perdant via jsonb_populate_record + INSERT (clé primaire + toutes colonnes restaurées exactement comme avant), (3) marque la fusion comme rollbackée avec rollback_at + rollback_par + rollback_raison. NB : les FK déjà migrées vers le gagnant restent là — le rollback recrée le perdant à vide mais les prescriptions/contrats migrés restent sur le gagnant. C'est documenté comme 'best effort'" },
      { "code": "FE", "txt": "Page /admin/doublons-forces enrichie : bouton 'Fusionner' rouge sur chacune des 3 cards (DoublonCardEtab, DoublonCardGroupement, DoublonCardMedecin) à côté du bouton 'Marquer non-doublon'. State fusionModal qui pilote l'ouverture de la modale" },
      { "code": "FE", "txt": "Nouveau composant FusionModal (modale 700px scrollable) : (1) choix du gagnant via 2 cartes ChoixCard cliquables avec badge 'GARDÉ' sur la sélectionnée + auto-suggestion intelligente du gagnant (celui avec le plus de FK pour groupements et médecins), (2) preview live des migrations à venir via RPC preview_fusion_doublon (tableau table/colonne/nb_rows/action FK avec total en gras), (3) champ raison libre (encouragé pour l'audit), (4) panneau warning ambré sur l'irréversibilité immédiate + snapshot conservé, (5) bouton 'Confirmer la fusion' rouge gros qui appelle fusionner_doublon avec merge_champs=true" },
      { "code": "FE", "txt": "Nouveau composant ChoixCard : carte cliquable avec bordure 2px qui devient colorée quand sélectionnée, badge 'GARDÉ' coin haut-droit, nom + sous-titre + nb références si dispo. Composant HistoriqueRow : affiche chaque fusion avec badge cible coloré + gagnant ← perdant (strikethrough sur perdant) + nb_rows_migrees + date + raison italique + bouton 'Annuler cette fusion' rouge léger qui appelle rollback_fusion. Si déjà rollbackée : opacité réduite + badge ambré 'ROLLBACKÉE'" },
      { "code": "FE", "txt": "Page admin : section 'Historique des fusions' en bas avec toggle replier/voir (default replié si vide). Charge les 20 dernières fusions au démarrage et après chaque fusion/rollback. Après fusion réussie : reload de la détection + stats + historique en parallèle pour UI cohérente" },
      { "code": "AI", "txt": "+37 tests Vitest : SQL table fusions (5 : structure+contraintes, snapshot jsonb, audit fields, fk_migrees jsonb, 3 RLS), RPC preview (5 : params, information_schema discovery, 3 cibles mapping, retour 4 champs, filtre count>0), RPC fusion (10 : params merge_champs, gagnant≠perdant, même struct, accès user, snapshot, FK discovery+update, unique_violation→delete, merge coalesce, DELETE perdant, INSERT trace, cleanup ignores), RPC rollback (3 : exists+est_rollbacke, jsonb_populate_record, marqueurs rollback), UI integration (13 : state fusionModal+historique, openFusion 3 cibles, loadHistorique limit 20, bouton Fusionner sur 3 cards, FusionModal preview, auto-suggestion gagnant, ChoixCard GARDÉ, executeMerge RPC, warning irreversible, HistoriqueRow rollback, ROLLBACKÉE display, tableau preview, btnMerge rouge). Total 2022 tests verts (vs 1985) — passe le cap symbolique des 2000 tests !" }
    ],
    "themes": ["admin", "audit", "doublons", "fusion", "rollback", "information_schema"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.9.html",
    "sqlFile": "aveho-PATCH-vers-0.56.9.sql"
  },
  {
    "v": "0.56.8",
    "kind": "version",
    "titre": "📚 Prescriptions archive · recherche multi-critères + dashboard stats + top médicaments/prescripteurs + tendances mensuelles + export CSV (avec ou sans lignes méds)",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.8 : 6 nouveaux index pour accélérer les recherches multi-critères — idx_prescriptions_struct_date (where statut active), idx_prescriptions_type, idx_prescriptions_source, 3 index GIN trigramme (prescripteur_nom + medicament_nom + medicament_dci) pour recherche fuzzy ilike performante" },
      { "code": "SQL", "txt": "RPC prescriptions_archive_stats(p_date_debut, p_date_fin) : 16 agrégats sur la période (total, actives/archivees/annulees, lignes, DCI uniques avec fallback nom commercial si DCI null, prescripteurs uniques avec préférence RPPS puis nom case-insensitive, patients uniques, OCR vs manuelle, RPPS vérifiés, premier/dernier date, tokens IA cumulés). Toutes les agrégations isolées par structure_id via membres_structure" },
      { "code": "SQL", "txt": "RPC prescriptions_top_medicaments(p_limit 20, p_date_debut, p_date_fin) : top N médicaments classés par nb_prescriptions. Préfère DCI (upper-case) sinon fallback nom commercial. Retourne medicament + flag est_dci (true si DCI fourni) + nb_patients_uniques + nb_prescripteurs_uniques. Permet d'identifier les molécules les plus prescrites au-delà des noms commerciaux" },
      { "code": "SQL", "txt": "RPC prescriptions_top_prescripteurs(p_limit 20) : top N prescripteurs classés par nb_prescriptions. Groupe par nom case-insensitive. Retourne nom, prénom (max si plusieurs), RPPS, spécialité, medecin_id (lien vers annuaire 0.56.5), rpps_verifie agrégé via bool_or, nb_patients_uniques, nb_lignes total, première+dernière date" },
      { "code": "SQL", "txt": "RPC prescriptions_par_mois(p_mois_count 12) : histogramme mensuel pour les N derniers mois. Utilise generate_series + LEFT JOIN pour inclure les mois sans prescription (compte = 0, important pour graphique continu). Retourne nb_prescriptions + nb_lignes + nb_patients_uniques + nb_ocr (via count filter)" },
      { "code": "BE", "txt": "Nouvelle route /api/prescriptions/search : POST avec body de filtres (patient_id, prescripteur_nom, RPPS, medicament_query, dci_query, type, source, statut, date_debut, date_fin, rpps_verifie). Si recherche médicament/DCI, passe d'abord par prescriptions_lignes pour récupérer les IDs (via ilike + Set deduplication) puis filtre les prescriptions sur ces IDs. Pagination range(offset, offset+limit-1), cap limit 500. Retour : count, total_estime, results avec join patients + etablissements" },
      { "code": "BE", "txt": "Nouvelle route /api/prescriptions/export-csv : POST avec mêmes filtres que /search. Limite 5000 lignes max (sécurité mémoire). Génère un CSV avec BOM UTF-8 pour ouverture Excel correcte, séparateur ;, CRLF entre lignes, échappement quotes/retour-ligne/séparateur. Option include_lignes=true qui ajoute une colonne 'Médicaments (liste)' avec concat nom + dosage + posologie pour chaque ligne, + colonne 'Nb lignes'. Content-Disposition attachment avec nom de fichier daté" },
      { "code": "FE", "txt": "Nouvelle page /admin/prescriptions-archive : 4 onglets — Recherche (formulaire multi-critères + résultats), Top médicaments (bar chart proportionnel, badge DCI vert si DCI), Top prescripteurs (avec badge RPPS vérifié, spécialité, ville, lien fiche médecin), Tendances par mois (graphique 12 mois en barres avec gradient violet + tableau détaillé). 8 KPI au top (total prescriptions mis en évidence + lignes + DCI uniques + prescripteurs + patients + OCR + RPPS vérifiés + tokens IA)" },
      { "code": "FE", "txt": "Page admin recherche : formulaire compact (grid auto-fit 180px) avec 9 champs filtres (prescripteur nom/RPPS, médicament/DCI, type, source, statut, date début/fin), bouton Rechercher + Réinitialiser. Liste de résultats cliquables (ouvre fiche patient onglet prescriptions), 100 max par page avec indication du total estimé. 2 boutons d'export CSV qui apparaissent uniquement si résultats : 'Export CSV' (simple) et 'Export + médicaments' (avec lignes concaténées)" },
      { "code": "FE", "txt": "Téléchargement CSV : appel API → blob → URL.createObjectURL → lien temporaire <a download> simulé + cleanup URL.revokeObjectURL. Fichier nommé prescriptions-archive-YYYY-MM-DD.csv. Composant MonthBarChart : graphique horizontal en barres flex avec hauteur proportionnelle, gradient violet, label de valeur au-dessus + nom du mois en dessous, tooltip natif via title" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Prescriptions archive' (ti-archive violet sombre) entre 'Doublons forces' et 'Diagnostic envoi mail'. Section Administration grossit à 10 entrées maintenant : Diagnostic API RPPS, Dump RPPS Plan B, Bulletins archivés, Caisses & Mutuelles, Médecins prescripteurs, Avis Google, Doublons forces, Prescriptions archive, Diagnostic envoi mail" },
      { "code": "AI", "txt": "+52 tests Vitest : SQL index (3), RPC stats (4 : security definer + dates, 16+ champs, DCI fallback, prescripteurs distinct), RPC top médicaments (5 : params, DCI fallback, est_dci flag, distinct patients/prescripteurs, tri desc), RPC top prescripteurs (4 : exists, group lower, medecin_id+bool_or rpps_verifie, dates min/max), RPC par mois (4 : params, generate_series, left join, filter OCR), API search (7 : exists, POST, médicament passe par lignes, ilike, dates gte/lte, range pagination, join patients+etabs, cap 500), API export-csv (9 : exists, maxDuration, csvEscape, BOM UTF-8 + ;, CRLF, headers attachment, include_lignes, limit 5000, header complet), Page admin (15 : exists, 4 onglets, 4 RPC, 8 KPI, 9 filtres, Bearer auth, 2 exports CSV, Blob download, reset, top meds avec proportions, top presc badge vérifié, MonthBarChart, table détaillée, lien fiche patient), Menu (1). Total 1985 tests verts (vs 1933)" }
    ],
    "themes": ["admin", "prescription", "stats", "export", "csv", "search"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.8.html",
    "sqlFile": "aveho-PATCH-vers-0.56.8.sql"
  },
  {
    "v": "0.56.7",
    "kind": "version",
    "titre": "🔍 Détection doublons forces · audit qualité 3 cibles (étabs + groupements + médecins) · similarité fuzzy pg_trgm + slider seuil ajustable",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.7 : extension PostgreSQL pg_trgm activée (fonction similarity() qui compare 2 strings par trigrammes — 0 = totalement différent, 1 = identique). 3 index GIN trigramme : idx_etablissements_nom_trgm, idx_groupements_nom_trgm, idx_medecins_nom_trgm. Accélère drastiquement les recherches par similarité (sinon scan séquentiel sur toutes les paires possibles)" },
      { "code": "SQL", "txt": "Table doublons_ignores : permet de marquer une paire comme 'non-doublon' pour qu'elle disparaisse des futures détections. Colonnes : structure_id, cible (etablissement/groupement/medecin), entity_id_1, entity_id_2, raison, ignore_par. Contrainte check (entity_id_1 < entity_id_2) pour éviter (A,B) et (B,A) en doublons. Contrainte unique (struct, cible, id_1, id_2). 3 RLS isolant par structure" },
      { "code": "SQL", "txt": "RPC detecter_doublons_etablissements(p_seuil 0.55, p_max 100) : stratégie en cascade — SIRET identique → score 1.0 (certain), FINESS identique → 0.95, sinon similarity(nom) avec motif 'Nom similaire' ou 'Nom similaire + même CP' si CP identique. Évite (A,B) et (B,A) via e1.id < e2.id. Filtre les paires déjà ignorées via not exists doublons_ignores. Retourne 14 colonnes (id/nom/siret/finess/cp/ville pour chaque + score + motif)" },
      { "code": "SQL", "txt": "RPC detecter_doublons_groupements(p_seuil 0.6) : similarity sur nom + nb_etabs par groupement pour aider à décider lequel fusionner (celui avec 0 étab est probablement le doublon). Filtre archive=false. RPC detecter_doublons_medecins(p_seuil 0.6) : RPPS identique → 1.0, sinon similarity(nom + prénom concaténés). Retourne RPPS, spécialité, ville, nb_prescriptions pour les 2 médecins pour aider à décider" },
      { "code": "SQL", "txt": "RPC ignorer_doublon(cible, id_1, id_2, raison) : récupère la structure_id en cohérence avec la cible (etablissements/groupements/medecins_prescripteurs), stocke toujours les IDs triés via least/greatest pour éviter doublons d'ignores, ON CONFLICT DO NOTHING (idempotent), trace l'utilisateur via auth.uid()" },
      { "code": "SQL", "txt": "RPC doublons_stats(p_seuil_etab, p_seuil_grp, p_seuil_med) : agrégat global pour les KPI — nb doublons par cible + nb ignorés + total. Permet d'avoir un compteur en temps réel sans relancer les 3 détections individuellement" },
      { "code": "FE", "txt": "Nouvelle page /admin/doublons-forces : 3 onglets (Établissements bleu / Groupements vert / Médecins violet) avec compteurs. Slider de seuil de similarité ajustable de 30% (très permissif) à 95% (très strict), seuil par défaut différent par cible (0.55 étabs, 0.6 groupements et médecins). Bouton 'Relancer la détection' avec spinner. Empty state vert si aucun doublon détecté ('Données propres')" },
      { "code": "FE", "txt": "Page admin : cartes de doublon avec affichage côte à côte des 2 entités (couleurs distinctes bleu/vert ou violet/violet clair) + ScoreBadge central coloré selon palier (rouge ≥95% Quasi-certain / ambré ≥80% Forte similarité / violet sinon Suggestion) + motif explicite (SIRET identique, FINESS identique, RPPS identique, Nom similaire + même CP, etc.). Bouton 'Marquer non-doublon' avec prompt() pour saisir la raison (optionnelle)" },
      { "code": "FE", "txt": "Cartes spécifiques par cible : DoublonCardEtab affiche SIRET + FINESS + CP/ville, DoublonCardGroupement affiche nb_etabs (utile pour identifier le groupement vide à supprimer), DoublonCardMedecin affiche RPPS + spécialité + ville + nb_prescriptions (utile pour fusionner vers celui qui a déjà des ordonnances)" },
      { "code": "FE", "txt": "Page admin : 5 KPI globaux en haut (Total mis en évidence rouge + 3 cibles + Ignorés). Panneau pédagogique en bas qui explique le fonctionnement (SIRET → 100%, FINESS → 95%, etc.), la signification du seuil, et la possibilité de marquer non-doublon pour les vrais cas distincts. Composant TabBtn réutilisé avec compteur intégré" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Doublons forces' (ti-copy rouge) entre 'Avis Google' et 'Diagnostic envoi mail'. Section Administration grossit à 9 entrées : Diagnostic API RPPS, Dump RPPS Plan B, Bulletins archivés, Caisses & Mutuelles, Médecins prescripteurs, Avis Google, Doublons forces, Diagnostic envoi mail" },
      { "code": "AI", "txt": "+44 tests Vitest : SQL pg_trgm + index (2), table doublons_ignores (3 : structure, contraintes, RLS), RPC etabs (7 : params, SIRET 1.0, FINESS 0.95, similarity, e1.id < e2.id, filtre ignorés, motifs), RPC groupements (3 : exists, nb_etabs, archive false), RPC médecins (5 : exists, RPPS 1.0, similarity nom+prenom, champs retournés, motifs), RPC ignorer (5 : params, structure cohérence, least/greatest, ON CONFLICT, auth.uid), RPC stats (2 : params, retour agrégat), Page admin (15 : exists, 3 onglets, RPC stats, 3 RPCs détection, slider 30-95%, seuils par défaut, ignorer prompt, cibleSingular, ScoreBadge 3 paliers, 3 cards spécifiques, SIRET/FINESS, nb_etabs, RPPS+nb_presc, empty state, 5 KPI, pédagogie), Menu (1). Total 1933 tests verts (vs 1889)" }
    ],
    "themes": ["admin", "audit", "doublons", "fuzzy_matching", "pg_trgm"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.7.html",
    "sqlFile": "aveho-PATCH-vers-0.56.7.sql"
  },
  {
    "v": "0.56.6",
    "kind": "version",
    "titre": "⭐ Sync Google Reviews automatique · Edge Function + cron 6h · stockage des avis + page admin pilotage",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.6 : ajout 5 colonnes sur etablissements (google_place_id, google_rating, google_ratings_count, google_last_sync_at, google_sync_status). Index partiel sur google_place_id where not null. Nouvelle table etablissements_avis_google avec 14 colonnes (author + profile photo + rating 1-5 + publish_time absolue + relative_time_description 'il y a 2 mois' + text_content + traduction + reply_text + raw_payload jsonb pour debug). Contrainte unique nulls not distinct (etab, author, publish) pour déduplication propre" },
      { "code": "SQL", "txt": "Table google_sync_logs : audit complet de chaque run (trigger_source cron/manual, etabs total/ok/errors, nouveaux_avis, duration_ms, details jsonb). 4 RLS sur table avis isolant par structure. RPC upsert_avis_google_batch avec jsonb_to_recordset + ON CONFLICT DO UPDATE (déduplication automatique). RPC avis_google_stats qui renvoie répartition par note (5★/4★/3★/2★/1★) + rating moyen + dernière sync" },
      { "code": "SQL", "txt": "Cron Supabase via pg_cron : job 'sync-google-reviews-cron' planifié toutes les 6h ('0 */6 * * *' = minuit/6h/12h/18h). Utilise net.http_post pour appeler l'Edge Function avec service_role. Configuration via current_setting('app.settings.sync_google_reviews_url') et service_role_key — à définir une fois via ALTER DATABASE ou Supabase Vault" },
      { "code": "BE", "txt": "Nouvelle Edge Function /supabase/functions/sync-google-reviews/index.ts : Deno.serve, client service_role (bypass RLS), itère sur les établissements avec google_place_id, appelle l'API Google Places Details pour chacun avec fields=name,rating,user_ratings_total,reviews&language=fr. Update du rating + count + statut sur l'établissement, upsert batch des avis via RPC. Gère le rate limit OVER_QUERY_LIMIT (arrête la boucle pour ne pas brûler le quota), délai 200ms entre 2 appels Google, statuts ok/api_error/rate_limited/exception" },
      { "code": "BE", "txt": "Edge Function : support body.etablissement_id pour synchroniser un seul établissement à la demande (utilisé depuis le bouton 'Sync' par ligne dans l'admin). Logs détaillés du run avec per_etab array dans details jsonb. Retourne {etablissements_total, etablissements_ok, etablissements_errors, nouveaux_avis, duration_ms} pour affichage UI immédiat" },
      { "code": "BE", "txt": "Nouvelle route /api/google-reviews/sync : maxDuration 60s + dynamic force. Appelle l'Edge Function via supabase.functions.invoke. Lit le body d'erreur en streaming via getReader + TextDecoder (réflexe 48) pour avoir un message d'erreur clair en cas de FunctionsHttpError. Transmet le token utilisateur Bearer pour respecter les permissions" },
      { "code": "FE", "txt": "Nouvelle page /admin/avis-google : (1) 6 KPI stats (étabs avec Place ID, avis total, rating moyen avec ★, 5 étoiles, critiques 1-2 étoiles, dernière sync), (2) carte sync manuelle avec bouton 'Lancer la sync' qui appelle l'Edge Function, (3) liste des établissements avec badge statut coloré (vert ok / ambré rate_limited / rouge api_error / gris jamais sync) + rating Google ★ + bouton Sync par ligne, (4) liste des 100 derniers avis avec photo auteur, étoiles, contenu, réponse établissement si présente — mise en évidence visuelle des critiques (bordure rouge 1-2★) et excellents (bordure verte 4-5★)" },
      { "code": "FE", "txt": "Page admin : 2 filtres combinables (par note avec option 'Critiques 1-2' spécifique, par établissement). Composant Stars qui affiche les étoiles ti-star-filled + ti-star Tabler. Affichage réponse de l'établissement si reply_text présent (panneau bleu avec icône message-reply). Tableau historique des 10 derniers runs avec badges cron (violet) / manual (vert)" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Avis Google' (ti-star ambré) entre 'Médecins prescripteurs' et 'Diagnostic envoi mail'. Section Administration grossit à 8 entrées maintenant : Diagnostic API RPPS, Dump RPPS Plan B, Bulletins archivés, Caisses & Mutuelles, Médecins prescripteurs, Avis Google, Diagnostic envoi mail" },
      { "code": "AI", "txt": "+41 tests Vitest : SQL (12 : 5 colonnes etablissements, index partiel, table avis 14 col, raw_payload, unique nulls, 4 RLS, table logs, RPC upsert batch, RPC stats, pg_cron 6h, net.http_post), Edge Function (13 : exists, Deno.serve, env vars, service_role, filtre place_id, Google API URL, OVER_QUERY_LIMIT, update statut, RPC, 200ms delay, log run, support 1 étab), Route /api/google-reviews/sync (5 : exists, maxDuration, functions.invoke, getReader, single etab), Page admin (10 : exists, RPC stats+tables, 6 KPI, triggerSync global+par étab, badge statut coloré, filtres notes+étabs, mise en évidence critiques, Stars component, reply, historique, pédagogie). Total 1889 tests verts (vs 1848)" }
    ],
    "themes": ["google", "etablissement", "edge_function", "cron", "admin"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.6.html",
    "sqlFile": "aveho-PATCH-vers-0.56.6.sql"
  },
  {
    "v": "0.56.5",
    "kind": "version",
    "titre": "🩺 Auto-link RPPS prescripteur · vérification ANS automatique sur OCR ordonnance · annuaire local medecins_prescripteurs avec stats",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.5 : nouvelle table medecins_prescripteurs (cache local des médecins vus via OCR) avec 18 colonnes (identification, profession, lieu d'exercice complet incluant coords GPS, vérification ANS, stats d'usage). Contrainte unique (rpps, structure_id) NULLS NOT DISTINCT pour permettre plusieurs médecins sans RPPS mais éviter doublons RPPS connus. 4 index : structure+nom, RPPS partiel, spécialité partielle, nom lower" },
      { "code": "SQL", "txt": "FK prescriptions.medecin_prescripteur_id (set null on delete pour garder l'historique même si on supprime un médecin) + rpps_verifie boolean + rpps_source_verification text ('ANS FHIR' / 'dump_local' / 'manuel'). Index partiel sur les prescriptions liées à un médecin" },
      { "code": "SQL", "txt": "4 policies RLS standard (select/insert/update/delete) isolant par structure_id via membres_structure. Trigger SQL trg_prescriptions_refresh_medecin (after insert/update/delete on prescriptions) qui recalcule automatiquement nb_prescriptions + premiere/derniere_prescription_date sur le médecin lié" },
      { "code": "SQL", "txt": "RPC upsert_medecin_from_ocr() security definer : recherche d'abord par RPPS+structure (clé forte), sinon par nom+prenom case-insensitive. Si trouvé : UPDATE avec coalesce (préfère les données existantes, enrichit les champs null). Sinon INSERT nouveau. Si est_verifie passe à true, met à jour source_verification + date_verification" },
      { "code": "SQL", "txt": "RPC medecins_stats() : total_medecins, verifies_ans, verifies_dump, non_verifies, total_prescriptions, derniere_activite — pour le tableau de bord admin" },
      { "code": "BE", "txt": "Nouvelle route /api/prescriptions/verify-rpps : POST avec body {rpps, nom_ocr, prenom_ocr, specialite_ocr}. Valide le RPPS (11 chiffres), appelle /api/rpps?rpps=... en interne (réutilise le fallback ANS→dump_local de 0.55.56), compare champ par champ avec normalisation accents/casse. Retourne status: 'match' / 'divergences' / 'not_found' / 'invalid_rpps' / 'error' + objet 'official' complet pour proposer un écrasement" },
      { "code": "BE", "txt": "Route /api/prescriptions/from-ocr enrichie : (1) appelle upsert_medecin_from_ocr avant l'insert de la prescription pour avoir le medecin_prescripteur_id, (2) si RPPS fourni, lance une vérification automatique non bloquante (try/catch silencieux) contre /api/rpps pour enrichir les données avec ANS/dump et marquer est_verifie=true + source_verification. (3) stocke medecin_prescripteur_id + rpps_verifie + rpps_source_verification sur la prescription. (4) retourne aussi ces 3 valeurs dans la réponse" },
      { "code": "FE", "txt": "Nouveau composant /app/RppsVerifyBadge.js réutilisable : useEffect qui déclenche automatiquement la vérification dès qu'un RPPS est saisi. Validation 11 chiffres en amont. 5 états visuels distincts : loading (gris + spinner), match (vert + détails dépliables), divergences (ambré + comparaison OCR vs officiel + bouton 'Utiliser les données officielles'), not_found (rouge), invalid_rpps (rouge avec message clair), error (rouge). Composant DivergenceRow qui affiche en grid 2 colonnes les valeurs OCR vs ANS pour chaque champ divergent. Flag cancelled au cas où le RPPS change pendant le fetch" },
      { "code": "FE", "txt": "Intégration RppsVerifyBadge dans /scan/prescription : affiché dans le panneau Prescripteur juste sous la grille de champs, dès que editedData.prescripteur.rpps est rempli. Compare nom + prenom + specialite extraits par OCR avec les données officielles. Callback onOfficialData met à jour tous les champs prescripteur + marqueurs _rpps_verified + _rpps_source en un clic" },
      { "code": "FE", "txt": "Nouvelle page /admin/medecins-prescripteurs : (1) 6 KPI (total, vérifiés ANS, vérifiés dump, non vérifiés, total prescriptions, dernière activité), (2) filtre live multi-champs (nom, RPPS, spécialité, ville) + filtre statut all/verifie/non_verifie, (3) liste tri date desc puis nom alphabétique, (4) badges statut Vérifié vert (avec source) / Non vérifié ambré, (5) ContactActions sur chaque ligne, (6) bouton 'Vérifier' qui relance la vérification + écrase les champs vides avec les données officielles, (7) panneau pédagogique en bas" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Médecins prescripteurs' (ti-stethoscope violet) entre 'Caisses & Mutuelles' et 'Diagnostic envoi mail'. La section Administration grossit encore avec maintenant 7 entrées : Diagnostic API RPPS, Dump RPPS Plan B, Bulletins archivés, Caisses & Mutuelles, Médecins prescripteurs, Diagnostic envoi mail" },
      { "code": "AI", "txt": "+49 tests Vitest : SQL (13 : table + colonnes + contrainte unique nulls not distinct + index + FK prescriptions + RLS + trigger + RPC upsert coalesce + RPC stats), API verify-rpps (7 : exists, validation RPPS 11 chiffres, appel /api/rpps, normalisation accents, 4 statuts, official complet, divergences), Composant RppsVerifyBadge (8 : exists, useEffect auto, 5 statuts visuels, match expand, divergences écrasement, not_found, invalid_rpps, cancelled cleanup), Intégration /scan/prescription (4 : import, badge si RPPS, onOfficialData update, props nom/prenom/specialite), Route from-ocr enrichie (6 : upsert_medecin RPC, vérif auto RPPS, enrichissement payload, stockage 3 champs sur prescription, retour réponse, try/catch silencieux), Page admin medecins (10 : exists, stats RPC, list desc, filtre nom/RPPS, filtre statut, verifyNow, ContactActions, badge statut, nb_prescriptions, 6 KPI), Menu (1). Total 1848 tests verts (vs 1799)" }
    ],
    "themes": ["prescription", "rpps", "ai", "admin", "ans"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.5.html",
    "sqlFile": "aveho-PATCH-vers-0.56.5.sql"
  },
  {
    "v": "0.56.4",
    "kind": "version",
    "titre": "🏥 Gestion référentiels caisses + mutuelles · 2 onglets admin · CRUD complet · actions tel/mail/GPS/web partout (fiche patient incluse)",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.4 : ajout colonnes latitude + longitude (numeric 10,7) sur caisses_assurance_maladie et mutuelles + email sur mutuelles (n'existait pas avant). 2 index partiels idx_caisses_coords + idx_mutuelles_coords where not null pour futures requêtes par proximité géographique. 100% idempotent" },
      { "code": "BE", "txt": "Route /api/caisses étendue avec 3 nouvelles méthodes : POST création (validation nom + code_organisme obligatoires, détection duplicate via code 23505), PUT mise à jour (id requis dans body), DELETE par id en query string. Toutes utilisent le Bearer token utilisateur pour respecter RLS. Payload complet : nom, code_organisme, type, regime, departement, region, adresse, code_postal, ville, telephone, email, site_web, latitude, longitude" },
      { "code": "BE", "txt": "Route /api/mutuelles étendue avec POST/PUT/DELETE symétrique. POST valide nom obligatoire (le numero_amc reste optionnel). Payload : nom, numero_amc, type (mutuelle/assurance/prevoyance/autre), adresse, cp, ville, telephone, email, site_web, latitude, longitude" },
      { "code": "FE", "txt": "Nouveau composant /app/ContactActions.js réutilisable : pastilles d'actions cliquables tel/mail/GPS/web qui s'affichent automatiquement selon les champs renseignés. tel: protocole, mailto:, Google Maps URL (avec coords lat/lng en priorité sinon fallback adresse texte URL-encodée), site web (ajoute https:// si manquant). 3 tailles (sm/md/lg). stopPropagation au clic pour ne pas déclencher le parent. Message 'Pas de coordonnées' si vide" },
      { "code": "FE", "txt": "Nouvelle page /admin/referentiels-sante : 2 onglets côte à côte (Caisses bleu / Mutuelles violet) avec compteur sur chaque. Filtre live multi-champs (nom, code, n° AMC, ville, département). Bouton 'Nouvelle caisse/mutuelle' déclenche modale création. Liste avec ContactActions en bas de chaque ligne (tel/mail/GPS/web)" },
      { "code": "FE", "txt": "Page admin : modale unifiée création/édition (640px max, scrollable) avec sections (Identification, Coordonnées, Contact). Selecteur type CPAM/CGSS/CSSM/MSA/CNMSS/LMG/CAMIEG/CAVIMAC/MNH/autre pour caisses, mutuelle/assurance/prevoyance/autre pour mutuelles. Selecteur régime general/agricole/militaire/fonctionnaire/special/drom. AdresseAutocomplete BAN INSEE qui remplit auto cp + ville + lat/lng. Badge vert confirmation 'Géocodage : X.XXXXX, Y.YYYYY' si coords présentes" },
      { "code": "FE", "txt": "Suppression sécurisée : confirm() obligatoire avec message 'irréversible'. Si la caisse/mutuelle est rattachée à des patients, la contrainte FK l'empêche → message d'erreur explicite. Message succès/erreur en haut de page avec icône ti-check/ti-alert-circle" },
      { "code": "FE", "txt": "Intégration ContactActions dans /patient/[id]/edit onglet 'Sécu & Mutuelle' : sous le bloc caisse affichée + sous le bloc mutuelle affichée. Permet à l'utilisateur d'appeler/mailer/router vers le bon organisme directement depuis la fiche patient sans avoir à aller chercher les coordonnées ailleurs. Refactoring du JSX pour grouper le contenu dans un wrapper" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Caisses & Mutuelles' (ti-shield-check violet) entre 'Bulletins archivés' et 'Diagnostic envoi mail'. Section Administration grossit avec : Diagnostic API RPPS, Dump RPPS Plan B, Bulletins archivés, Caisses & Mutuelles, Diagnostic envoi mail" },
      { "code": "AI", "txt": "+37 tests Vitest : SQL (3 : lat/lng caisses, email+coords mutuelles, index partiels), API caisses CRUD (5 : POST validation, PUT id, DELETE query, duplicate 23505, RLS Bearer), API mutuelles CRUD (4 : POST nom, PUT, DELETE, payload complet), ContactActions (9 : exists, tel, mail, GPS, fallback adresse, https auto, 3 tailles, stopPropagation, message vide), Page admin (12 : 2 onglets, filtre, openCreate, modale unifiée, POST/PUT switch, confirm suppression, ContactActions affiché, BAN autocomplete, géocodage, compteurs, duplicate flag), Intégration fiche patient (3 : import, caisse, mutuelle), Menu (1). Total 1799 tests verts (vs 1762)" }
    ],
    "themes": ["admin", "referentiels", "patient", "ui_ux"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.4.html",
    "sqlFile": "aveho-PATCH-vers-0.56.4.sql"
  },
  {
    "v": "0.56.3",
    "kind": "version",
    "titre": "💊 OCR Ordonnances · Claude Vision extrait prescripteur + médicaments structurés · onglet Prescriptions sur fiche patient",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.3 : table prescriptions (en-tête : patient_id, structure_id, prescripteur_nom/prenom/RPPS/specialite/adresse/tel/email/finess, date_prescription, type_prescription (ordonnance/bizone/medicaments_exception/hospitaliere/securisee), duree_traitement, est_renouvelable, nb_renouvellements, notes_libres, fichier_path/mime/size_kb, ocr_brut/date/confiance/tokens, statut, source_creation). Table prescriptions_lignes (medicament_nom/dci/forme/dosage/voie, posologie_libre+structurée qte/unite/prises_par_jour/duree_jours, quantite_a_delivrer, est_renouvelable, commentaire)" },
      { "code": "SQL", "txt": "Bucket Storage prescriptions-scannees (privé, 10 Mo max, MIME image/* + PDF) avec 4 policies RLS isolant par structure_id (premier segment du path). Convention {structure_id}/{patient_id}/{prescription_id}/{ts}-{filename}. 4 RLS prescriptions + 4 RLS prescriptions_lignes (via FK) + 4 RLS storage = 12 policies au total. Indexes patient_id+date desc, structure_id+date desc, RPPS partiel, DCI lower" },
      { "code": "SQL", "txt": "RPC prescriptions_stats() security definer : total prescriptions, total actives, total lignes, prescripteurs uniques, premier/dernier date, tokens IN/OUT cumulés. Pour la page admin stats future" },
      { "code": "BE", "txt": "Nouvelle route /api/ocr/prescription : maxDuration 60s + AbortController 55s, prompt spécialisé ordonnances françaises 'Tu es un assistant spécialisé...' avec format JSON strict imposé (pas de markdown). Demande prescripteur complet + médicaments structurés (nom commercial, DCI déductible, forme, dosage, voie, posologie libre+structurée prises/jour/durée, quantité à délivrer, renouvelable, commentaire). Support PDF via type=document. Retourne {ok, data, ocr_text, model, duration_ms, tokens}" },
      { "code": "BE", "txt": "Règles du prompt : type_prescription auto-détecté (bizone si 2 zones ALD/hors-ALD, securisee si papier vert filigrané, etc.). Conversion auto durée 'X mois' → jours. Posologie 'matin midi soir' → 3 prises/jour. 'un demi' → 0.5. ALD marqué dans commentaire. JAMAIS d'invention — préférer null à valeur incertaine. Confiance globale haute/moyenne/faible retournée" },
      { "code": "BE", "txt": "Nouvelle route /api/prescriptions/from-ocr : insère la prescription puis batch insert des lignes médicaments. Utilise le Bearer token utilisateur pour respecter RLS. Source_creation='ocr' + audit complet (tokens, confiance, OCR brut). Retourne {ok, prescription_id, nb_lignes} avec warning non bloquant si lignes échouent" },
      { "code": "FE", "txt": "Nouveau helper lib/prescriptionsStorage.js : uploadPrescription({structureId, patientId, prescriptionId}), getSignedUrl(path, 3600), deletePrescription. Convention path à 3 niveaux pour ranger correctement plusieurs ordonnances par patient" },
      { "code": "FE", "txt": "Nouvelle page /scan/prescription (650+ lignes) : workflow 4 étapes (upload → OCR Claude → vérification édition → patient & création). Sélecteur de patient avec recherche live (nom/prénom/dossier), pré-sélection via ?patient_id= query string. Édition complète prescripteur + meta + chaque médicament (champs structurés ajoutables/supprimables). Badge confiance OCR coloré (haute vert / moyenne ambre / faible rouge). Affichage durée OCR + tokens consommés" },
      { "code": "FE", "txt": "Page /scan/prescription : Suspense boundary obligatoire pour useSearchParams (sinon prerender error Next.js). Archivage Storage post-création non bloquant — la prescription est créée même si l'upload Storage échoue. Étape done avec badge bleu 'Ordonnance archivée dans Storage' + bouton 'Voir la fiche patient'" },
      { "code": "FE", "txt": "Nouvel onglet 'Prescriptions' sur /patient/[id]/edit (7ème onglet, icône ti-prescription violet) : liste les prescriptions tri date desc, badges statut (active/archivée/annulée) + type + source (badge OCR violet si extraction IA), expand/collapse au clic pour voir les médicaments avec dosage + forme + posologie + commentaire ALD, lien signé vers l'ordonnance scannée originale. Chargement lazy des lignes (1 requête par expand). Bouton 'Scanner une ordonnance' pré-remplit le patient" },
      { "code": "FE", "txt": "Entrée menu Outils scan : 'OCR Ordonnance' (ti-prescription violet) entre 'Créer patient depuis bulletin' et 'Scan QR code'" },
      { "code": "AI", "txt": "+48 tests Vitest : SQL (12 : table prescriptions, prescripteur, méta, archivage+OCR audit, table lignes, médicament, posologie, bucket privé MIME, 12 RLS, isolation structure, indexes, RPC stats), Helper storage (4 : BUCKET, buildPath 3 niveaux, uploadPrescription, getSignedUrl), Route OCR (8 : exists, maxDuration+dynamic, modèle Sonnet 4, ANTHROPIC_API_KEY, prompt ordonnances, AbortController 55s, support PDF, retour structuré), Route from-ocr (5 : exists, validation params, insert+batch lignes, Bearer token RLS, source ocr), Page scan (10 : exists, Suspense, 4 étapes, appels API, édition meds, sélecteur patient, pré-sélection query, archivage, warning, posologie structurée), Onglet patient (7 : tab ajouté, composant rendu, tri+statut, lazy load, redirection scan, signed URL, badge OCR), Menu (1), Version (1). Total 1762 tests verts (vs 1714)" }
    ],
    "themes": ["ocr", "patient", "prescription", "ai", "storage"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.3.html",
    "sqlFile": "aveho-PATCH-vers-0.56.3.sql"
  },
  {
    "v": "0.56.2",
    "kind": "version",
    "titre": "📷 Scan QR fonctionnel · caméra arrière html5-qrcode + parser intelligent Vitale/GS1/EAN/URL · actions contextuelles par type",
    "chantiers": [
      { "code": "FE", "txt": "Installation html5-qrcode@^2.3.8 (10ème dépendance npm) en dynamic import dans le composant pour ne pas alourdir le bundle de démarrage (~150 Ko chargés à la demande)" },
      { "code": "FE", "txt": "Nouveau composant /app/QrScanner.js (réutilisable) : démarre la caméra arrière en priorité (regex back|arrière|rear|environment sur le label), liste les caméras dispo et propose un select si plusieurs, qrbox responsive 70% du min(vw,vh), fallback scan depuis fichier image (utile desktop ou caméra HS), cleanup propre au unmount (stop + clear)" },
      { "code": "FE", "txt": "Nouveau parser /lib/qrParser.js : détecte automatiquement le type du contenu scanné en 8 catégories — empty / url / url_aveho (interne) / vcard / wifi / vitale_qr (NIR détecté) / gs1 (Application Identifiers GS1/UDI) / ean (EAN-8 ou EAN-13) / text. Retourne une structure normalisée avec label et données extraites" },
      { "code": "FE", "txt": "Parser Vitale : regex sur le NIR français (1 chiffre sexe + 2 année + 2 mois + 2-3 lieu + 3 commune + 3 ordre + 2 clé). Extrait NIR, sexe (1=M, 2=F), année et mois de naissance. Heuristique : ne prétend pas décoder le vrai format DGE-MSS Vitale (cryptographique) mais détecte au minimum la présence d'un NIR" },
      { "code": "FE", "txt": "Parser GS1/UDI : regex sur les Application Identifiers entre parenthèses. Mappe les AI connus (01=GTIN, 10=Lot, 17=Péremption, 21=Serial, 11=Date fab, 240=Réf additionnelle) vers leurs libellés. Retourne ais_labeled prêt à afficher dans un tableau" },
      { "code": "FE", "txt": "Page /scan/qr refondue (348 lignes, vs 49 placeholder) : intégration du composant QrScanner + parser + actions contextuelles. État scanning/parsed/history, historique des 10 derniers scans cliquables, auto-navigate vers /patient/X si url_aveho détectée" },
      { "code": "FE", "txt": "Affichage spécifique par type avec actions contextuelles : (1) Vitale → chercher patient par NIR ou créer nouveau patient avec ce NIR pré-rempli + avertissement 'NIR seul ne suffit pas', (2) GS1/UDI → tableau des AI avec libellés + chercher matériel par GTIN, (3) EAN → chercher matériel par EAN, (4) URL Aveho → redirection auto, (5) URL externe → bouton ouvrir, (6) vCard → carte contact, (7) WiFi → SSID+type, (8) Texte → bouton copier" },
      { "code": "FE", "txt": "Badges colorés par type (vitale vert, GS1 bleu, EAN violet, URL Aveho vert, URL bleu, vCard ambre, WiFi ambre, texte gris). Panneau pédagogie en bas listant tous les types reconnus avec leur badge. Section 'contenu brut' dépliable dans chaque résultat pour debug" },
      { "code": "AI", "txt": "+32 tests Vitest : Parser qrParser (10 : empty, url, url_aveho, vcard, wifi, vitale M, vitale F, GS1 avec 4 AIs, EAN-13 et EAN-8, texte fallback), Composant QrScanner (8 : exists, dynamic import, caméra arrière prefer, multiple cameras, scan from file, cleanup, props, qrbox responsive), Page /scan/qr (12 : imports, state, auto-navigate, rescan, affichage par type, historique 10, pédagogie, avertissement NIR), package.json (2 : html5-qrcode + version). Total 1714 tests verts (vs 1682)" }
    ],
    "themes": ["scan", "patient", "materiel", "ui_ux"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.2.html",
    "sqlFile": null
  },
  {
    "v": "0.56.1",
    "kind": "version",
    "titre": "📦 Storage Supabase pour archiver les bulletins scannés · bucket privé RLS + URL signées + page admin avec stats coûts Claude",
    "chantiers": [
      { "code": "SQL", "txt": "Création du bucket Storage 'bulletins-scannes' (privé, max 10 Mo/fichier, MIME image/* + PDF) avec 4 policies RLS isolant par structure_id (premier segment du path). Convention de path : {structure_id}/{patient_id}/{timestamp}-{filename_safe}. Idempotent via ON CONFLICT DO UPDATE" },
      { "code": "SQL", "txt": "6 nouvelles colonnes audit sur patients : bs_file_path (chemin Storage), bs_file_mime, bs_file_size_kb, bs_ocr_tokens_in, bs_ocr_tokens_out, bs_ocr_confiance. Index partiel idx_patients_bs_archive (structure_id, bs_ocr_date desc) where bs_file_path is not null. RPC bulletins_archive_stats() security definer pour les stats agrégées par structure" },
      { "code": "FE", "txt": "Nouveau helper lib/bulletinsStorage.js : uploadBulletin(file, structureId, patientId) avec sanitize filename (lowercase + chars safe), getSignedUrl(path, expiresIn=3600) pour générer un lien temporaire 1h, deleteBulletin(path) pour suppression admin. Retourne { path, size_kb, mime, error? }" },
      { "code": "FE", "txt": "Workflow /scan/bulletin-situation refondu : après création du patient via /api/patients/from-ocr, on upload AUTOMATIQUEMENT le fichier original dans le bucket avec le patient_id, puis on update le patient avec bs_file_path + bs_file_mime + bs_file_size_kb. Si l'archivage échoue, affichage d'un warning ambré non bloquant (le patient est créé). Badge bleu 'Bulletin archivé dans Storage' sur l'étape 'done'" },
      { "code": "BE", "txt": "Route /api/patients/from-ocr étendue : accepte maintenant ocr_confiance, ocr_tokens_in, ocr_tokens_out depuis le body. Stockés dans bs_ocr_confiance/tokens_in/tokens_out pour audit coût IA et traçabilité de la qualité d'extraction" },
      { "code": "FE", "txt": "Onglet Audit de la fiche patient (/patient/[id]/edit) refondu : génère une URL signée à l'ouverture de la page (1h validité), affiche un preview image direct si MIME image/* (click pour zoom plein écran), bouton 'Ouvrir le PDF' avec icône si PDF, ou lien externe pour autres formats. Affiche aussi confiance OCR (badge coloré), tokens IN/OUT, taille Ko, type MIME. Compat conservée avec l'ancien format bs_file_url (mention 'ancien format')" },
      { "code": "FE", "txt": "Nouvelle page /admin/bulletins-archive : (1) KPI bulletins archivés + espace utilisé en Ko/Mo + premier/dernier archive + tokens IN/OUT cumulés, (2) estimation coût Claude Sonnet 4 (3$/M IN + 15$/M OUT × 0.92 EUR/USD), (3) liste des 200 derniers patients avec bulletin (filtre live nom/prénom/dossier + badges confiance coloré + tokens), (4) bouton 'Voir' redirige vers /patient/[id]/edit?tab=audit, (5) panneau pédagogique confidentialité RLS + URL signées 1h" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Bulletins archivés' (ti-archive bleu) entre 'Dump RPPS (Plan B)' et 'Diagnostic envoi mail'" },
      { "code": "AI", "txt": "+40 tests Vitest : SQL bucket + RLS + colonnes (10), helper bulletinsStorage (6), intégration workflow scan (5), API from-ocr méta (2), TabAudit preview signée (7), Page admin archive (9), Menu (1). Total 1682 tests verts (vs 1642)" }
    ],
    "themes": ["storage", "patient", "admin", "ai"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.1.html",
    "sqlFile": "aveho-PATCH-vers-0.56.1.sql"
  },
  {
    "v": "0.56.0",
    "kind": "milestone",
    "titre": "🎯 Version majeure 0.56 — Cycle 0.55 terminé · 56 versions · 1631 tests verts · plateforme SaaS PSAD prête",
    "chantiers": [
      { "code": "MILESTONE", "txt": "Clôture du cycle 0.55.X après 56 versions consécutives (0.55.0 → 0.55.56) sans cassure de build ni régression. Service Worker bumpé 66× de suite, format unifié des réponses API, RLS Supabase partout, 1628 tests Vitest verts avant cette release, 0 console.warn/log/info résiduels" },
      { "code": "FE", "txt": "Nouvelle page /v056 : récap visuel des 8 piliers fonctionnels atteints (gestion matériel & patients, fiche patient niveau bulletin de situation, OCR Claude Vision, géolocalisation BAN INSEE, référentiels santé intégrés, administration & diagnostic, robustesse & performance, tests & qualité). 4 KPI live de la base (caisses, mutuelles, patients, établissements). Parcours de découverte vers /scan/bulletin-situation, /patients, /carte, /changelog. Roadmap 0.56.X annoncée (storage Supabase, scan QR/codebarre, OCR prescriptions)" },
      { "code": "FE", "txt": "Page accueil : nouvelle tuile 'Aveho EC 0.56' avec badge NEW vert dégradé dans les raccourcis. Lien direct vers /v056 pour découvrir tout ce que l'app sait faire" },
      { "code": "DOC", "txt": "Cycle 0.55 récapitulé : ce cycle a apporté l'OCR de bulletin de situation via Claude Vision (40+ champs auto en 10s), l'autocomplete d'adresse BAN INSEE intégré dans 3 emplacements, la fiche patient édition à 6 onglets (identité/sécu/adresses/contacts/médecin/audit), 1-N adresses de livraison par patient, le système anti-doublon établissements + groupements, 105 caisses + 44 mutuelles seedées, le Plan B RPPS avec fallback automatique sur dump local quand l'API ANS est bloquée, le diagnostic Resend pour les invitations, la robustesse de toutes les routes API (maxDuration + AbortController + plus jamais de 502), et 56 itérations de stabilisation" },
      { "code": "FE", "txt": "Bump majeur 0.55.56 → 0.56.0 — passage en cycle 0.56.X qui se concentrera sur les flux 'temps réel' (scan QR Vitale, scan code-barre matériel GS1/UDI, OCR prescriptions, storage Supabase pour archivage documents, sync Google reviews)" },
      { "code": "AI", "txt": "+3 tests Vitest : page /v056 chargée, KPI live calculés, tuile NEW accueil. Total 1631 tests verts (vs 1628)" }
    ],
    "themes": ["milestone", "ui_ux", "doc"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.0.html",
    "sqlFile": null
  },
  {
    "v": "0.55.56",
    "kind": "version",
    "titre": "🔄 Plan B RPPS : fallback automatique sur dump local quand l'API ANS plante · admin seed CSV par batchs · /api/rpps source ANS ou dump_local transparent",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.56 : nouvelle table rpps_dump (PK rpps 11 chiffres) avec 23 colonnes (état civil, profession, spécialité, lieu d'exercice complet, coords lat/lng, code INSEE commune). Indices full-text français + index par nom/profession/cp/insee/coords (partiels where not null). Table rpps_dump_meta single-row pour stocker statut et date d'extrait" },
      { "code": "SQL", "txt": "Fonctions RPC : search_rpps_local(q, profession, cp, ville, limit) security definer — recherche filtrée dans le dump avec retour normalisé. rpps_dump_status() retourne total_records + source_extract_date + last_seed_at + age_jours. RLS lecture publique authenticated, écriture via RPC security definer" },
      { "code": "SQL", "txt": "Patch SUITE 0.55.56-rpc : upsert_rpps_dump_batch(rows jsonb) qui ingère jusqu'à 5000 lignes via jsonb_to_recordset + ON CONFLICT (rpps) DO UPDATE. rpps_dump_truncate() pour vider avant un seed complet. rpps_dump_meta_update() pour marquer statut idle/seeding/completed/failed + message" },
      { "code": "BE", "txt": "Route /api/rpps refondue : maxDuration 30s + dynamic force-dynamic + nouvelle fonction fallbackToLocalDump(). Appelée à 3 endroits : (1) mode RPPS exact si ANS KO, (2) multi-query si toutes les sous-requêtes ANS échouent, (3) ANS répond OK mais 0 résultat après filtrage. Format de retour identique à ANS avec champs source='ANS FHIR' ou source='dump_local' + fallback_reason pour debug" },
      { "code": "BE", "txt": "fallbackToLocalDump : importe createClient Supabase dynamiquement, appelle RPC search_rpps_local, normalise les résultats au format ANS (nom/prenom/profession/cp/commune/lat/lng) avec source_record='dump_local' marqué sur chaque ligne. Catch toutes les exceptions, retourne {ok, count, results, duration_ms, fallback_reason}" },
      { "code": "BE", "txt": "Nouvelle route /api/rpps/dump-status : GET qui appelle la RPC rpps_dump_status et retourne {ok, total_records, source_extract_date, last_seed_at, seed_status, seed_message, age_jours, is_fresh (âge<60j), empty (records=0)}. Utilisée par la page admin de pilotage" },
      { "code": "FE", "txt": "Nouvelle page /admin/rpps-dump : (1) carte d'état coloré (vert si fresh, ambre si vieux, rouge si vide) avec KPI records/extract date/last seed/âge jours/statut, (2) zone upload CSV avec parser intégré qui détecte automatiquement le séparateur (;/,/\\t) et fait un mapping flexible des colonnes (identification nationale RPPS, nom d'exercice, prénom d'exercice, libellé profession, etc.), (3) progress bar live + log dépliable, (4) section test fallback avec query libre qui affiche source/durée/fallback_reason, (5) panneau pédagogique workflow" },
      { "code": "FE", "txt": "Page admin : parsing côté client par batchs de 5000 lignes, appel RPC upsert_rpps_dump_batch par batch, yield 10ms entre chaque pour ne pas freezer l'UI, comptage erreurs + total inséré. Truncate de la table avant le seed pour repartir propre. Mise à jour du méta avec statut completed/failed à la fin. Compatible fichiers ~500 Mo en mémoire navigateur" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Dump RPPS (Plan B)' (ti-database-import vert) entre Diagnostic API RPPS et Diagnostic envoi mail" },
      { "code": "AI", "txt": "+29 tests Vitest : SQL (8 : table+PK, colonnes, méta single-row, indices, search_rpps_local, dump_status, RLS, upsert_rpps_dump_batch+truncate+meta_update), Route fallback (6 : maxDuration, fonction fallback, appelée 3× minimum, source dump_local, fallback_reason, normalisation), Route status (3 : exists, RPC, is_fresh+empty), Page admin (10 : exists, statut, upload, séparateur, mapping, batch+RPC, truncate, progress+log, test fallback, meta_update), Menu (1). Total 1628 tests verts (vs 1599)" }
    ],
    "themes": ["rpps", "ai", "ui_ux", "admin"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.56.html",
    "sqlFile": "aveho-PATCH-vers-0.55.56.sql"
  },
  {
    "v": "0.55.55",
    "kind": "version",
    "titre": "📍 AdresseAutocomplete BAN INSEE · auto-fill cp + ville + code commune + lat/lng · intégré dans /patients (modale rapide) et /patient/[id]/edit (3 emplacements)",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant /app/AdresseAutocomplete.js — autocomplete d'adresse via l'API officielle BAN (Base Adresse Nationale, api-adresse.data.gouv.fr). Gratuite, illimitée, sans clé. Debounce 300ms, min 3 caractères, max 8 suggestions. Restriction par code postal possible (postcode param)" },
      { "code": "FE", "txt": "Composant : dropdown stylé avec badges colorés par type (Numéro vert/Rue bleu/Lieu-dit violet/Commune ambre), affichage contexte (département, région), code INSEE 5 chiffres en mono à droite. Source 'data.gouv.fr' mentionnée en pied de dropdown. Click outside ferme. Loader spin pendant fetch" },
      { "code": "FE", "txt": "onSelect renvoie un objet complet : {adresse, code_postal, ville, code_insee (5 chiffres commune), latitude, longitude, label, context, type}. Pas besoin de saisir cp/ville à la main, tout est rempli en 1 clic" },
      { "code": "FE", "txt": "/patients (liste, modale création/édition rapide) : nouveau bloc 'Adresse (recherche BAN)' avec autocomplete + ligne (cp + ville). Si l'user sélectionne une suggestion, tous les champs se remplissent automatiquement (adresse, cp, ville, code_insee_residence, latitude, longitude). Petite aide 'Pour l'adresse complète + livraisons, va dans Édition complète'" },
      { "code": "FE", "txt": "Save() de /patients étendu : payload inclut maintenant adresse, code_postal, ville, code_insee_residence, latitude, longitude. Compatible offline (safeWrite)" },
      { "code": "FE", "txt": "/patient/[id]/edit — onglet Identité : lieu de naissance avec autocomplete commune INSEE. Champs séparés village + code_insee_pays. Quand l'user choisit Paris dans le dropdown, code_insee=75056 se remplit auto" },
      { "code": "FE", "txt": "/patient/[id]/edit — onglet Adresses : adresse principale avec autocomplete BAN qui remplit cp/ville/code_insee_residence/lat/lng. Champs séparés visibles juste après pour ajustement manuel si besoin. + code_insee_residence champ visible (rempli auto, modifiable)" },
      { "code": "FE", "txt": "/patient/[id]/edit — onglet Adresses : adresses de LIVRAISON 1-N utilisent aussi le BAN autocomplete (compact). Si tu tapes une adresse, cp + ville se remplissent automatiquement par adresse" },
      { "code": "SQL", "txt": "Patch 0.55.55 : ajout colonnes idempotentes code_insee_residence text, latitude numeric(10,7), longitude numeric(10,7) sur patients. Index partiels idx_patients_code_insee (where not null) et idx_patients_coords (lat+lng where not null) pour requêtes géo futures" },
      { "code": "AI", "txt": "+22 tests Vitest : composant BAN (10 : exists, API gouv, debounce, min 3 chars, params, postcode, code_insee, lat/lng, badges, source), intégration /patients (4 : import, champ, save payload, aide), intégration /patient/edit (4 : import, identité, adresse principale, livraison 1-N), SQL (4 : colonnes, index, idempotent). Total 1599 tests verts (vs 1577)" }
    ],
    "themes": ["patient", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.55.html",
    "sqlFile": "aveho-PATCH-vers-0.55.55.sql"
  },
  {
    "v": "0.55.54",
    "kind": "version",
    "titre": "🧭 Clarification routes patient : /patient (nu) redirige vers /patients · fil d'Ariane sur fiche et édition",
    "chantiers": [
      { "code": "DOC", "txt": "Précision : il n'y a PAS 2 pages patient. /patients (pluriel) = la LISTE des patients (KPI + tableau + création), accessible depuis le menu. /patient/[id] (singulier + id) = la FICHE 360° d'un patient sélectionné, qui s'ouvre en cliquant sur une ligne du tableau ou via la palette de recherche globale (pas en menu — ça n'aurait pas de sens). Le menu de gauche n'a qu'UNE entrée 'Patients' au pluriel" },
      { "code": "FE", "txt": "Nouveau /patient/page.js : si quelqu'un tape l'URL /patient nue (sans id) → redirect automatique vers /patients (la liste). Plus de page blanche ou 404 dans ce cas" },
      { "code": "FE", "txt": "Fil d'Ariane ajouté en haut de la fiche /patient/[id] : '← Tous les patients / Fiche de Jean DUPONT'. Bouton retour stylé avec hover underline" },
      { "code": "FE", "txt": "Fil d'Ariane sur /patient/[id]/edit : '← Tous les patients / Fiche Jean DUPONT / Édition'. Permet de naviguer en arrière sans utiliser le bouton navigateur" },
      { "code": "AI", "txt": "+9 tests Vitest : redirect /patient → /patients, fil d'Ariane fiche (3), fil d'Ariane édition (3), pas de doublon menu (2). Total 1577 tests verts (vs 1568)" }
    ],
    "themes": ["ui_ux", "patient"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.54.html",
    "sqlFile": null
  },
  {
    "v": "0.55.53",
    "kind": "hotfix",
    "titre": "📧 Fix critique invitation : capture erreur Resend + page /admin/mail-diagnostic + bandeau alerte mail non envoyé",
    "chantiers": [
      { "code": "FIX", "txt": "Bug critique : les invitations ne partent plus, mais l'app annonce 'Invitation envoyée'. Cause : supabase.functions.invoke() ne throw pas en cas d'erreur Resend — il retourne {data, error}, et l'ancien code attrapait seulement les exceptions JS, pas les retours error" },
      { "code": "FE", "txt": "App utilisateurs sendInvite() : capture maintenant {data: invokeData, error: invokeErr}. Si invokeErr, on lit le body de l'erreur (FunctionsHttpError contient un readableStream) via TextDecoder pour extraire le message exact retourné par l'Edge Function. Stocke un mailWarning dans createdInviteLink" },
      { "code": "FE", "txt": "Popup d'invitation : si mailWarning présent, le header passe d'ambré 'mail NON envoyé' (au lieu de vert 'créée'), bandeau rouge explicatif avec la raison Resend exacte + conseil 'copie le lien et envoie-le manuellement (SMS/WhatsApp/mail perso). L'invitation Aveho est bien créée en base'" },
      { "code": "BE", "txt": "Edge Function invite-user v2 : diagnostic complet. Détecte RESEND_API_KEY manquante (msg explicite avec lien Supabase Secrets), décode validation_error mode test Resend (testing emails restriction → message expliquant la vérif de domaine), 401/403 (clé invalide), 429 (rate limit 3000/mois)" },
      { "code": "BE", "txt": "Edge Function v2 : retour enrichi {ok, diagnostic, error, resend_status, resend_body, from_address, to, duration_ms, resend_id?}. Support nouveau secret RESEND_FROM configurable (par défaut 'Aveho EC <onboarding@resend.dev>') pour utiliser une adresse de domaine vérifié" },
      { "code": "FE", "txt": "Nouvelle page /admin/mail-diagnostic : tape un email → l'Edge Function tente l'envoi → affichage détaillé (résultat OK/KO coloré, diagnostic code mono, HTTP status Resend, from/to, durée, body brut dépliable). Panneau pédagogique en bas listant les 5 causes courantes avec leur solution exacte et liens vers resend.com/api-keys et resend.com/domains" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Diagnostic envoi mail' (ti-mail-cog rouge) juste après 'Diagnostic API RPPS'" },
      { "code": "AI", "txt": "+20 tests Vitest : Edge Function v2 (8 : missing_key, RESEND_FROM, test mode, 401/403, 429, diagnostic+status+from/to/body, resend_id, liens doc), App capture invoke (5 : data+error, lecture body, mailWarning, popup ambré, conseil envoi manuel), Page diagnostic (6 : existe, invoke, décode body, KV affichage, pédagogie, liens), Menu (1). Total 1568 tests verts (vs 1548)" }
    ],
    "themes": ["fixes", "users"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.53.html",
    "sqlFile": null
  },
  {
    "v": "0.55.52",
    "kind": "hotfix",
    "titre": "🩹 Fix Service Worker · TypeError chrome-extension scheme · helper safeCachePut",
    "chantiers": [
      { "code": "FIX", "txt": "Bug Service Worker : TypeError 'Failed to execute put on Cache: Request scheme chrome-extension is unsupported'. Les extensions navigateur (LastPass, Dashlane, Grammarly, MetaMask, Honey, etc.) injectent des scripts qui font des requêtes vers chrome-extension://..., moz-extension://..., etc. Ces requêtes passent par le SW de la page mais cache.put() refuse les schémas non-http(s) → throw" },
      { "code": "FE", "txt": "Fix SW : early return dans le handler fetch si req.url ne commence pas par http:// ou https:// — on laisse le navigateur faire son fetch normal sans interception. Couvre chrome-extension, moz-extension, safari-extension, data:, blob:, ws://, wss://, file://" },
      { "code": "FE", "txt": "Ceinture + bretelle : nouveau helper safeCachePut(cache, req, res) qui wrap tous les cache.put() avec try/catch silencieux. Vérifie aussi le schéma de l'URL avant put + ignore les responses opaques (no-cors qu'on ne peut pas servir correctement). Pas de console.error pour éviter le bruit" },
      { "code": "FE", "txt": "cacheFirst, networkFirst (success + retry path), et staleWhileRevalidate utilisent tous safeCachePut maintenant. Plus aucun appel direct à cache.put() qui pourrait throw" },
      { "code": "AI", "txt": "+9 tests Vitest : early return schémas non-http, safeCachePut existe, filtre schémas, ignore opaques, silent fail (pas de console.error), utilisé dans cacheFirst/networkFirst/staleWhileRevalidate, commentaire chrome-extension. Total 1548 tests verts (vs 1539)" }
    ],
    "themes": ["fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.52.html",
    "sqlFile": null
  },
  {
    "v": "0.55.51",
    "kind": "version",
    "titre": "🔧 Fix API SIRENE 502 (maxDuration + AbortController) · Pages stub QR/Code-barre · OCR générique avec Claude Vision",
    "chantiers": [
      { "code": "FIX", "txt": "Bug critique : /api/sirene retournait régulièrement HTTP 502 Bad Gateway en production (vu dans les logs Vercel). Cause : aucune limite maxDuration côté serverless + aucun AbortController côté code → Vercel killait la requête à 10s par défaut, renvoyant 502" },
      { "code": "BE", "txt": "Fix /api/sirene : maxDuration = 30s + dynamic = 'force-dynamic' + AbortController interne 25s (avant le 30s Vercel). Plus AUCUN retour 502 — toutes les erreurs (timeout, network, HTTP not-ok) sont catchées et retournent 200 avec ok:false + message explicite. Format unifié { ok, count, results, error?, duration_ms, timeout? }" },
      { "code": "BE", "txt": "/api/sirene : limite max remontée de 20 → 50 (le user demandait limit=25, ignoré silencieusement avant). User-Agent 'Aveho-EC/0.55' ajouté pour traçabilité. Support param 'commune' (en plus de 'code_postal') pour recherche par nom de ville. Message timeout pédagogique : 'Timeout SIRENE >25s — la requête est trop lourde, essaie avec plus de critères'" },
      { "code": "BE", "txt": "/api/finess : ajout maxDuration = 30s + dynamic = 'force-dynamic' pour éviter le même bug 502 sur les requêtes lourdes" },
      { "code": "FE", "txt": "Nouvelle page /scan/qr (stub) : placeholder qui liste les futurs usages (QR Vitale, étiquettes patient, étabs, matériel, adresses). Stack prévue : html5-qrcode + caméra native" },
      { "code": "FE", "txt": "Nouvelle page /scan/codebarre (stub) : placeholder pour scan GS1/UDI matériel médical, EAN-13, LPP, codes parc Aveho EC. Stack prévue : ZXing + parser Application Identifiers" },
      { "code": "FE", "txt": "Nouvelle page /scan/ocr GÉNÉRIQUE (fonctionnelle) : upload n'importe quel document (prescription, facture, courrier…) → Claude Vision retourne le texte brut. Différence avec /scan/bulletin-situation : pas de schéma JSON forcé, juste l'extraction libre. Textarea éditable + bouton 'Copier dans le presse-papier' + tokens IN/OUT affichés" },
      { "code": "BE", "txt": "Nouvelle route /api/ocr/generic : prompt simple 'Extrais TOUT le texte visible, conserve la structure naturelle, sans markdown'. Modèle claude-sonnet-4, max_tokens 4096, maxDuration 60s. Si image illisible, retourne '(aucun texte détecté)'" },
      { "code": "AI", "txt": "+27 tests Vitest : Fix SIRENE (10 : maxDuration, dynamic, AbortController, no 502, format unifié, limite 50, msg timeout, UA, commune, duration_ms), Fix FINESS (2), Pages stub QR/Code-barre (4 : exist + contenu mentionné), OCR générique page (6 : upload, preview, fetch, textarea, copy, limite, capture), Route OCR générique (5 : env, prompt libre, max_duration, sonnet 4, tokens). Total 1539 tests verts (vs 1512)" }
    ],
    "themes": ["fixes", "ai", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.51.html",
    "sqlFile": null
  },
  {
    "v": "0.55.50",
    "kind": "version",
    "titre": "🤖 OCR bulletin de situation via Claude Vision · 40+ champs extraits automatiquement · Auto-link caisse + mutuelle · Patient créé en 1 photo",
    "chantiers": [
      { "code": "BE", "txt": "Nouvelle route /api/ocr/bulletin-situation : reçoit une image (jpg/png/webp/pdf en base64) et l'envoie à Claude Sonnet 4 via l'API Anthropic (/v1/messages, header anthropic-version 2023-06-01, max_tokens 4096, maxDuration Vercel 60s). Nécessite ANTHROPIC_API_KEY dans les env Vercel" },
      { "code": "BE", "txt": "Prompt structuré (190 lignes) qui demande à Claude d'extraire 40+ champs en JSON strict sans markdown : nom, prenom, nom_naissance, sexe, date_naissance, lieu_naissance ville/code_insee/pays, nationalite, numero_secu (NIR 13 ou 15 chiffres), cle_nir, code_organisme_rattachement, nom_caisse, centre_paiement, regime_secu, qualite_assure, rang_naissance, date_debut/fin_droits, ALD avec commentaire, CMU_C, C2S, AME, mutuelle_nom, mutuelle_numero_amc, mutuelle_numero_adherent, adresse complète, telephones, email, medecin_traitant nom/prenom/RPPS, etablissement_emetteur, date_emission, date_entree/sortie hospit, service, ocr_text_brut (audit), confiance (haute/moyenne/faible)" },
      { "code": "BE", "txt": "Anti-hallucination : prompt explicite 'Ne devine PAS, mets null si pas sûr'. Cleanup automatique des ```json ... ``` au cas où Claude oublie. Si Claude détecte une image illisible/pas un BS → retourne {erreur, ocr_text_brut}. Retour enrichi : tokens IN/OUT pour audit coût, durée ms, modèle utilisé" },
      { "code": "BE", "txt": "Nouvelle route /api/patients/from-ocr : crée le patient à partir des données OCR. Auto-link intelligent : caisse via code_organisme exact (3 premiers chiffres) puis fallback ilike sur nom_caisse, mutuelle via numero_amc exact puis fallback ilike sur raison_sociale. source_creation='ocr_bs', bs_ocr_brut et bs_ocr_date stockés pour audit. Concaténation NIR + clé si séparées" },
      { "code": "FE", "txt": "Page /scan/bulletin-situation REFONDUE — workflow 4 étapes avec stepper visuel : (1) Upload drag&drop + camera mobile (capture='environment' pour ouvrir l'appareil photo direct sur smartphone), formats jpg/png/webp/pdf max 8 Mo, aperçu image avant lancement. (2) Loader 'OCR en cours' avec animation spinner pendant 5-15s d'analyse. (3) Vérification : aperçu image à gauche + formulaire éditable à droite avec sections Identité/Sécu/Mutuelle/Adresse/Médecin, badge confiance coloré (vert/ambre), tokens affichés, OCR brut dépliable. (4) Done : confirmation + bouton 'Compléter la fiche' (redirige vers /patient/[id]/edit) + 'Scanner un autre'" },
      { "code": "FE", "txt": "Champs éditables avant création : si l'OCR a mal lu un caractère, le user corrige avant de valider. Stats référentiels en bas (X caisses, Y mutuelles) pour montrer ce qui est disponible pour auto-liaison" },
      { "code": "AI", "txt": "+35 tests Vitest : route OCR (13 : exists, env var, Claude Sonnet 4, max_tokens, endpoint, header version, types acceptés, prompt JSON strict, champs critiques NIR/AMC/ALD, ocr brut + confiance, cleanup ```, tokens IN/OUT, maxDuration), route from-ocr (7 : auto-link caisse code/nom, mutuelle amc/nom, structure_id, source ocr_bs, bs brut+date, concat NIR), page 4 étapes (12 : workflow, drag&drop+camera, limite, calls APIs+token, édition, aperçu, badge confiance, tokens, brut dépliable, redirect, stats), prompt (3 : 30+ champs, anti-hallucination, ISO date). Total 1512 tests verts (vs 1477)" }
    ],
    "themes": ["patient", "ai", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.50.html",
    "sqlFile": null
  },
  {
    "v": "0.55.49",
    "kind": "version",
    "titre": "👤 Nouvelle page édition fiche patient avec 6 onglets · Intégration CaisseSearch + MutuelleSearch · Gestion 1-N adresses livraison · Fix carte recherche libre (affichage 100%)",
    "chantiers": [
      { "code": "FE", "txt": "Nouvelle page /patient/[id]/edit : édition COMPLÈTE de la fiche patient niveau bulletin de situation. 6 onglets : 🪪 Identité (nom, prenom, nom_naissance, sexe, date+lieu naissance, nationalité, n° dossier), 🛡 Sécu & Mutuelle, 📍 Adresses livraison, 📞 Contacts urgence + personne confiance, 🩺 Médecin traitant, 📄 OCR & audit" },
      { "code": "FE", "txt": "Onglet Sécu : numéro_secu NIR 15 chiffres mono, régime (général/agricole/militaire/fonctionnaire/spécial), qualité (assuré/ayant droit), rang naissance, centre paiement, date début/fin droits, toggles ALD/C2S/AME (avec commentaire ALD conditionnel). Intégration CaisseSearch live — sélection caisse affiche carte bleue avec nom, code, type, dept" },
      { "code": "FE", "txt": "Onglet Mutuelle (dans Sécu) : intégration MutuelleSearch live avec badge couleur type (mutuelle vert / assurance bleu / IP violet) + badge C2S, n° AMC 8 chiffres mono, n° adhérent, dates début/fin droits, tiers payant actif" },
      { "code": "FE", "txt": "Onglet Adresses : adresse principale (sociale) avec rue, complement, cp, ville, pays. Section verte 'Adresses de livraison' 1-N avec ajout/édition/suppression inline : libelle (Domicile/Travail/Maison campagne), destinataire si différent (ex 'Mme X, sa fille'), code_porte digicode mono, instructions livraison ('Sonner 2x'), case 'Principale'. Boutons Sauv. par adresse" },
      { "code": "FE", "txt": "Onglet Contacts : téléphone fixe + portable + email du patient, section ambre 'Personne à prévenir (urgence)' avec nom/prenom/lien parenté/tel, section violette 'Personne de confiance' (loi 4 mars 2002) avec nom/prenom/tel + bandeau pédagogique" },
      { "code": "FE", "txt": "Onglet Médecin traitant : nom, prenom, téléphone, RPPS 11 chiffres mono, FINESS établissement mono, bandeau pédagogique sur le parcours de soins coordonné" },
      { "code": "FE", "txt": "Onglet Audit/OCR : source_creation (manuelle/ocr_bs/import_csv avec emoji), created_at, updated_at, bs_file_url (lien externe vers bulletin scanné), bs_ocr_brut (dépliable avec pre dark si OCR effectué)" },
      { "code": "FE", "txt": "Footer sticky en bas : 'Sauvegardé à HH:MM' + bouton 'Retour fiche' + bouton vert 'Sauvegarder' (loader durant save). Composants Field (input avec label), FieldSelect (dropdown), Toggle (booléens colorés ALD/C2S/AME), KvBlock pour les sections read-only" },
      { "code": "FE", "txt": "Bouton 'Édition complète' ajouté sur la fiche /patient/[id] qui pointe maintenant vers la nouvelle page edit (au lieu de rediriger vers la liste)" },
      { "code": "FIX", "txt": "Carte : recherche libre — bug 'visibles 0' corrigé. Le filtre bbox était trop strict : SIRENE/FINESS sans coords sortaient toujours du filtre. Nouveau : on affiche TOUS les résultats avec coords (sans filtre bbox) ET on auto-fit la carte sur les résultats trouvés. L'user voit immédiatement ce qu'il cherche, où qu'il soit. Console log enrichi : 'total avec coords X / affichés Y'" },
      { "code": "FE", "txt": "Carte : avertissement 'API ANS bloquée — voir diagnostic' affiché en rouge sur le panneau RPPS quand des filtres sont actifs mais résultats = 0 (lien direct vers /admin/rpps-diagnostic)" },
      { "code": "AI", "txt": "+18 tests Vitest : page édition patient (12 : existe, 6 onglets, imports composants, Promise.all charge, hydrate refs, payload complet save, gestion 1-N adresses, champs onglet adresses, secu, audit, sticky save, helpers Field/Toggle), fix recherche libre (4 : plus de bbox, auto-fit, console log, avertissement panneau), lien depuis fiche (1), test obsolete corrigé (1). Total 1477 tests verts (vs 1459)" }
    ],
    "themes": ["patient", "ui_ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.49.html",
    "sqlFile": null
  },
  {
    "v": "0.55.48",
    "kind": "version",
    "titre": "🔬 Diagnostic API RPPS · IP sortante Vercel + status par endpoint + body brut · Page /admin/rpps-diagnostic pour debug en prod",
    "chantiers": [
      { "code": "BE", "txt": "Nouvel endpoint /api/rpps/diagnostic : lance 4 tests en parallèle (Promise.all) — (1) ANS Practitioner family=DUPONT, (2) ANS PractitionerRole city=Paris, (3) ANS Practitioner identifier RPPS exact, (4) BAN data.gouv.fr pour contrôle. Récupère aussi l'IP sortante via api.ipify.org, et les variables d'environnement Vercel (VERCEL_ENV production/preview/dev, VERCEL_REGION cdg1/iad1/etc, Node version)" },
      { "code": "BE", "txt": "Diagnostic intelligent : 4 codes de résumé — OK (vert : 3/3 endpoints répondent), PARTIAL (ambre : 1-2 sur 3), BLACKLISTED (rouge : ≥ 2 retours 403 → l'IP est blacklistée par l'ANS), DOWN (rouge : 0 endpoint OK). Messages explicatifs avec IP affichée. Timeout 10s par requête, AbortController, body tronqué à 800 chars" },
      { "code": "FE", "txt": "Page /admin/rpps-diagnostic : UI complète avec relancer + champ query custom (ex 'Martin'). Affiche en gros : IP sortante (mono violet), hébergeur (Vercel/local), environnement, région Vercel, Node version, durée totale. Bandeau résumé coloré selon diagnostic" },
      { "code": "FE", "txt": "Card par test avec : label, badge status HTTP (vert ok / rouge 403 / ambre autre), durée ms, URL appelée, total FHIR + entries si JSON valide, error message si exception. Détails dépliables : body brut tronqué dans pre dark + headers de réponse (10 premiers)" },
      { "code": "FE", "txt": "Pédagogie intégrée : panneau jaune en bas explique comment lire les codes HTTP (200/403/0/400/500), et 3 solutions si blacklist — (1) Demander whitelist à l'ANS via cyber@esante.gouv.fr avec l'IP affichée, (2) Utiliser un proxy/relay (Cloudflare Workers), (3) Importer le dump RPPS open data depuis data.gouv.fr (mensuel, 1,7M praticiens)" },
      { "code": "FE", "txt": "Entrée menu Administration ajoutée : '🩺 Diagnostic API RPPS' juste après 'Performance SQL'" },
      { "code": "AI", "txt": "+21 tests Vitest : endpoint route (10 : exists, 4 tests parallel, ipify, env Vercel, timeout, body tronqué, 3 codes summary, query custom, no-store), page UI (10 : exists, useEffect mount, bouton + custom, IP en évidence, région, TestCard, pédagogie, 3 solutions, couleur summary), menu (1). Total 1459 tests verts (vs 1438)" }
    ],
    "themes": ["users", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.48.html",
    "sqlFile": null
  },
  {
    "v": "0.55.47",
    "kind": "version",
    "titre": "🗺 Carte : icônes voyantes mes étab + boutons appel/GPS/email/fiche · Recherche libre (orthopédiste, pharmacie, ville…) en parallèle RPPS+SIRENE+FINESS · Type étab verrouillé après création",
    "chantiers": [
      { "code": "FE", "txt": "Page /etablissement/fiche : le type d'établissement (Mon collectivité / Partenaire) est maintenant VERROUILLÉ après création. Boutons remplacés par divs non-clickables avec opacity 0.55 + badge ambré '🔒 Verrouillé après création' + tooltip 'Le type d'établissement ne peut pas être modifié après création'. Bandeau info en bas : 'Pour changer, il faut supprimer puis recréer'. Côté backend : est_partenaire RETIRÉ du payload update — impossible de switcher accidentellement, même via DevTools" },
      { "code": "FE", "txt": "Carte : icône VOYANTE pour mes établissements. Taille 48px (vs 38 pour partenaires), gradient bleu→vert (#185FA5→#5aa05a au lieu du bleu sombre), halo pulsant (animation pulse-mine 2s ease-out infinite, ring blanc 2px, box-shadow étendu rgba verte). Badge popup change : '★ Mon étab' (au lieu de 'Géré') sur fond vert dff5e0" },
      { "code": "FE", "txt": "Popups étab carte enrichis avec 4 boutons d'action en pied (border-top séparateur) : 📞 Appeler (tel: nettoyé des espaces et points) en bleu si téléphone présent, 📍 Itinéraire (google.com/maps/dir/?api=1&destination=lat,lng) en ambre toujours présent, ✉️ Email (mailto:) en vert si email présent, 📄 Fiche (lien vers /etablissement/fiche?id=X pour mine ou /etablissements-partenaires?id=X pour partner) en violet" },
      { "code": "FE", "txt": "Carte : nouvelle barre de RECHERCHE LIBRE en haut du panneau filtres. Tape n'importe quoi : 'orthopédiste', 'boulangerie', 'pharmacie de Mayrinhac', 'Paris'. Debounce 600ms. Cherche en parallèle (Promise.allSettled) dans 3 sources : /api/rpps (praticiens, max 60), /api/sirene (entreprises, max 40), /api/finess (établissements santé, max 40). Géocode les résultats sans coords via BAN, filtre par bbox visible" },
      { "code": "FE", "txt": "Marqueurs recherche libre colorés par source : RPPS violet 🩺, SIRENE vert 🏪, FINESS bleu 🏥. Popup avec boutons actions identiques. Layer Leaflet dédié freeSearchLayerRef pour pouvoir clear/redraw indépendamment. Reverse géocodage BAN du centre de carte pour cibler la recherche sur la zone visible" },
      { "code": "FE", "txt": "Compteur résultats live : badge violet 'X résultats' à droite du label. Bouton × pour clear la recherche. Min 3 caractères avant de chercher (sinon clear). Console logs détaillés [Recherche libre] avec les comptes par source" },
      { "code": "AI", "txt": "+24 tests Vitest : type étab verrouillé (4), icône voyante mine (4), boutons popup (4), recherche libre state/funcs/UI (11), debug logs (1). Total 1438 tests verts (vs 1414)" }
    ],
    "themes": ["ui_ux", "fixes", "search"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.47.html",
    "sqlFile": null
  },
  {
    "v": "0.55.46",
    "kind": "version",
    "titre": "🏥 Refonte fiche patient niveau bulletin de situation · Tables caisses + mutuelles (seed 100+) · Adresses livraison séparées · Nouveau menu Outils scan (QR/code-barre/OCR) · Page placeholder bulletin de situation",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.46 : nouvelle table caisses_assurance_maladie (code_organisme unique, type CPAM/MSA/CGSS/CSSM, regime, departement, region, adresse, ville). Seed 105 lignes : 96 CPAM métropole + 5 CGSS/CSSM DROM + régimes spéciaux (CNMSS militaires, LMG fonctionnaires, CAMIEG, CAVIMAC, MNH, MSA agricole)" },
      { "code": "SQL", "txt": "Nouvelle table mutuelles (numero_amc 8 chiffres unique, raison_sociale, type 'mutuelle'/'assurance'/'IP', categorie, gere_c2s pour Complémentaire Santé Solidaire). Seed 44 mutuelles principales : Harmonie, MGEN, Malakoff Humanis, AG2R, Mutuelle Générale, AÉSIO, Pro BTP, Mutex, MGEFI, MGP, UNEO, etc. avec leurs n° AMC connus publiquement" },
      { "code": "SQL", "txt": "Nouvelle table patients_adresses_livraison (1-N par patient) : libelle ('Domicile', 'Travail', 'Maison campagne'), destinataire (si différent), adresse complète, code_porte digicode, instructions de livraison ('Sonner 2x', 'Au fond de la cour'), est_principale. RLS via membres_structure" },
      { "code": "SQL", "txt": "20+ colonnes ajoutées sur table patients (idempotent via ADD COLUMN IF NOT EXISTS) : Identité (nom_naissance, sexe, lieu_naissance_ville/code_insee/pays, nationalite). Sécu (numero_secu NIR, caisse_id FK, code_organisme_rattachement, centre_paiement, regime_secu, qualite_assure, rang_naissance, date_debut/fin_droits, ald, ald_commentaire, cmu_c, c2s, ame). Mutuelle (mutuelle_id FK, mutuelle_numero_amc, mutuelle_numero_adherent, mutuelle_date_debut/fin_droits, tiers_payant_actif). Adresse (adresse, complement, code_postal, ville, pays). Contact (telephone_fixe, telephone_portable, email). Urgence (contact_urgence_nom/prenom/lien/telephone, personne_confiance_*). Médecin traitant (medecin_traitant_prenom/telephone/rpps/finess). Audit (source_creation, bs_file_url, bs_ocr_brut, bs_ocr_date, updated_at via trigger)" },
      { "code": "SQL", "txt": "2 RPCs : search_caisses(p_query, p_dept, p_limit) et search_mutuelles(p_query, p_limit). Indexées + tolérantes à la casse. Visible par tous les authentifiés (référentiel public)" },
      { "code": "BE", "txt": "Routes API /api/caisses (params q/dept/code) et /api/mutuelles (params q/amc). Proxy léger via Supabase RPC. Retournent {ok, count, results}" },
      { "code": "FE", "txt": "Nouveaux composants autocomplete CaisseSearch et MutuelleSearch (style FinessSearch). Recherche live 300ms. CaisseSearch a un champ dept à côté + détection 9 chiffres = code organisme. MutuelleSearch détecte 8 chiffres = n° AMC, badges type (mutuelle vert / assurance bleu / IP violet) + badge C2S si gestionnaire" },
      { "code": "FE", "txt": "Nouvelle catégorie de menu 'Outils scan' en 2ème position (juste après Mon espace, donc tout en haut). 4 entrées : 'Créer patient depuis bulletin' (file-scan vert), 'Scan QR code' (qrcode bleu), 'Scan code-barre' (barcode violet), 'OCR générique' (text-recognition ambre)" },
      { "code": "FE", "txt": "Page placeholder /scan/bulletin-situation : explique le workflow (4 étapes), compteurs des référentiels disponibles (caisses, mutuelles, FINESS 540k+, RPPS 1,7M), stack technique prévue (Tesseract.js ou Claude Vision pour OCR, regex extraction NIR/AMC, archivage Supabase bucket). L'OCR complet arrive en 0.55.47" },
      { "code": "AI", "txt": "+26 tests Vitest : tables (4), seed contenu (3), colonnes patient (6), adresses livraison (3), composants UI (2), APIs (2), menu (1), page placeholder (2), formats n° AMC/code (2), divers (1). Total 1414 tests verts (vs 1388)" }
    ],
    "themes": ["patient", "users", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.46.html",
    "sqlFile": "aveho-PATCH-vers-0.55.46.sql"
  },
  {
    "v": "0.55.45",
    "kind": "version",
    "titre": "🔍 Refonte recherche RPPS : multi-critères en parallèle (nom OU ville) · API audit + debug · /partenaires-rpps en autocomplete · Carte RPPS améliorée (reverse géocodage + limites)",
    "chantiers": [
      { "code": "BE", "txt": "Audit API ANS FHIR : depuis le sandbox dev → 403 Forbidden (IP probablement blacklistée). En production sur Vercel, l'IP française devrait passer. L'API ANS distingue strictement family/given/city/postalcode — taper 'Paris' en family= retourne forcément 0 (personne ne s'appelle Paris en famille)" },
      { "code": "BE", "txt": "Refonte complète /api/rpps : recherche INTELLIGENTE en PARALLÈLE. Si l'user tape 'Paris' → 2 requêtes simultanées via Promise.all : (1) Practitioner?name=Paris (au cas où nom propre), (2) PractitionerRole avec location.address-city=Paris + _include practitioner. Merge des Practitioners + dédup par RPPS+adresse" },
      { "code": "BE", "txt": "Limite par défaut remontée de 20 → 50 et max passe de 100 → 200 pour éviter de brider. Helper fetchFhir() avec timeout 12s + AbortController + User-Agent 'Aveho-EC/0.55' + headers complets" },
      { "code": "BE", "txt": "Messages d'erreur enrichis : si 403 → 'API ANS bloquée (403 Forbidden) — vérifier IP en production'. Si timeout → 'API ANS indisponible (HTTP timeout)'. Champs debug ajoutés à la réponse : duration_ms, queries_count, success_count, error_count, pracs_found, roles_found" },
      { "code": "BE", "txt": "Gestion des PractitionerRole multiples : un même praticien peut avoir plusieurs adresses (cabinets multiples). On crée maintenant une entrée par rôle pour les afficher tous, puis dédup par RPPS+cp+commune" },
      { "code": "FE", "txt": "RppsAutocomplete : limite remontée de 10 → 50, messages d'erreur affichés dans le dropdown (au lieu de just résultats vides). Si l'API ANS répond mais 0 résultat → message clair. Si l'API échoue → l'erreur s'affiche" },
      { "code": "FE", "txt": "Page /partenaires-rpps refondue : remplacement complet de RppsSearch (avec bouton 'Rechercher' bloquant) par RppsAutocomplete (live au fur et à mesure de la frappe). Astuce affichée dans la modale : 'tape un nom OU une ville'. Le bouton Rechercher est SUPPRIMÉ" },
      { "code": "FE", "txt": "Carte RPPS : reverse géocodage BAN INSEE pour trouver le nom de la ville au centre de la carte → utilisé comme critère 'ville' dans l'appel /api/rpps. Cache par tile (lat.toFixed(2) + lng.toFixed(2)) en localStorage" },
      { "code": "FE", "txt": "Carte RPPS : limite remontée de 30 → 100 par profession. Console logs détaillés pour debug : '[Carte RPPS] Médecin → 47 résultats', '[Carte RPPS] résultats finaux 23 / total fetchés 94' (utile pour comprendre pourquoi 0 sur la carte)" },
      { "code": "AI", "txt": "+15 tests Vitest : détection capitale (2), limites (1), dédup par RPPS+adresse (1), messages erreur 403/timeout (2), min 2 chars autocomplete (3), carte RPPS (3), page /partenaires-rpps utilise autocomplete (1), headers UA (1), parallel Promise.all (1). Total 1388 tests verts (vs 1373)" }
    ],
    "themes": ["users", "fixes", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.45.html",
    "sqlFile": null
  },
  {
    "v": "0.55.44",
    "kind": "hotfix",
    "titre": "🩹 Fix SQL 'column rpps does not exist' · Colonne rpps + adeli + profession + specialite ajoutées sur etablissements_partenaires AVANT les index",
    "chantiers": [
      { "code": "FIX", "txt": "Bug SQL 'ERROR 42703: column rpps does not exist' lors de l'exécution du patch 0.55.43 : la table etablissements_partenaires n'avait pas encore de colonne rpps mais le patch tentait de créer un index dessus. Ordre des instructions incorrect" },
      { "code": "SQL", "txt": "Patch 0.55.44 : ALTER TABLE etablissements_partenaires ADD COLUMN IF NOT EXISTS rpps text, adeli text, profession text, specialite text (toutes idempotentes). Puis recrée les 3 colonnes traçabilité doublon. PUIS les 5 index. PUIS la RPC check_etab_doublon. PUIS la vue v_doublons_forces. Tout dans le bon ordre" },
      { "code": "SQL", "txt": "Le patch 0.55.43 a été corrigé aussi (ajout colonnes rpps en première instruction) pour quiconque le rejouerait. Hotfix 100% idempotent — peut être rejoué même si 0.55.43 a partiellement échoué" },
      { "code": "AI", "txt": "+6 tests Vitest : colonne rpps ajoutée, ordre col avant index, autres colonnes RPPS, patch 0.55.43 corrigé, idempotence (IF NOT EXISTS partout), RPC recréée. Total 1373 tests verts (vs 1367)" }
    ],
    "themes": ["fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.44.html",
    "sqlFile": "aveho-PATCH-vers-0.55.44.sql"
  },
  {
    "v": "0.55.43",
    "kind": "version",
    "titre": "🛡 Système anti-doublon réutilisable · RPC check_etab_doublon · Composant DoublonAlert + EtabAutoFiller · Nouveau droit force_doublon_etab · Commentaire obligatoire avec traçabilité",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.43 : 3 nouvelles colonnes sur etablissements ET etablissements_partenaires : doublon_force_commentaire (texte), doublon_force_par (uuid → auth.users), doublon_force_at (timestamptz). Index sur finess/siret/rpps pour lookup rapide. Tout en IF NOT EXISTS / ADD COLUMN IF NOT EXISTS donc idempotent" },
      { "code": "SQL", "txt": "Nouvelle RPC check_etab_doublon(p_finess, p_siret, p_siren, p_rpps, p_nom, p_exclude_id) qui scanne mes étab ET les partenaires de la structure courante, matche sur n'importe lequel des identifiants, retourne jsonb { ok, found, count, matches[] } avec pour chaque match : kind (mine/partner), id, nom, type, adresse, identifiants matchés, et l'éventuel commentaire de force précédent" },
      { "code": "SQL", "txt": "Vue v_doublons_forces qui liste tous les doublons forcés (mine + partner) avec leur commentaire et auteur — pour audit admin. security_invoker pour respecter RLS" },
      { "code": "FE", "txt": "Nouveau composant /app/components/DoublonAlert.js : encart ambre avec icône triangle ⚠, liste des fiches existantes avec badge 'Mon étab'/'Partenaire', adresse complète, identifiants matchés mis en évidence, lien direct vers chaque fiche. Si commentaire de force précédent → affiché en italique. 2 actions : Annuler la création / Créer quand même (avec commentaire)" },
      { "code": "FE", "txt": "DoublonAlert : si admin (droit force_doublon_etab) → bouton 'Créer quand même' qui ouvre un textarea obligatoire ≥ 10 caractères. Si pas admin → message 'Seul un admin peut forcer la création d'un doublon. Contactez votre référent.' Validation côté UI puis enregistrement en base avec qui/quand/pourquoi" },
      { "code": "FE", "txt": "Nouveau composant /app/components/EtabAutoFiller.js : regroupe FinessSearch + SireneSearch + RppsAutocomplete dans un seul bloc compact réutilisable. Props : show=['finess','sirene','rpps'] pour filtrer les sources actives, callbacks onSelect séparés. Mode compact (sans titre) ou bloc violet (avec)" },
      { "code": "FE", "txt": "Helper /app/lib/checkEtabDoublon.js : wrapper autour de la RPC qui retourne format normalisé. Try/catch pour gérer erreurs. Pas de check si aucun critère fourni (return early avec found:false)" },
      { "code": "FE", "txt": "Intégration dans /etablissements-partenaires (modale création) : DoublonAlert affiché si check trouve un match. State doublons + doublonForceCommentaire. Save() vérifie d'abord les doublons, si trouvé bloque et affiche l'alerte. Si admin force avec commentaire → enregistre doublon_force_commentaire + doublon_force_par + doublon_force_at" },
      { "code": "FE", "txt": "Intégration dans /etablissements (création depuis FINESS/SIRENE) : remplace l'ancien check 'simple' qui ne regardait que les FINESS de mes étab. Désormais utilise checkEtabDoublon qui scanne aussi les partenaires + matche sur siret/siren/nom. Bloque la création tant que pas confirmé" },
      { "code": "BE", "txt": "Nouveau droit dans lib/useAuth.js : 'force_doublon_etab' avec format objet { module: 'doublons', perm: 'write' } pour ne matcher QUE ce module précis (pas les autres modules write). canDo() étendu pour supporter ce format ciblé en plus du format string existant" },
      { "code": "FE", "txt": "Nouveau module 'doublons' dans la liste MODULES de la page /utilisateurs : permission 'write' = peut forcer la création d'un doublon avec commentaire. Visible dans la modale d'édition de rôle, à activer pour les administrateurs qui ont vraiment besoin de cette possibilité" },
      { "code": "AI", "txt": "+18 tests Vitest : canDo() ciblée par module (6 — admin, lecture, doublons.write, doublons.read insuffisant, etablissement.write ne déborde pas, wildcard), helper checkEtabDoublon (3 — pas de check sans critère, appel RPC, gestion erreur), validation commentaire (3 — short/long/trim), SQL contient les colonnes et RPC (3), EtabAutoFiller (2), module doublons (1). Total 1367 tests verts (vs 1349)" }
    ],
    "themes": ["users", "rls_securite", "patient"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.43.html",
    "sqlFile": "aveho-PATCH-vers-0.55.43.sql"
  },
  {
    "v": "0.55.42",
    "kind": "version",
    "titre": "🩺 Composant RppsAutocomplete style FinessSearch/SireneSearch · Dropdown live au fur et à mesure de la frappe · Photo Google au survol · Boutons Appeler/Mail/GPS sur chaque résultat · Intégré dans création partenaire (3ème ligne)",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant /app/RppsAutocomplete.js (style FinessSearch.js et SireneSearch.js) : 1 seul input avec selecteur profession compact à gauche, dropdown live au fur et à mesure de la frappe avec debounce 350ms, fermeture au clic extérieur. Recherche min 2 caractères (ou profession active). Détection auto numéro RPPS (11 chiffres) → recherche exacte" },
      { "code": "FE", "txt": "Tuiles dropdown enrichies : avatar 38x38 avec photo Google au survol (sinon gradient bleu/teal), nom + civilité + badge profession, spécialité avec icône prescription, adresse complète avec map-pin, RPPS/ADELI mono en footer. Hover light gris (#f4f7fa)" },
      { "code": "FE", "txt": "Photo Google au survol : useEffect au mouseEnter qui appelle /api/place avec nom+adresse complete. Mémoïzation par RPPS (jamais re-fetch). Si pas de clé Google ou pas de photo trouvée → fallback gradient sans casser le rendu. Cache localStorage 7j par requête" },
      { "code": "FE", "txt": "Boutons ContactActions (Appeler tel:, Mail mailto:, GPS popup choix Maps/Apple/Waze/OSM/Copier) intégrés sur chaque résultat — visibles tout le temps, pas seulement au survol. Cliquables sans déclencher la sélection (stopPropagation)" },
      { "code": "FE", "txt": "9 professions dans le select compact : Toutes / Médecin / Infirmier / Kinésithérapeute / Pharmacien / Sage-femme / Dentiste / Pédicure / Orthophoniste. Changement de profession → relance la recherche live" },
      { "code": "FE", "txt": "Intégration dans /etablissements-partenaires modale création : 3ème ligne 🩺 RPPS (en plus de 🏥 FINESS et 🏢 SIRENE). Sélection d'un praticien → pré-remplit nom (avec civilité), type (Cabinet médical si médecin sinon profession), type_relation (Prescripteur par défaut), adresse, cp, ville, téléphone, email. Garde l'existant si déjà rempli (form.nom || ...)" },
      { "code": "AI", "txt": "+13 tests Vitest : logique search (4), construction params API (3), hover Google photo (3), intégration création partenaire (2), 9 professions (1). Total 1349 tests verts (vs 1336)" }
    ],
    "themes": ["users", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.42.html",
    "sqlFile": null
  },
  {
    "v": "0.55.41",
    "kind": "hotfix",
    "titre": "🩹 Fix géoloc bloquée sur ancienne position (cache 24h) · Fix filtres carte RPPS/SIRENE vides (géocodage BAN INSEE) · Bouton 'Recentrer' fresh · Indicateur précision + heure de maj",
    "chantiers": [
      { "code": "FIX", "txt": "Bug géoloc bloquée sur Lagny au lieu de Mayrinhac (vraie ville) : le code lisait toujours localStorage avec un TTL de 24h. Désormais le bouton 'Ma position' force TOUJOURS un nouvel appel getCurrentPosition avec maximumAge: 0 (jamais de cache) et enableHighAccuracy: true (utilise le GPS si dispo au lieu de la triangulation IP)" },
      { "code": "FIX", "txt": "Timeout porté de 8s à 15s pour laisser le GPS faire son fix (sur PC fixe sans GPS, ça utilise la triangulation Wi-Fi qui peut prendre plus de temps). Messages d'erreur enrichis : si code 1 (refus) → instructions navigateur précises (Chrome cadenas, Edge permissions, mobile paramètres). Si code 3 (timeout) → vérifier Windows Paramètres → Confidentialité → Localisation" },
      { "code": "FE", "txt": "Nouvel indicateur visuel sous le bouton 'Ma position' : '±50m · maj à l'instant' avec couleur verte si précision GPS (<1km) ou rouge si précision IP (>1km). Helper formatRelativeTime() pour l'affichage (à l'instant / il y a X min / X h / X j). États geolocLoading, lastGeolocAt, geolocAccuracy" },
      { "code": "FIX", "txt": "Bug filtres carte RPPS et SIRENE : 0 résultat affiché parce que l'API FHIR ANS ne renvoie pas de lat/lng et l'API SIRENE ne les renvoie pas systématiquement. Solution : nouvelle fonction geocodeBatch() qui géocode chaque résultat via l'API BAN INSEE (api-adresse.data.gouv.fr/search) à partir de l'adresse complète (adresse + cp + commune). Cache localStorage par query pour éviter les requêtes répétées" },
      { "code": "FE", "txt": "API SIRENE proxy /api/sirene supporte maintenant les params lat/lng/radius=50km pour recherche par proximité géographique (recentre les résultats sur la zone visible). Avant : recherche nationale qui filtrait après → ratio résultats / bbox catastrophique. Désormais : recherche localisée → la plupart des résultats sont dans la bbox" },
      { "code": "FE", "txt": "Hints UI ambres si 0 résultat sur RPPS ou SIRENE : 'Aucun praticien trouvé dans la zone visible. Zoome plus large ou déplace la carte vers une grande ville.' Évite la confusion 'pourquoi rien ne s'affiche ?'" },
      { "code": "AI", "txt": "+17 tests Vitest : options géoloc (2), formatRelativeTime (5), geocodeBatch logique (3), URL BAN INSEE (1), params SIRENE (1), filtre bbox post-géocodage (3), avertissement précision (2). Total 1336 tests verts (vs 1319)" }
    ],
    "themes": ["fixes", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.41.html",
    "sqlFile": null
  },
  {
    "v": "0.55.40",
    "kind": "hotfix",
    "titre": "🩹 Fix SQL 42P17 'functions in index expression must be marked IMMUTABLE' · date_trunc() retiré de l'index · Les 2 autres index suffisent pour la perf",
    "chantiers": [
      { "code": "FIX", "txt": "Bug SQL 'ERROR 42P17: functions in index expression must be marked IMMUTABLE' lors de l'exécution du patch 0.55.39 : l'index idx_api_usage_month utilisait date_trunc('month', created_at) qui n'est pas marqué IMMUTABLE en PostgreSQL (car le fuseau horaire peut influencer le résultat avec timestamptz). PostgreSQL refuse les fonctions non-IMMUTABLE dans les expressions d'index" },
      { "code": "SQL", "txt": "Patch 0.55.40 : drop index if exists idx_api_usage_month (silencieux si jamais créé), garde les 2 autres index utiles (idx_api_usage_api sur api_name+created_at desc et idx_api_usage_struct sur structure_id+created_at). PostgreSQL utilise un range scan sur created_at desc pour le filtre 'where created_at >= date_trunc month' donc les perfs restent identiques" },
      { "code": "SQL", "txt": "Patch 0.55.40 100% idempotent et auto-suffisant : recrée la table api_usage_log (IF NOT EXISTS), les RLS policies (do $$ if exists $$), la vue v_api_usage_current_month, les 3 RPCs (get_api_usage_stats, log_api_call, cleanup_old_api_logs). Tu peux jouer ce patch même si le 0.55.39 a partiellement échoué" },
      { "code": "SQL", "txt": "Le patch 0.55.39 a été corrigé aussi (l'index sur date_trunc supprimé) pour quiconque le rejouerait. Note ajoutée en commentaire expliquant pourquoi" },
      { "code": "AI", "txt": "+6 tests Vitest : vérification que les fichiers SQL ne contiennent plus date_trunc dans les CREATE INDEX, drop explicite de l'ancien, 2 autres index conservés, idempotence (IF NOT EXISTS), DO $$ pour policies. Total 1319 tests verts (vs 1313)" }
    ],
    "themes": ["fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.40.html",
    "sqlFile": "aveho-PATCH-vers-0.55.40.sql"
  },
  {
    "v": "0.55.39",
    "kind": "version",
    "titre": "🔌 Compteur de requêtes API + page Paramètres > Intégrations · .env.local avec clé Google Places · Login info biométrie · SQL log_api_call + get_api_usage_stats",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.39 : table api_usage_log (id, structure_id, user_id, api_name, endpoint, status [ok/error/no_key/cache_hit], http_status, error_message, duration_ms, created_at). Index sur api_name + date_trunc('month') pour les agrégats rapides. Vue v_api_usage_current_month qui groupe par api_name avec calls_ok/error/cached/total + avg_duration_ms. RPCs : get_api_usage_stats() (admin), log_api_call() (utilisé par les route handlers), cleanup_old_api_logs() (nettoie > 90 jours). RLS : insert pour tous authentifiés, select uniquement pour parametres_admin" },
      { "code": "BE", "txt": "Modification de /api/place : logger chaque appel via la RPC log_api_call avec endpoint (findplacefromtext / details / no_key / exception), status, duration_ms. Best-effort try/catch — n'a JAMAIS d'impact sur la réponse à l'utilisateur même si Supabase down" },
      { "code": "FE", "txt": "Nouvelle page /parametres/integrations : 5 cartes (Google Places, RPPS, FINESS, SIRENE, BAN INSEE) avec pour chacune : statut connecté/non configuré (badge vert/rouge), total des appels du mois, succès/erreurs, temps moyen, barre de quota (Google Places : 1000/mois gratuits, ~$17/1000 ensuite, autres APIs gratuites). Auto-detect si la clé Google Places est configurée côté serveur" },
      { "code": "FE", "txt": "Pour les APIs nécessitant une clé non configurée (Google Places) : bloc informatif ambre avec procédure étape par étape (lien doc, ajout sur Vercel Settings → Environment Variables, redeploy). Lien direct vers la documentation officielle de chaque API" },
      { "code": "CFG", "txt": "Fichier .env.local créé (dans .gitignore — JAMAIS poussé sur GitHub) avec GOOGLE_PLACES_API_KEY. ⚠ La clé partagée dans le chat est COMPROMISE — à régénérer absolument sur Google Cloud Console + restreindre par référent HTTP. Fichier .env.local.example mis à jour avec la procédure complète" },
      { "code": "FE", "txt": "TopBar : nouveau lien 'Intégrations API' (icône ti-plug bleu Google) dans le menu admin, juste après 'Paramètres'. Accès restreint via parametres_admin" },
      { "code": "FE", "txt": "Login : message d'astuce 'Active la biométrie dans Mon profil' qui s'affiche dès qu'un email est saisi ET que WebAuthn est supporté ET que pas de méthode biométrique enregistrée pour cet email. Aide à comprendre pourquoi les boutons biométriques ne s'affichent pas" },
      { "code": "AI", "txt": "+14 tests Vitest : .env.local + .gitignore (2), schéma SQL (2), page intégrations 5 APIs (3), calcul coût (4), login biométrie hint (2), logging best-effort (1). Total 1313 tests verts (vs 1299)" }
    ],
    "themes": ["users", "ui_ux", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.39.html",
    "sqlFile": "aveho-PATCH-vers-0.55.39.sql"
  },
  {
    "v": "0.55.38",
    "kind": "version",
    "titre": "🗺 Filtres carte RPPS + SIRENE croisés (en plus de FINESS) · Wikipedia retiré · Google Places API préparé (photo + horaires + étoiles + avis) · Popup d'alerte 20s · SQL préférences alertes Google par étab · Modal avec étoiles de notation",
    "chantiers": [
      { "code": "FE", "txt": "EtabPhoto Wikipedia COMPLÈTEMENT RETIRÉ : les photos ne correspondaient pas à l'adresse (Wikipedia matche le premier hit textuel sans vérifier la géoloc). Remplacé par un système basé sur Google Places API qui interroge par 'nom + adresse complète' garantissant que la photo correspond vraiment à l'endroit" },
      { "code": "FE", "txt": "Nouveau composant EtabPhoto.js qui appelle /api/place (proxy serveur). Si GOOGLE_PLACES_API_KEY définie côté serveur (dans .env Vercel) → photo Google + note + nb d'avis + horaires. Sinon → fallback gradient propre selon le type. Cache localStorage 7 jours" },
      { "code": "BE", "txt": "Nouveau route handler /api/place qui proxifie Google Places API (sécurise la clé côté serveur). 2 appels : findplacefromtext pour récupérer le place_id, puis details pour les fields (photos, rating, user_ratings_total, opening_hours, formatted_phone_number, website, url, name, formatted_address). Cache Next.js 24h" },
      { "code": "FE", "txt": "Nouveau composant EtabGoogleDetails.js : affiche dans une modale les détails Google d'un établissement — étoiles de notation visuelles (★★★★⯨ avec demi-étoile), nombre d'avis, statut Ouvert maintenant/Fermé, horaires d'ouverture par jour, téléphone/site/lien Google Maps avec icônes. Bouton 'Voir les avis Google' qui ouvre la page Google Maps de l'établissement" },
      { "code": "SQL", "txt": "Patch 0.55.38 : table user_review_alert_prefs (préférences alertes commentaires Google par utilisateur ET par établissement, avec min_rating/max_rating pour filtrer ex: 'alerte si avis ≤ 2 étoiles'). Table google_reviews_seen (historique pour ne pas re-notifier le même avis). RPCs get_my_review_alert_prefs() et set_review_alert_pref(). RLS activées" },
      { "code": "FE", "txt": "Composant AlertToast.js avec API globale showAlert() : popup en bas à droite qui disparaît automatiquement après 20s. Supporte alertes multiples empilées. Barre de progression du timer animée en bas. Couleur selon rating (vert ≥4★, ambre 3★, rouge ≤2★). Click sur l'alerte → action custom (redirection vers la fiche etab). AlertToastContainer monté dans layout.js" },
      { "code": "FE", "txt": "Carte /carte : 3 nouveaux panels de filtres en plus du FINESS — RPPS (8 professions avec couleurs et emojis : Médecin 🩺 bleu, Infirmier 💉 vert, Kiné 🤸 ambre, Pharmacien 💊 rouge, Sage-femme 🤰 violet, Dentiste 🦷 teal, Pédicure 🦶 dark teal, Orthophoniste 🗣 violet foncé). SIRENE (5 catégories : pharmacies, matériel médical, orthopédie, audioprothésistes, opticiens)" },
      { "code": "FE", "txt": "Carte : 3 layers Leaflet séparés (finessOverlay, rppsOverlay, sireneOverlay). Marqueurs custom différenciés (cercle pour FINESS, cercle plus petit pour RPPS, carré arrondi pour SIRENE entreprises). Refresh auto au déplacement de la carte (debounce 800ms). Compteur de résultats par layer" },
      { "code": "FE", "txt": "Carte : popups marqueurs enrichies avec emoji + badge profession (RPPS) ou badge SIRENE + nom + spécialité + adresse + tel + ID officiel. Croisement possible : on peut activer FINESS + RPPS + SIRENE en même temps pour voir un quartier complet" },
      { "code": "AI", "txt": "+18 tests Vitest : Wikipedia retiré + /api/place utilisé (2), réponse sans clé (2), RatingStars logique (3), AlertToast system (5), filtres carte (3), schéma SQL (3). Total 1299 tests verts (vs 1281)" }
    ],
    "themes": ["users", "ui_ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.38.html",
    "sqlFile": "aveho-PATCH-vers-0.55.38.sql"
  },
  {
    "v": "0.55.37",
    "kind": "hotfix",
    "titre": "🩹 Fix version login (0.1 → dynamique pkg) · Retry RPPS name= si family= retourne 403 (ex: 'lacroix') · AddressAutocomplete INSEE BAN intégré sur fiche partenaire + fiche user · Features list login mise à jour (FINESS/SIRENE/RPPS/biométrie)",
    "chantiers": [
      { "code": "FIX", "txt": "Bug 'Version Alpha 0.1' hardcoded dans le popup de connexion : remplacé par <code>{pkg.version.replace(/-alpha$/, '')}</code> dynamique. Tooltip 'Build 0.55.37-alpha' au survol. Synchronisé automatiquement à chaque bump de version" },
      { "code": "FIX", "txt": "Bug RPPS 'API ANS HTTP 403' sur le nom 'lacroix' (et d'autres) : l'API ANS rejette certains noms via le paramètre family=. Désormais : si family= retourne 403 ou 400 et que le nom fait 2+ caractères, retry automatique avec name= (paramètre FHIR plus permissif qui cherche sur l'ensemble des champs name). Message d'erreur amélioré : 'API ANS HTTP 403. Essayez avec un autre nom ou ajoutez un critère (ville, profession).'" },
      { "code": "FE", "txt": "Login mis à jour avec les évolutions récentes : 5 features listées au lieu de 3 — Multi-établissements + partenaires (FINESS, SIRENE, RPPS), Annuaire RPPS national 1,7M praticiens API FHIR ANS, Connexion biométrique (empreinte + reconnaissance faciale), Plan de l'établissement, HDS+RGPD. Icônes adaptées (ti-building-community, ti-stethoscope, ti-fingerprint, ti-bed, ti-shield-check)" },
      { "code": "FE", "txt": "AddressAutocomplete (BAN INSEE api-adresse.data.gouv.fr, gratuit sans clé) intégré dans la modale création/édition de /etablissements-partenaires : remplace l'input adresse simple par un champ avec suggestions live. onSelect remplit automatiquement adresse + cp + ville + latitude + longitude. Badge vert '(autocomplétée INSEE)' à côté du label" },
      { "code": "FE", "txt": "AddressAutocomplete aussi intégré dans /utilisateurs (fiche détaillée d'un user, onglet info personnelle) : le champ 'Adresse postale' devient autocomplété. Badge vert (autocomplétée INSEE) visible" },
      { "code": "AI", "txt": "+16 tests Vitest : version dynamique (2), features list (3), RPPS retry conditions (6), message d'erreur (2), AddressAutocomplete onSelect (2), hint UI (1). Total 1281 tests verts (vs 1265)" }
    ],
    "themes": ["fixes", "users", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.37.html",
    "sqlFile": null
  },
  {
    "v": "0.55.36",
    "kind": "version",
    "titre": "📸 Photos établissements via Wikipedia API (gratuit, sans clé) · Bannières dans /vue-globale, /etablissement/fiche, /etablissements-partenaires · Cache localStorage 7 jours · Fallback gradient par type",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant EtabPhoto.js réutilisable : tente de récupérer une photo de l'établissement via l'API Wikipedia FR (gratuite, sans clé, CORS OK avec origin=*). Requête en un seul appel via generator=search + prop=pageimages + pithumbsize=600. Si succès → affiche l'image en cover. Sinon → fallback gradient + icône colorée par type" },
      { "code": "FE", "txt": "Mapping type → icône+gradient : Hôpital (bleu hospital), EHPAD (violet community), Clinique (vert stethoscope), Cabinet (ambre prescription), Pharmacie (rouge pill), Fournisseur (teal truck), Sous-traitant (ambre handshake), Autre (gris building). Détection par prefix dans le type (4 premiers chars lowercase)" },
      { "code": "FE", "txt": "Cache intelligent à 2 niveaux : (1) Mémoire RAM via Map() pour éviter les requêtes parallèles concurrentes pendant la session, (2) localStorage avec TTL 7 jours. Cache aussi les ÉCHECS (URL vide) pour ne pas re-tenter inutilement la même recherche. Clé cache = nom|ville" },
      { "code": "FE", "txt": "Skeleton loader animé (gradient 90deg animé) pendant la requête Wikipedia. Affichage de la photo en background-image avec gradient overlay foncé en bas pour lisibilité du texte. Watermark discret 'Wikipedia' en bas à droite pour attribution" },
      { "code": "FE", "txt": "Intégration dans /vue-globale : remplace le simple gradient dans .mag-photo par EtabPhoto avec hauteur 140px. Le badge 'PARTENAIRE' violet est conservé en overlay top-right avec z-index 2" },
      { "code": "FE", "txt": "Intégration dans /etablissement/fiche : bannière full-width 180px en haut de page avec dégradé navy bas → transparent haut + nom de l'établissement + type + ville + badge FINESS en overlay. Effet hero comme sur Booking/Airbnb" },
      { "code": "FE", "txt": "Intégration dans /etablissements-partenaires : bannière 100px en tête de chaque tuile + avatar coloré 44x44 (selon type_relation) qui chevauche la photo (margin-top négatif, border 2px blanc, shadow). Hover lift effet (translateY -2px + shadow)" },
      { "code": "FE", "txt": "Modale édition partenaire : bannière photo 140px en haut avec overlay sombre gradient bas + nom + ville. Look pro et identifiable d'un coup d'œil. Affichage uniquement en mode édition (pas en création vu qu'on n'a pas encore les infos)" },
      { "code": "AI", "txt": "+19 tests Vitest : construction URL Wikipedia (5), parsing réponse (3), cache localStorage TTL 7j (4), fallback par type (5), query construction (2). Total 1265 tests verts (vs 1246)" }
    ],
    "themes": ["ui_ux", "users"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.36.html",
    "sqlFile": null
  },
  {
    "v": "0.55.35",
    "kind": "hotfix",
    "titre": "🩹 Fix API RPPS HTTP 403/502 (ville sans nom) · Auto-rattachement RPPS→FINESS · Validation 2 lettres min · Rebuild qui devrait corriger 'kind is not defined' (résidu ancien bundle)",
    "chantiers": [
      { "code": "FIX", "txt": "Bug 502 'FHIR API HTTP 403' quand le user cherchait par ville seule (sans nom) : l'API ANS rejette family= (espace vide). Désormais : si q < 2 caractères ET ville/cp fournis → bascule sur endpoint PractitionerRole avec location.address-city / location.address-postalcode et _include=PractitionerRole:practitioner pour récupérer les praticiens" },
      { "code": "FIX", "txt": "Si l'API ANS retourne quand même une erreur (rate limit, maintenance, etc.), réponse HTTP 200 avec ok:false et message lisible au lieu de 502 brutal → le composant frontend affiche un message clair sans crasher" },
      { "code": "FIX", "txt": "RppsSearch côté client : ne plus envoyer 'q= ' (espace forcé) qui plantait l'API. Validation 2 caractères minimum dans le code. Côté serveur, retour 400 explicite 'Précise au moins un nom (2 lettres min.) ou un n° RPPS' si critères insuffisants" },
      { "code": "FE", "txt": "Auto-rattachement RPPS → FINESS dans /annuaire-rpps : la fonction normalizePractitioner extrait désormais le N° FINESS depuis Organization.reference (format Organization/750712184) + organization_name depuis display. Le bouton 'Rattacher à un étab' cherche automatiquement l'établissement dans la base avec ce FINESS et le pré-sélectionne avec badge vert 'Auto-rattachement détecté !'" },
      { "code": "FE", "txt": "Si le FINESS du praticien n'est PAS dans la base, banner ambre 'FINESS détecté <code> mais aucun étab dans ta base. Choisis manuellement.' Cherche d'abord dans etablissements (Mes), puis dans etablissements_partenaires si pas trouvé" },
      { "code": "•", "txt": "Le rebuild de cette version remet le SW à 0.55.35 et devrait écraser tout résidu d'ancien bundle Vercel (qui pouvait contenir l'erreur 'kind is not defined' héritée d'une build cassée). Si l'erreur persiste après déploiement, vide complètement le cache du navigateur (Ctrl+Shift+Suppr)" },
      { "code": "AI", "txt": "+23 tests Vitest : construction URL FHIR (6), useRoleSearch logique (5), fallback gracieux (3), extraction FINESS regex (4), auto-link match (3), normalizePractitioner enrichi (2). Total 1246 tests verts (vs 1223)" }
    ],
    "themes": ["fixes", "users"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.35.html",
    "sqlFile": null
  },
  {
    "v": "0.55.34",
    "kind": "version",
    "titre": "📞 Actions Appeler/Mail/GPS (popup choix Maps/Apple/Waze/OSM) dans toutes les listes RPPS/partenaires · Création partenaire par FINESS/SIRENE · Badge version → bouton i avec popup · Rappel SQL idempotent (fix 404 partenaires_rpps)",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.34 : RAPPEL idempotent de toutes les tables précédentes (partenaires_rpps, etablissements_partenaires, colonnes etablissements). Permet de rattraper si les patchs 0.55.30/0.55.31/0.55.33 n'ont pas tous été joués. CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + policies DO $$ EXISTS$$ → 100% safe à rejouer" },
      { "code": "FE", "txt": "Nouveau composant ContactActions.js (réutilisable partout) : 3 boutons compacts Appeler (tel:) bleu, Mail (mailto:) vert, GPS (popup choix) ambre. S'affichent uniquement si la donnée correspondante existe (telephone/email/adresse ou coords). N'apparaît pas du tout si aucune donnée" },
      { "code": "FE", "txt": "Popup GPS au clic sur le bouton GPS : 4 options (Google Maps, Apple Plans, Waze, OpenStreetMap) avec icônes + couleurs de marque + lien externe. 5ème option 'Copier l'adresse' via clipboard.writeText. Utilise les coords si disponibles, sinon l'adresse encodée. URLs : maps.google.com/dir/?api=1&destination= · maps.apple.com/?daddr= · waze.com/ul?ll=...&navigate=yes · openstreetmap.org/?mlat=&mlon=#map=18/" },
      { "code": "FE", "txt": "Intégration ContactActions dans : tuiles RppsSearch (toutes les pages qui l'utilisent : /annuaire-rpps, modales /utilisateurs et /partenaires-rpps), cartes /partenaires-rpps, cartes /etablissements-partenaires (utilise lat/lng en plus pour précision GPS). Tous les onClick sur le bouton ont un stopPropagation pour ne pas déclencher le onClick de la carte parente" },
      { "code": "FE", "txt": "Création d'un partenaire dans /etablissements-partenaires : nouveau bloc violet 'Remplir automatiquement' en haut de la modale CRÉATION (pas en édition) avec 2 champs side-by-side — FinessSearch (santé) et SireneSearch (entreprises). Sélection d'un résultat → pré-remplit nom/type/finess/siret/siren/adresse/cp/ville/telephone du form. Composants déjà existants réutilisés sans duplication" },
      { "code": "FE", "txt": "TopBar : badge 'v0.55.x' visible remplacé par un bouton 'i' compact (cercle 26x26 avec icône ti-info-circle). Au clic, ouvre un Modal centré 'À propos d'Aveho EC' avec logo gradient, badge version mono, et 2 actions (Voir le changelog / Fermer). Idem mode mobile : juste un i discret, popup centré au clic" },
      { "code": "AI", "txt": "+18 tests Vitest : ContactActions affichage conditionnel (4), URLs GPS générées (5), tel/mailto encoding (3), recherche FINESS/SIRENE pré-remplissage (3), popup version (2), test global +1. Total 1224 tests verts (vs 1206)" }
    ],
    "themes": ["users", "ui_ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.34.html",
    "sqlFile": "aveho-PATCH-vers-0.55.34.sql"
  },
  {
    "v": "0.55.33",
    "kind": "version",
    "titre": "🔍 RPPS production unifié : filtres ville/mode/CP, liste 100 résultats, actions Rattacher + Inviter dans les tuiles · Colonnes manquantes etablissements · Verrouillage SQL est_partenaire/groupement_id après création",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.33 : ajout idempotent de 16 colonnes manquantes sur etablissements (adresse, cp, pays, latitude, longitude, finess, siret, siren, contact_nom, contact_fonction, telephone, email, site_web, notes, tags[], est_partenaire avec default false). Indexes partiels sur finess/siret/cp pour recherche rapide" },
      { "code": "SQL", "txt": "Triggers de verrouillage : trg_lock_etab_critical_fields sur etablissements (est_partenaire + groupement_id) et trg_lock_etab_part_critical sur etablissements_partenaires (type_relation + groupement_id) → blocage si tentative de modification sans droit parametres_admin. Erreur claire raise exception" },
      { "code": "SQL", "txt": "Nouvelle colonne invitations.origine (default 'manuelle', valeurs : manuelle/rpps_annuaire/rpps_partenaire) pour tracer la source des invitations. 2 nouvelles RPCs : link_partenaire_rpps_to_etablissement (ajoute un partenaire RPPS à etablissement_ids[] sans doublon via @>) et unlink_partenaire_rpps_from_etablissement (array_remove)" },
      { "code": "FE", "txt": "Composant RppsSearch refondu — UNIQUE, utilisé partout sans duplication. 6 filtres : nom OR RPPS exact, profession (12 valeurs), mode d'exercice (3 valeurs : libéral/salarié/remplaçant), ville (texte libre), CP (préfixe département accepté), limite (20/50/100). Bouton 'Effacer' qui reset tout. Indicateur 'Augmente la limite' quand on atteint le max" },
      { "code": "FE", "txt": "Nouvelles tuiles RPPS plus riches : avatar gradient bleu/teal, badge profession en haut, ligne spécialité avec icône prescription, ligne mode d'exercice avec icône briefcase, adresse complète, tel/email cliquables, RPPS+ADELI en footer mono. Hauteur ~120px par tuile, jusqu'à 100 affichables" },
      { "code": "FE", "txt": "Composant RppsSearch supporte 2 modes : (1) onSelect={(p) => ...} → clic tuile = sélection (utilisé dans /partenaires-rpps et /utilisateurs création) ; (2) renderActions={(p) => <JSX/>} → affiche des boutons custom sous chaque tuile (utilisé dans /annuaire-rpps). Pas de code dupliqué" },
      { "code": "FE", "txt": "Page /annuaire-rpps refondue : 2 boutons par tuile — vert 'Rattacher à un étab' (modale avec liste de Mes étabs + Partenaires) et bleu 'Transformer en utilisateur' (modale avec choix de l'email, du rôle, et CHECKBOXES pour sélectionner les infos à pré-remplir : prénom/nom/téléphone/RPPS/ADELI/profession/spécialité/mode/adresse)" },
      { "code": "FE", "txt": "Action 'Rattacher' crée d'abord le partenaire_rpps dans la table s'il n'existe pas (avec classification auto médecin→prescripteur), puis appelle la RPC link_partenaire_rpps_to_etablissement. Détection doublon par RPPS. Confirmation par dialog" },
      { "code": "FE", "txt": "Action 'Transformer en utilisateur' : modale 'Voulez-vous envoyer une invitation ?', email pré-rempli depuis RPPS si disponible, sélecteur de rôle obligatoire, liste de checkboxes par champ avec valeur affichée à côté. À la confirmation : insert invitation avec origine='rpps_annuaire' + appel Edge Function invite-user pour mail" },
      { "code": "API", "txt": "/api/rpps : supporte les nouveaux query params ville et mode. Filtres appliqués côté serveur (FHIR ne les filtre pas natif). Limite portée à 100 (était 50). Filtre client tolérant : contient/inclut (pas strict equals)" },
      { "code": "AI", "txt": "+18 tests Vitest : filtres étendus (5), filtre client API (4), action Transformer en utilisateur (4), action Rattacher (2), verrouillage SQL (3), schéma colonnes (3). Total 1203 tests verts (vs 1185)" }
    ],
    "themes": ["users", "fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.33.html",
    "sqlFile": "aveho-PATCH-vers-0.55.33.sql"
  },
  {
    "v": "0.55.32",
    "kind": "hotfix",
    "titre": "🔧 Hotfix migration SQL 0.55.31 : passage à to_jsonb() pour tolérer un schéma `etablissements` variable (colonnes cp/latitude/longitude/groupement_id peuvent ne pas exister)",
    "chantiers": [
      { "code": "FIX", "txt": "Bug 0.55.31 : la migration plantait avec ERROR 42703 'record \"e\" has no field \"cp\"' sur les structures dont la table etablissements n'a pas toutes les colonnes attendues. La boucle `for e in select * from etablissements` avec `e.cp` plante si cp n'existe pas" },
      { "code": "SQL", "txt": "Solution : passage à `for e in select to_jsonb(t) from etablissements t` puis accès via `e->>'cp'`. Si la clé n'existe pas, `->>` renvoie NULL au lieu de planter. Idem pour latitude/longitude/groupement_id avec `nullif(...,'')::numeric` pour gérer les conversions" },
      { "code": "SQL", "txt": "Bloc EXCEPTION ajouté autour de chaque INSERT pour ne pas bloquer la migration sur une ligne corrompue (raise NOTICE, continue avec les autres)" },
      { "code": "SQL", "txt": "Vue v_etablissements_all construite DYNAMIQUEMENT via execute format() : détecte la présence de cp/groupement_id sur etablissements et utilise 'null::text/uuid' si absente. Évite l'erreur au CREATE VIEW" },
      { "code": "SQL", "txt": "RPC convert_etab_to_partner refondue avec accès jsonb pour le même problème. Plus de %rowtype qui plante" },
      { "code": "•", "txt": "Le patch est IDEMPOTENT et peut être rejoué : si la table partenaires est déjà créée, on saute la création. Si la migration a déjà tourné, on ne re-migre pas (vérif via NOT EXISTS sur link_to_etablissement_id)" },
      { "code": "•", "txt": "1185 tests Vitest verts (idem 0.55.31, pas de nouveau code JS, juste fix SQL)" }
    ],
    "themes": ["fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.32.html",
    "sqlFile": "aveho-PATCH-vers-0.55.32.sql"
  },
  {
    "v": "0.55.31",
    "kind": "version",
    "titre": "🏗 Table DÉDIÉE etablissements_partenaires (séparée d'etablissements) + table d'audit dédiée etab_partenaires_audit avec triggers + page de gestion complète + vue unifiée + RPC de conversion",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.31 : nouvelle table etablissements_partenaires (29 colonnes) — identité (nom, type, type_relation), identifiants officiels (finess, siret, siren), adresse (+ lat/lng), contact référent (contact_nom, contact_fonction, telephone, email, site_web), métadonnées (notes, tags[], groupement_id), link_to_etablissement_id pour transition douce, actif/archive, audit complet (created_at/by, updated_at/by)" },
      { "code": "SQL", "txt": "Table d'audit DÉDIÉE etab_partenaires_audit : id, ts, action (INSERT/UPDATE/DELETE), partenaire_id, structure_id, user_id, old_data jsonb, new_data jsonb, changes jsonb (diff colonne-par-colonne calculé automatiquement par le trigger). Index sur ts/structure/partenaire. RLS admin_read (parametres_admin ou utilisateurs_write)" },
      { "code": "SQL", "txt": "Trigger trg_audit_etab_partenaires AFTER INSERT/UPDATE/DELETE qui log automatiquement chaque action avec snapshot complet et diff. Sur UPDATE : ne loggue que si au moins 1 champ a changé. Pas de log pour les changements de updated_at/updated_by seuls" },
      { "code": "SQL", "txt": "Migration AUTOMATIQUE des données : tous les etablissements existants avec est_partenaire=true sont COPIÉS vers etablissements_partenaires (link_to_etablissement_id pointe vers l'ancien). Idempotent : ne re-copie pas si déjà migré. Affiche le compte de migrations dans NOTICE PostgreSQL" },
      { "code": "SQL", "txt": "Vue v_etablissements_all UNION ALL des 2 tables (mes établissements + partenaires non archivés) avec champ source ('mine'/'partner') pour les requêtes qui veulent les 2 en un seul SELECT. security_invoker=true" },
      { "code": "SQL", "txt": "RPC convert_etab_to_partner(p_etab_id) : bascule un établissement legacy vers la nouvelle table avec vérif droits parametres_admin. Renvoie le nouveau partenaire_id. Marque l'ancien est_partenaire=true pour cohérence" },
      { "code": "FE", "txt": "Nouvelle page /etablissements-partenaires : gestion CRUD complète avec 4 KPIs (Partenaires actifs, Prescripteurs, Fournisseurs, Sous-traitants), recherche multi-champs (nom, type, ville, FINESS, SIRET), filtre par type de relation (5 types : Prescripteur/Fournisseur/Sous-traitant/Confrère/Autre)" },
      { "code": "FE", "txt": "Modale création/édition partenaire (24 champs) avec sections Identité, Identifiants officiels (FINESS/SIRET/SIREN), Adresse, Contact référent (nom + fonction + tel + email + site). Validation 'Nom requis'. Bouton Archiver en mode édition" },
      { "code": "FE", "txt": "Bouton 'Audit' en haut de page → modale historique avec 50 dernières actions, badges colorés par type (INSERT vert, UPDATE ambre, DELETE rouge), <details> dépliable pour voir le diff champ-par-champ (rouge barré → vert) sur UPDATE" },
      { "code": "FE", "txt": "Vue-globale (/vue-globale) refondée pour charger les 2 tables séparément : 'mineRows' depuis etablissements (filtre !est_partenaire), 'partnersFromNewTable' depuis etablissements_partenaires, 'legacyPartners' depuis etablissements (est_partenaire=true ET pas déjà dans la nouvelle table). Évite les doublons via link_to_etablissement_id" },
      { "code": "FE", "txt": "Lien 'Étabs partenaires' ajouté dans le menu TopBar section Établissement (icône ti-building-community violette) entre 'Annuaire étabs' et 'Annuaire RPPS'" },
      { "code": "AI", "txt": "+13 tests Vitest : schéma table (5), types relation (3), vue-globale dual-source (3), trigger diff logic (4), format audit row (3), convert RPC (2). Total 1178 tests verts (vs 1165)" }
    ],
    "themes": ["users", "fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.31.html",
    "sqlFile": "aveho-PATCH-vers-0.55.31.sql"
  },
  {
    "v": "0.55.30",
    "kind": "version",
    "titre": "🤝 Partenaires RPPS (table dédiée non-utilisateurs) · Mail/popup invitation enrichi RPPS · Hotfix vue-globale (groupement_id) · RPC ajout user au bâtiment",
    "chantiers": [
      { "code": "FIX", "txt": "Hotfix 400 sur /vue-globale : le SELECT contenait 'groupement_id' qui n'existait pas sur la table etablissements. Colonne ajoutée dans le patch SQL 0.55.30 (avec index partiel) + table groupements créée si absente avec RLS" },
      { "code": "SQL", "txt": "Patch 0.55.30 : nouvelle table partenaires_rpps (id, structure_id, rpps, adeli, civilite, nom, prenom, profession, specialite, mode_exercice, adresse, cp, commune, telephone, telephone_mobile, email, notes, tags[], est_prescripteur, est_intervenant, etablissement_ids[], created_at, created_by, updated_at, archive)" },
      { "code": "SQL", "txt": "Contrainte unicité par (structure_id, rpps) avec archive=false → un même praticien ne peut être ajouté qu'une fois. Index sur nom + profession + structure pour recherche rapide. RLS member_rw. Trigger updated_at automatique" },
      { "code": "SQL", "txt": "Vue v_partenaires_rpps avec colonnes virtuelles (nb_etablissements_lies) + security_invoker. RPCs add_user_to_etablissement(p_user_id, p_etablissement_id) et remove_user_from_etablissement (security definer, vérif droits utilisateurs_write OU parametres_admin)" },
      { "code": "FE", "txt": "Nouvelle page /partenaires-rpps : liste des partenaires non-utilisateurs (médecins prescripteurs, IDE libéraux, kinés). 3 filtres : Tous / Prescripteurs / Intervenants. Recherche par nom/prénom/profession/RPPS/commune. Cartes avec avatar violet, badges colorés (PRESCRIPTEUR bleu, INTERVENANT vert, RPPS violet)" },
      { "code": "FE", "txt": "Bouton 'Ajouter un partenaire depuis RPPS' qui ouvre RppsSearch. Au clic sur un résultat : insertion automatique avec classification (médecin → est_prescripteur, infirm/kin/sage → est_intervenant). Détection de doublon par RPPS avec message d'alerte" },
      { "code": "FE", "txt": "Modale détails partenaire avec coordonnées cliquables (tel: + mailto:) + bouton 'Archiver' (rouge). Lien dans le menu TopBar section Établissement (entre Annuaire RPPS et Carte)" },
      { "code": "FE", "txt": "Mail d'invitation Resend enrichi : bloc violet 'Identité professionnelle (RPPS)' avec profession + spécialité + n° RPPS. Banner ambre '🔒 Rattachement verrouillé' si lock_assignment=true. Subject du mail personnalisé (ex: 'Invitation Aveho EC — Médecin'). Edge Function invite-user mise à jour" },
      { "code": "FE", "txt": "Pop-up post-création d'invitation enrichi : récap complet de ce qui a été envoyé (nom, rôle, matricule, établissements rattachés en pills, badge VERROUILLÉ si lock, bloc violet RPPS si renseigné, lien copiable). État createdInviteLink passe de string à object" },
      { "code": "AI", "txt": "+18 tests Vitest : classification auto (6), filtres recherche partenaires (4), structure objet popup (2), add_user RPC idempotence (1), hotfix groupement_id (1). Total 1169 tests verts (vs 1151)" }
    ],
    "themes": ["users", "fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.30.html",
    "sqlFile": "aveho-PATCH-vers-0.55.30.sql"
  },
  {
    "v": "0.55.29",
    "kind": "version",
    "titre": "🩺 RPPS production (API FHIR ANS officielle) · Bouton 'Rechercher RPPS' à la création utilisateur · Champs RPPS dans fiche user · Filtre vue-globale Mes/Partenaires/Tous",
    "chantiers": [
      { "code": "FIX", "txt": "Vue globale multi-établissements : filtre est_partenaire dans la requête SQL et toggle UI 'Mes établissements / Partenaires / Tous' avec compteurs. Les partenaires affichent un badge violet 'PARTENAIRE' et un CTA différent ('Voir la fiche partenaire' qui mène à /etablissements?focus=...)" },
      { "code": "API", "txt": "/api/rpps refondu : utilise l'API FHIR Annuaire Santé ANS officielle (gateway.api.esante.gouv.fr/fhir/v2/Practitioner). Plus de mock par défaut, données réelles ~1.7M praticiens en accès libre, sans clé. Cache serveur 1h" },
      { "code": "API", "txt": "Normalisation FHIR Practitioner + PractitionerRole → format unifié (rpps, adeli, civilite, nom, prenom, profession, specialite, mode_exercice, adresse, cp, commune, telephone, email). Fetch parallèle des rôles pour chaque résultat (limité à 10 pour la perf)" },
      { "code": "SQL", "txt": "Patch 0.55.29 : invitations + membres_structure étendus avec rpps, adeli, rpps_profession, rpps_specialite, rpps_mode_exercice. Index partiel idx_invitations_rpps et idx_membres_rpps. Vue v_user_complete régénérée avec les nouveaux champs + security_invoker. RPC get_invitation_full retourne les RPPS" },
      { "code": "FE", "txt": "Modale 'Créer un utilisateur' : nouveau bouton violet 'Rechercher RPPS' à côté du titre 'Identité' qui ouvre une modale RppsSearch. Au clic sur un praticien, pré-remplit automatiquement prénom/nom/téléphone/fonction + champs RPPS dédiés (rpps/adeli/profession/spécialité/mode)" },
      { "code": "FE", "txt": "Badge violet 'Pré-rempli depuis RPPS' affiché en haut de la section Identité quand un RPPS est associé, avec affichage profession+spécialité+RPPS et bouton 'Retirer' pour défaire le pré-remplissage" },
      { "code": "FE", "txt": "Fiche utilisateur (modale info) : nouveau bloc violet 'Données RPPS (annuaire ANS)' affiché si l'user a un RPPS, avec affichage formaté du n° RPPS, n° ADELI, profession, spécialité et mode d'exercice" },
      { "code": "FE", "txt": "RppsSearch : bandeau d'info adapté — vert 'Source : API FHIR ANS officielle (~1.7M praticiens, libre accès)' en production, jaune 'Mode démonstration' uniquement si l'API tombe en fallback" },
      { "code": "AI", "txt": "+14 tests Vitest : normalisation FHIR Practitioner (system rpps/idnatps/adeli, prefix civilité, code profession, specialty spécialité), filtre vue-globale, construction URL FHIR, schéma RPPS invitations. Total 1151 tests verts (vs 1137)" }
    ],
    "themes": ["users", "fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.29.html",
    "sqlFile": "aveho-PATCH-vers-0.55.29.sql"
  },
  {
    "v": "0.55.28",
    "kind": "version",
    "titre": "🩺 Annuaire RPPS (cabinets libéraux) · Bilan ménage code (console.* déjà à 0, SafeWrite audit ciblé)",
    "chantiers": [
      { "code": "FE", "txt": "Nouvelle page /annuaire-rpps : recherche de professionnels de santé libéraux (médecins, infirmiers, kinés, sages-femmes, pharmaciens, etc.) par nom, n° RPPS, profession et code postal. Complémentaire au FINESS qui ne couvre que les établissements" },
      { "code": "API", "txt": "Nouvel endpoint /api/rpps : proxy serveur vers data.gouv.fr (Tabular API du dataset Annuaire ANS). Cache 1h serveur. Mock fallback automatique si RPPS_DATASET_RID non configuré (mode démo avec 4 praticiens fictifs)" },
      { "code": "FE", "txt": "Nouveau composant RppsSearch (app/components/RppsSearch.js) réutilisable : champs nom + RPPS + profession + CP, validation regex sur RPPS (11 chiffres exactement), bandeau jaune si mode démo, liste résultats avec carte cliquable hover" },
      { "code": "FE", "txt": "Modale détails au clic sur un résultat : affichage des champs profession, spécialité, mode d'exercice, RPPS/ADELI (mono), adresse complète, téléphone cliquable, email mailto. Utilise le composant <Modal> partagé (0.55.26)" },
      { "code": "UX", "txt": "Lien 'Annuaire RPPS (libéraux)' ajouté dans le menu TopBar section Établissement (entre 'Établissements' et 'Carte'), icône stéthoscope violette" },
      { "code": "FE", "txt": "Page dédiée avec header icône teal, bloc d'aide sombre avec lien vers https://annuaire.sante.fr/ (annuaire officiel ANS) pour les recherches avancées" },
      { "code": "AI", "txt": "+15 tests Vitest : normalizeEntry (format ANS officiel + alternatif), validation RPPS/ADELI regex, filtres mock par nom/rpps/profession/cp, PROFESSIONS list. Total 1137 tests verts (vs 1122)" },
      { "code": "•", "txt": "Bilan ménage technique : migration console.* officiellement TERMINÉE (les 27 du compteur étaient des .error autorisés + texte changelog). SafeWrite : audit montre que les 26 writes directs restants sont majoritairement légitimes (config admin, batch CRUD, ConflictResolver), pas de cleanup massif nécessaire" }
    ],
    "themes": ["users", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.28.html"
  },
  {
    "v": "0.55.27",
    "kind": "version",
    "titre": "Cheatsheet raccourcis clavier (touche ?) + navigation G+lettre · Migration logger sécurisé sur 7 fichiers supplémentaires",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant KeyboardHelp monté dans le layout : appuyez sur '?' n'importe où dans l'app (hors champs texte) pour ouvrir une cheatsheet avec tous les raccourcis disponibles. Utilise le composant Modal partagé (0.55.26)" },
      { "code": "FE", "txt": "Navigation par raccourcis : 'G puis A' = /accueil, 'G puis P' = /patients, 'G puis M' = /materiel, 'G puis U' = /utilisateurs, 'G puis L' = /changelog, 'G puis S' = /profil. La séquence a une fenêtre de 1.5s entre les 2 touches" },
      { "code": "UX", "txt": "Cheatsheet organisée en 4 sections : Navigation, Recherche, Modales et listes, Débogage. Touches affichées sous forme de <kbd> stylisées avec ombre" },
      { "code": "FIX", "txt": "Migration console.* → logger.* sur 7 fichiers supplémentaires : app/inscription/[token]/page.js, app/utilisateurs/page.js, app/signalements/page.js, app/achats/page.js, app/transferts/page.js, lib/events.js, lib/useOffline.js" },
      { "code": "FIX", "txt": "Compteur console.* en prod : 51 occurrences en 0.55.25 → 27 en 0.55.27 (-47%, migration progressive)" },
      { "code": "AI", "txt": "+16 tests Vitest sur isTypingInInput (détection focus champs), NAV_MAP (routes G+lettre), structure SHORTCUTS et paths logger. Total 1122 tests verts (vs 1106)" }
    ],
    "themes": ["ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.27.html"
  },
  {
    "v": "0.55.26",
    "kind": "version",
    "titre": "🔒 Maintenance sécurité + optimisations + dédup code : durcissement RLS, logger sécurisé, composant Modal partagé, cache SW borné, table audit",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.26 : security_invoker=true sur les 3 vues récentes (v_users_auth_methods, v_my_webauthn_credentials, v_user_complete) pour forcer le respect des RLS de l'appelant. Index manquants (idx_webauthn_user_active, idx_invitations_token_active, idx_audit_log_struct_user_date, idx_app_logs_user_date, idx_membres_matricule)" },
      { "code": "SQL", "txt": "REVOKE PUBLIC + GRANT explicit authenticated sur les RPCs sensibles (reset_user_password, get_invitation_full, revoke_webauthn_credential, update_webauthn_last_used). Table security_audit_log + RPC log_security_event + trigger audit changements de rôle" },
      { "code": "FE", "txt": "Nouveau lib/logger.js : remplace console.log/warn/info par un logger qui REDACTE automatiquement les valeurs sensibles (password, token, refresh_token, credential_id, etc.) et qui se TAIT en production (sauf si flag debug activé via __avehoEnableDebug() dans la console)" },
      { "code": "FE", "txt": "Nouveau lib/constants.js : centralise les couleurs (COLOR.ok/ko/warn/...), gradients (GRADIENT.primary/danger/...) et icônes (ICON.fingerprint/face/...). Helpers colorForState() et labelForState() pour réduire le code dupliqué" },
      { "code": "FE", "txt": "Nouveau app/components/Modal.js : composant partagé qui encapsule le pattern modal-bg+modal+modal-head+modal-body+modal-foot. Supporte variant='centered' ou 'bottom-sheet' (mobile). Escape pour fermer, backdrop click, animation, header coloré gradient" },
      { "code": "FE", "txt": "Service Worker : limite MAX_DATA_CACHE_ENTRIES=100 (Supabase REST/RPC) et MAX_PAGE_CACHE_ENTRIES=30 (HTML). Helper trimCache LRU appelé après chaque put pour éviter la croissance illimitée du cache" },
      { "code": "FIX", "txt": "lib/webauthn.js, app/BiometricSection.js, app/BiometricOptInModal.js, app/StatusIcons.js : remplacement automatique de console.warn par logger.warn pour neutralisation en production" },
      { "code": "AI", "txt": "+19 tests Vitest sur le logger (redaction, profondeur max, troncature longue), constants (couleurs, gradients, helpers) et logique SW trim. Total 1106 tests verts (vs 1087)" }
    ],
    "themes": ["rls_securite", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.26.html",
    "sqlFile": "aveho-PATCH-vers-0.55.26.sql"
  },
  {
    "v": "0.55.25",
    "kind": "version",
    "titre": "Invitation enrichie : rattachement multi-établissements + lock + RH · Fiche utilisateur étendue (matricule, contact urgence, spécialité…) · Réinitialiser mot de passe (admin)",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.25 : invitations.etablissement_ids (uuid[]) + lock_assignment + matricule + date_arrivee + notes_admin. membres_structure étendu : matricule, date_naissance, contact_urgence_{nom,tel}, adresse, specialite, diplome, date_fin_contrat, locked_fields" },
      { "code": "SQL", "txt": "Vue v_user_complete combine membres_structure + bio_devices_count + has_empreinte/face pour faciliter les requêtes admin. RPC reset_user_password (admin only) journalise une demande de réinit. RPC get_invitation_full retourne tous les champs incluant etablissement_ids et lock_assignment" },
      { "code": "FE", "txt": "Modale 'Inviter un utilisateur' : nouveau bloc 'Rattachement aux établissements' avec sélection multi-pills (clic pour ajouter/retirer). Checkbox 'Verrouiller le rattachement' (cochée par défaut)" },
      { "code": "FE", "txt": "Modale invitation : nouveau bloc 'Informations RH' avec matricule, date d'arrivée et notes admin (visible uniquement par les admins)" },
      { "code": "FE", "txt": "Page /inscription/[token] : affichage des établissements rattachés avec badge VERROUILLÉ si lock_assignment=true. Matricule et date d'arrivée affichés en lecture seule s'ils ont été pré-remplis par l'admin" },
      { "code": "FE", "txt": "Fiche utilisateur (modale info) : nouveau bloc dépliable 'Informations RH étendues' avec matricule, date de naissance, spécialité, diplôme, adresse, contact d'urgence (nom + tél), date de fin de contrat" },
      { "code": "FE", "txt": "Fiche utilisateur : nouveau bloc dépliable 'Actions administrateur' avec bouton rouge 'Réinitialiser mot de passe' (déclenche la RPC + log applicatif) et bouton bleu 'Envoyer un email' (mailto:)" },
      { "code": "•", "txt": "Compatibilité douce : si le SQL n'a pas encore été passé, la sauvegarde fiche user retombe automatiquement sur les colonnes de base sans erreur" }
    ],
    "themes": ["users", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.25.html",
    "sqlFile": "aveho-PATCH-vers-0.55.25.sql"
  },
  {
    "v": "0.55.24",
    "kind": "version",
    "titre": "Smoke tests sur TOUTES les versions du changelog (fallback générique) + bouton 'Tester toutes les versions' avec rapport global",
    "chantiers": [
      { "code": "AI", "txt": "Système de smoke tests étendu : les versions sans tests dédiés bénéficient maintenant d'un fallback générique qui vérifie la présence de l'entrée dans versions-data, l'accessibilité de la note HTML et du fichier SQL (si applicable), et la description des chantiers" },
      { "code": "FE", "txt": "Bouton 'Tester' maintenant visible sur TOUTES les versions du changelog (vert si tests dédiés, gris si fallback générique) — chaque carte de version a son bouton" },
      { "code": "FE", "txt": "Nouveau bouton 'Tester toutes les versions' en haut de la page changelog : lance séquentiellement les tests de toutes les versions (73+) et affiche un rapport global avec progress bar" },
      { "code": "UX", "txt": "Modale rapport global : header gradient avec compteur dynamique X/Y versions testées, totaux OK/échec, version en cours d'exécution, progress bar live" },
      { "code": "UX", "txt": "Affichage des résultats : liste compacte des versions avec badge OK/échec, détails dépliables (<details>) pour les versions en échec montrant le nom du test fail + message + erreur éventuelle" }
    ],
    "themes": ["ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.24.html"
  },
  {
    "v": "0.55.23",
    "kind": "hotfix",
    "titre": "Badge version vraiment centré avec le logo · Feedback détaillé sur activation notifs/géoloc (succès, bloqué par browser, refusé) + notif de test au succès",
    "chantiers": [
      { "code": "FIX", "txt": "Badge v0.55.x : fix centrage final. Le logo 'aveho' avait une line-height héritée (1.5) qui décalait son baseline par rapport au badge. Solution : .logo en display:inline-flex + align-items:center + line-height:1 + height:24px. Badge mis à la même height:24px pour alignement strict" },
      { "code": "UX", "txt": "Quand l'user clique 'Autoriser' sur Notifications dans le popover/modale StatusIcons : feedback inline coloré selon le résultat — vert + notif de test (granted) / rouge avec instructions cadenas (denied) / orange avec instructions cloche (default, ex. Edge Quiet)" },
      { "code": "UX", "txt": "Idem pour Géolocalisation : feedback vert (success) ou rouge avec instructions selon le code d'erreur (1 = refusé, autres = erreur technique)" },
      { "code": "FE", "txt": "Notification de test envoyée automatiquement au moment de l'autorisation pour confirmer visuellement à l'user que c'est bien actif" }
    ],
    "themes": ["fixes", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.23.html"
  },
  {
    "v": "0.55.22",
    "kind": "hotfix",
    "titre": "Privacy : getDeviceName plus neutre · /utilisateurs : icônes bio toujours visibles avec couleur · smoke tests pour toutes les versions 0.55.18-22",
    "chantiers": [
      { "code": "FIX", "txt": "getDeviceName() : remplace les noms bruts 'Windows' / 'Mac' / 'iPhone' / modèle Android par des noms plus naturels et privacy-friendly ('Mon ordinateur (Windows)', 'Mon Mac', 'Mon iPhone', 'Mon téléphone Android' — sans modèle exact)" },
      { "code": "FE", "txt": "Page /utilisateurs : les 2 icônes biométriques (empreinte + face) sont maintenant TOUJOURS affichées à côté du nom de chaque user. Vert si méthode activée, gris si pas — comme ça on voit clairement l'état pour chaque user" },
      { "code": "AI", "txt": "Smoke tests ajoutés pour les versions 0.55.18, 19, 20, 21 et 22. La page changelog a maintenant 11 versions testables in-browser (de 0.55.12 à 0.55.22)" }
    ],
    "themes": ["ux", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.22.html"
  },
  {
    "v": "0.55.21",
    "kind": "hotfix",
    "titre": "Mobile : icônes de statut regroupées dans 1 bouton + modale plein écran · fix click action 'Gérer' · fix 503 transient",
    "chantiers": [
      { "code": "FE", "txt": "StatusIcons mode mobile (≤768px) : 1 seul bouton bouclier dans la TopBar à côté du panier, avec petite pastille de couleur (rouge si refusé, ambre si non config, vert si tout OK). Au clic, modale plein écran type bottom-sheet avec les 7 features détaillées" },
      { "code": "UX", "txt": "Modale mobile : header gradient, liste scrollable des features avec icône + nom + badge ACTIF/REFUSÉ/INACTIF + description + bouton 'Autoriser' ou 'Gérer dans Profil' pour chaque" },
      { "code": "FIX", "txt": "Boutons d'action des popovers : ajout de e.stopPropagation() pour éviter que le clic ne ferme accidentellement le popover avant que la redirection ne s'exécute. 'Gérer' ferme proprement la modale + setTimeout 50ms + router.push('/profil')" },
      { "code": "FIX", "txt": "SW networkFirst : retry 1× avec délai 100ms en cas d'échec network transient (cause potentielle du 503 sur /profil). Fallback HTML lisible avec bouton 'Réessayer' si /offline.html pas en cache" }
    ],
    "themes": ["ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.21.html"
  },
  {
    "v": "0.55.20",
    "kind": "hotfix",
    "titre": "TopBar : badge version centré et visible sur mobile · Profil : sections empreinte et facial séparées · réduction warning PWA + forced reflow",
    "chantiers": [
      { "code": "FIX", "txt": "Badge version (v0.55.x) dans la TopBar : centré verticalement (display:inline-flex + align-items:center + line-height:1 + height:22px), maintenant aussi visible sur mobile (était caché en display:none ≤900px)" },
      { "code": "FE", "txt": "Page Profil : section unique 'Connexion par empreinte' séparée en 2 sections distinctes — 'Connexion par empreinte digitale' (bleu) et 'Connexion par détection faciale' (violet). Chacune avec son icône, sa liste d'appareils filtrée par méthode" },
      { "code": "FIX", "txt": "BiometricSection accepte prop methodFilter pour n'afficher qu'une méthode (empreinte ou face). Liste credentials filtrée en conséquence" },
      { "code": "FIX", "txt": "Warning 'Banner not shown: beforeinstallprompt' : preventDefault appelé uniquement si l'install banner n'a pas été dismissed forever, sinon laisse Chrome gérer nativement" },
      { "code": "FIX", "txt": "Forced reflow 106ms : remplacé setTimeout(50) par requestAnimationFrame x2 dans le scroll auto vers le match courant (modale highlight)" }
    ],
    "themes": ["fixes", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.20.html"
  },
  {
    "v": "0.55.19",
    "kind": "version",
    "titre": "Icônes de statut dans la TopBar : réseau, notifs, géoloc, PWA, SW, empreinte, face — feux vert/rouge + popover détails",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant StatusIcons monté dans la TopBar (à gauche du menu user) : 7 icônes de statut compactes avec petite pastille colorée en bas à droite" },
      { "code": "UX", "txt": "Code couleur : vert (#5aa05a) = activé/OK/autorisé, rouge (#c0392b) = refusé/bloqué, gris (#8a98a8) = non configuré ou indéterminé" },
      { "code": "UX", "txt": "Au clic sur une icône → popover de 280px avec header coloré, état (Activé / Refusé / Non configuré), description, et bouton d'action contextuel (Autoriser / Gérer)" },
      { "code": "FE", "txt": "Features tracées : Réseau (online/offline live via events), Notifications (Notification.permission), Géolocalisation (Permissions API), PWA installée (display-mode standalone + navigator.standalone iOS), Service Worker actif, Empreinte digitale activée, Détection faciale activée" },
      { "code": "UX", "txt": "Mobile-responsive : sur écran ≤520px, on cache les icônes secondaires (uniquement réseau + notif + géoloc + pwa visibles)" },
      { "code": "•", "txt": "Bouton 'Autoriser' déclenche directement Notification.requestPermission() ou geolocation.getCurrentPosition() ; 'Gérer' pour la bio redirige vers /profil" }
    ],
    "themes": ["ux", "pwa_offline"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.19.html"
  },
  {
    "v": "0.55.18",
    "kind": "hotfix",
    "titre": "Fix bug 'kind is not defined' sur changelog + fix SQL view 0.55.17 + bouton 'Tester' par version + 126 tests ajoutés (944 → 1070)",
    "chantiers": [
      { "code": "FIX", "txt": "Bug 'kind is not defined' au clic sur titre/évolution dans changelog : remplacé par v.kind correctement scopé dans la map" },
      { "code": "FIX", "txt": "SQL patch 0.55.17 : DROP VIEW v_my_webauthn_credentials avant CREATE pour contourner l'erreur 42P16 (Postgres refuse changer l'ordre des colonnes d'une vue)" },
      { "code": "AI", "txt": "Nouveau bouton 'Tester' vert sur chaque carte de version qui a des smoke tests : exécution in-browser des checks fonctionnels (WebAuthn dispo, RPCs accessibles, password policy, fichiers SQL servables, etc.)" },
      { "code": "UX", "txt": "Modale résultats des tests : compteur OK/échec dans le header, liste des tests avec icône check/x, message + erreur, bouton Relancer" },
      { "code": "AI", "txt": "+126 tests Vitest : 5 nouveaux fichiers (v055-12 password policy, v055-13 webauthn, v055-14 ZIP/SW, v055-15 SQL modal, v055-16 highlight, v055-17 face+empreinte) totalisant 1070 tests verts" }
    ],
    "themes": ["fixes", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.18.html"
  },
  {
    "v": "0.55.17",
    "kind": "version",
    "titre": "Détection faciale en plus de l'empreinte : 2 méthodes biométriques séparées, modale opt-in refondue, icônes par user dans /utilisateurs",
    "chantiers": [
      { "code": "BIO", "txt": "Ajout de la détection faciale (Face ID iPhone/iPad, Hello caméra Windows) en plus de l'empreinte digitale. Même WebAuthn, séparation logique via colonne auth_method (empreinte|face)" },
      { "code": "UX", "txt": "Modale opt-in refondue avec 2 cards distinctes : Empreinte (bleu) et Détection faciale (violet). L'user peut activer une ou les deux. Badge RECOMMANDÉ sur la méthode probablement compatible avec son device." },
      { "code": "FE", "txt": "Page /login : 1 bouton dédié par méthode activée pour l'email saisi. Bouton 'Se connecter avec la détection faciale' (gradient violet) ou 'avec mon empreinte' (gradient bleu/teal)." },
      { "code": "USR", "txt": "Page /utilisateurs : icônes empreinte (bleu) et face-id (violet) à côté du nom de chaque user pour visualiser quelles méthodes sont configurées" },
      { "code": "FE", "txt": "Page /profil → 'Connexion biométrique' : 2 lignes séparées pour empreinte et face avec activation/désactivation indépendantes. Liste des appareils avec badge méthode + badge CET APPAREIL." },
      { "code": "SQL", "txt": "Patch 0.55.17 : colonne webauthn_credentials.auth_method + check constraint + index + vue v_users_auth_methods (has_empreinte/has_face/total_devices)" },
      { "code": "•", "txt": "Migration douce IndexedDB ancien format → nouveau format multi-méthodes (préserve les activations existantes)" }
    ],
    "themes": ["rls_securite", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.17.html",
    "sqlFile": "aveho-PATCH-vers-0.55.17.sql"
  },
  {
    "v": "0.55.16",
    "kind": "version",
    "titre": "Refonte preview note changelog : click au lieu de hover, modale plein écran avec highlight des passages correspondants à l'évolution cliquée",
    "chantiers": [
      { "code": "UX", "txt": "Suppression du hover preview qui était coupé sur mobile et flashait sur desktop. Remplacé par un clic sur le titre ou sur une évolution." },
      { "code": "AI", "txt": "Modale plein écran (max 960×92vh) qui affiche la note HTML scopée avec ses styles confinés au scope .cl-note-scope (pas de pollution CSS)" },
      { "code": "AI", "txt": "Highlight automatique des passages correspondant à l'évolution cliquée. Extraction des mots-clés du txt (4+ caractères, sans stopwords FR), injection de <mark class='cl-match'> dans le HTML scopé." },
      { "code": "UX", "txt": "Navigation entre les matches : boutons ⬆/⬇ + compteur 'X/Y' + scroll auto vers le match courant avec animation et bordure orange vif sur le match actif" },
      { "code": "UX", "txt": "Bandeau jaune indiquant le nombre de passages trouvés + l'évolution cherchée + les mots-clés extraits. Bandeau gris si aucun match." },
      { "code": "UX", "txt": "Raccourcis clavier dans la modale : Échap (ferme), F3 ou n (match suivant), Shift+F3 ou p (précédent)" },
      { "code": "UX", "txt": "Boutons header : compteur matches, Télécharger HTML, X fermer. Curseur 'pointer' + hover ambre sur les évolutions cliquables." }
    ],
    "themes": ["ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.16.html"
  },
  {
    "v": "0.55.15",
    "kind": "version",
    "titre": "Bouton 'Requête SQL' sur chaque version du changelog : popup avec contenu, copier, télécharger",
    "chantiers": [
      { "code": "AI", "txt": "Sur chaque carte de version du changelog, nouveau bouton 'SQL' (navy + teal) à côté du bouton 'HTML'. Visible uniquement sur les versions qui ont un patch SQL associé." },
      { "code": "UX", "txt": "Popup d'affichage du SQL : header gradient avec nom du fichier, instructions Supabase, contenu syntax-highlighted sur fond navy, footer avec nb lignes + taille." },
      { "code": "UX", "txt": "3 actions dans la popup : bouton 'Copier' (clipboard, feedback vert 'Copié !'), bouton 'Télécharger' (.sql direct), bouton 'X' fermer + Escape" },
      { "code": "AI", "txt": "36 fichiers SQL copiés dans public/changelog-sql/ (de 0.15 à 0.55.13). Cache côté client après 1er chargement." },
      { "code": "•", "txt": "Champ 'sqlFile' ajouté dans versions-data.js sur les 36 versions concernées" }
    ],
    "themes": ["ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.15.html"
  },
  {
    "v": "0.55.14",
    "kind": "hotfix",
    "titre": "Fix 503 sur tooltip hover changelog + bouton 'Télécharger toutes les notes' en ZIP",
    "chantiers": [
      { "code": "FIX", "txt": "Service Worker : route /changelog-notes/* en cacheFirst (au lieu de networkFirst qui renvoyait 503 quand offline ou SW intercepte mal). Cache les notes au 1er hover, instant ensuite." },
      { "code": "FIX", "txt": "fetchNoteHtml côté changelog : retry sans force-cache si 1er fetch échoue, fallback élégant '⏳ Aperçu indisponible' au lieu d'erreur rouge." },
      { "code": "AI", "txt": "Bouton 'Télécharger toutes les notes' sur /changelog : zip contenant tous les .html + un INDEX.html cliquable. Utilise JSZip via dynamic import (~100KB économisés à l'init)." },
      { "code": "UX", "txt": "Indicateur de progression pendant la création du zip (1/22, 2/22... puis Compression... puis ✓ X notes)" }
    ],
    "themes": ["fixes", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.14.html"
  },
  {
    "v": "0.55.13",
    "kind": "version",
    "titre": "Refonte gestion utilisateurs (partie B) : connexion par empreinte digitale (WebAuthn) sur mobile",
    "chantiers": [
      { "code": "BIO", "txt": "Connexion par empreinte digitale / Touch ID / Face ID / Windows Hello sur mobile : table webauthn_credentials + RPC dédiées" },
      { "code": "UX", "txt": "Modale post-login automatique sur mobile : 'Activer la connexion par empreinte ?' avec personnalisation du nom de l'appareil" },
      { "code": "FE", "txt": "Bouton 'Se connecter avec mon empreinte' sur /login : visible si WebAuthn dispo + credential local pour l'email saisi" },
      { "code": "FE", "txt": "Nouvelle section /profil → 'Connexion par empreinte' : liste des appareils enregistrés + activation/révocation par device" },
      { "code": "SEC", "txt": "Architecture pragmatique : credential WebAuthn comme preuve de présence physique + refresh_token Supabase chiffré local (IndexedDB protégée par origin)" },
      { "code": "SQL", "txt": "Patch 0.55.13 : table webauthn_credentials + RLS (user own only) + 2 RPC (update_last_used, revoke) + vue v_my_webauthn_credentials" },
      { "code": "•", "txt": "Empreinte ne quitte jamais l'appareil — Aveho ne stocke que credential_id + device_name + user_agent côté serveur" }
    ],
    "themes": ["rls_securite", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.13.html",
    "sqlFile": "aveho-PATCH-vers-0.55.13.sql"
  },
  {
    "v": "0.55.12",
    "kind": "version",
    "titre": "Refonte gestion utilisateurs (partie A) : token invitation, page /inscription, policy mot de passe stricte, fix z-index carte",
    "chantiers": [
      { "code": "USR", "txt": "Page /utilisateurs : bouton 'Créer un utilisateur' avec modale enrichie (Identité, Contact, Rôle) — 3 sections, mobile-friendly" },
      { "code": "USR", "txt": "Champs étendus sur membres_structure : nom, prénom, mobile, fonction_detail, photo_url, preferences (jsonb)" },
      { "code": "FE", "txt": "Nouvelle page publique /inscription/[token] : formulaire pré-rempli, mot de passe avec policy stricte + jauge, redirection auto vers /accueil" },
      { "code": "EDGE", "txt": "Edge function invite-user réécrite : utilise le token custom (au lieu de admin.auth.inviteUserByEmail). Edge function welcome-user nouvelle (mail de bienvenue)" },
      { "code": "SEC", "txt": "Policy mot de passe stricte : min 12 caractères, 1 maj/min/chiffre/spécial, blacklist 'azerty123' & co. Composant PasswordInput réutilisable avec jauge couleur + bouton générer" },
      { "code": "SQL", "txt": "Patch 0.55.12 : vue v_users_complete + 3 RPC (validate_password_policy, get_invitation_preview, accept_invitation)" },
      { "code": "FIX", "txt": "Carte Leaflet : stacking context contraint (z-index:0 + isolation) pour ne plus passer au-dessus du menu drawer latéral" },
      { "code": "•", "txt": "Token invitation valide 7 jours, regénérable depuis la liste des invitations" }
    ],
    "themes": ["rls_securite", "ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.12.html",
    "sqlFile": "aveho-PATCH-vers-0.55.12.sql"
  },
  {
    "v": "0.55.11",
    "kind": "version",
    "titre": "Recherche globale ⌘K avec chips de filtre · Export Excel sur listes · Tooltip hover preview HTML sur changelog · Cleanup",
    "chantiers": [
      { "code": "AF", "txt": "Recherche globale ⌘K : chips visuels de filtre par catégorie (patients, matériels, DI, signalements, achats, transferts, maintenances, consents, fournisseurs)" },
      { "code": "AI", "txt": "Export Excel ajouté sur /etablissements, /patients, /matériels (lazy load xlsx via npm)" },
      { "code": "UI", "txt": "Tooltip hover sur changelog : passe la souris sur une évolution → preview du HTML de la note en popup flottant à côté du curseur" },
      { "code": "DOC", "txt": "Page changelog à jour avec 0.55.8, 0.55.9, 0.55.10, 0.55.11" },
      { "code": "FIX", "txt": "Migration xlsx CDN→npm (réflexe 19 : Edge/Brave bloquent jsdelivr)" },
      { "code": "OPS", "txt": "Cleanup dossier dupliqué aveho-ec-app/aveho-ec-app/ supprimé du repo" }
    ],
    "themes": ["ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.11.html"
  },
  {
    "v": "0.55.10",
    "kind": "hotfix",
    "titre": "Fix 502 carte FINESS — page_size cap 200 max tabular-api + garde-fou bbox > 5°lat ou 6°lng",
    "chantiers": [
      { "code": "FIX", "txt": "limit capé à 200 côté serveur ET client (tabular-api refuse >200, renvoyait 400 → mon proxy crashait en 502)" },
      { "code": "UX", "txt": "Garde-fou bbox trop large : si vue France entière → chip orange 'Zoome plus (zone trop large)' au lieu de fetch foireux" },
      { "code": "API", "txt": "Proxy FINESS renvoie 200 avec results:[] + error en metadata au lieu de 502 sur erreur tabular" }
    ],
    "themes": ["fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.10.html"
  },
  {
    "v": "0.55.9",
    "kind": "version",
    "titre": "Carte logistique — Overlay FINESS ressources santé (8 catégories) + fix display:none div",
    "chantiers": [
      { "code": "FE", "txt": "Sur /carte : panneau Ressources santé proches (FINESS) avec 8 catégories en chips multi-sélection" },
      { "code": "FE", "txt": "Catégories : Pharmacies (38k), Maisons de santé (1.1k), Centres de santé (3.4k), EHPAD, Hôpitaux/Cliniques, SSR/Psy, Handicap, Pharma & LPP" },
      { "code": "API", "txt": "Route /api/finess accepte ?bbox=lat1,lng1,lat2,lng2 (filtre tabular via geoloc_4326_lat/long __greater/__less)" },
      { "code": "UX", "txt": "Refresh auto au moveend (pan/zoom) debounced 800ms · marqueurs colorés par catégorie · popups détaillés" },
      { "code": "FIX", "txt": "Div carte plus en display:none (Leaflet ne pouvait pas mesurer clientWidth=0) — loader en position:absolute par-dessus" },
      { "code": "•", "txt": "Note : cabinets infirmiers/médecins libéraux individuels PAS dans FINESS (sont dans RPPS, autre API)" }
    ],
    "themes": ["geographique", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.9.html"
  },
  {
    "v": "0.55.8",
    "kind": "hotfix",
    "titre": "Fix critique carte vide en prod Vercel — race condition mapRef.current null",
    "chantiers": [
      { "code": "FIX", "txt": "Race condition mapRef.current null en prod : useEffect A posait flag leafletReady, useEffect B essayait L.map(mapRef.current) mais React n'avait pas encore commit le DOM" },
      { "code": "REFACTOR", "txt": "Fusion des 2 useEffects en un seul async avec attente patiente : while (!mapRef.current && tries < 50) await sleep(60)" },
      { "code": "RÉFLEXE 20", "txt": "Init lib qui dépend d'une DOM ref → toujours UN SEUL useEffect avec attente active de la ref. Pattern 'effect A pose un flag, effect B utilise la ref' cassé en prod." }
    ],
    "themes": ["fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.8.html"
  },
  {
    "v": "0.55.7",
    "kind": "hotfix",
    "titre": "Fix z-index dropdown FINESS/SIRENE · choix collectivité/partenaire dans Fiche étab · fix IndexedDB closing · changelog à jour",
    "chantiers": [
      { "code": "UI", "txt": "Z-index liste résultats FINESS/SIRENE 60→150 + parent Panel relative z=50" },
      { "code": "FE", "txt": "Sélecteur collectivité/partenaire dans Fiche Établissement" },
      { "code": "OFFLINE", "txt": "Fix InvalidStateError IDBDatabase closing avec withDb() helper retry" },
      { "code": "DOC", "txt": "Changelog à jour : 9 versions ajoutées (0.54 → 0.55.7)" }
    ],
    "themes": ["ux", "fixes", "offline_pwa"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.7.html"
  },
  {
    "v": "0.55.6",
    "kind": "version",
    "titre": "Groupement enrichi SIRENE + popup bâtiments par étab",
    "chantiers": [
      { "code": "RENAME", "txt": "'Collectivité' → 'Groupement' partout dans l'UI" },
      { "code": "SQL", "txt": "+18 champs SIRENE sur structures + batiments.etablissement_id" },
      { "code": "SIRENE", "txt": "Import SIRENE intégré dans Fiche Groupement (tous champs)" },
      { "code": "POPUP", "txt": "Cards d'étabs cliquables → modal arbo bâtiments/étages/services/chambres/lits" },
      { "code": "FE", "txt": "Tabs FINESS/SIRENE dans Fiche Établissement" }
    ],
    "themes": ["ux", "documentation", "stats_dashboard"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.6.html",
    "sqlFile": "aveho-PATCH-vers-0.55.6.sql"
  },
  {
    "v": "0.55.5",
    "kind": "hotfix",
    "titre": "Fix carte vide (Edge bloque CDN) · filtres médicaux FINESS/SIRENE · France+DOM-TOM",
    "chantiers": [
      { "code": "CDN", "txt": "Leaflet + Tabler icons bundlés via npm (Edge Tracking Prevention bloquait unpkg/jsdelivr)" },
      { "code": "FILT_F", "txt": "10 catégories FINESS filtrables (EHPAD, Hôpitaux, USLD, Handicap, SSR/Psy, HAD, Pharma, Formation, Enfance, Social)" },
      { "code": "FILT_S", "txt": "7 catégories SIRENE médicales (santé, pharma, matériel ortho, audio, ambulances, labos, fab pharma)" },
      { "code": "GEO", "txt": "Mention 'France + DOM-TOM' explicite" }
    ],
    "themes": ["fixes", "ux", "pwa"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.5.html"
  },
  {
    "v": "0.55.4",
    "kind": "version",
    "titre": "SIRENE + plugins ligne d'appel + choix appli GPS",
    "chantiers": [
      { "code": "SIRENE", "txt": "Route /api/sirene + composant SireneSearch (40M entreprises)" },
      { "code": "PLUG", "txt": "Plugins ligne d'appel sur tableau /etablissements (tel/mail/GPS/fiche)" },
      { "code": "GPS", "txt": "Modal choix appli GPS : Google Maps / Waze / Apple Plans / OSM" },
      { "code": "TABS", "txt": "Tabs FINESS/SIRENE dans modal d'import" }
    ],
    "themes": ["ux", "documentation"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.4.html"
  },
  {
    "v": "0.55.3",
    "kind": "hotfix",
    "titre": "Partenaires + Réorg menu Établissement + fix warning géoloc Chrome",
    "chantiers": [
      { "code": "PART", "txt": "Étabs partenaires (est_partenaire) : 3 onglets Tous/Mes/Partenaires" },
      { "code": "MENU", "txt": "Carte/Annuaire/Fiche étab déplacés dans section Établissement" },
      { "code": "MARK", "txt": "Marqueurs carte différenciés (bleu géré / teal partenaire)" },
      { "code": "GEO", "txt": "Fix 'Only request geolocation in response to a user gesture'" }
    ],
    "themes": ["ux", "fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.3.html",
    "sqlFile": "aveho-PATCH-vers-0.55.3.sql"
  },
  {
    "v": "0.55.2",
    "kind": "hotfix",
    "titre": "Fix hydratation TopBar + page /etablissements (annuaire)",
    "chantiers": [
      { "code": "HYDR", "txt": "Fix 7 éléments TopBar mismatch hydratation (mounted state)" },
      { "code": "PAGE", "txt": "Page /etablissements créée (annuaire liste + KPI + filtres + modal import FINESS)" }
    ],
    "themes": ["fixes", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.2.html"
  },
  {
    "v": "0.55.0",
    "kind": "version",
    "titre": "FINESS national (340K étabs) + géolocalisation utilisateur sur carte",
    "chantiers": [
      { "code": "FINESS", "txt": "Route /api/finess + FinessSearch (Atlasanté data.gouv.fr, 340K étabs)" },
      { "code": "GEOLOC", "txt": "GeolocPrompt au premier login + marqueur user bleu pulsant sur carte" },
      { "code": "POS", "txt": "Bouton 'Ma position' avec flyTo centré" }
    ],
    "themes": ["ux", "documentation"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.0.html"
  },
  {
    "v": "0.54.0",
    "kind": "version",
    "titre": "Carte logistique Leaflet + Playwright + SafeWrite",
    "chantiers": [
      { "code": "AX", "txt": "Carte Leaflet /carte avec 12 camions demo animés + étabs géolocalisés" },
      { "code": "ADDR", "txt": "AddressAutocomplete via api-adresse.data.gouv.fr (BAN)" },
      { "code": "D", "txt": "Playwright (7 tests E2E sur 3 specs)" },
      { "code": "C", "txt": "SafeWrite tags-materiel + etiquettes" }
    ],
    "themes": ["ux", "documentation", "stats_dashboard"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.54.0.html",
    "sqlFile": "aveho-PATCH-vers-0.54.sql"
  },
  {
    "v": "0.53.0",
    "kind": "version",
    "titre": "Email valideurs · Comparaison périodes · Templates signalements · Mode compact · Mentions légales · Badge NEW",
    "chantiers": [
      {
        "code": "BC",
        "txt": "Email aux valideurs lors de la soumission d'achat"
      },
      {
        "code": "BK",
        "txt": "Comparaison périodes dans /statistiques-activite"
      },
      {
        "code": "BM",
        "txt": "Templates de signalements"
      },
      {
        "code": "BJ",
        "txt": "Mode compact pour les tables"
      },
      {
        "code": "BL",
        "txt": "Mentions légales / RGPD"
      },
      {
        "code": "BO",
        "txt": "Badge \"NEW\" dans le menu pour pages récentes"
      }
    ],
    "themes": [
      "rgpd",
      "achats",
      "ux",
      "notifications",
      "stats_dashboard",
      "documentation",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.53.0.html",
    "sqlFile": "aveho-PATCH-vers-0.53.sql"
  },
  {
    "v": "0.52.8",
    "kind": "hotfix",
    "titre": "Bug latent depuis la 0.38 (livrée il y a longtemps) — requête malformée silencieuse",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Bug latent depuis la 0.38 (livrée il y a longtemps) — requête malformée silencie"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.52.8.html"
  },
  {
    "v": "0.52.7",
    "kind": "hotfix",
    "titre": "Erreurs 503 console nettoyées · 70 versions documentées dans /changelog (+5 récentes)",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Erreurs 503 console nettoyées · 70 versions documentées dans /changelog (+5 réce"
      }
    ],
    "themes": [
      "documentation"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.52.7.html"
  },
  {
    "v": "0.52.6",
    "kind": "hotfix",
    "titre": "\"Le pop-up nouvelle annonce et pas top tout touche le bord\"",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "\"Le pop-up nouvelle annonce et pas top tout touche le bord\""
      }
    ],
    "themes": [
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.52.6.html"
  },
  {
    "v": "0.52.5",
    "kind": "version",
    "titre": "Annonce ciblable par établissement · audit responsive complet sur toutes les pages paramétrage",
    "chantiers": [],
    "themes": [
      "ux",
      "audit",
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.52.5.html",
    "sqlFile": "aveho-PATCH-vers-0.52.5.sql"
  },
  {
    "v": "0.52.4",
    "kind": "hotfix",
    "titre": "Audit complet 0.50→0.52.3, fix mobile sur 6 pages + bannière + 1 modal",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Audit complet 0.50→0.52.3, fix mobile sur 6 pages + bannière + 1 modal"
      }
    ],
    "themes": [
      "ux",
      "audit",
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.52.4.html"
  },
  {
    "v": "0.52.3",
    "kind": "version",
    "titre": "Le changelog devient une vraie base de connaissance navigable",
    "chantiers": [
      {
        "code": "•",
        "txt": "📥 Téléchargement HTML par version"
      },
      {
        "code": "•",
        "txt": "🏷️ 17 thèmes catégorisés"
      },
      {
        "code": "•",
        "txt": "🎨 Bannière refondue (modal + carousel + snooze)"
      },
      {
        "code": "•",
        "txt": "📱 Bannière mobile en bas (safe-area iOS)"
      },
      {
        "code": "•",
        "txt": "🔍 Recherche sophistiquée"
      }
    ],
    "themes": [
      "ux",
      "notifications",
      "recherche",
      "documentation"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.52.3.html"
  },
  {
    "v": "0.52.2",
    "kind": "version",
    "titre": "65 entrées · 57 versions + 8 hotfix · Tout l'historique depuis le départ",
    "chantiers": [],
    "themes": [
      "audit"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.52.2.html"
  },
  {
    "v": "0.52.1",
    "kind": "hotfix",
    "titre": "Explication enfin du pattern récurrent \"la bannière n'apparaît pas après chaque MAJ\"",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Explication enfin du pattern récurrent \"la bannière n'apparaît pas après chaque "
      }
    ],
    "themes": [
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.52.1.html"
  },
  {
    "v": "0.52.0",
    "kind": "version",
    "titre": "Logs applicatifs · Mode focus · Filtres audit prédéfinis · Métriques 7j · Dashboard digest · Recherche c:/f:",
    "chantiers": [
      {
        "code": "AK",
        "txt": "Logs applicatifs front"
      },
      {
        "code": "BD",
        "txt": "Métriques 7j sur page statut"
      },
      {
        "code": "BE",
        "txt": "Filtres audit prédéfinis (presets)"
      },
      {
        "code": "BF",
        "txt": "Dashboard digest notifications"
      },
      {
        "code": "BG",
        "txt": "Mode focus (Esc Esc)"
      },
      {
        "code": "G",
        "txt": "Recherche c: et f:"
      }
    ],
    "themes": [
      "audit",
      "notifications",
      "stats_dashboard",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.52.0.html",
    "sqlFile": "aveho-PATCH-vers-0.52.sql"
  },
  {
    "v": "0.51.0",
    "kind": "version",
    "titre": "Statut système · Stats annonces · Recherche audit · Validations en attente · Migration confirm() finale",
    "chantiers": [
      {
        "code": "AQ",
        "txt": "Statut système — page de monitoring"
      },
      {
        "code": "AZ",
        "txt": "Statistiques annonces"
      },
      {
        "code": "BA",
        "txt": "Recherche audit étendue"
      },
      {
        "code": "BB",
        "txt": "Mes validations en attente (widget accueil)"
      },
      {
        "code": "AA",
        "txt": "Migration confirm() — FINALE"
      }
    ],
    "themes": [
      "audit",
      "notifications",
      "stats_dashboard",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.51.0.html",
    "sqlFile": "aveho-PATCH-vers-0.51.sql"
  },
  {
    "v": "0.50.0",
    "kind": "version",
    "titre": "Workflow achat double validation · Annonces internes · Filtres audit · Migration confirm() · Changelog",
    "chantiers": [
      {
        "code": "AO",
        "txt": "Annonces internes (broadcast admin → users)"
      },
      {
        "code": "AS",
        "txt": "Workflow achat — double validation"
      },
      {
        "code": "AT",
        "txt": "Filtres avancés audit log"
      },
      {
        "code": "AA",
        "txt": "Migration confirm() — phase finale"
      }
    ],
    "themes": [
      "achats",
      "audit",
      "notifications",
      "documentation"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.50.0.html",
    "sqlFile": "aveho-PATCH-vers-0.50.sql"
  },
  {
    "v": "0.49.6",
    "kind": "hotfix",
    "titre": "Empêcher l'avatar utilisateur de sortir de l'écran sans casser les dropdowns",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Empêcher l'avatar utilisateur de sortir de l'écran sans casser les dropdowns"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.49.6.html"
  },
  {
    "v": "0.49.5",
    "kind": "hotfix",
    "titre": "VersionCheck reload réel · dropdown coupé par overflow · bouton install toujours visible",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "VersionCheck reload réel · dropdown coupé par overflow · bouton install toujours"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.49.5.html"
  },
  {
    "v": "0.49.2",
    "kind": "hotfix",
    "titre": "Hydration mismatch · UX mobile (avatar hors écran) · documentation PowerShell",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Hydration mismatch · UX mobile (avatar hors écran) · documentation PowerShell"
      }
    ],
    "themes": [
      "ux",
      "documentation"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.49.2.html"
  },
  {
    "v": "0.49.0",
    "kind": "version",
    "titre": "Badge version · Multi-établissements · Bulk transferts · Notifs catégorie · Onboarding admin · Migration confirm()",
    "chantiers": [
      {
        "code": "AY",
        "txt": "Multi-établissements page accueil"
      },
      {
        "code": "AC",
        "txt": "Bulk transferts (autres déjà OK via Crud)"
      },
      {
        "code": "AV",
        "txt": "Notifications par catégorie"
      },
      {
        "code": "AD",
        "txt": "Onboarding par rôle"
      },
      {
        "code": "AA",
        "txt": "Migration 8 confirm() vers dialogs.confirm()"
      }
    ],
    "themes": [
      "ux",
      "audit",
      "notifications",
      "rls_securite",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.49.0.html"
  },
  {
    "v": "0.48.1",
    "kind": "hotfix",
    "titre": "Élimine les 8 erreurs 503 dans la console quand on est hors-ligne",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Élimine les 8 erreurs 503 dans la console quand on est hors-ligne"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.48.1.html"
  },
  {
    "v": "0.48.0",
    "kind": "version",
    "titre": "Vérif version live · Vue 360° patient enrichie · Drawer mobile swipe",
    "chantiers": [
      {
        "code": "AP",
        "txt": "Vérification de version dispo"
      },
      {
        "code": "AR",
        "txt": "Vue 360° patient enrichie"
      },
      {
        "code": "AW",
        "txt": "Drawer mobile — swipe-to-close"
      }
    ],
    "themes": [
      "ux",
      "patients",
      "realtime"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.48.0.html"
  },
  {
    "v": "0.47.0",
    "kind": "version",
    "titre": "Dashboard direction · Webhooks UI · Push API étendu · Diff visuel · Page offline · InstallBanner",
    "chantiers": [
      {
        "code": "AM",
        "txt": "Dashboard direction multi-structures"
      },
      {
        "code": "AN",
        "txt": "Page /webhooks dédiée"
      },
      {
        "code": "AB",
        "txt": "Push API câblé sur cron + digest"
      },
      {
        "code": "AH",
        "txt": "ConflictResolver — diff visuel word-level"
      },
      {
        "code": "AG",
        "txt": "Page /offline polie"
      },
      {
        "code": "AL",
        "txt": "InstallBanner refonte"
      }
    ],
    "themes": [
      "pwa",
      "notifications",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.47.0.html",
    "sqlFile": "aveho-PATCH-vers-0.47.sql"
  },
  {
    "v": "0.46.0",
    "kind": "version",
    "titre": "pg_stat_statements · Bulk patients · Calendrier RGPD · Sections rétractables · dialogs.confirm() · Push API · Onboarding tour",
    "chantiers": [
      {
        "code": "Y",
        "txt": "pg_stat_statements + dashboard /admin-perf"
      },
      {
        "code": "X",
        "txt": "Bulk patients — actions sur sélection multiple"
      },
      {
        "code": "U",
        "txt": "Calendrier signatures RGPD"
      },
      {
        "code": "W",
        "txt": "CollapsibleSection + /profil refondu"
      },
      {
        "code": "P",
        "txt": "dialogs.confirm() / alert() singleton"
      },
      {
        "code": "Q",
        "txt": "Push browser API câblé sur signalements"
      },
      {
        "code": "T",
        "txt": "Onboarding tour 4 étapes"
      }
    ],
    "themes": [
      "rgpd",
      "ux",
      "audit",
      "notifications",
      "patients",
      "perf_qualite",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.46.0.html",
    "sqlFile": "aveho-PATCH-vers-0.46.sql"
  },
  {
    "v": "0.46.0",
    "kind": "hotfix",
    "titre": "Crossover lib/↔app/ + router non importé dans /profil",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Crossover lib/↔app/ + router non importé dans /profil"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.46.0.html",
    "sqlFile": "aveho-PATCH-vers-0.46.sql"
  },
  {
    "v": "0.45.0",
    "kind": "version",
    "titre": "Notif email signalement · Realtime étendu · Cron hebdo · Audit a11y · Modales réutilisables",
    "chantiers": [
      {
        "code": "B",
        "txt": "Notif email auteur signalement"
      },
      {
        "code": "K",
        "txt": "Realtime étendu — maintenances, transferts, commandes"
      },
      {
        "code": "L",
        "txt": "Cron weekly-stats-digest"
      },
      {
        "code": "J",
        "txt": "Audit a11y complet sur 6 pages"
      },
      {
        "code": "N",
        "txt": "Refactor — modales réutilisables"
      }
    ],
    "themes": [
      "achats",
      "ux",
      "audit",
      "notifications",
      "maintenance",
      "perf_qualite",
      "realtime",
      "stats_dashboard",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.45.0.html"
  },
  {
    "v": "0.44.0",
    "kind": "version",
    "titre": "Activation groupée RGPD · Realtime DI/signalements/achats · Cron récurrences · Indexes SQL · Audit a11y",
    "chantiers": [
      {
        "code": "J",
        "txt": "Activation groupée templates RGPD"
      },
      {
        "code": "K",
        "txt": "Realtime sur DI, signalements, achats"
      },
      {
        "code": "L",
        "txt": "Cron auto-génération récurrences maintenance"
      },
      {
        "code": "M",
        "txt": "Audit perf + 19 indexes SQL"
      },
      {
        "code": "O",
        "txt": "Audit accessibilité (a11y)"
      }
    ],
    "themes": [
      "rgpd",
      "achats",
      "audit",
      "maintenance",
      "perf_qualite",
      "realtime",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.44.0.html",
    "sqlFile": "aveho-PATCH-vers-0.44.sql"
  },
  {
    "v": "0.43.0",
    "kind": "version",
    "titre": "Stats DI · Calendrier maintenance · Realtime · Duplication templates · Audit heatmap · Récurrences maintenance",
    "chantiers": [
      {
        "code": "N",
        "txt": "Dashboard statistiques DI"
      },
      {
        "code": "M",
        "txt": "Vue calendrier mensuelle maintenances"
      },
      {
        "code": "L",
        "txt": "Notification temps réel Supabase"
      },
      {
        "code": "K",
        "txt": "Duplication templates RGPD multi-établissements"
      },
      {
        "code": "J",
        "txt": "Heatmap temporel sur /audit"
      },
      {
        "code": "A",
        "txt": "CRUD récurrences maintenance"
      }
    ],
    "themes": [
      "rgpd",
      "audit",
      "notifications",
      "maintenance",
      "realtime",
      "stats_dashboard",
      "infrastructure",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.43.0.html",
    "sqlFile": "aveho-PATCH-vers-0.43.sql"
  },
  {
    "v": "0.43.0",
    "kind": "hotfix",
    "titre": "Vues stats DI invisibles côté API + duplication templates RGPD bloquée",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Vues stats DI invisibles côté API + duplication templates RGPD bloquée"
      }
    ],
    "themes": [
      "rgpd",
      "stats_dashboard",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.43.0.html",
    "sqlFile": "aveho-PATCH-vers-0.43.sql"
  },
  {
    "v": "0.42.0",
    "kind": "version",
    "titre": "Templates RGPD par établissement · Digest historique · Audit log UI · Timeline DI fiche patient · Mode présentation TV",
    "chantiers": [
      {
        "code": "I",
        "txt": "Templates RGPD par établissement"
      },
      {
        "code": "J",
        "txt": "Digest — historique des envois"
      },
      {
        "code": "K",
        "txt": "Page /audit dédiée"
      },
      {
        "code": "L",
        "txt": "Timeline DI sur fiche patient"
      },
      {
        "code": "M",
        "txt": "Mode présentation TV de service"
      }
    ],
    "themes": [
      "rgpd",
      "audit",
      "notifications",
      "patients",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.42.0.html",
    "sqlFile": "aveho-PATCH-vers-0.42.sql"
  },
  {
    "v": "0.41.0",
    "kind": "version",
    "titre": "Drill heatmap RGPD · Digest test · Preview kanban · Workflow signalements · Stats maintenances · Widget \"À traiter\"",
    "chantiers": [
      {
        "code": "I",
        "txt": "Drill-down heatmap signatures RGPD"
      },
      {
        "code": "J",
        "txt": "Digest — test depuis /profil"
      },
      {
        "code": "K",
        "txt": "DIPreview dans Kanban"
      },
      {
        "code": "H",
        "txt": "Signalements — workflow avancé"
      },
      {
        "code": "L",
        "txt": "Maintenances — stats par type + récurrences"
      },
      {
        "code": "A",
        "txt": "Accueil — widget \"À traiter\""
      }
    ],
    "themes": [
      "rgpd",
      "notifications",
      "maintenance",
      "perf_qualite",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.41.0.html",
    "sqlFile": "aveho-PATCH-vers-0.41.sql"
  },
  {
    "v": "0.41.0",
    "kind": "hotfix",
    "titre": "Erreurs SQL au déploiement + 1 test DST → tout fixé",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Erreurs SQL au déploiement + 1 test DST → tout fixé"
      }
    ],
    "themes": [
      "perf_qualite",
      "infrastructure"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.41.0.html",
    "sqlFile": "aveho-PATCH-vers-0.41.sql"
  },
  {
    "v": "0.40.0",
    "kind": "version",
    "titre": "Digest email · Signalements votes + catégories · Stats RGPD enrichies · Variables custom RGPD · Preview étendus",
    "chantiers": [
      {
        "code": "F",
        "txt": "Notifications digest (email récap automatique)"
      },
      {
        "code": "K",
        "txt": "Signalements enrichis : votes + catégories"
      },
      {
        "code": "L",
        "txt": "Stats RGPD enrichies (3 nouveaux blocs)"
      },
      {
        "code": "G",
        "txt": "Variables custom dans les templates RGPD"
      },
      {
        "code": "J",
        "txt": "PatientPreview étendu à /interventions"
      }
    ],
    "themes": [
      "rgpd",
      "notifications",
      "patients",
      "maintenance",
      "stats_dashboard",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.40.0.html",
    "sqlFile": "aveho-PATCH-vers-0.40.sql"
  },
  {
    "v": "0.39.0",
    "kind": "version",
    "titre": "EntityPreview générique · DIPreview + AchatPreview · Dernière DI lazy · Filtres avancés stats activité + CSV",
    "chantiers": [
      {
        "code": "•",
        "txt": "🧩 EntityPreview générique réutilisable"
      },
      {
        "code": "•",
        "txt": "🔧 DIPreview hover sur les numéros DI"
      },
      {
        "code": "•",
        "txt": "🛒 AchatPreview hover sur les numéros achats"
      },
      {
        "code": "•",
        "txt": "⚡ Dernière DI fetchée lazy au hover patient"
      },
      {
        "code": "•",
        "txt": "🔍 Filtres avancés stats activité (etab / user / catégorie)"
      },
      {
        "code": "•",
        "txt": "📊 Export CSV brut audit_log (5000 lignes max)"
      }
    ],
    "themes": [
      "achats",
      "audit",
      "patients",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.39.0.html"
  },
  {
    "v": "0.38.0",
    "kind": "version",
    "titre": "Aperçu rapide patient au hover — popover contextuel, navigation accélérée",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔍 Popover au survol nom patient (desktop)"
      },
      {
        "code": "•",
        "txt": "📱 Tap direct sur mobile (pas de hover)"
      },
      {
        "code": "•",
        "txt": "⏱️ Délai 500ms anti-flicker"
      },
      {
        "code": "•",
        "txt": "📊 Compteurs DI/achats préchargés"
      },
      {
        "code": "•",
        "txt": "🛡️ Badge RGPD intégré"
      },
      {
        "code": "•",
        "txt": "📍 Positionnement intelligent (bord d'écran)"
      }
    ],
    "themes": [
      "rgpd",
      "achats",
      "ux",
      "patients"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.38.0.html"
  },
  {
    "v": "0.37.0",
    "kind": "version",
    "titre": "Drill-down heatmap cliquable · Badges tendance N vs N-1 · RPC get_heatmap_drill",
    "chantiers": [
      {
        "code": "•",
        "txt": "📊 Vue v_stats_activite_global (mois courant vs précédent)"
      },
      {
        "code": "•",
        "txt": "🔍 RPC get_heatmap_drill pour détail par créneau"
      },
      {
        "code": "•",
        "txt": "🖱️ Heatmap cliquable avec modale drill-down"
      },
      {
        "code": "•",
        "txt": "📈 Composant TrendBadge réutilisable"
      },
      {
        "code": "•",
        "txt": "🎯 6 métriques de tendance sur stats activité"
      },
      {
        "code": "•",
        "txt": "🛡️ TrendBadge intégré aussi dans stats RGPD"
      }
    ],
    "themes": [
      "rgpd",
      "ux",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.37.0.html",
    "sqlFile": "aveho-PATCH-vers-0.37.sql"
  },
  {
    "v": "0.36.0",
    "kind": "version",
    "titre": "Icônes brandées · 13 splash iOS · InstallBanner contextuel · Optims touch + safe area",
    "chantiers": [
      {
        "code": "•",
        "txt": "📱 13 icônes brandées (16px → 512px)"
      },
      {
        "code": "•",
        "txt": "🚀 13 splash screens iOS (iPhone 8 → 14 Pro Max + iPad)"
      },
      {
        "code": "•",
        "txt": "⚙️ Manifest enrichi : shortcuts, categories, lang"
      },
      {
        "code": "•",
        "txt": "💬 InstallBanner contextuel (30s + snooze 7j)"
      },
      {
        "code": "•",
        "txt": "👆 Touch targets 44px (Apple/Google specs)"
      },
      {
        "code": "•",
        "txt": "🛡️ Safe area pour notch iPhone X+"
      }
    ],
    "themes": [
      "pwa"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.36.0.html"
  },
  {
    "v": "0.35.0",
    "kind": "version",
    "titre": "Fix doublon GlobalSearch · Bouton 🔍 visible · 2 nouvelles entités · Historique récent",
    "chantiers": [
      {
        "code": "•",
        "txt": "🩹 Fix doublon GlobalSearch dans TopBar"
      },
      {
        "code": "•",
        "txt": "🔍 Bouton search visible avec badge ⌘K"
      },
      {
        "code": "•",
        "txt": "🔄 Recherche transferts (préfixe t:)"
      },
      {
        "code": "•",
        "txt": "🔧 Recherche maintenances (préfixe x:)"
      },
      {
        "code": "•",
        "txt": "⏱️ Historique 6 dernières navigations (localStorage)"
      }
    ],
    "themes": [
      "ux",
      "audit",
      "maintenance",
      "transferts",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.35.0.html"
  },
  {
    "v": "0.34.0",
    "kind": "version",
    "titre": "Sortie du template hardcodé · Éditeur markdown · Versionning + audit · Preview live",
    "chantiers": [
      {
        "code": "•",
        "txt": "📋 Table consent_templates avec versionning"
      },
      {
        "code": "•",
        "txt": "✍️ Éditeur markdown side-by-side preview"
      },
      {
        "code": "•",
        "txt": "🔢 Auto-incrément version (1.0 → 1.1)"
      },
      {
        "code": "•",
        "txt": "🛡️ Anti-suppression si utilisé (audit)"
      },
      {
        "code": "•",
        "txt": "⚙️ Trigger SQL : 1 seul actif par structure"
      },
      {
        "code": "•",
        "txt": "🩹 Fix SQL roles.systeme BOOLEAN"
      },
      {
        "code": "•",
        "txt": "🩹 Fix Modal props (open + size)"
      }
    ],
    "themes": [
      "rgpd",
      "ux",
      "audit",
      "realtime",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.34.0.html",
    "sqlFile": "aveho-PATCH-vers-0.34.sql"
  },
  {
    "v": "0.33.0",
    "kind": "version",
    "titre": "Edge Function send-email · Email template brandé · Opt-in par catégorie · Intégration logEvent",
    "chantiers": [
      {
        "code": "•",
        "txt": "📧 Edge Function send-email réutilisable"
      },
      {
        "code": "•",
        "txt": "🎨 Template HTML brandé Aveho (navy + teal)"
      },
      {
        "code": "•",
        "txt": "☑️ Opt-in par catégorie (push ON / email OFF par défaut)"
      },
      {
        "code": "•",
        "txt": "🔌 Relais auto depuis logEvent"
      },
      {
        "code": "•",
        "txt": "🛡️ XSS escape sur tous les champs dynamiques"
      }
    ],
    "themes": [
      "notifications",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.33.0.html",
    "sqlFile": "aveho-PATCH-vers-0.33.sql"
  },
  {
    "v": "0.32.0",
    "kind": "version",
    "titre": "Tracker signalements perso — opt-in created_by préservant l'anonymat par défaut",
    "chantiers": [
      {
        "code": "•",
        "txt": "☑️ Checkbox opt-in dans le form signalement"
      },
      {
        "code": "•",
        "txt": "📊 KPI \"Signalements signés\" de retour dans /profil"
      },
      {
        "code": "•",
        "txt": "👥 Compteur signalements dans stats activité"
      }
    ],
    "themes": [
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.32.0.html",
    "sqlFile": "aveho-PATCH-vers-0.32.sql"
  },
  {
    "v": "0.31.0",
    "kind": "version",
    "titre": "Statistiques d'activité — Top utilisateurs · Heatmap jour×heure · Export PDF",
    "chantiers": [
      {
        "code": "•",
        "txt": "📊 5 vues SQL d'agrégation activité"
      },
      {
        "code": "•",
        "txt": "🏆 Podium top 3 + jauges 4-10"
      },
      {
        "code": "•",
        "txt": "🗓️ Heatmap 7 jours × 24 heures"
      },
      {
        "code": "•",
        "txt": "📅 Sélecteur période 7/30/90 jours"
      },
      {
        "code": "•",
        "txt": "📄 Export PDF brandé"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (150 lignes)"
      }
    ],
    "themes": [
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.31.0.html",
    "sqlFile": "aveho-PATCH-vers-0.31.sql"
  },
  {
    "v": "0.30.0",
    "kind": "version",
    "titre": "Dashboard collectif RGPD · Graphiques SVG natifs · KPIs avancés · Export PDF brandé",
    "chantiers": [
      {
        "code": "•",
        "txt": "📊 5 vues SQL d'agrégation"
      },
      {
        "code": "•",
        "txt": "📈 4 composants graphiques SVG natifs"
      },
      {
        "code": "•",
        "txt": "🎯 6 KPIs RGPD globaux"
      },
      {
        "code": "•",
        "txt": "🏥 Performance par établissement"
      },
      {
        "code": "•",
        "txt": "📄 Export PDF brandé Aveho"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (194 lignes)"
      }
    ],
    "themes": [
      "rgpd",
      "perf_qualite",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.30.0.html",
    "sqlFile": "aveho-PATCH-vers-0.30.sql"
  },
  {
    "v": "0.29.1",
    "kind": "version",
    "titre": "Hotfix dashboard /profil — corrections des erreurs 400 et 404 sur audit_log et signalements",
    "chantiers": [
      {
        "code": "•",
        "txt": "🩹 Fix table audit_events → audit_log"
      },
      {
        "code": "•",
        "txt": "🩹 Fix signalements.user_id inexistant"
      },
      {
        "code": "•",
        "txt": "📋 Doc résolution erreur 503 Service Worker"
      }
    ],
    "themes": [
      "pwa",
      "audit",
      "stats_dashboard",
      "infrastructure"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.29.1.html"
  },
  {
    "v": "0.29.0",
    "kind": "version",
    "titre": "Filtres sticky localStorage · Préférences notif par user · Dashboard /profil enrichi",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔖 useStickyState — filtres persistés par user"
      },
      {
        "code": "•",
        "txt": "🔔 7 catégories de notif configurables"
      },
      {
        "code": "•",
        "txt": "🌙 Heures silencieuses"
      },
      {
        "code": "•",
        "txt": "📊 Dashboard /profil : mes stats + historique"
      },
      {
        "code": "•",
        "txt": "⚙️ Filtrage push côté Edge Function"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL"
      }
    ],
    "themes": [
      "audit",
      "notifications",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.29.0.html",
    "sqlFile": "aveho-PATCH-vers-0.29.sql"
  },
  {
    "v": "0.28.0",
    "kind": "version",
    "titre": "Invalidation cache auto · Migration safeWrite quasi-totale · safeFetch sur signalements",
    "chantiers": [
      {
        "code": "•",
        "txt": "🧹 cacheInvalidate auto dans safeWrite"
      },
      {
        "code": "•",
        "txt": "📦 6 pages métier migrées (transferts, maintenance, panier...)"
      },
      {
        "code": "•",
        "txt": "🏷️ Tags + étiquettes via safeWrite"
      },
      {
        "code": "•",
        "txt": "🛡️ ConsentementRGPD offline-aware"
      },
      {
        "code": "•",
        "txt": "💾 safeFetch sur signalements"
      }
    ],
    "themes": [
      "rgpd",
      "pwa",
      "maintenance",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.28.0.html"
  },
  {
    "v": "0.27.0",
    "kind": "version",
    "titre": "Cache lecture activé · Bandeau données obsolètes · Modale résolution conflit avec fusion champ par champ",
    "chantiers": [
      {
        "code": "•",
        "txt": "💾 safeFetch activé : patients + interventions + achats"
      },
      {
        "code": "•",
        "txt": "🟠 Bandeau \"données obsolètes\" sur 3 pages"
      },
      {
        "code": "•",
        "txt": "⚔️ Modale ConflictResolver avec 3 actions"
      },
      {
        "code": "•",
        "txt": "🎨 Fusion champ par champ (UI claire)"
      }
    ],
    "themes": [
      "achats",
      "ux",
      "patients",
      "maintenance"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.27.0.html"
  },
  {
    "v": "0.26.0",
    "kind": "version",
    "titre": "Migration safeWrite sur toutes pages critiques · Cache lecture IndexedDB · Détection conflit optimiste",
    "chantiers": [
      {
        "code": "•",
        "txt": "📵 Crud.js + achats + interventions + signalements offline-ready"
      },
      {
        "code": "•",
        "txt": "💾 Cache de lecture IndexedDB (TTL 7j)"
      },
      {
        "code": "•",
        "txt": "🛡️ Détection conflit optimiste (updated_at)"
      },
      {
        "code": "•",
        "txt": "📦 ~15 pages bénéficient via Crud"
      }
    ],
    "themes": [
      "achats",
      "pwa",
      "maintenance",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.26.0.html"
  },
  {
    "v": "0.25.0",
    "kind": "version",
    "titre": "Mode hors-ligne avec queue d'écritures IndexedDB + sync automatique à la reconnexion",
    "chantiers": [
      {
        "code": "•",
        "txt": "📴 Queue IndexedDB persistante"
      },
      {
        "code": "•",
        "txt": "🔄 Sync auto à la reconnexion"
      },
      {
        "code": "•",
        "txt": "📊 Modale détail \"actions en attente\""
      },
      {
        "code": "•",
        "txt": "🆔 UUID client pour INSERT offline"
      },
      {
        "code": "•",
        "txt": "🛠️ Helpers safeInsert/Update/Delete/Rpc"
      }
    ],
    "themes": [
      "pwa",
      "ux",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.25.0.html"
  },
  {
    "v": "0.24.0",
    "kind": "version",
    "titre": "Resend API · Auto-archivage 6 mois · Export CSV audit annuel",
    "chantiers": [
      {
        "code": "•",
        "txt": "📧 Email DPO via Resend API (HTML brandé)"
      },
      {
        "code": "•",
        "txt": "📦 Auto-archivage cron mensuel"
      },
      {
        "code": "•",
        "txt": "📊 Export CSV audit annuel"
      },
      {
        "code": "•",
        "txt": "⚙️ Seuil archivage configurable par collectivité"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL + 1 Edge Function"
      }
    ],
    "themes": [
      "audit",
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.24.0.html",
    "sqlFile": "aveho-PATCH-vers-0.24.sql"
  },
  {
    "v": "0.23.0",
    "kind": "version",
    "titre": "Cron renouvellement quotidien · Audit scans QR · Durée de validité configurable",
    "chantiers": [
      {
        "code": "•",
        "txt": "⏰ Cron quotidien renouvellement (push + webhook + email DPO)"
      },
      {
        "code": "•",
        "txt": "🔍 Page admin audit scans QR"
      },
      {
        "code": "•",
        "txt": "⚙️ Durée validité configurable (1/2/3/5/10 ans)"
      },
      {
        "code": "•",
        "txt": "📧 Email DPO HTML brandé Aveho"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL + 1 Edge Function"
      }
    ],
    "themes": [
      "audit",
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.23.0.html",
    "sqlFile": "aveho-PATCH-vers-0.23.sql"
  },
  {
    "v": "0.22.0",
    "kind": "version",
    "titre": "PDF avec signature intégrée · QR code de vérification · Renouvellement automatique 3 ans",
    "chantiers": [
      {
        "code": "•",
        "txt": "📄 Export PDF complet avec signature image"
      },
      {
        "code": "•",
        "txt": "🔍 QR code de vérification d'intégrité"
      },
      {
        "code": "•",
        "txt": "🌐 Page publique /verifier (anonyme)"
      },
      {
        "code": "•",
        "txt": "⏰ Date d'expiration auto (3 ans)"
      },
      {
        "code": "•",
        "txt": "🔔 Filtre \"À renouveler\" + alertes 30j"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (193 lignes)"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.22.0.html",
    "sqlFile": "aveho-PATCH-vers-0.22.sql"
  },
  {
    "v": "0.21.0",
    "kind": "version",
    "titre": "Consentement RGPD complet · Signature électronique tactile + WebHID · Hash SHA-256 + Storage privé",
    "chantiers": [
      {
        "code": "•",
        "txt": "🛡️ Consentement RGPD générique santé à domicile"
      },
      {
        "code": "•",
        "txt": "✍️ Pavé de signature tactile (Pointer Events)"
      },
      {
        "code": "•",
        "txt": "🔌 Détection signpads externes via WebHID"
      },
      {
        "code": "•",
        "txt": "🔐 Hash SHA-256 + Storage privé Supabase"
      },
      {
        "code": "•",
        "txt": "📋 Page /consentements avec filtres &amp; archivage"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL + 1 bucket Storage"
      }
    ],
    "themes": [
      "rgpd",
      "infrastructure"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.21.0.html",
    "sqlFile": "aveho-PATCH-vers-0.21.sql"
  },
  {
    "v": "0.20.0",
    "kind": "version",
    "titre": "Full-text search Postgres · Notifs push regroupées · Recherche dans liste membres",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔍 Recherche full-text accent-insensitive"
      },
      {
        "code": "•",
        "txt": "⚡ Index GIN sur patients + matériels"
      },
      {
        "code": "•",
        "txt": "🔔 Push notifs regroupées par tag"
      },
      {
        "code": "•",
        "txt": "👥 Recherche dans liste membres"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (111 lignes)"
      }
    ],
    "themes": [
      "notifications",
      "patients",
      "perf_qualite",
      "transferts",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.20.0.html",
    "sqlFile": "aveho-PATCH-vers-0.20.sql"
  },
  {
    "v": "0.19.0",
    "kind": "version",
    "titre": "67 tests Vitest · Audit mode sombre 0.16-0.18 · Lazy load modules lourds · pageSize configurable · content-visibility",
    "chantiers": [
      {
        "code": "•",
        "txt": "🌓 Mode sombre complet (UM, FilterBar, Tooltip…)"
      },
      {
        "code": "•",
        "txt": "📦 -44% bundle fiche matériel/patient"
      },
      {
        "code": "•",
        "txt": "🔢 pageSize configurable (25/50/100/Tout)"
      },
      {
        "code": "•",
        "txt": "⚡ content-visibility sur les tables"
      }
    ],
    "themes": [
      "audit",
      "patients",
      "perf_qualite",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.19.0.html"
  },
  {
    "v": "0.18.0",
    "kind": "version",
    "titre": "Tests Vitest (34 tests) · Refactor pdfPreview blob URL · Audit a11y (focus, ARIA, skip-link) · NotifBell mutualisé",
    "chantiers": [
      {
        "code": "•",
        "txt": "🧹 document.write supprimé partout"
      },
      {
        "code": "•",
        "txt": "♿ Focus visible accessible"
      },
      {
        "code": "•",
        "txt": "🪪 Skip-link au contenu principal"
      },
      {
        "code": "•",
        "txt": "🔄 NotifBell utilise relativeTime partagé"
      },
      {
        "code": "•",
        "txt": "🔒 Focus trap dans les modales"
      }
    ],
    "themes": [
      "ux",
      "audit",
      "notifications",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.18.0.html"
  },
  {
    "v": "0.17.1",
    "kind": "version",
    "titre": "Push VAPID · Webhooks Teams &amp; Slack · Tri Kanban par échéance · relativeTime mutualisé",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔔 Push notifications VAPID"
      },
      {
        "code": "•",
        "txt": "🟦 Webhook Microsoft Teams"
      },
      {
        "code": "•",
        "txt": "🟪 Webhook Slack"
      },
      {
        "code": "•",
        "txt": "📅 Tri Kanban par échéance"
      },
      {
        "code": "•",
        "txt": "♻️ relativeTime extrait dans lib/format"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL + 2 Edge Functions"
      }
    ],
    "themes": [
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.17.1.html",
    "sqlFile": "aveho-PATCH-vers-0.17.1.sql"
  },
  {
    "v": "0.17.0",
    "kind": "version",
    "titre": "Drag tactile Kanban (Pointer Events) · Échéance DI saisissable · Pastilles d'activité utilisateurs · Notes 0.12-0.14 enrichies",
    "chantiers": [
      {
        "code": "•",
        "txt": "📱 Drag tactile Kanban"
      },
      {
        "code": "•",
        "txt": "📅 Échéance DI dans la modale"
      },
      {
        "code": "•",
        "txt": "🟢 \"En ligne il y a X\" sur membres"
      },
      {
        "code": "•",
        "txt": "📚 Notes 0.12 · 0.13 · 0.14 enrichies"
      },
      {
        "code": "•",
        "txt": "🚫 0 dépendance npm ajoutée"
      }
    ],
    "themes": [
      "ux",
      "documentation"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.17.0.html"
  },
  {
    "v": "0.16.1",
    "kind": "version",
    "titre": "",
    "chantiers": [
      {
        "code": "•",
        "txt": "⚙️ Auto-rattachement admin (2 triggers SQL)"
      },
      {
        "code": "•",
        "txt": "📅 due_date rétabli"
      },
      {
        "code": "•",
        "txt": "🛒 Commander un remplacement"
      },
      {
        "code": "•",
        "txt": "🏷️ 10 étiquettes par défaut seedées"
      },
      {
        "code": "•",
        "txt": "🧩 Composant FilterBar partagé"
      },
      {
        "code": "•",
        "txt": "💬 Tooltips fiche matériel"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (178 lignes)"
      }
    ],
    "themes": [
      "achats",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.16.1.html",
    "sqlFile": "aveho-PATCH-vers-0.16.1.sql"
  },
  {
    "v": "0.16.0",
    "kind": "version",
    "titre": "UserMenu (desktop + mobile) · Archivage utilisateurs · Modale infos enrichie · Tooltips fiche patient",
    "chantiers": [
      {
        "code": "•",
        "txt": "👤 UserMenu avec avatar + nom"
      },
      {
        "code": "•",
        "txt": "📱 Bottom-sheet mobile"
      },
      {
        "code": "•",
        "txt": "🗂️ Archivage utilisateurs"
      },
      {
        "code": "•",
        "txt": "📊 Stats d'activité par user"
      },
      {
        "code": "•",
        "txt": "💬 Tooltips réutilisables"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (4 colonnes + 1 vue)"
      }
    ],
    "themes": [
      "ux",
      "patients",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.16.0.html",
    "sqlFile": "aveho-PATCH-vers-0.16.sql"
  },
  {
    "v": "0.15.6",
    "kind": "version",
    "titre": "",
    "chantiers": [
      {
        "code": "•",
        "txt": "🛒 Module Achats (workflow 7 statuts)"
      },
      {
        "code": "•",
        "txt": "⌘K Préfixes p:/m:/d:/s:/a:"
      },
      {
        "code": "•",
        "txt": "📰 Journal d'activité"
      },
      {
        "code": "•",
        "txt": "📊 Export Excel multi-feuille"
      },
      {
        "code": "•",
        "txt": "⚠️ 8 pièges connus documentés"
      },
      {
        "code": "•",
        "txt": "🔧 2 scripts SQL livrés"
      },
      {
        "code": "•",
        "txt": "🔥 6 hotfix post-livraison"
      }
    ],
    "themes": [
      "achats",
      "transferts",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.15.6.html"
  },
  {
    "v": "0.15.1",
    "kind": "version",
    "titre": "",
    "chantiers": [
      {
        "code": "•",
        "txt": "🛒 Module Achats (workflow 7 statuts)"
      },
      {
        "code": "•",
        "txt": "⌘K Préfixes p:/m:/d:/s:/a:"
      },
      {
        "code": "•",
        "txt": "📰 Journal d'activité"
      },
      {
        "code": "•",
        "txt": "📊 Export Excel multi-feuille"
      },
      {
        "code": "•",
        "txt": "⚠️ Pièges connus documentés"
      },
      {
        "code": "•",
        "txt": "🔧 Script PATCH consolidé"
      },
      {
        "code": "•",
        "txt": "🔥 Hotfix 0.15.1 : Journal corrigé"
      }
    ],
    "themes": [
      "achats",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.15.1.html"
  },
  {
    "v": "0.15",
    "kind": "version",
    "titre": "",
    "chantiers": [
      {
        "code": "•",
        "txt": "🛒 Module Achats (workflow 7 statuts)"
      },
      {
        "code": "•",
        "txt": "⌘K Préfixes p:/m:/d:/s:/a:"
      },
      {
        "code": "•",
        "txt": "📰 Journal d'activité"
      },
      {
        "code": "•",
        "txt": "📊 Export Excel multi-feuille"
      },
      {
        "code": "•",
        "txt": "⚠️ Pièges connus documentés"
      },
      {
        "code": "•",
        "txt": "🔧 Script PATCH consolidé"
      },
      {
        "code": "•",
        "txt": "🔥 Hotfix 0.15.1 : Journal corrigé"
      }
    ],
    "themes": [
      "achats",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.15.html",
    "sqlFile": "aveho-PATCH-vers-0.15.sql"
  },
  {
    "v": "0.14",
    "kind": "version",
    "titre": "Imprimer les fiches · Aperçu impression Stats · Recherche globale Cmd+K · Vue Kanban DI",
    "chantiers": [
      {
        "code": "•",
        "txt": "🖨️ Imprimer fiches patient & matériel"
      },
      {
        "code": "•",
        "txt": "📄 Aperçu impression Stats"
      },
      {
        "code": "•",
        "txt": "⌘K Recherche globale"
      },
      {
        "code": "•",
        "txt": "📋 Vue Kanban DI"
      },
      {
        "code": "•",
        "txt": "🏷️ Étiquettes patient sur fiche"
      }
    ],
    "themes": [
      "patients",
      "stats_dashboard",
      "transferts",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.14.html"
  },
  {
    "v": "0.13",
    "kind": "version",
    "titre": "Fiche patient 360° · Stats signalements · Filtres combinés · Mode auto jour/nuit · Aperçu impression A4",
    "chantiers": [
      {
        "code": "•",
        "txt": "👤 Fiche patient 360°"
      },
      {
        "code": "•",
        "txt": "📊 Stats signalements"
      },
      {
        "code": "•",
        "txt": "🔍 Filtres combinés Matériels"
      },
      {
        "code": "•",
        "txt": "🌗 Mode auto jour/nuit"
      },
      {
        "code": "•",
        "txt": "🖨️ Aperçu impression A4"
      }
    ],
    "themes": [
      "patients",
      "stats_dashboard",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.13.html"
  },
  {
    "v": "0.12",
    "kind": "version",
    "titre": "Fiche matériel 360° · Export PDF planning · Stats Maintenance · Signalements anonymes · Cron quotidien",
    "chantiers": [
      {
        "code": "•",
        "txt": "📋 Fiche matériel 360°"
      },
      {
        "code": "•",
        "txt": "📄 Export PDF planning"
      },
      {
        "code": "•",
        "txt": "📊 Stats Maintenance"
      },
      {
        "code": "•",
        "txt": "💬 Signalements anonymes"
      },
      {
        "code": "•",
        "txt": "⏰ Cron quotidien Supabase"
      },
      {
        "code": "•",
        "txt": "⚠ Nouveau script SQL + Edge Function"
      }
    ],
    "themes": [
      "maintenance",
      "stats_dashboard",
      "transferts",
      "infrastructure"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.12.html"
  },
  {
    "v": "0.11",
    "kind": "version",
    "titre": "Lien Maintenance↔DI · Maintenances récurrentes · Notifs J-7 · Tags matériel · Maintenances dans calendrier",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔗 Lien Maintenance ↔ DI auto"
      },
      {
        "code": "•",
        "txt": "🔁 Maintenances récurrentes"
      },
      {
        "code": "•",
        "txt": "🔔 Notifs J-7"
      },
      {
        "code": "•",
        "txt": "🏷️ Tags matériel"
      },
      {
        "code": "•",
        "txt": "📅 Maintenances dans calendrier"
      },
      {
        "code": "•",
        "txt": "⚠ Nouveau script SQL requis"
      }
    ],
    "themes": [
      "notifications",
      "maintenance",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.11.html"
  },
  {
    "v": "0.10",
    "kind": "version",
    "titre": "Maintenance préventive · Calendrier vue semaine · Filtre étiquette · Mode kiosque · Mode lecture seule",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔧 Maintenance préventive"
      },
      {
        "code": "•",
        "txt": "📅 Calendrier vue semaine"
      },
      {
        "code": "•",
        "txt": "🏷️ Filtre par étiquette"
      },
      {
        "code": "•",
        "txt": "🖥️ Mode kiosque"
      },
      {
        "code": "•",
        "txt": "👁️ Mode lecture seule"
      },
      {
        "code": "•",
        "txt": "⚠ Nouveau script SQL requis"
      }
    ],
    "themes": [
      "maintenance"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.10.html"
  },
  {
    "v": "0.9",
    "kind": "version",
    "titre": "Sélection multiple · Calendrier DI · Étiquettes patients · Comparaison inter-établissements",
    "chantiers": [
      {
        "code": "•",
        "txt": "☑️ Sélection multiple + bulk actions"
      },
      {
        "code": "•",
        "txt": "📅 Calendrier DI mensuel"
      },
      {
        "code": "•",
        "txt": "🏷️ Étiquettes patients"
      },
      {
        "code": "•",
        "txt": "⚖️ Comparaison inter-étab"
      },
      {
        "code": "•",
        "txt": "⚠ Nouveau script SQL requis"
      }
    ],
    "themes": [
      "patients",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.9.html"
  },
  {
    "v": "0.8",
    "kind": "version",
    "titre": "Tri colonnes · Pagination · Filtres avancés étendus · Export PDF stats · Recherche fulltext historique",
    "chantiers": [
      {
        "code": "•",
        "txt": "↕️ Tri colonnes (toutes listes Crud)"
      },
      {
        "code": "•",
        "txt": "📄 Pagination 50/page"
      },
      {
        "code": "•",
        "txt": "🔍 Filtres avancés Articles + Matériels"
      },
      {
        "code": "•",
        "txt": "📊 Export PDF Statistiques"
      },
      {
        "code": "•",
        "txt": "🔎 Recherche fulltext Historique"
      }
    ],
    "themes": [
      "audit",
      "stats_dashboard",
      "transferts",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.8.html"
  },
  {
    "v": "0.7",
    "kind": "version",
    "titre": "Statistiques · Import CSV · Mode foncé · Filtres avancés · Réorganisation widgets",
    "chantiers": [
      {
        "code": "•",
        "txt": "📊 Nouvelle page Statistiques"
      },
      {
        "code": "•",
        "txt": "📥 Import CSV"
      },
      {
        "code": "•",
        "txt": "🌙 Mode foncé"
      },
      {
        "code": "•",
        "txt": "🔍 Filtres avancés Patients"
      },
      {
        "code": "•",
        "txt": "↕️ Widgets réordonnables"
      }
    ],
    "themes": [
      "patients",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.7.html"
  },
  {
    "v": "0.6",
    "kind": "version",
    "titre": "Mode hors-ligne PWA · Assignation DI · Dashboard personnalisable · Libellés métier complets",
    "chantiers": [
      {
        "code": "•",
        "txt": "📡 Mode hors-ligne consultation"
      },
      {
        "code": "•",
        "txt": "🎯 Notifs ciblées effectives"
      },
      {
        "code": "•",
        "txt": "⚙️ Dashboard configurable"
      },
      {
        "code": "•",
        "txt": "⚠ Test interne"
      }
    ],
    "themes": [
      "pwa",
      "notifications",
      "perf_qualite",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.6.html"
  },
  {
    "v": "0.5",
    "kind": "version",
    "titre": "RLS étanche · Profil utilisateur · Logs de connexion · Libellés propagés · Filtres temporels",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔒 RLS étanche par établissement"
      },
      {
        "code": "•",
        "txt": "⚠ Test interne"
      }
    ],
    "themes": [
      "audit",
      "rls_securite",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.5.html"
  },
  {
    "v": "0.4",
    "kind": "version",
    "titre": "Notifications auto · Audit log · Libellés métier appliqués · Export PDF · Droits étendus",
    "chantiers": [
      {
        "code": "•",
        "txt": "✓ Notifications maintenant peuplées"
      },
      {
        "code": "•",
        "txt": "⚠ Test interne"
      }
    ],
    "themes": [
      "audit",
      "notifications",
      "rls_securite",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.4.html"
  },
  {
    "v": "0.3",
    "kind": "version",
    "titre": "Notifications · Recherche globale · Export CSV · Paramètres collectivité · Droits étendus",
    "chantiers": [
      {
        "code": "•",
        "txt": "⚠ Test interne"
      }
    ],
    "themes": [
      "notifications",
      "rls_securite",
      "perf_qualite",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.3.html"
  },
  {
    "v": "0.2",
    "kind": "version",
    "titre": "Édition de la hiérarchie · Système UI unifié · Application des droits · Décrément stock auto",
    "chantiers": [
      {
        "code": "•",
        "txt": "✓ Système UI unifié"
      },
      {
        "code": "•",
        "txt": "✓ Droits effectifs"
      },
      {
        "code": "•",
        "txt": "⚠ Test interne"
      }
    ],
    "themes": [
      "rls_securite",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.2.html"
  },
  {
    "v": "0.1",
    "kind": "version",
    "titre": "Première version fonctionnelle déployée — du local au cloud, avec emails actifs",
    "chantiers": [
      {
        "code": "•",
        "txt": "✓ Déployée Vercel"
      },
      {
        "code": "•",
        "txt": "✓ Base Supabase"
      },
      {
        "code": "•",
        "txt": "✓ PWA installable"
      },
      {
        "code": "•",
        "txt": "✓ Emails Resend"
      },
      {
        "code": "•",
        "txt": "⚠ Test interne uniquement"
      }
    ],
    "themes": [
      "pwa",
      "notifications",
      "perf_qualite",
      "infrastructure"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.1.html"
  }
];
