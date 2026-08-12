"""발표 슬라이드 v2용 신규 도식 6종 생성 (HTML → Chrome headless → PNG).

기존 그림(bridge·architecture·reading·equivalence)과 같은 색 토큰·선 두께를 쓴다.
한 덱 안에서 그림끼리 따로 노는 것이 제일 티가 나기 때문이다.
"""
import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
STAGE = 1720  # 기존 그림과 동일 — 슬라이드에 넣었을 때 선 두께가 같아진다

CSS = """
:root{ --ink:#1a1a1a; --grey:#6d6d6d; --line:#c2c2c2; --fill:#f1f1f1;
       --blue:#3375BE; --bluefill:#eaf1f9; --red:#F94145; --redfill:#fdf0f0; }
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#fff;}
body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;}
.stage{width:%dpx;background:#fff;}
.t{font-weight:800;color:var(--ink);}
.g{color:var(--grey);}
.cap{font-size:19px;font-weight:600;color:var(--grey);text-align:center;}
""" % STAGE


def page(body: str, pad: str = "24px 26px") -> str:
    return (f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}'
            f'.stage{{padding:{pad};}}</style></head><body>'
            f'<div class="stage">{body}</div></body></html>')


# ── FIG-A · Introduction: RAG 구성과 벡터 레이어 ──────────────────────────
FIG_A = page("""
<style>
 .pipe{display:flex;align-items:stretch;gap:0;}
 .node{flex:1 1 0;border:2.5px solid var(--ink);padding:14px 10px;text-align:center;background:#fff;}
 .node.soft{border:2px solid var(--line);}
 .node .n{font-size:26px;font-weight:800;color:var(--ink);}
 .node.soft .n{font-weight:700;color:var(--grey);}
 .node .s{font-size:17px;font-weight:600;color:var(--grey);margin-top:4px;}
 .ar{flex:0 0 54px;display:flex;align-items:center;justify-content:center;}
 .brace{margin-top:10px;display:flex;}
 .bsp{flex:0 0 0;}
 .bwrap{border-top:3px solid var(--blue);border-left:3px solid var(--blue);
        border-right:3px solid var(--blue);height:14px;}
 .blab{text-align:center;font-size:22px;font-weight:800;color:var(--blue);margin-top:8px;}
 .bsub{text-align:center;font-size:19px;font-weight:600;color:var(--grey);margin-top:2px;}
 .split{height:2px;background:var(--line);margin:26px 0 22px 0;}
 .path{display:flex;align-items:center;gap:26px;}
 .pbox{flex:1 1 0;border:2.5px solid var(--ink);background:#fff;padding:14px 18px;}
 .pbox.to{background:var(--fill);}
 .pk{font-size:16px;font-weight:700;color:var(--grey);letter-spacing:.03em;}
 .pv{font-size:25px;font-weight:800;color:var(--ink);margin-top:3px;line-height:1.2;}
 .pnote{font-size:18px;font-weight:600;color:var(--grey);margin-top:6px;font-style:italic;}
</style>
<div class="pipe">
  <div class="node soft"><div class="n">User query</div></div>
  <div class="ar"><svg width="34" height="20"><line x1="0" y1="10" x2="24" y2="10" stroke="#8a8a8a" stroke-width="3"/><polygon points="22,3 22,17 34,10" fill="#8a8a8a"/></svg></div>
  <div class="node"><div class="n">Embedding model</div><div class="s">text &#8594; vector</div></div>
  <div class="ar"><svg width="34" height="20"><line x1="0" y1="10" x2="24" y2="10" stroke="#1a1a1a" stroke-width="3"/><polygon points="22,3 22,17 34,10" fill="#1a1a1a"/></svg></div>
  <div class="node"><div class="n">Store</div><div class="s">index &amp; search</div></div>
  <div class="ar"><svg width="34" height="20"><line x1="0" y1="10" x2="24" y2="10" stroke="#8a8a8a" stroke-width="3"/><polygon points="22,3 22,17 34,10" fill="#8a8a8a"/></svg></div>
  <div class="node soft"><div class="n">Language model</div><div class="s">grounded answer</div></div>
</div>
<div class="brace">
  <div class="bsp" style="flex:0 0 22.4%"></div>
  <div class="bwrap" style="flex:1 1 0;"></div>
  <div class="bsp" style="flex:0 0 22.4%"></div>
</div>
<div class="blab">VECTOR LAYER</div>
<div class="bsub">the part that is replaced most often after deployment</div>
<div class="split"></div>
<div class="path">
  <div class="pbox">
    <div class="pk">FROM</div>
    <div class="pv">General-purpose relational database<br>with a vector extension</div>
    <div class="pnote">the embedding is computed outside</div>
  </div>
  <svg width="120" height="30"><line x1="0" y1="15" x2="96" y2="15" stroke="#1a1a1a" stroke-width="6"/><polygon points="94,2 94,28 120,15" fill="#1a1a1a"/></svg>
  <div class="pbox to">
    <div class="pk">TO</div>
    <div class="pv">Converged database with a vector type<br>and an inference runtime inside it</div>
    <div class="pnote">the database itself computes the embedding</div>
  </div>
</div>
""")

# ── FIG-B · Introduction: 두 요인이 동시에 바뀐다 ────────────────────────
FIG_B = page("""
<style>
 .row{display:flex;align-items:center;gap:0;}
 .card{flex:1 1 0;border:2.5px solid var(--ink);background:#fff;}
 .ch{padding:12px 18px;border-bottom:2.5px solid var(--ink);}
 .ch .cn{font-size:27px;font-weight:800;color:var(--ink);}
 .ch .cs{font-size:18px;font-weight:600;color:var(--grey);margin-top:1px;}
 .attr{display:flex;align-items:center;padding:11px 18px;border-bottom:1.5px solid var(--line);}
 .attr:last-child{border-bottom:none;}
 .attr.hot{background:var(--redfill);}
 .ak{flex:0 0 156px;font-size:16px;font-weight:700;color:var(--grey);letter-spacing:.02em;}
 .av{font-size:21px;font-weight:800;color:var(--ink);}
 .attr.hot .av{color:var(--red);}
 .mid{flex:0 0 430px;display:flex;flex-direction:column;align-items:center;padding:0 18px;}
 .mlab{font-size:23px;font-weight:800;color:var(--ink);letter-spacing:.04em;margin-bottom:9px;}
 .chip{border:2px solid var(--red);background:var(--redfill);color:var(--red);
       font-size:18px;font-weight:800;padding:7px 14px;margin-top:11px;white-space:nowrap;}
 .foot{margin-top:22px;border-top:2.5px solid var(--line);padding-top:16px;
       display:flex;align-items:center;justify-content:center;gap:22px;}
 .fbox{border:2.5px solid var(--ink);background:var(--fill);padding:11px 22px;
       font-size:23px;font-weight:800;color:var(--ink);}
 .fq{font-size:34px;font-weight:800;color:var(--red);}
 .fnote{font-size:21px;font-weight:700;color:var(--red);}
</style>
<div class="row">
  <div class="card">
    <div class="ch"><div class="cn">A &middot; deployed baseline</div><div class="cs">before the migration</div></div>
    <div class="attr hot"><div class="ak">STORE</div><div class="av">PostgreSQL + pgvector</div></div>
    <div class="attr hot"><div class="ak">PLACEMENT</div><div class="av">outside the database</div></div>
    <div class="attr"><div class="ak">RETRIEVAL RULE</div><div class="av">identical</div></div>
  </div>
  <div class="mid">
    <div class="mlab">ONE MIGRATION</div>
    <svg width="190" height="34"><line x1="0" y1="17" x2="160" y2="17" stroke="#1a1a1a" stroke-width="7"/><polygon points="158,2 158,32 190,17" fill="#1a1a1a"/></svg>
    <div class="chip">&#9312; store factor</div>
    <div class="chip">&#9313; placement factor</div>
  </div>
  <div class="card">
    <div class="ch"><div class="cn">C &middot; migrated system</div><div class="cs">after the migration</div></div>
    <div class="attr hot"><div class="ak">STORE</div><div class="av">Oracle AI Database 26ai</div></div>
    <div class="attr hot"><div class="ak">PLACEMENT</div><div class="av">inside the database</div></div>
    <div class="attr"><div class="ak">RETRIEVAL RULE</div><div class="av">identical</div></div>
  </div>
</div>
<div class="foot">
  <div class="fbox">a single before-and-after comparison</div>
  <svg width="60" height="24"><line x1="0" y1="12" x2="40" y2="12" stroke="#6d6d6d" stroke-width="4"/><polygon points="38,2 38,22 60,12" fill="#6d6d6d"/></svg>
  <div class="fq">?</div>
  <div class="fnote">which factor caused it cannot be told</div>
</div>
""")

# ── FIG-C · Introduction: 오진단 ─────────────────────────────────────────
FIG_C = page("""
<style>
 .cols{display:flex;gap:44px;}
 .col{flex:1 1 0;border:2.5px solid var(--ink);background:#fff;padding:16px 20px 18px 20px;}
 .col.b{border-style:dashed;}
 .ct{font-size:25px;font-weight:800;color:var(--ink);margin-bottom:4px;}
 .cq{font-size:18px;font-weight:600;color:var(--grey);margin-bottom:14px;}
 .obs{border:2.5px solid var(--ink);background:var(--fill);padding:10px 14px;text-align:center;
      font-size:23px;font-weight:800;color:var(--ink);}
 .dn{display:flex;justify-content:center;padding:9px 0;}
 .forks{display:flex;gap:16px;}
 .fork{flex:1 1 0;border:2px solid var(--line);padding:10px 12px;text-align:center;
       font-size:20px;font-weight:700;color:var(--grey);background:#fff;}
 .verdict{margin-top:13px;border:2.5px solid var(--red);background:var(--redfill);
          padding:10px 14px;text-align:center;font-size:21px;font-weight:800;color:var(--red);}
 .strip{margin-top:24px;border-top:2.5px solid var(--line);padding-top:16px;text-align:center;}
 .s1{font-size:25px;font-weight:800;color:var(--ink);}
 .s2{font-size:20px;font-weight:600;color:var(--grey);margin-top:5px;}
</style>
<div class="cols">
  <div class="col">
    <div class="ct">When quality drops</div>
    <div class="cq">the end-to-end comparison shows a decline</div>
    <div class="obs">relevance falls after the migration</div>
    <div class="dn"><svg width="20" height="26"><line x1="10" y1="0" x2="10" y2="16" stroke="#1a1a1a" stroke-width="3"/><polygon points="2,15 18,15 10,26" fill="#1a1a1a"/></svg></div>
    <div class="forks">
      <div class="fork">the store<br>is at fault?</div>
      <div class="fork">the model<br>is at fault?</div>
    </div>
    <div class="verdict">the two cannot be told apart</div>
  </div>
  <div class="col b">
    <div class="ct">When nothing changes</div>
    <div class="cq">the end-to-end comparison shows no difference</div>
    <div class="obs">relevance stays the same</div>
    <div class="dn"><svg width="20" height="26"><line x1="10" y1="0" x2="10" y2="16" stroke="#1a1a1a" stroke-width="3"/><polygon points="2,15 18,15 10,26" fill="#1a1a1a"/></svg></div>
    <div class="forks">
      <div class="fork">there truly was<br>no effect?</div>
      <div class="fork">two effects<br>cancelled out?</div>
    </div>
    <div class="verdict">the two cannot be told apart</div>
  </div>
</div>
<div class="strip">
  <div class="s1">Blaming the store and reverting it does not bring the quality back</div>
  <div class="s2">and the conclusion cannot be carried over to a different instance class or model size limit</div>
</div>
""")

# ── FIG-D · Performance Evaluation: 세 조건 비교 (기존 표 대체) ───────────
FIG_D = page("""
<style>
 table{border-collapse:collapse;width:100%;table-layout:fixed;}
 col.k{width:250px;}
 th,td{padding:15px 18px;text-align:center;border-bottom:1.5px solid var(--line);}
 thead th{background:var(--ink);color:#fff;font-size:24px;font-weight:800;border-bottom:none;}
 thead th.k{background:#fff;}
 tbody th{background:#fff;text-align:left;font-size:19px;font-weight:700;color:var(--grey);
          letter-spacing:.02em;white-space:nowrap;}
 td{font-size:23px;font-weight:700;color:var(--ink);}
 td.same{color:#9a9a9a;font-weight:600;}
 td.sf{background:#e9eef4;color:var(--blue);font-weight:800;}
 td.pf{background:var(--redfill);color:var(--red);font-weight:800;}
 tbody tr:last-child th,tbody tr:last-child td{border-bottom:none;}
 .legend{margin-top:20px;display:flex;justify-content:center;gap:40px;align-items:center;}
 .li{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:700;}
 .sw{width:26px;height:18px;border:1.5px solid var(--line);}
 .arrs{display:flex;margin-top:16px;}
 .arrs .sp{flex:0 0 250px;}
 .arrs .seg{flex:1 1 0;display:flex;align-items:center;justify-content:center;gap:12px;
            font-size:21px;font-weight:800;}
</style>
<table>
 <colgroup><col class="k"><col><col><col></colgroup>
 <thead><tr><th class="k"></th><th>A &middot; baseline</th><th>B &middot; bridge</th><th>C &middot; migrated</th></tr></thead>
 <tbody>
  <tr><th>Store</th><td>PostgreSQL + pgvector</td><td class="sf">Oracle 26ai</td><td class="same">Oracle 26ai</td></tr>
  <tr><th>Vector search</th><td>HNSW approximate</td><td class="sf">exact</td><td class="same">exact</td></tr>
  <tr><th>Embedding model</th><td>BGE-M3 &middot; 1024-d</td><td class="same">BGE-M3 &middot; 1024-d</td><td class="pf">e5-small &middot; 384-d</td></tr>
  <tr><th>Placement</th><td>outside the database</td><td class="same">outside the database</td><td class="pf">inside the database</td></tr>
 </tbody>
</table>
<div class="arrs">
  <div class="sp"></div>
  <div class="seg" style="color:#3375BE;">
    <svg width="150" height="22"><line x1="0" y1="11" x2="124" y2="11" stroke="#3375BE" stroke-width="5"/><polygon points="122,1 122,21 150,11" fill="#3375BE"/></svg>
    STORE FACTOR
  </div>
  <div class="seg" style="color:#F94145;">
    <svg width="150" height="22"><line x1="0" y1="11" x2="124" y2="11" stroke="#F94145" stroke-width="5"/><polygon points="122,1 122,21 150,11" fill="#F94145"/></svg>
    PLACEMENT FACTOR
  </div>
</div>
<div class="legend">
  <div class="li"><div class="sw" style="background:#e9eef4;"></div><span style="color:#3375BE;">changed by the store factor</span></div>
  <div class="li"><div class="sw" style="background:#fdf0f0;"></div><span style="color:#F94145;">changed by the placement factor</span></div>
  <div class="li"><div class="sw" style="background:#fff;"></div><span class="g">carried over unchanged</span></div>
</div>
""")


def result_fig(jac, jac_ci, pval, p_verdict, dz, dz_word, headline, hot):
    """결과 두 장을 같은 틀로 찍어낸다 — 나란히 놓았을 때 대비가 바로 읽히게."""
    c = "var(--red)" if hot else "var(--blue)"
    fill = "var(--redfill)" if hot else "#e9eef4"
    jac_pct = jac * 100
    dz_pct = min(abs(dz) / 1.0, 1.0) * 100
    # p값은 로그 눈금이라야 0.003과 0.523이 한 축에 같이 보인다
    import math
    lo, hi = math.log10(0.001), math.log10(1.0)
    p_pct = (math.log10(max(pval, 0.001)) - lo) / (hi - lo) * 100
    thr_pct = (math.log10(0.05) - lo) / (hi - lo) * 100
    return page(f"""
<style>
 .panels{{display:flex;gap:34px;}}
 .p{{flex:1 1 0;border:2.5px solid var(--line);padding:16px 20px 18px 20px;background:#fff;}}
 .pt{{font-size:20px;font-weight:700;color:var(--grey);letter-spacing:.02em;}}
 .pv{{font-size:52px;font-weight:800;color:{c};line-height:1.05;margin-top:2px;
      font-variant-numeric:tabular-nums;}}
 .ps{{font-size:18px;font-weight:600;color:var(--grey);margin-top:2px;}}
 .track{{position:relative;height:22px;background:var(--fill);border:1.5px solid var(--line);
         margin-top:14px;}}
 .fillbar{{position:absolute;left:0;top:0;bottom:0;background:{c};opacity:.85;}}
 .mark{{position:absolute;top:-6px;bottom:-6px;width:4px;background:var(--ink);}}
 .thr{{position:absolute;top:-6px;bottom:-6px;width:3px;background:var(--grey);}}
 .ends{{display:flex;justify-content:space-between;font-size:16px;font-weight:700;
        color:var(--grey);margin-top:5px;}}
 .ends.rel{{position:relative;}}
 .thrlab{{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap;
          color:var(--ink);font-size:16px;font-weight:800;}}
 .verdict{{margin-top:24px;border:2.5px solid {c};background:{fill};padding:13px 18px;
           text-align:center;font-size:27px;font-weight:800;color:{c};}}
</style>
<div class="panels">
  <div class="p">
    <div class="pt">TOP-10 JACCARD</div>
    <div class="pv">{jac:.3f}</div>
    <div class="ps">95% CI [{jac_ci[0]:.3f}, {jac_ci[1]:.3f}]</div>
    <div class="track"><div class="fillbar" style="width:{jac_pct:.1f}%"></div></div>
    <div class="ends"><span>0.0 &nbsp;no overlap</span><span>identical&nbsp; 1.0</span></div>
  </div>
  <div class="p">
    <div class="pt">P VALUE &middot; RELEVANCE</div>
    <div class="pv">{pval:.3f}</div>
    <div class="ps">{p_verdict}</div>
    <div class="track"><div class="thr" style="left:{thr_pct:.1f}%"></div><div class="mark" style="left:{p_pct:.1f}%"></div></div>
    <div class="ends rel"><span>0.001</span><span class="thrlab" style="left:{thr_pct:.1f}%">&#9650; 0.05</span><span>1.0</span></div>
  </div>
  <div class="p">
    <div class="pt">EFFECT SIZE |dz|</div>
    <div class="pv">{abs(dz):.3f}</div>
    <div class="ps">{dz_word}</div>
    <div class="track"><div class="fillbar" style="width:{dz_pct:.1f}%"></div></div>
    <div class="ends"><span>0.0</span><span>1.0</span></div>
  </div>
</div>
<div class="verdict">{headline}</div>
""")


FIG_E = result_fig(0.971, (0.946, 0.992), 0.523, "chance explains it",
                   -0.098, "negligible",
                   "STORE FACTOR &mdash; no quality change was detected", hot=False)
FIG_F = result_fig(0.175, (0.133, 0.221), 0.003, "chance is an unlikely explanation",
                   0.473, "medium",
                   "PLACEMENT FACTOR &mdash; a significant, medium-sized effect", hot=True)

FIGS = {
    "slide2-fig-intro-rag": FIG_A,
    "slide2-fig-intro-problem": FIG_B,
    "slide2-fig-intro-misdiagnosis": FIG_C,
    "slide2-fig-setup-matrix": FIG_D,
    "slide2-fig-result-store": FIG_E,
    "slide2-fig-result-placement": FIG_F,
}


def render(name: str, html: str) -> Path:
    src = OUT / f"{name}.html"
    png = OUT / f"{name}.png"
    src.write_text(html, encoding="utf-8")
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
         "--force-device-scale-factor=2", f"--window-size={STAGE},1400",
         f"--screenshot={png}", f"file://{src}"],
        check=True, capture_output=True)
    return png


def crop(png: Path) -> tuple:
    """여백을 잘라내고, 잘림이 없는지 확인한다."""
    from PIL import Image
    im = Image.open(png).convert("RGB")
    bg = Image.new("RGB", im.size, (255, 255, 255))
    from PIL import ImageChops
    bbox = ImageChops.difference(im, bg).getbbox()
    if bbox is None:
        raise RuntimeError(f"{png.name}: 빈 이미지")
    pad = 8
    box = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
           min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad))
    im.crop(box).save(png)
    # 오른쪽 끝에 잉크가 닿으면 stage 폭을 넘겨 잘린 것이다
    clipped = bbox[2] >= im.width - 2
    return Image.open(png).size, clipped


if __name__ == "__main__":
    bad = []
    for name, html in FIGS.items():
        png = render(name, html)
        size, clipped = crop(png)
        flag = "  ⚠ 우측 잘림 의심" if clipped else ""
        print(f"{name:<34} {size[0]:>5} x {size[1]:<5} (비 {size[0]/size[1]:.2f}:1){flag}")
        if clipped:
            bad.append(name)
    if bad:
        print(f"\n잘림 의심: {bad}")
        sys.exit(1)
