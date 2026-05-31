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
