#!/usr/bin/env python3
"""
gen-html-notes-rich.py — Génère des HTML notes au format RICHE (style ancien)
- Header gradient
- Sections h2 soulignées
- Panels colorés (.hi vert, .warn ambre, .violet, .danger)
- Code blocks pour SQL
- Liens vers fichiers SQL
- Footer professionnel
"""
import re
import os
import sys

PATH = os.path.join(os.path.dirname(__file__), "..", "app", "changelog", "versions-data.js")
NOTES_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "changelog-notes")

# Lit versions-data
content = open(PATH).read()

# Pattern : extrait un bloc version
block_pat = re.compile(
    r'\{\s*"v":\s*"([\d.]+)",\s*'
    r'"kind":\s*"([^"]+)",\s*'
    r'"titre":\s*"([^"]+)",\s*'
    r'"chantiers":\s*\[(.*?)\]\s*,\s*'
    r'"themes":\s*\[(.*?)\]\s*,\s*'
    r'"date":\s*"([^"]+)"'
    r'(?:,\s*"noteFile":\s*"([^"]*)")?'
    r'(?:,\s*"sqlFile":\s*"([^"]*)")?'
    r'\s*\}',
    re.DOTALL
)

chant_pat = re.compile(r'\{\s*"code":\s*"([^"]+)",\s*"txt":\s*"((?:[^"\\]|\\.)*)"\s*\}', re.DOTALL)

# Map code → couleur + emoji
CODE_META = {
    "SQL": ("#7CC8C8", "🗄", "SQL / Migration"),
    "AI":  ("#7a6fb0", "🤖", "Backend / Frontend"),
    "INFO":("#5a6878", "ℹ", "Info / Tâche"),
    "FIX": ("#EF9F27", "🐛", "Fix"),
    "UX":  ("#5aa05a", "🎨", "Interface"),
    "UI":  ("#5aa05a", "🎨", "Interface"),
    "PERF":("#185FA5", "⚡", "Performance"),
    "DOC": ("#7a6fb0", "📄", "Documentation"),
    "TEST":("#5aa05a", "🧪", "Tests"),
}

KIND_META = {
    "feat":  ("#185FA5", "FEATURE", "Nouvelle fonctionnalité majeure"),
    "fix":   ("#EF9F27", "FIX", "Correction de bug"),
    "ux":    ("#5aa05a", "UX", "Amélioration interface"),
    "perf":  ("#5e4a8c", "PERF", "Performance"),
    "doc":   ("#7CC8C8", "DOC", "Documentation"),
}

def text_to_html(t):
    """Transforme **gras**, `code`, et __underline__ en HTML"""
    # Échappe d'abord HTML
    t = t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # **bold**
    t = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', t)
    # `code`
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    # Détecte les sauts de ligne explicites
    t = t.replace("\\n", "<br>")
    # Restaure les guillemets échappés
    t = t.replace('\\"', '"')
    return t

def gen_html(version, kind, titre, chantiers, themes, date, note_file, sql_file):
    color, label, kind_desc = KIND_META.get(kind, ("#185FA5", kind.upper(), ""))

    # Compte par type de chantier
    counts = {}
    for c, _ in chantiers:
        counts[c] = counts.get(c, 0) + 1
    counts_str = " · ".join(f"{n} {k}" for k, n in counts.items())

    # Section par type de chantier
    sections_html = ""
    grouped = {}
    for code, txt in chantiers:
        grouped.setdefault(code, []).append(txt)

    # Ordre d'affichage prioritaire
    order = ["SQL", "AI", "FIX", "UX", "UI", "PERF", "DOC", "TEST", "INFO"]
    sorted_codes = [c for c in order if c in grouped] + [c for c in grouped if c not in order]

    for code in sorted_codes:
        meta = CODE_META.get(code, ("#5a6878", "•", code))
        col, emoji, lbl = meta
        items_html = ""
        for txt in grouped[code]:
            html_txt = text_to_html(txt)
            items_html += f'    <li>{html_txt}</li>\n'

        # Type de panel selon le code
        panel_cls = ""
        if code == "SQL": panel_cls = "violet"
        elif code == "FIX": panel_cls = "warn"
        elif code == "UX" or code == "UI": panel_cls = "hi"
        elif code == "INFO": panel_cls = ""

        sections_html += f'''
  <h2><span style="display:inline-block;width:32px;height:32px;background:{col}22;color:{col};border-radius:8px;text-align:center;line-height:32px;margin-right:8px">{emoji}</span>{lbl} <small style="color:#8a98a8;font-weight:400;font-size:13px">({len(grouped[code])} chantier{'s' if len(grouped[code]) > 1 else ''})</small></h2>
  <div class="panel {panel_cls}">
    <ul>
{items_html}    </ul>
  </div>
'''

    # SQL file section
    sql_section = ""
    if sql_file:
        sql_section = f'''
  <h2>📦 Migration SQL</h2>
  <div class="panel violet">
    <p>Cette version inclut une migration SQL à appliquer dans Supabase SQL Editor :</p>
    <pre style="margin-top:10px">{sql_file}</pre>
    <p style="margin-top:8px;font-size:12px;color:#5a6878">📍 Disponible dans <code>public/sql/{sql_file}</code>. Lance-la AVANT de déployer cette version.</p>
  </div>
'''

    # Themes
    themes_clean = re.findall(r'"([^"]+)"', themes)
    themes_html = " ".join(f'<span style="display:inline-block;padding:2px 8px;background:rgba(24,95,165,.10);color:#185FA5;border-radius:12px;font-size:11px;font-weight:600;margin:2px">{t}</span>' for t in themes_clean)

    html = f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aveho {version} — Note d'évolution</title>
<style>
  :root {{
    --navy: #142131; --teal: #7CC8C8; --amber: #EF9F27;
    --terra: #C9867F; --violet: #7a6fb0; --green: #5aa05a;
    --aveho-text: #2a3a48; --aveho-muted: #6c7a89;
  }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Quicksand', 'Segoe UI', -apple-system, sans-serif; max-width: 920px; margin: 0 auto; padding: 24px; background: #f4f7fa; color: var(--aveho-text); line-height: 1.65; }}
  .wrap {{ }}
  header.cover {{ background: linear-gradient(135deg, var(--navy) 0%, {color} 50%, var(--navy) 100%); color: #fff; border-radius: 16px; padding: 30px 32px; margin-bottom: 28px; box-shadow: 0 12px 32px rgba(20,33,49,.24); }}
  .eyebrow {{ font-size: 11px; letter-spacing: 3px; color: rgba(255,255,255,.85); font-weight: 700; margin-bottom: 6px; text-transform: uppercase; }}
  .logo {{ font-size: 26px; font-weight: 600; letter-spacing: 2px; }}
  .logo .v {{ color: var(--teal); }}
  h1 {{ font-size: 22px; font-weight: 700; margin: 10px 0 4px; color: #fff; }}
  h1 small {{ font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,.85); display: block; margin-top: 8px; line-height: 1.5; }}
  .meta {{ display: flex; flex-wrap: wrap; gap: 16px; margin-top: 14px; font-size: 12px; color: rgba(255,255,255,.9); }}
  .meta b {{ color: #fff; }}
  .meta .badge {{ background: rgba(255,255,255,.15); padding: 3px 10px; border-radius: 6px; font-family: 'Consolas', monospace; }}
  h2 {{ font-size: 18px; color: var(--navy); margin: 30px 0 12px; padding-bottom: 6px; border-bottom: 2px solid var(--amber); display: flex; align-items: center; }}
  h3 {{ font-size: 15px; color: var(--navy); margin: 20px 0 8px; }}
  .panel {{ background: #fff; border: 1px solid #e3e9ee; border-radius: 12px; padding: 18px 22px; margin: 12px 0; }}
  .panel.hi {{ background: #eef9ef; border-color: #bfe2bf; }}
  .panel.warn {{ background: #fff8ec; border-color: #f0d59f; }}
  .panel.violet {{ background: #f3effa; border-color: #d6c9ec; }}
  .panel.danger {{ background: #fce5e0; border-color: #f0c4be; }}
  code {{ font-family: 'Consolas', 'Menlo', monospace; background: #f4f7fa; color: #2a5a5a; padding: 2px 7px; border-radius: 4px; font-size: 12.5px; border: 1px solid #e3e9ee; }}
  pre {{ background: var(--navy); color: #e8edf2; padding: 14px 16px; border-radius: 8px; overflow-x: auto; font-size: 12.5px; line-height: 1.55; font-family: 'Consolas', monospace; }}
  ul {{ padding-left: 20px; margin: 6px 0; }}
  li {{ margin: 8px 0; }}
  b {{ color: var(--navy); }}
  .themes-row {{ margin-top: 14px; }}
  footer {{ margin-top: 36px; padding-top: 18px; border-top: 1px solid #e3e9ee; font-size: 11.5px; color: var(--aveho-muted); text-align: center; }}
  @media(max-width: 700px) {{ body {{ padding: 14px; }} header.cover {{ padding: 22px 18px; }} h1 {{ font-size: 19px; }} h2 {{ font-size: 16px; }} }}
</style>
</head>
<body>
<div class="wrap">

  <header class="cover">
    <div class="eyebrow">NOTE D'ÉVOLUTION · {label}</div>
    <div class="logo">a<span class="v">v</span>eho <span style="font-size:11px;font-weight:400;opacity:.7">Espace Collectivité</span></div>
    <h1>Version {version}
      <small>{titre}</small>
    </h1>
    <div class="meta">
      <span><b>📅 Date :</b> {date}</span>
      <span><b>📦 Version :</b> <span class="badge">v{version}-alpha</span></span>
      <span><b>📋 Type :</b> {kind_desc}</span>
      <span><b>🔧 Chantiers :</b> {counts_str}</span>
    </div>
    <div class="themes-row">{themes_html}</div>
  </header>

{sections_html}
{sql_section}

  <footer>
    <p>Aveho Espace Collectivité — Note générée le {date}</p>
    <p>Pour toute question, contacte ton chef de produit ou consulte le changelog complet sur <code>/changelog</code></p>
  </footer>

</div>
</body>
</html>
'''
    return html


# Trouve tous les blocs des versions à régénérer
to_regen_versions = sys.argv[1:] if len(sys.argv) > 1 else None  # default = toutes

count = 0
for m in block_pat.finditer(content):
    version, kind, titre, ch_block, themes, date, note_file_existing, sql_file = m.groups()

    if to_regen_versions and version not in to_regen_versions:
        continue

    # Extrait les chantiers
    chantiers = []
    for cm in chant_pat.finditer(ch_block):
        chantiers.append((cm.group(1), cm.group(2)))

    if not chantiers:
        continue

    # Détermine le nom de fichier
    file_name = None
    if note_file_existing:
        file_name = note_file_existing
    else:
        label_in_filename = {"feat": "FEAT", "fix": "FIX", "ux": "UX", "perf": "PERF", "doc": "DOC"}.get(kind, kind.upper())
        file_name = f"NOTE-{label_in_filename}-{version}.html"

    html = gen_html(version, kind, titre, chantiers, themes, date, file_name, sql_file)
    out_path = os.path.join(NOTES_DIR, file_name)
    open(out_path, "w").write(html)
    count += 1
    print(f"✓ {file_name}")

print(f"✅ {count} HTML générés (format RICHE)")
