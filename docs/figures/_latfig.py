"""rev10 신규 도식 — 검색 지연 + 효과 크기 (HTML → Chrome headless → PNG).

리허설 피드백: 위치 요인의 '8배 느려짐'이 말로만 지나가고, 효과 크기는 그림
구석에만 있어 설명 없이 넘어간다. 두 값을 한 장으로 뽑아 슬라이드를 세운다.
색 토큰·선 두께·패널 틀은 _slidefig_v2.py 의 result_fig 와 동일하게 맞춘다 —
한 덱 안에서 그림끼리 따로 노는 것이 제일 티가 나기 때문이다.
"""
import subprocess
from pathlib import Path

OUT = Path(__file__).parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
STAGE = 1720

CSS = """
:root{ --ink:#1a1a1a; --grey:#6d6d6d; --line:#c2c2c2; --fill:#f1f1f1;
       --blue:#3375BE; --bluefill:#eaf1f9; --red:#F94145; --redfill:#fdf0f0; }
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#fff;}
body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;}
.stage{width:%dpx;background:#fff;padding:24px 26px;}
""" % STAGE

# 값의 출처: docs/research/paper-results/stats.md — mean(ms) 150.2 / 110.0 / 947.0,
# median(C)/median(B) = 8.4배. 발표 문구("약 8배")와 어긋나지 않게 반올림만 쓴다.
LAT = [("A", "pgvector + external embedding", 150, "var(--ink)", 0.55),
       ("B", "Oracle + same vectors", 110, "var(--blue)", 0.85),
       ("C", "Oracle + in-DB embedding", 947, "var(--red)", 0.85)]
LMAX = 1000.0

def _val(pct: float, text: str) -> str:
    """긴 막대는 라벨을 막대 안쪽 흰 글자로 — 트랙 경계·눈금과 겹치지 않게."""
    if pct > 40:
        return f'<div class="val in" style="right:{100 - pct + 0.5:.1f}%;">{text}</div>'
    return f'<div class="val" style="left:{pct:.1f}%;">{text}</div>'


BARS = "\n".join(f"""
  <div class="row">
    <div class="lab"><span class="cond">{c}</span> {desc}</div>
    <div class="track"><div class="bar" style="width:{v / LMAX * 100:.1f}%;background:{color};opacity:{op};"></div>
      {_val(v / LMAX * 100, f"{v} ms")}</div>
  </div>""" for c, desc, v, color, op in LAT)

FIG = (f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}'
       """
 .panels{display:flex;gap:34px;}
 .p{flex:1 1 0;border:2.5px solid var(--line);padding:16px 20px 18px 20px;background:#fff;}
 .pt{font-size:20px;font-weight:700;color:var(--grey);letter-spacing:.02em;}
 .ps{font-size:18px;font-weight:600;color:var(--grey);margin-top:2px;}
 .row{margin-top:14px;}
 .lab{font-size:18px;font-weight:700;color:var(--grey);}
 .lab .cond{display:inline-block;min-width:26px;font-size:19px;font-weight:800;color:var(--ink);}
 .track{position:relative;height:26px;background:var(--fill);border:1.5px solid var(--line);margin-top:4px;}
 .bar{position:absolute;left:0;top:0;bottom:0;}
 .val{position:absolute;top:1px;font-size:18px;font-weight:800;color:var(--ink);padding-left:8px;
      font-variant-numeric:tabular-nums;white-space:nowrap;}
 .val.in{padding-left:0;color:#fff;}
 .times{margin-top:14px;text-align:right;font-size:24px;font-weight:800;color:var(--red);}
 .eff .row{margin-top:18px;}
 .bench{position:absolute;top:-6px;bottom:-6px;width:3px;background:var(--grey);}
 .ends{position:relative;display:flex;justify-content:space-between;font-size:16px;
       font-weight:700;color:var(--grey);margin-top:5px;}
 .blab{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap;
       color:var(--ink);font-size:16px;font-weight:800;}
 .verdict{margin-top:24px;border:2.5px solid var(--red);background:var(--redfill);
          padding:13px 18px;text-align:center;font-size:27px;font-weight:800;color:var(--red);}
</style></head><body><div class="stage">
<div class="panels">
  <div class="p">
    <div class="pt">SEARCH LATENCY &middot; mean over 43 queries</div>
    <div class="ps">entry-level instance &mdash; absolute times do not generalize</div>"""
       + BARS +
       """
    <div class="times">B &rarr; C &nbsp;&asymp; 8&times; slower</div>
  </div>
  <div class="p eff">
    <div class="pt">EFFECT SIZE |dz| &middot; how large the quality difference is</div>
    <div class="ps">p asks &ldquo;is it chance?&rdquo; &mdash; effect size asks &ldquo;how big is it?&rdquo;</div>
    <div class="row">
      <div class="lab"><span class="cond" style="min-width:0;color:var(--blue);">STORE FACTOR</span></div>
      <div class="track"><div class="bar" style="width:9.8%;background:var(--blue);opacity:.85;"></div>
        <div class="val" style="left:9.8%;">0.098 &middot; negligible</div>
        <div class="bench" style="left:20%;"></div><div class="bench" style="left:50%;"></div><div class="bench" style="left:80%;"></div></div>
    </div>
    <div class="row">
      <div class="lab"><span class="cond" style="min-width:0;color:var(--red);">PLACEMENT FACTOR</span></div>
      <div class="track"><div class="bar" style="width:47.3%;background:var(--red);opacity:.85;"></div>
        <div class="val in" style="right:53.2%;">0.473 &middot; medium</div>
        <div class="bench" style="left:20%;"></div><div class="bench" style="left:50%;"></div><div class="bench" style="left:80%;"></div></div>
    </div>
    <div class="ends"><span>0.0</span>
      <span class="blab" style="left:20%;">small 0.2</span>
      <span class="blab" style="left:50%;">medium 0.5</span>
      <span class="blab" style="left:80%;">large 0.8</span>
      <span>1.0</span></div>
  </div>
</div>
<div class="verdict">BOTH THE SLOWDOWN AND THE QUALITY DROP BELONG TO THE PLACEMENT FACTOR</div>
</div></body></html>""")


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


def crop(png: Path) -> None:
    from PIL import Image, ImageChops
    im = Image.open(png).convert("RGB")
    bg = Image.new("RGB", im.size, (255, 255, 255))
    bbox = ImageChops.difference(im, bg).getbbox()
    if bbox is None:
        raise RuntimeError(f"{png.name}: 빈 이미지")
    pad = 8
    box = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
           min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad))
    if bbox[2] >= im.width - 1:
        raise RuntimeError(f"{png.name}: 오른쪽이 잘렸다 — stage 폭 초과")
    im.crop(box).save(png)


if __name__ == "__main__":
    png = render("slide2-fig-latency-effect", FIG)
    crop(png)
    from PIL import Image
    print(f"저장: {png} {Image.open(png).size}")
