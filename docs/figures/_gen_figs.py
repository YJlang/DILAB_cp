"""DILAB ongoing-project figures — simple academic style, stdlib-only SVG.

No in-figure titles/eyebrows/decoration (captions live in the HTML, centered,
as '그림 N.'). White background, restrained single-hue palette.

fig2: 토픽 모델링 + 감성 분석 결과 (two horizontal-bar panels)
fig3: 5축 평가 레이더
"""
import math

INK = "#222222"
GRAY = "#7a7a7a"
GRID = "#dcdcdc"
NAVY = "#3f5e86"          # primary series
NAVY_FILL = "#3f5e86"
DASH = "#9aa0a8"          # secondary / category average
FONT = "'Noto Sans KR','Apple SD Gothic Neo','Helvetica Neue',sans-serif"


def html_wrap(svg, w, h):
    return ("<!doctype html><html><head><meta charset='utf-8'>"
            "<style>*{margin:0;padding:0}body{background:#fff}</style></head>"
            f"<body>{svg}</body></html>")


# ----------------------------------------------- fig2: topics + sentiment
def fig2():
    W, H = 880, 380
    s = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}' "
         f"viewBox='0 0 {W} {H}' font-family=\"{FONT}\">"]
    s.append(f"<rect width='{W}' height='{H}' fill='#fff'/>")

    # --- panel (가): sentiment ---
    s.append(f"<text x='40' y='40' font-size='14' fill='{INK}'>(가) 감성 분포 (%)</text>")
    sent = [("긍정", 64), ("중립", 23), ("부정", 13)]
    bx, by, bw = 110, 70, 230   # bar origin x, first row y, max bar width
    rowh, barh = 56, 22
    for i, (lab, val) in enumerate(sent):
        y = by + i * rowh
        s.append(f"<text x='{bx-12}' y='{y+barh-6}' font-size='13' fill='{INK}' "
                 f"text-anchor='end'>{lab}</text>")
        w = bw * val / 100
        s.append(f"<rect x='{bx}' y='{y}' width='{w:.1f}' height='{barh}' fill='{NAVY}'/>")
        s.append(f"<text x='{bx+w+8:.1f}' y='{y+barh-6}' font-size='12' fill='{GRAY}'>{val}</text>")

    # divider
    s.append(f"<line x1='450' y1='30' x2='450' y2='{H-30}' stroke='{GRID}' stroke-width='1'/>")

    # --- panel (나): topics ---
    s.append(f"<text x='490' y='40' font-size='14' fill='{INK}'>(나) 주요 토픽별 언급 비중 (%)</text>")
    topics = [("진정·수딩", 28), ("가격", 19), ("성분(어성초)", 16),
              ("보습·수분감", 14), ("자극·트러블", 12), ("기타", 11)]
    tx, ty, tw = 600, 66, 200
    trowh, tbarh = 44, 18
    for i, (lab, val) in enumerate(topics):
        y = ty + i * trowh
        s.append(f"<text x='{tx-12}' y='{y+tbarh-5}' font-size='12.5' fill='{INK}' "
                 f"text-anchor='end'>{lab}</text>")
        w = tw * val / 28
        s.append(f"<rect x='{tx}' y='{y}' width='{w:.1f}' height='{tbarh}' fill='{NAVY}'/>")
        s.append(f"<text x='{tx+w+8:.1f}' y='{y+tbarh-4}' font-size='11.5' fill='{GRAY}'>{val}</text>")

    s.append("</svg>")
    return "".join(s), W, H


# ----------------------------------------------- fig3: 5-axis radar
def fig3():
    W, H = 640, 560
    axes = ["효능", "성분", "가격", "사용감", "안전성"]
    product = [8.4, 7.8, 6.9, 8.1, 8.0]
    catavg = [7.2, 7.0, 6.6, 7.3, 7.1]
    cx, cy, R, n = 320, 280, 188, 5

    def pt(i, val):
        ang = math.radians(-90 + i * 360 / n)
        r = R * val / 10
        return cx + r * math.cos(ang), cy + r * math.sin(ang)

    s = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}' "
         f"viewBox='0 0 {W} {H}' font-family=\"{FONT}\">"]
    s.append(f"<rect width='{W}' height='{H}' fill='#fff'/>")

    for ring in (2, 4, 6, 8, 10):
        poly = " ".join(f"{x:.1f},{y:.1f}" for x, y in (pt(i, ring) for i in range(n)))
        s.append(f"<polygon points='{poly}' fill='none' stroke='{GRID}' stroke-width='1'/>")
    for i, ax in enumerate(axes):
        x, y = pt(i, 10)
        s.append(f"<line x1='{cx}' y1='{cy}' x2='{x:.1f}' y2='{y:.1f}' stroke='{GRID}' stroke-width='1'/>")
        lx, ly = pt(i, 11.3)
        anchor = "middle"
        if lx > cx + 5:
            anchor = "start"
        elif lx < cx - 5:
            anchor = "end"
        dy = 5 if ly > cy else 0
        s.append(f"<text x='{lx:.1f}' y='{ly+dy:.1f}' font-size='14' fill='{INK}' "
                 f"text-anchor='{anchor}'>{ax}</text>")
        s.append(f"<text x='{lx:.1f}' y='{ly+dy+17:.1f}' font-size='11.5' fill='{GRAY}' "
                 f"text-anchor='{anchor}'>{product[i]:.1f}</text>")

    polc = " ".join(f"{x:.1f},{y:.1f}" for x, y in (pt(i, catavg[i]) for i in range(n)))
    s.append(f"<polygon points='{polc}' fill='none' stroke='{DASH}' stroke-width='1.5' "
             f"stroke-dasharray='5 4'/>")
    polp = " ".join(f"{x:.1f},{y:.1f}" for x, y in (pt(i, product[i]) for i in range(n)))
    s.append(f"<polygon points='{polp}' fill='{NAVY_FILL}' fill-opacity='0.10' "
             f"stroke='{NAVY}' stroke-width='2'/>")
    for i in range(n):
        x, y = pt(i, product[i])
        s.append(f"<circle cx='{x:.1f}' cy='{y:.1f}' r='3' fill='{NAVY}'/>")

    # legend (bottom, centered)
    ly = 520
    s.append(f"<line x1='180' y1='{ly}' x2='210' y2='{ly}' stroke='{NAVY}' stroke-width='2'/>")
    s.append(f"<text x='218' y='{ly+5}' font-size='13' fill='{INK}'>제품 (아누아 어성초 77 토너)</text>")
    s.append(f"<line x1='180' y1='{ly+24}' x2='210' y2='{ly+24}' stroke='{DASH}' "
             f"stroke-width='1.5' stroke-dasharray='5 4'/>")
    s.append(f"<text x='218' y='{ly+29}' font-size='13' fill='{INK}'>카테고리 평균</text>")

    s.append("</svg>")
    return "".join(s), W, H


for name, fn in (("fig2-analysis", fig2), ("fig3-radar", fig3)):
    svg, w, h = fn()
    with open(f"/Users/junha/Desktop/DILAB/docs/figures/{name}.html", "w") as f:
        f.write(html_wrap(svg, w, h))
    print("wrote", name, w, h)
