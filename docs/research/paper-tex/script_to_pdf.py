"""발표 대본 Markdown → PDF 두 벌.

무대에서 들고 읽는 큐시트다. 화면용 문서와 요구가 다르다.
  · 슬라이드 한 장 분량이 페이지 경계에서 잘리면 안 된다 (page-break-inside: avoid)
  · 시간·슬라이드 번호가 고개만 내려도 눈에 들어와야 한다
  · 연출 지시(호흡·손짓)와 낭독할 문장이 한눈에 구분돼야 한다

판이 둘인 이유는 읽는 거리가 다르기 때문이다.
  · print  — 연단에 놓고 서서 내려다본다. 그래서 12.5pt.
  · mobile — 손에 들고 본다. 여기서 중요한 건 글자 크기가 아니라 **한 줄에 들어가는
             글자 수**다. 뷰어가 페이지를 화면 폭에 맞추므로, A4(한 줄 45자 남짓)는
             글자를 아무리 키워도 같은 비율로 함께 줄어든다. 페이지를 폰 비율로
             좁혀 한 줄을 20자 안팎으로 만들어야 실제로 커진다.
"""
import html
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "발표대본_PyGeek2026.md"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PROFILES = {
    "print": {
        "out": "발표대본_PyGeek2026.pdf",
        "page": "A4 portrait",
        "margin": "13mm 14mm 13mm 14mm",
        "base": 12.5,
        "table": 10.4,
        "gap": 13,          # 슬라이드 블록 사이 여백(pt)
    },
    "mobile": {
        "out": "발표대본_PyGeek2026_모바일.pdf",
        "page": "92mm 164mm",     # 9:16 — 폰 화면에 꽉 찬다
        "margin": "6mm 5mm 6mm 5mm",
        "base": 11.5,
        "table": 6.6,             # 5단 표는 좁은 폭에서만 줄인다
        "gap": 10,
    },
}

CSS = """
@page { size: {{PAGE}}; margin: {{MARGIN}}; }
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{
  font-family:"Apple SD Gothic Neo","Malgun Gothic",-apple-system,sans-serif;
  font-size:{{BASE}}pt; line-height:1.62; color:#16181d;
  -webkit-font-smoothing:antialiased;
}
h1{font-size:{{H1}}pt;font-weight:800;margin:0 0 4pt 0;letter-spacing:-.01em;}
h1.sub{font-size:{{H1SUB}}pt;margin-top:16pt;border-top:1.5pt solid #16181d;padding-top:10pt;}
.meta{font-size:{{META}}pt;color:#5b6270;line-height:1.5;margin-bottom:12pt;
      border-left:2.5pt solid #3375BE;padding-left:9pt;}
.meta b{color:#16181d;}

h2.head{font-size:{{HEAD}}pt;font-weight:800;margin:0 0 7pt 0;color:#16181d;}

/* 슬라이드 한 덩어리 — 페이지 경계에서 쪼개지 않는다 */
.slide{break-inside:avoid;page-break-inside:avoid;margin:0 0 {{GAP}}pt 0;
       border-top:1pt solid #d7dbe2;padding-top:9pt;}
.slide.key{border-top:2.2pt solid #F94145;}
/* 좁은 판에서는 제목이 길어 시각(時刻)이 밀린다. 밀리면 아랫줄로 내려보낸다. */
.bar{display:flex;flex-wrap:wrap;align-items:baseline;gap:5pt 8pt;margin-bottom:6pt;}
.num{flex:0 0 auto;background:#16181d;color:#fff;font-size:{{NUM}}pt;font-weight:800;
     padding:1.5pt 7pt;border-radius:2pt;}
.slide.key .num{background:#F94145;}
.ttl{flex:1 1 auto;min-width:0;font-size:{{TTL}}pt;font-weight:800;}
.star{color:#F94145;}
.time{flex:0 0 auto;margin-left:auto;font-size:{{TIME}}pt;font-weight:800;color:#3375BE;
      font-variant-numeric:tabular-nums;white-space:nowrap;}

p{margin:0 0 6.5pt 0;}
strong{font-weight:800;color:#000;}
.cue{border-left:3pt solid #F94145;background:#fdf3f3;padding:6pt 9pt;
     margin:0 0 7pt 0;font-size:{{CUE}}pt;font-weight:700;color:#c0272b;}
.opt{color:#7b8290;}
.opt::before{content:"";}
.stage{color:#5b6270;font-weight:600;}

table{border-collapse:collapse;width:100%;font-size:{{TABLE}}pt;margin:0 0 10pt 0;
      break-inside:avoid;page-break-inside:avoid;}
th,td{border-bottom:.7pt solid #d7dbe2;padding:3.4pt 4pt;text-align:left;
      word-break:keep-all;}
thead th{background:#16181d;color:#fff;font-weight:700;border-bottom:none;}
td.c,th.c{text-align:center;}
tbody tr.k td{background:#fff6f6;}

h3{font-size:{{H3}}pt;font-weight:800;margin:11pt 0 4pt 0;break-after:avoid;page-break-after:avoid;}
.qa{break-inside:avoid;page-break-inside:avoid;margin-bottom:9pt;}
ul{margin:0 0 8pt 0;padding-left:15pt;}
li{margin-bottom:3.5pt;}
.chk{list-style:none;padding-left:0;break-inside:avoid;page-break-inside:avoid;}
.chk li::before{content:"☐  ";font-weight:700;}
h1.sub:not(.newpage){break-after:avoid;page-break-after:avoid;}
hr{border:none;border-top:1pt solid #d7dbe2;margin:12pt 0;}
.newpage{break-before:page;page-break-before:always;}
"""


def inline(s: str) -> str:
    s = html.escape(s)
    s = re.sub(r"`([^`]+)`", r'<code>\1</code>', s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = s.replace("★", '<span class="star">★</span>')
    # 〈…〉 는 낭독하지 않는 표식이다. 종류를 늘려도 회색으로 빠지도록 통째로 잡는다.
    s = re.sub(r"〈[^〉]*〉", lambda m: f'<span class="opt">{m.group(0)}</span>', s)
    return s


def convert(md: str) -> str:
    lines = md.split("\n")
    out, i = [], 0
    in_slide = False
    in_qa = False
    in_body = False            # 첫 슬라이드를 지났는가 — 인용의 성격이 여기서 갈린다

    def close_slide():
        nonlocal in_slide
        if in_slide:
            out.append("</section>")
            in_slide = False

    def close_qa():
        nonlocal in_qa
        if in_qa:
            out.append("</div>")
            in_qa = False

    while i < len(lines):
        ln = lines[i]

        # 표
        if ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            hdr, body = rows[0], [r for r in rows[2:]]
            out.append("<table><thead><tr>"
                       + "".join(f"<th>{inline(c)}</th>" for c in hdr)
                       + "</tr></thead><tbody>")
            for r in body:
                key = any("★" in c for c in r)
                out.append(f'<tr class="{"k" if key else ""}">'
                           + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
            out.append("</tbody></table>")
            continue

        # 슬라이드 블록 머리 — "## 4 · 1. Introduction — 두 요인 ★ `1:45–3:05`"
        m = re.match(r"^## (\d+) · (.+?)\s*`([^`]+)`\s*$", ln)
        if m:
            close_qa()
            close_slide()
            in_body = True
            n, title, t = m.group(1), m.group(2), m.group(3)
            key = "★" in title
            out.append(f'<section class="slide{" key" if key else ""}">')
            out.append(f'<div class="bar"><span class="num">{n}</span>'
                       f'<span class="ttl">{inline(title)}</span>'
                       f'<span class="time">{html.escape(t)}</span></div>')
            in_slide = True
            i += 1
            continue

        # 답변 본문은 아래 일반 처리기에 맡기고 여기서는 상자만 연다. 답변 안에서
        # 줄을 직접 소비하면 표·목록이 문단으로 찍히므로, 경계에서 close_qa() 로 닫는다.
        if ln.startswith("### "):
            close_qa()
            close_slide()
            out.append(f'<div class="qa"><h3>{inline(ln[4:])}</h3>')
            in_qa = True
            i += 1
            continue

        if ln.startswith("## "):
            close_qa()
            close_slide()
            out.append(f'<h2 class="head">{inline(ln[3:])}</h2>')
            i += 1
            continue

        if ln.startswith("# "):
            close_qa()
            close_slide()
            t = ln[2:].strip()
            # 새 쪽은 Q&A 앞에서만 뗀다. 체크리스트까지 떼면 다섯 줄짜리
            # 마지막 장이 생겨 들고 넘길 종이만 늘어난다.
            cls = "sub" if out else ""
            if t.startswith("예상 질문"):
                cls += " newpage"
            out.append(f'<h1 class="{cls}">{inline(t)}</h1>')
            i += 1
            continue

        if ln.startswith("> "):
            close_qa()
            buf = []
            while i < len(lines) and lines[i].startswith(">"):
                buf.append(lines[i].lstrip("> ").rstrip())
                i += 1
            rows = [x for x in buf if x]
            # 첫 슬라이드 앞에 오는 인용은 문서 머리말 하나뿐이고, 그 뒤의 인용은
            # 전부 무대에서 지킬 지시다. 낱말 목록으로 가르면 지시를 하나 더할
            # 때마다 목록을 늘려야 하고, 빠뜨리면 조용히 머리말 모양으로 찍힌다.
            if in_body:
                out.append(f'<div class="cue">{inline(" ".join(rows))}</div>')
            else:                                   # 머리말은 줄바꿈을 살린다
                out.append('<div class="meta">'
                           + "<br>".join(inline(r) for r in rows) + "</div>")
            continue

        if re.match(r"^- \[ \]", ln):
            out.append('<ul class="chk">')
            while i < len(lines) and re.match(r"^- \[ \]", lines[i]):
                out.append(f"<li>{inline(lines[i][6:].strip())}</li>")
                i += 1
            out.append("</ul>")
            continue

        if ln.startswith("- "):
            out.append("<ul>")
            while i < len(lines) and lines[i].startswith("- "):
                out.append(f"<li>{inline(lines[i][2:].strip())}</li>")
                i += 1
            out.append("</ul>")
            continue

        if ln.strip() in ("---", "___"):
            close_qa()
            i += 1
            continue

        if ln.strip():
            out.append(f"<p>{inline(ln.strip())}</p>")
        i += 1

    close_qa()
    close_slide()
    return "\n".join(out)


def css_for(p: dict) -> str:
    """본문 크기 하나에서 나머지를 비례로 끌어낸다. 판을 바꿔도 위계가 유지된다."""
    b = p["base"]
    sizes = {
        "PAGE": p["page"], "MARGIN": p["margin"], "GAP": p["gap"],
        "BASE": b, "TABLE": p["table"],
        "H1": round(b * 1.52, 1), "H1SUB": round(b * 1.24, 1),
        "META": round(b * 0.87, 1), "HEAD": round(b * 1.06, 1),
        "NUM": round(b * 0.90, 1), "TTL": round(b * 1.06, 1),
        "TIME": round(b * 0.92, 1), "CUE": round(b * 0.94, 1),
        "H3": round(b * 0.98, 1),
    }
    css = CSS
    for k, v in sizes.items():
        css = css.replace("{{%s}}" % k, str(v))
    return css


def render(profile: str, body: str) -> Path:
    p = PROFILES[profile]
    dst = HERE / p["out"]
    tmp = HERE / f"_script_{profile}.html"
    tmp.write_text(
        f'<!doctype html><html lang="ko"><head><meta charset="utf-8">'
        f"<title>PyGeek 2026 발표 대본</title><style>{css_for(p)}</style></head>"
        f"<body>{body}</body></html>", encoding="utf-8")
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
         f"--print-to-pdf={dst}", f"file://{tmp}"],
        check=True, capture_output=True)
    tmp.unlink()
    return dst


def main():
    body = convert(SRC.read_text(encoding="utf-8"))
    return [render(name, body) for name in PROFILES]


if __name__ == "__main__":
    for f in main():
        print(f"저장: {f}")
