"""Writes dev.html: the site with Tailwind compiled in the browser and Motion from a CDN.

For a quick local look without `npm install`. The published site is the build in dist/,
which makes no third-party requests.

    python3 scripts/dev_preview.py && python3 -m http.server 4173 --bind 127.0.0.1
    # open http://127.0.0.1:4173/dev.html
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TAILWIND = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.13"
MOTION = "https://cdn.jsdelivr.net/npm/motion@12.23.12/+esm"

html = (ROOT / "index.html").read_text()
css = (ROOT / "src/input.css").read_text().replace('@import "tailwindcss";\n', "").replace('url("../fonts/', 'url("fonts/')
head = f"""  <!-- DEV PREVIEW ONLY (scripts/dev_preview.py). The published site uses dist/. -->
  <script src="{TAILWIND}"></script>
  <style type="text/tailwindcss">
{css}
  </style>
  <script type="importmap">{{"imports": {{"motion": "{MOTION}"}}}}</script>
  <script type="module" src="src/main.js"></script>
"""
built = '  <link rel="stylesheet" href="styles.css">\n  <script type="module" src="main.js"></script>\n'
if built not in html:
    raise SystemExit("index.html no longer has the expected stylesheet/script tags")
(ROOT / "dev.html").write_text(html.replace(built, head))
print("Wrote dev.html")
