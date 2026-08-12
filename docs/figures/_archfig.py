import pathlib

CSS = """
  :root{ --ink:#1a1a1a; --grey:#8a8a8a; --grey-mid:#5f5f66; --grey-line:#b7b7b7; --fill:#f0f0f0; }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;background:#fff;}
  body{font-family:-apple-system,"Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;}
  .stage{ width:800px; %HEIGHT% padding:14px 18px 12px 18px; background:#fff;
          display:flex; flex-direction:column; }
  .node{ display:flex; align-items:baseline; gap:10px; border:2px solid var(--ink);
         background:#fff; padding:7px 12px; }
  .node-plain{ border:1.5px solid var(--grey-line); }
  .badge{ width:32px;height:32px;border-radius:50%; flex:0 0 auto; align-self:center;
          display:flex;align-items:center;justify-content:center;
          font-size:19px;font-weight:800; border:2px solid var(--ink);color:var(--ink);background:#fff; }
  .badge-solid{ background:var(--ink); color:#fff; }
  .t{ font-size:24px; font-weight:700; color:var(--ink); white-space:nowrap; }
  .t-soft{ font-weight:600; color:var(--grey-mid); }
  .d{ font-size:19px; color:var(--grey-mid); font-weight:500; }
  .arrow{ display:flex; align-items:center; justify-content:center; gap:9px; padding:3px 0; }
  .arrow .lbl{ font-size:17px; font-weight:600; color:var(--grey); letter-spacing:0.02em; }
  .zone{ border:2.5px dashed var(--ink); background:var(--fill); padding:8px 10px 9px 10px; }
  .zone-head{ font-size:21px; font-weight:800; color:var(--ink); margin-bottom:7px; }
  .zone .node{ background:#fff; }
  .foot{ margin-top:7px; border-top:1.5px solid var(--grey-line); padding-top:7px;
         font-size:19px; font-weight:600; color:var(--grey-mid); text-align:center; }
"""

ARROW_PLAIN = """  <div class="arrow"><svg width="22" height="26" viewBox="0 0 22 26">
    <line x1="11" y1="0" x2="11" y2="15" stroke="#6d6d6d" stroke-width="3"/>
    <polygon points="4,14 18,14 11,25" fill="#6d6d6d"/></svg></div>"""

def arrow(lbl=None, dark=True):
    col = "#1a1a1a" if dark else "#6d6d6d"
    svg = (f'<svg width="22" height="26" viewBox="0 0 22 26">'
           f'<line x1="11" y1="0" x2="11" y2="15" stroke="{col}" stroke-width="3"/>'
           f'<polygon points="4,14 18,14 11,25" fill="{col}"/></svg>')
    l = f'<div class="lbl">{lbl}</div>' if lbl else ""
    return f'  <div class="arrow">{l}{svg}</div>'

def node(title, detail, badge=None, solid=False, plain=False):
    b = ""
    if badge:
        b = f'<div class="badge{" badge-solid" if solid else ""}">{badge}</div>'
    cls = "node node-plain" if plain else "node"
    t = f'<div class="t{" t-soft" if plain else ""}">{title}</div>'
    return f'  <div class="{cls}">{b}{t}<div class="d">{detail}</div></div>'

def page(title, body, height=None):
    css = CSS.replace("%HEIGHT%", f"height:{height}px;" if height else "")
    return (f'<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>{title}</title>\n'
            f'<style>{css}</style>\n</head>\n<body>\n<div class="stage">\n{body}\n</div>\n</body>\n</html>\n')

def oracle(h=None):
    b = "\n".join([
        node("User query", "&middot; Korean natural-language question", plain=True),
        arrow(dark=False),
        node("Application server", "&middot; one SQL statement with the query text", "1"),
        arrow("network boundary (1 of 1)"),
        '  <div class="zone">\n    <div class="zone-head">Oracle AI Database 26ai</div>\n'
        + node("In-database embedding", "&middot; ONNX runtime, e5-small 384-d", "2", solid=True) + "\n"
        + arrow("query vector", dark=False) + "\n"
        + node("Exact vector search", "&middot; VECTOR(384) + filters", "3", solid=True) + "\n  </div>",
        arrow("top-k review chunks"),
        node("Answer generation (LLM)", "&middot; cites the retrieved chunks", "4"),
        '  <div class="foot">1 network boundary &middot; no external model call &middot; embedding and search in one SQL statement</div>',
    ])
    return page("Oracle-based system architecture", b, h)

def pg(h=None):
    b = "\n".join([
        node("User query", "&middot; Korean natural-language question", plain=True),
        arrow(dark=False),
        node("Application server", "&middot; calls the embedding service, then the store", "1"),
        arrow("network boundary (1 of 2)"),
        node("External embedding service", "&middot; BGE-M3, 1024-d", "2", solid=True),
        arrow("via application &middot; boundary (2 of 2)"),
        '  <div class="zone">\n    <div class="zone-head">PostgreSQL + pgvector &nbsp;<span style="font-weight:500;font-size:18px;color:#5f5f66">(no inference runtime inside)</span></div>\n'
        + node("Approximate vector search", "&middot; vector(1024) + filters, HNSW", "3", solid=True) + "\n  </div>",
        arrow("top-k review chunks"),
        node("Answer generation (LLM)", "&middot; cites the retrieved chunks", "4"),
        '  <div class="foot">2 network boundaries &middot; 1 external model call &middot; embedding and search in separate systems</div>',
    ])
    return page("PostgreSQL-based system architecture", b, h)

import sys
h = int(sys.argv[1]) if len(sys.argv) > 1 else None
pathlib.Path("paper-fig1-arch-oracle.html").write_text(oracle(h))
pathlib.Path("paper-fig2-arch-pgvector.html").write_text(pg(h))
print("written", "height =", h)
