#!/bin/bash
# =============================================================
#  scripts/lighthouse-guide.sh (Alpha 0.57.8)
#
#  Guide d'audit Lighthouse pour Aveho EC sur Vercel.
#  L'audit doit être fait depuis un navigateur connecté à la prod
#  pour obtenir des chiffres représentatifs.
#
#  Usage : bash scripts/lighthouse-guide.sh
# =============================================================

cat << 'EOF'

=============================================================
 AVEHO EC — Guide d'audit Lighthouse / Core Web Vitals
=============================================================

⚠️  Lighthouse en local sur localhost:3000 donne des chiffres
    NON représentatifs de la prod (Vercel a CDN + edge cache + brotli).
    Toujours auditer depuis https://aveho-ec-app.vercel.app

╔═══════════════════════════════════════════════════════════╗
║  ÉTAPE 1 — Préparer le navigateur                          ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  1. Chrome en mode Incognito (pas d'extension qui pollue)  ║
║  2. F12 → Onglet "Lighthouse"                              ║
║  3. Cocher : Performance + Accessibility + Best Practices  ║
║              + SEO + PWA                                   ║
║  4. Mode : Navigation (default)                            ║
║  5. Device : Mobile (Throttling: Slow 4G + 4× CPU)        ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║  ÉTAPE 2 — Pages prioritaires à tester                     ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  • /login         → premier load utilisateur (critique)    ║
║  • /vue-globale   → dashboard principal (LCP important)    ║
║  • /patients      → 213 kB First Load (page la + lourde)   ║
║  • /changelog     → 274 kB (split appliqué en 0.57.7)      ║
║  • /carte         → 205 kB + leaflet lazy                  ║
║  • /scan/qr       → html5-qrcode lazy + caméra             ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║  ÉTAPE 3 — Métriques à viser (Core Web Vitals)             ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  📊 LCP  (Largest Contentful Paint)                        ║
║       BON    : < 2.5s                                      ║
║       MOYEN  : 2.5s - 4s                                   ║
║       MAUVAIS: > 4s                                        ║
║                                                            ║
║  ⚡ INP  (Interaction to Next Paint, anciennement FID)      ║
║       BON    : < 200ms                                     ║
║       MOYEN  : 200ms - 500ms                               ║
║       MAUVAIS: > 500ms                                     ║
║                                                            ║
║  📐 CLS  (Cumulative Layout Shift)                         ║
║       BON    : < 0.1                                       ║
║       MOYEN  : 0.1 - 0.25                                  ║
║       MAUVAIS: > 0.25                                      ║
║                                                            ║
║  🎯 Score global Performance Lighthouse                    ║
║       BON    : > 90                                        ║
║       MOYEN  : 50-89                                       ║
║       MAUVAIS: < 50                                        ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║  ÉTAPE 4 — Optimisations déjà en place (à mentionner)     ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  ✅ next/font Quicksand (self-hosted, swap)                ║
║  ✅ Preconnect Supabase (-100ms TTFB)                      ║
║  ✅ 8 composants layout lazy-loadés                        ║
║  ✅ CodeViewer, SqlModal lazy (changelog)                  ║
║  ✅ smoke-tests lazy (92 KB économisés sur changelog)      ║
║  ✅ chantiers-extra.json lazy fetch                        ║
║  ✅ jszip, leaflet, html5-qrcode lazy                      ║
║  ✅ 6 security headers OWASP                               ║
║  ✅ Service Worker pour cache hors-ligne                   ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║  ÉTAPE 5 — Si LCP > 2.5s                                   ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  Causes possibles :                                        ║
║                                                            ║
║  1. Première requête Supabase trop lente                   ║
║     → Vérifier le ping vers le pop Supabase                ║
║     → Vérifier qu'on précharge bien (preconnect)           ║
║                                                            ║
║  2. JS bundle initial trop gros pour le device             ║
║     → Vérifier shared bundle = 104 kB                      ║
║     → Vérifier que la page testée n'est pas > 250 kB       ║
║                                                            ║
║  3. Render bloqué par un useEffect synchrone               ║
║     → Vérifier qu'aucun useEffect fait du calcul lourd     ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║  ÉTAPE 6 — Si INP > 200ms                                  ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  Causes possibles :                                        ║
║                                                            ║
║  1. Handler de click qui fait du calcul lourd              ║
║     → Lighthouse onglet "Performance" → trouver le LongTask║
║                                                            ║
║  2. Re-render React massif après changement de state       ║
║     → React DevTools Profiler                              ║
║                                                            ║
║  3. setState dans une boucle                               ║
║     → useReducer ou batch updates                          ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║  ÉTAPE 7 — Si CLS > 0.1                                    ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  Causes possibles :                                        ║
║                                                            ║
║  1. Image sans width/height qui se charge après le rendu   ║
║     → Lighthouse "Diagnostics" pointe directement les imgs ║
║                                                            ║
║  2. Police qui swap après chargement (FOUT/FOIT)           ║
║     → Devrait être fixé par next/font en 0.57.8            ║
║                                                            ║
║  3. Banner/modal qui apparaît et pousse le contenu         ║
║     → Vérifier OfflineBanner, LectureSeuleBadge,           ║
║       AnnoncesBanner                                       ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║  ÉTAPE 8 — Reporting                                       ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  Pour chaque page testée, noter :                          ║
║   • Score Performance global                               ║
║   • LCP, INP, CLS, FCP, TTI                                ║
║   • Top 3 opportunités proposées par Lighthouse            ║
║   • Date et version Aveho (depuis /api/version)            ║
║                                                            ║
║  Sauvegarder le rapport HTML (bouton "Save as HTML")       ║
║  Comparer entre versions pour mesurer les progrès          ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

EOF
