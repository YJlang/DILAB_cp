"""발표 대본 Markdown → 인쇄용 PDF.

무대에서 들고 읽는 큐시트다. 화면용 문서와 요구가 다르다.
  · 슬라이드 한 장 분량이 페이지 경계에서 잘리면 안 된다 (page-break-inside: avoid)
  · 시간·슬라이드 번호가 고개만 내려도 눈에 들어와야 한다
  · 연출 지시(호흡·손짓)와 낭독할 문장이 한눈에 구분돼야 한다
"""
import html
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "발표대본_PyGeek2026.md"
DST = HERE / "발표대본_PyGeek2026.pdf"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS = """
@page { size: A4 portrait; margin: 14mm 15mm 14mm 15mm; }
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{
  font-family:"Apple SD Gothic Neo","Malgun Gothic",-apple-system,sans-serif;
  font-size:10.8pt; line-height:1.62; color:#16181d;
  -webkit-font-smoothing:antialiased;
}
h1{font-size:19pt;font-weight:800;margin:0 0 4pt 0;letter-spacing:-.01em;}
h1.sub{font-size:15pt;margin-top:16pt;border-top:1.5pt solid #16181d;padding-top:10pt;}
.meta{font-size:9.4pt;color:#5b6270;line-height:1.5;margin-bottom:12pt;
      border-left:2.5pt solid #3375BE;padding-left:9pt;}
.meta b{color:#16181d;}

h2.head{font-size:12pt;font-weight:800;margin:0 0 7pt 0;color:#16181d;}

/* 슬라이드 한 덩어리 — 페이지 경계에서 쪼개지 않는다 */
.slide{break-inside:avoid;page-break-inside:avoid;margin:0 0 13pt 0;
       border-top:1pt solid #d7dbe2;padding-top:9pt;}
.slide.key{border-top:2.2pt solid #F94145;}
.bar{display:flex;align-items:baseline;gap:8pt;margin-bottom:6pt;}
.num{flex:0 0 auto;background:#16181d;color:#fff;font-size:10pt;font-weight:800;
     padding:1.5pt 7pt;border-radius:2pt;}
.slide.key .num{background:#F94145;}
.ttl{flex:1 1 auto;font-size:12pt;font-weight:800;}
.star{color:#F94145;}
.time{flex:0 0 auto;font-size:10.2pt;font-weight:800;color:#3375BE;
      font-variant-numeric:tabular-nums;white-space:nowrap;}

p{margin:0 0 6.5pt 0;}
strong{font-weight:800;color:#000;}
.cue{border-left:3pt solid #F94145;background:#fdf3f3;padding:6pt 9pt;
     margin:0 0 7pt 0;font-size:10.2pt;font-weight:700;color:#c0272b;}
.opt{color:#7b8290;}
.opt::before{content:"";}
.stage{color:#5b6270;font-weight:600;}

table{border-collapse:collapse;width:100%;font-size:9.3pt;margin:0 0 10pt 0;
      break-inside:avoid;page-break-inside:avoid;}
th,td{border-bottom:.7pt solid #d7dbe2;padding:3.4pt 5pt;text-align:left;}
thead th{background:#16181d;color:#fff;font-weight:700;border-bottom:none;}
td.c,th.c{text-align:center;}
tbody tr.k td{background:#fff6f6;}

h3{font-size:11pt;font-weight:800;margin:11pt 0 4pt 0;break-after:avoid;page-break-after:avoid;}
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
    s = re.sub(r"〈생략 가능〉", '<span class="opt">〈생략 가능〉</span>', s)
    return s


def convert(md: str) -> str:
    lines = md.split("\n")
    out, i = [], 0
    in_slide = False

    def close_slide():
        nonlocal in_slide
        if in_slide:
            out.append("</section>")
            in_slide = False

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
            close_slide()
            n, title, t = m.group(1), m.group(2), m.group(3)
            key = "★" in title
            out.append(f'<section class="slide{" key" if key else ""}">')
            out.append(f'<div class="bar"><span class="num">{n}</span>'
                       f'<span class="ttl">{inline(title)}</span>'
                       f'<span class="time">{html.escape(t)}</span></div>')
            in_slide = True
            i += 1
            continue

        if ln.startswith("### "):
            close_slide()
            out.append(f'<div class="qa"><h3>{inline(ln[4:])}</h3>')
            i += 1
            while i < len(lines) and not lines[i].startswith(("### ", "---", "# ")):
                if lines[i].strip():
                    out.append(f"<p>{inline(lines[i].strip())}</p>")
                i += 1
            out.append("</div>")
            continue

        if ln.startswith("## "):
            close_slide()
            out.append(f'<h2 class="head">{inline(ln[3:])}</h2>')
            i += 1
            continue

        if ln.startswith("# "):
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
            buf = []
            while i < len(lines) and lines[i].startswith(">"):
                buf.append(lines[i].lstrip("> ").rstrip())
                i += 1
            rows = [x for x in buf if x]
            # 연출 지시인지 단순 안내인지는 낱말로 가른다.
            # 굵은 글씨 유무로 가르면 머리말까지 연출 지시로 물든다.
            CUE = ("호흡", "쉬고", "천천히", "읽지 않습니다", "짚으면서",
                   "청중을 보며", "정상 속도", "짧게 시작")
            body = " ".join(rows)
            if any(k in body for k in CUE):
                out.append(f'<div class="cue">{inline(body)}</div>')
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
            i += 1
            continue

        if ln.strip():
            out.append(f"<p>{inline(ln.strip())}</p>")
        i += 1

    close_slide()
    return "\n".join(out)


def main():
    md = SRC.read_text(encoding="utf-8")
    tmp = HERE / "_script_print.html"
    tmp.write_text(
        f'<!doctype html><html lang="ko"><head><meta charset="utf-8">'
        f"<title>PyGeek 2026 발표 대본</title><style>{CSS}</style></head>"
        f"<body>{convert(md)}</body></html>", encoding="utf-8")
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
         f"--print-to-pdf={DST}", f"file://{tmp}"],
        check=True, capture_output=True)
    tmp.unlink()
    return DST


if __name__ == "__main__":
    print(f"저장: {main()}")
