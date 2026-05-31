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
    "noteFile": "NOTE-VERSION-Alpha-0.55.13.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.55.12.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.55.6.html"
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
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.3.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.54.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.53.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.52.5.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.52.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.51.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.50.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.47.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.46.0.html"
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
    "noteFile": "NOTE-HOTFIX-Alpha-0.46.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.44.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.43.0.html"
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
    "noteFile": "NOTE-HOTFIX-Alpha-0.43.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.42.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.41.0.html"
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
    "noteFile": "NOTE-HOTFIX-Alpha-0.41.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.40.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.37.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.34.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.33.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.32.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.31.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.30.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.29.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.24.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.23.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.22.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.21.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.20.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.17.1.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.16.1.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.16.0.html"
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
    "noteFile": "NOTE-VERSION-Alpha-0.15.html"
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
