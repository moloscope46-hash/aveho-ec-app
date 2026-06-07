#!/usr/bin/env python3
"""
gen-html-notes-ultra.py — Génère HTML notes ULTRA détaillées (style ancien Alpha 0.55+)
- Header gradient avec eyebrow + logo + meta + themes pills
- Sections h2 par type avec emoji + souligné ambre
- Pour chaque chantier : panel coloré dédié avec h3 + paragraphes + listes
- Auto-extraction de code blocks SQL/JS depuis les chantiers (détecte `xxx` et **gras**)
- Extraction des "Mode opératoire" : si chantier décrit étapes, génère <ol>
- Panel "📦 SQL à appliquer" séparé si sqlFile
- Footer professionnel avec liens vers /sql et procédure déploiement
"""
import re
import os
import sys

PATH = os.path.join(os.path.dirname(__file__), "..", "app", "changelog", "versions-data.js")
NOTES_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "changelog-notes")

content = open(PATH).read()

# Pattern bloc version
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

CODE_META = {
    "SQL": ("#7CC8C8", "🗄", "SQL / Migration", "violet"),
    "AI":  ("#7a6fb0", "🤖", "Backend / Frontend", ""),
    "INFO":("#5a6878", "ℹ", "Info / Tâche restante", ""),
    "FIX": ("#EF9F27", "🐛", "Fix bug", "warn"),
    "UX":  ("#5aa05a", "🎨", "Interface utilisateur", "hi"),
    "UI":  ("#5aa05a", "🎨", "Interface utilisateur", "hi"),
    "PERF":("#185FA5", "⚡", "Performance", ""),
    "DOC": ("#7a6fb0", "📄", "Documentation", ""),
    "TEST":("#5aa05a", "🧪", "Tests", "hi"),
}

KIND_META = {
    "feat":  ("#185FA5", "FEATURE", "Nouvelle fonctionnalité"),
    "fix":   ("#EF9F27", "FIX", "Correction de bug critique"),
    "ux":    ("#5aa05a", "UX", "Amélioration interface"),
    "perf":  ("#5e4a8c", "PERF", "Performance"),
    "doc":   ("#7CC8C8", "DOC", "Documentation"),
}

def escape_html(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def transform_text(t):
    """Transforme markdown léger en HTML"""
    # Unescape JS
    t = t.replace('\\"', '"').replace("\\n", "\n").replace("\\t", "    ")
    # Échappe HTML
    t = escape_html(t)
    # Code blocks `xxx`
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    # Bold **xxx**
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    return t

def split_into_sentences(t):
    """Découpe un texte en phrases pour générer une liste si y a plusieurs points"""
    # Le texte est déjà brut, split par ". "
    parts = re.split(r'\.\s+(?=[A-Z(])', t)
    return [p.strip(' .') for p in parts if p.strip()]

def detect_steps(t):
    """Détecte une description en étapes (1. 2. 3. ou (1) (2)) → renvoie liste"""
    # Pattern (1) (2) ou 1. 2.
    if re.search(r'\(1\)', t) and re.search(r'\(2\)', t):
        steps = re.split(r'\((\d+)\)\s*', t)
        # steps = ['intro', '1', 'étape1', '2', 'étape2', ...]
        items = []
        for i in range(1, len(steps), 2):
            if i + 1 < len(steps):
                items.append(steps[i + 1].strip(' .').rstrip(','))
        return items if len(items) >= 2 else None
    return None

def extract_files_mentioned(t):
    """Extrait les chemins de fichiers mentionnés dans le texte"""
    paths = re.findall(r'`([^`]+\.(js|jsx|ts|sql|css|html))`', t)
    return list(set([p[0] for p in paths]))

def render_chantier(code, txt):
    meta = CODE_META.get(code, ("#5a6878", "•", code, ""))
    col, emoji, lbl, panel_cls = meta

    # Premier mot/phrase clé du chantier → titre h3
    # Format typique : "🔧 **Titre** : description longue..."
    title_match = re.match(r'([^*:]+?)\s*\*\*([^*]+)\*\*\s*:?\s*(.*)', txt, re.DOTALL)
    if title_match:
        prefix, h3_title, body = title_match.groups()
        h3_title = h3_title.strip()
        body = (prefix.strip() + " " + body.strip()).strip(": ")
    else:
        # Pas de **titre** explicite → utiliser les 60 premiers char comme titre
        first_part = txt.split(":", 1)
        if len(first_part) == 2 and len(first_part[0]) < 100:
            h3_title = first_part[0].strip()
            body = first_part[1].strip()
        else:
            h3_title = txt[:80].strip() + ("…" if len(txt) > 80 else "")
            body = txt

    # Transforme le body en HTML
    body_html = transform_text(body)

    # Détecte étapes (1) (2) (3)
    steps = detect_steps(body)
    if steps:
        # Génère intro + liste ordonnée
        intro_match = re.match(r'^([^(]+?)(?=\(1\))', body)
        intro = intro_match.group(1).strip(' .,:') if intro_match else ""
        outro = body.split(steps[-1], 1)[-1] if steps[-1] in body else ""
        # Génère liste
        items_html = "\n".join([f'      <li>{transform_text(s)}</li>' for s in steps])
        steps_html = f'''
    <p>{transform_text(intro)}</p>
    <ol class="steps">
{items_html}
    </ol>'''
        if outro.strip(' .,'):
            steps_html += f'\n    <p>{transform_text(outro.strip())}</p>'
        body_html = steps_html
    else:
        body_html = f'<p>{body_html}</p>'

    # Fichiers mentionnés → footer chantier
    files = extract_files_mentioned(txt)
    files_html = ""
    if files:
        files_list = "".join([f'<code style="font-size:11px;display:inline-block;margin:2px 4px 2px 0">{f}</code>' for f in files])
        files_html = f'<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e3e9ee;font-size:11px;color:#6c7a89"><b>📁 Fichiers concernés :</b> {files_list}</div>'

    return f'''  <h3 style="border-left:4px solid {col};padding-left:10px;color:{col};margin-top:24px">{escape_html(h3_title)}</h3>
  <div class="panel {panel_cls}">
    {body_html}{files_html}
  </div>
'''

def gen_html(version, kind, titre, chantiers, themes, date, sql_file):
    color, label, kind_desc = KIND_META.get(kind, ("#185FA5", kind.upper(), ""))

    # Compte par type
    counts = {}
    for c, _ in chantiers:
        counts[c] = counts.get(c, 0) + 1
    counts_str = " · ".join(f"<b>{n}</b> {k.upper()}" for k, n in counts.items())

    # Sections groupées par code
    grouped = {}
    for code, txt in chantiers:
        grouped.setdefault(code, []).append(txt)

    order = ["SQL", "AI", "FIX", "UX", "UI", "PERF", "DOC", "TEST", "INFO"]
    sorted_codes = [c for c in order if c in grouped] + [c for c in grouped if c not in order]

    sections_html = ""
    for code in sorted_codes:
        meta = CODE_META.get(code, ("#5a6878", "•", code, ""))
        col, emoji, lbl, _ = meta
        sections_html += f'\n  <h2>{emoji} {lbl} <small style="color:#8a98a8;font-weight:400;font-size:13px">({len(grouped[code])})</small></h2>\n'
        for txt in grouped[code]:
            sections_html += render_chantier(code, txt)

    # Section SQL si présent
    sql_section = ""
    if sql_file:
        sql_section = f'''
  <h2>📦 SQL à appliquer dans Supabase</h2>
  <div class="panel violet">
    <p>Cette version inclut une migration SQL <strong>à appliquer AVANT le déploiement</strong> du code :</p>
    <pre><code># Supabase Studio → SQL Editor → New query → Coller le contenu
{sql_file}</code></pre>
    <p style="margin-top:10px;font-size:12px;color:#6c7a89">📍 Disponible dans <code>public/sql/{sql_file}</code> · Téléchargeable depuis la modale changelog</p>
  </div>
'''

    # Themes pills
    themes_clean = re.findall(r'"([^"]+)"', themes)
    themes_html = " ".join(f'<span class="theme-pill">#{t}</span>' for t in themes_clean)

    # Procédure déploiement
    procedure_html = f'''
  <h2>🚀 Procédure de déploiement</h2>
  <div class="panel hi">
    <ol class="steps">
      {"<li>Lance le SQL <code>" + sql_file + "</code> dans Supabase SQL Editor</li>" if sql_file else ""}
      <li>Extraire le zip dans <code>C:\\aveho-ec-app</code> (remplace les fichiers existants)</li>
      <li>Terminal : <code>npm install --legacy-peer-deps</code></li>
      <li>Terminal : <code>npm run build</code> (vérifie qu'il passe sans erreur)</li>
      <li>Terminal : <code>git add -A ; git commit -m "{version} - {kind_desc}" ; git push origin main</code></li>
      <li>Vercel déploie automatiquement depuis le push</li>
    </ol>
  </div>
'''

    html = f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aveho {version} — {label}</title>
<style>
  :root {{
    --navy: #142131; --teal: #7CC8C8; --amber: #EF9F27;
    --terra: #C9867F; --violet: #7a6fb0; --green: #5aa05a;
  }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Quicksand', 'Segoe UI', -apple-system, sans-serif; max-width: 920px; margin: 0 auto; padding: 24px; background: #f4f7fa; color: #2a3a48; line-height: 1.65; }}
  header.cover {{ background: linear-gradient(135deg, var(--navy) 0%, {color} 50%, var(--navy) 100%); color: #fff; border-radius: 16px; padding: 30px 32px; margin-bottom: 28px; box-shadow: 0 12px 32px rgba(20,33,49,.24); }}
  .eyebrow {{ font-size: 11px; letter-spacing: 3px; color: rgba(255,255,255,.85); font-weight: 700; text-transform: uppercase; }}
  .logo {{ font-size: 26px; font-weight: 600; letter-spacing: 2px; margin-top: 4px; }}
  .logo .v {{ color: var(--teal); }}
  h1 {{ font-size: 22px; font-weight: 700; margin: 10px 0 4px; color: #fff; }}
  h1 small {{ font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,.85); display: block; margin-top: 8px; line-height: 1.5; }}
  .meta {{ display: flex; flex-wrap: wrap; gap: 16px; margin-top: 14px; font-size: 12px; color: rgba(255,255,255,.9); }}
  .meta .badge {{ background: rgba(255,255,255,.15); padding: 3px 10px; border-radius: 6px; font-family: 'Consolas', monospace; }}
  .themes-row {{ margin-top: 14px; }}
  .theme-pill {{ display: inline-block; padding: 2px 10px; background: rgba(255,255,255,.18); color: #fff; border-radius: 12px; font-size: 11px; font-weight: 600; margin: 2px 4px 2px 0; }}
  h2 {{ font-size: 18px; color: var(--navy); margin: 30px 0 12px; padding-bottom: 6px; border-bottom: 2px solid var(--amber); }}
  h3 {{ font-size: 15px; color: var(--navy); margin: 20px 0 8px; padding-left: 10px; }}
  .panel {{ background: #fff; border: 1px solid #e3e9ee; border-radius: 12px; padding: 18px 22px; margin: 10px 0 18px; }}
  .panel.hi {{ background: #eef9ef; border-color: #bfe2bf; }}
  .panel.warn {{ background: #fff8ec; border-color: #f0d59f; }}
  .panel.violet {{ background: #f3effa; border-color: #d6c9ec; }}
  .panel.danger {{ background: #fce5e0; border-color: #f0c4be; }}
  .panel p {{ margin: 8px 0; }}
  code {{ font-family: 'Consolas', 'Menlo', monospace; background: #f4f7fa; color: #2a5a5a; padding: 2px 7px; border-radius: 4px; font-size: 12.5px; border: 1px solid #e3e9ee; }}
  pre {{ background: var(--navy); color: #e8edf2; padding: 14px 16px; border-radius: 8px; overflow-x: auto; font-size: 12.5px; line-height: 1.55; }}
  pre code {{ background: none; color: inherit; border: none; padding: 0; }}
  ol.steps {{ padding-left: 22px; }}
  ol.steps li {{ margin: 8px 0; padding-left: 4px; }}
  ul {{ padding-left: 22px; }} ul li {{ margin: 5px 0; }}
  strong {{ color: var(--navy); }}
  footer {{ margin-top: 36px; padding-top: 18px; border-top: 1px solid #e3e9ee; font-size: 11.5px; color: #6c7a89; text-align: center; }}
  @media(max-width: 700px) {{ body {{ padding: 14px; }} header.cover {{ padding: 22px 18px; }} h1 {{ font-size: 19px; }} h2 {{ font-size: 16px; }} }}
</style>
</head>
<body>

  <header class="cover">
    <div class="eyebrow">NOTE D'ÉVOLUTION · {label}</div>
    <div class="logo">a<span class="v">v</span>eho <span style="font-size:11px;font-weight:400;opacity:.7;letter-spacing:0">Espace Collectivité</span></div>
    <h1>Version {version}
      <small>{escape_html(titre)}</small>
    </h1>
    <div class="meta">
      <span>📅 <b>Date :</b> {date}</span>
      <span>📦 <b>Version :</b> <span class="badge">v{version}-alpha</span></span>
      <span>📋 <b>Type :</b> {kind_desc}</span>
      <span>🔧 <b>Chantiers :</b> {counts_str}</span>
    </div>
    <div class="themes-row">{themes_html}</div>
  </header>
{sections_html}
{sql_section}
{procedure_html}

  <footer>
    <p><strong>Aveho Espace Collectivité</strong> — Note d'évolution générée le {date}</p>
    <p>📝 Pour toute question, consulte le changelog complet sur <code>/changelog</code> ou contacte ton chef de produit</p>
  </footer>

</body>
</html>
'''
    return html


# Main
to_regen = sys.argv[1:] if len(sys.argv) > 1 else None
count = 0
for m in block_pat.finditer(content):
    version, kind, titre, ch_block, themes, date, note_file_existing, sql_file = m.groups()

    if to_regen and version not in to_regen:
        continue

    chantiers = []
    for cm in chant_pat.finditer(ch_block):
        chantiers.append((cm.group(1), cm.group(2)))

    if not chantiers:
        continue

    if note_file_existing:
        file_name = note_file_existing
    else:
        label_in_filename = {"feat": "FEAT", "fix": "FIX", "ux": "UX", "perf": "PERF", "doc": "DOC"}.get(kind, kind.upper())
        file_name = f"NOTE-{label_in_filename}-{version}.html"

    html = gen_html(version, kind, titre, chantiers, themes, date, sql_file)
    out_path = os.path.join(NOTES_DIR, file_name)
    open(out_path, "w").write(html)
    count += 1
    print(f"✓ {file_name}")

print(f"✅ {count} HTML générés (format ULTRA RICHE)")
