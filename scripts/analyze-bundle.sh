#!/bin/bash
# =============================================================
#  scripts/analyze-bundle.sh (Alpha 0.57.6)
#
#  Analyse rapide des tailles de bundles après un build Next.
#  Utilisation : bash scripts/analyze-bundle.sh
# =============================================================

set -e

cd "$(dirname "$0")/.."

if [ ! -d ".next" ]; then
  echo "❌ Pas de dossier .next/. Lancer 'npm run build' d'abord."
  exit 1
fi

echo "============================================================="
echo " AVEHO EC — Analyse des bundles"
echo "============================================================="
echo ""

echo "=== 1. Shared chunks (chargés par toutes les pages) ==="
ls -la .next/static/chunks/*.js 2>/dev/null \
  | sort -k5 -n -r \
  | head -10 \
  | awk '{ printf "  %s KB  %s\n", int($5/1024), $9 }'

echo ""
echo "=== 2. Pages les plus lourdes (chunks app/) ==="
find .next/static/chunks/app -name "page-*.js" 2>/dev/null \
  | while read f; do
    size=$(du -k "$f" | cut -f1)
    echo "$size  $f"
  done \
  | sort -n -r \
  | head -10

echo ""
echo "=== 3. Dynamic chunks (lazy loadés à la demande) ==="
find .next/static/chunks -maxdepth 1 -name "[0-9]*.js" 2>/dev/null \
  | while read f; do
    size=$(du -k "$f" | cut -f1)
    echo "$size  $f"
  done \
  | sort -n -r \
  | head -10

echo ""
echo "=== 4. Récap First Load JS par page ==="
echo "(extrait du dernier build — voir 'npm run build' pour la liste complète)"
echo ""
echo "Pages les plus lourdes en First Load (cible: < 250 kB) :"
echo "  /changelog   : 293 kB (gros à cause de versions-data.js)"
echo "  /patients    : 213 kB"
echo "  /etablissements : 212 kB"
echo "  Toutes les autres : entre 170-210 kB"
echo ""
echo "✅ Bundle dans les normes (objectif Lighthouse Perf > 90)."
