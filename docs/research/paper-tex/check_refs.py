"""참고문헌이 실재하는지, 서지사항이 맞는지 1차 출처와 대조한다.

LLM 이 관여한 원고에서 가장 위험한 오류는 **그럴듯하지만 존재하지 않는 인용**이다.
사람 눈으로는 형식이 멀쩡해 보여 그냥 지나간다. 그래서 등록기관에 직접 물어본다.

  DOI    → Crossref API (제목·저자·권·호·쪽·연도)
  arXiv  → arXiv API    (제목·저자·최초 게시일)
  URL    → 실제 GET     (HTTP 200 과 <title>)
  기타    → OpenAlex     (DOI 없는 학회 proceedings)

네트워크가 없으면 그냥 실패한다. 제출 전에 한 번 돌려 보는 용도다.
"""

import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

UA = {"User-Agent": "pygeek-ref-check/1.0 (mailto:pulse12f12@gmail.com)"}

# (표시명, 종류, 식별자, 원고에 적은 서지에서 반드시 나와야 하는 값들)
REFS = [
    ("[1] Lewis, RAG",        "openalex",
     "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
     {"volume": "33", "first_page": "9459", "last_page": "9474", "year": 2020}),
    ("[2] Gao, RAG survey",   "arxiv",    "2312.10997", {"year": "2023"}),
    ("[3] Oracle AI Vector",  "url",
     "https://docs.oracle.com/en/database/oracle/oracle-database/26/vecse/",
     {"title_has": "Oracle AI Vector Search User's Guide"}),
    ("[4] Multilingual E5",   "arxiv",    "2402.05672", {"year": "2024"}),
    ("[5] pgvector",          "url",      "https://github.com/pgvector/pgvector", {}),
    ("[6] M3-Embedding",      "doi",      "10.18653/v1/2024.findings-acl.137",
     {"page": "2318-2335", "year": 2024}),
    ("[7] HNSW",              "doi",      "10.1109/TPAMI.2018.2889473",
     {"volume": "42", "issue": "4", "page": "824-836", "year": 2020}),
    ("[8] MT-Bench",          "openalex",
     "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena", {"year": 2023}),
    ("[9] Lakens, TOST",      "doi",      "10.1177/1948550617697177",
     {"volume": "8", "issue": "4", "page": "355-362", "year": 2017}),
]


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode("utf-8", "replace"), r.status


def year_of(msg):
    for k in ("published-print", "published-online", "issued"):
        if msg.get(k):
            return msg[k]["date-parts"][0][0]
    return None


def check(name, kind, ident, want):
    try:
        if kind == "doi":
            m = json.loads(get(f"https://api.crossref.org/works/{urllib.parse.quote(ident)}")[0])["message"]
            got = {"volume": m.get("volume"), "issue": m.get("issue"),
                   "page": m.get("page"), "year": year_of(m)}
            title = (m.get("title") or [""])[0]
            n_auth = len(m.get("author", []))

        elif kind == "arxiv":
            x = get(f"http://export.arxiv.org/api/query?id_list={ident}")[0]
            title = " ".join(re.search(r"<entry>.*?<title>(.*?)</title>", x, re.S).group(1).split())
            n_auth = len(re.findall(r"<author>\s*<name>", x))
            got = {"year": re.search(r"<published>(\d{4})", x).group(1)}

        elif kind == "openalex":
            q = urllib.parse.quote(f'"{ident}"')
            res = json.loads(get(f"https://api.openalex.org/works?filter=title.search:{q}&per-page=3")[0])["results"]
            d = next((w for w in res if w["display_name"].lower() == ident.lower()), res[0])
            b = d.get("biblio", {})
            got = {"volume": b.get("volume"), "first_page": b.get("first_page"),
                   "last_page": b.get("last_page"), "year": d.get("publication_year")}
            title, n_auth = d["display_name"], len(d.get("authorships", []))

        else:  # url
            body, status = get(ident)
            t = re.search(r"<title>(.*?)</title>", body, re.S | re.I)
            title = " ".join(t.group(1).split()) if t else "(no title tag)"
            got, n_auth = {"status": status}, None
            if "title_has" in want:
                ok = want["title_has"].lower().replace("’", "'") in title.lower().replace("’", "'")
                print(f"{'✅' if ok else '❌'} {name}\n   HTTP {status} · {title[:80]}")
                return ok
            print(f"{'✅' if status == 200 else '❌'} {name}\n   HTTP {status} · {title[:80]}")
            return status == 200

    except Exception as e:
        print(f"❌ {name}\n   조회 실패: {e}")
        return False

    bad = {k: (want[k], got.get(k)) for k in want
           if str(got.get(k)).lower() != str(want[k]).lower()}
    print(f"{'✅' if not bad else '❌'} {name}")
    print(f"   {title[:76]}")
    print(f"   저자 {n_auth}명 · " + " · ".join(f"{k}={v}" for k, v in got.items() if v is not None))
    if bad:
        for k, (w, g) in bad.items():
            print(f"   ⚠️ {k}: 원고 '{w}' ≠ 등록기관 '{g}'")
    return not bad


if __name__ == "__main__":
    print("참고문헌 대조 — 등록기관 1차 출처\n" + "=" * 70)
    results = [check(*r) for r in REFS]
    print("=" * 70)
    print(f"{sum(results)}/{len(results)} 건 일치")
    sys.exit(0 if all(results) else 1)
