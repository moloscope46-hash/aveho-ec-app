#!/usr/bin/env python3
"""Génère les HTML manquants pour les versions sans noteFile.
Approche : regex sur le fichier JS, pas de parsing JSON."""
import re, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NOTES_DIR = ROOT / "public" / "changelog-notes"
VERSIONS_FILE = ROOT / "app" / "changelog" / "versions-data.js"

content = VERSIONS_FILE.read_text(encoding="utf-8")

# Pattern : trouver chaque bloc version avec noteFile vide
# Pattern simplifié : capture { "v": "X.Y.Z", ..., "noteFile": "" }
pattern = re.compile(
    r'\{\s*"v":\s*"([\d.]+)",\s*"kind":\s*"([^"]+)",\s*"titre":\s*"([^"]+)",\s*"chantiers":\s*\[(.*?)\],\s*"themes":\s*\[(.*?)\],\s*"date":\s*"([^"]+)",\s*"noteFile":\s*""\s*\}',
    re.DOTALL
)

KIND_META = {
    "feat": {"icon": "✨", "color": "#185FA5", "lbl": "FEATURE"},
    "fix": {"icon": "🐛", "color": "#EF9F27", "lbl": "FIX"},
    "hotfix": {"icon": "🚨", "color": "#e35d5b", "lbl": "HOTFIX"},
    "patch": {"icon": "🩹", "color": "#7a6fb0", "lbl": "PATCH"},
    "version": {"icon": "🎉", "color": "#5aa05a", "lbl": "VERSION"},
}
CODE_META = {
    "SQL": ("#7CC8C8", "🗄"), "AI": ("#7a6fb0", "🤖"), "INFO": ("#5a6878", "ℹ"),
    "FIX": ("#EF9F27", "🐛"), "UX": ("#5aa05a", "🎨"), "ARCH": ("#5e4a8c", "🏗"),
}

generated = 0
for match in pattern.finditer(content):
    version, kind, titre, chantiers_raw, themes_raw, date = match.groups()
    meta = KIND_META.get(kind, KIND_META["feat"])
    file_name = f"NOTE-{kind.upper()}-{version}.html"

    # Extract chantiers : { "code": "X", "txt": "..." }
    chant_pattern = re.compile(r'\{\s*"code":\s*"([^"]+)",\s*"txt":\s*"((?:[^"\\]|\\.)*)"\s*\}', re.DOTALL)
    chantiers = []
    for cm in chant_pattern.finditer(chantiers_raw):
        chantiers.append({"code": cm.group(1), "txt": cm.group(2).replace('\\"', '"').replace("\\n", "<br>")})

    themes = [t.strip().strip('"') for t in themes_raw.split(",") if t.strip()]

    chantiers_html = "\n".join([
        f'<div class="chantier" style="border-left-color: {CODE_META.get(c["code"], ("#5a6878","•"))[0]};">'
        f'<span class="code-tag" style="background: {CODE_META.get(c["code"], ("#5a6878","•"))[0]};">'
        f'{CODE_META.get(c["code"], ("#5a6878","•"))[1]} {c["code"]}</span> {c["txt"]}</div>'
        for c in chantiers
    ])
    themes_html = " ".join([f'<span class="theme">#{t}</span>' for t in themes])

    html = f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aveho {version} — {kind.upper()}</title>
<style>
body {{ font-family: 'Quicksand', 'Segoe UI', system-ui, sans-serif; max-width: 880px; margin: 0 auto; padding: 24px; background: #f4f7fa; color: #2a3a48; line-height: 1.6; }}
h1 {{ color: {meta["color"]}; border-bottom: 3px solid {meta["color"]}; padding-bottom: 10px; margin-top: 0; font-size: 28px; }}
.header {{ background: linear-gradient(135deg, {meta["color"]}11, {meta["color"]}05); padding: 20px 24px; border-left: 6px solid {meta["color"]}; border-radius: 10px; margin-bottom: 24px; }}
.kind {{ display: inline-block; background: {meta["color"]}; color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 1px; }}
.date {{ color: #8a98a8; font-size: 13px; margin-top: 8px; }}
.titre {{ font-size: 18px; color: #142131; font-weight: 700; margin-top: 14px; }}
.themes {{ margin-top: 10px; }}
.theme {{ display: inline-block; background: #fff; border: 1px solid #cfd8e0; padding: 3px 10px; border-radius: 12px; font-size: 11px; color: #5a6878; margin-right: 5px; margin-bottom: 4px; }}
h2 {{ color: #185FA5; font-size: 16px; margin-top: 30px; }}
.chantier {{ background: #fff; border-radius: 8px; padding: 14px 18px; margin-bottom: 10px; border-left: 4px solid #cfd8e0; }}
.code-tag {{ display: inline-block; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .5px; margin-right: 8px; font-family: 'Consolas', monospace; }}
code {{ background: #f0f3f6; padding: 2px 5px; border-radius: 3px; font-size: 90%; font-family: 'Consolas', monospace; color: #c0392b; }}
strong, b {{ color: #142131; }}
.footer {{ margin-top: 40px; padding: 16px; background: #142131; color: #fff; border-radius: 8px; text-align: center; font-size: 12px; }}
@media (max-width: 600px) {{ body {{ padding: 12px; }} h1 {{ font-size: 22px; }} .header {{ padding: 14px; }} }}
</style></head><body>
<div class="header">
<span class="kind">{meta["icon"]} {meta["lbl"]}</span>
<h1>Aveho {version}</h1>
<div class="titre">{titre}</div>
<div class="date">📅 {date}</div>
{f'<div class="themes">{themes_html}</div>' if themes else ''}
</div>
<h2>📋 Chantiers ({len(chantiers)})</h2>
{chantiers_html}
<div class="footer">Aveho Espace Collectivité — Version {version}<br>Généré automatiquement</div>
</body></html>"""

    (NOTES_DIR / file_name).write_text(html, encoding="utf-8")
    # Update versions-data.js : remplacer le bloc trouvé en ajoutant le noteFile
    new_block = match.group(0).replace('"noteFile": ""', f'"noteFile": "{file_name}"')
    content = content.replace(match.group(0), new_block)
    generated += 1
    print(f"✓ {file_name}")

VERSIONS_FILE.write_text(content, encoding="utf-8")
print(f"✅ {generated} HTML générés et liés")
