"""로컬 엔드투엔드 RAG ask — Oracle 위에서 (Phase 3 데모).

흐름(answer.py 포팅): 질문 → LM Studio BGE-M3 임베딩 → Oracle 하이브리드 검색
(전문가 k + 일반 k 분리) → DeepSeek 답변(JSON) → 출처 인용.

- 임베딩: LM Studio 로컬(:1234, OpenAI 호환 /embeddings) — Modal/torch 불필요
- 검색: scripts/oracle_retrieve.oracle_match_chunks (match_chunks drop-in)
- LLM: DeepSeek (운영과 동일)

실행:
    source .venv/bin/activate
    python scripts/ask_oracle.py "이 수분크림 진정 효과 어때?"
"""
from __future__ import annotations

import json
import os
import sys
import time

import httpx
from dotenv import load_dotenv

load_dotenv("/Users/junha/Desktop/DILAB 복사본/.env")

from oracle_retrieve import connect, oracle_match_chunks  # noqa: E402

LM = os.environ["LMSTUDIO_BASE_URL"]
EMBED = os.environ.get("EMBED_MODEL", "bge-m3")
DS = os.environ["DEEPSEEK_BASE_URL"]
DSKEY = os.environ["DEEPSEEK_API_KEY"]
MODEL = os.environ.get("LLM_MODEL", "deepseek-chat")

SYSTEM_PROMPT = """\
당신은 화장품 도메인 RAG 어시스턴트 DILAB Ask 입니다.
사용자 질문과 함께 제공된 [출처] 청크만 사용해 *근거 있는* 답변을 생성하세요.

규칙:
- [출처] 에 없는 내용을 만들지 마세요. 모르는 부분은 "제공된 자료로는 단정하기 어려워요" 같이 정직하게.
- [Expert] 출처를 우선 활용, [User] 출처는 보조로 — 단 [User] 만 다루는 정보(예: 향, 사용감)는 그대로 활용해도 OK.
- 답변 본문 안에서 [1], [2] 같이 출처 번호를 인용.
- 친근한 톤 ("~해요", "~할 수 있어요").
- 한국어로만 답변.

반드시 다음 JSON 만 출력 (다른 텍스트·코드블록 X):
{"answer":"3~5문장 답변, 출처 [n] 인용 포함","recommendation":"한 줄 추천 — 어떤 사람에게 적합/비적합한지"}
"""


def _resolve_bge() -> str:
    """로드된 모델 중 BGE-M3 자동 선택 (없으면 안내 후 종료)."""
    models = _list_models()
    for m in models:
        if "bge-m3" in m.lower() or "bge_m3" in m.lower():
            return m
    # EMBED_MODEL 이 명시적으로 로드돼 있으면 그것 사용
    if EMBED in models:
        return EMBED
    sys.exit(
        "[BGE-M3 미로드] LM Studio 에 BGE-M3 임베딩 모델이 없습니다.\n"
        f"  로드된 모델: {models}\n"
        "  → LM Studio Discover 에서 'bge-m3' 검색·다운로드 후 로드하세요.\n"
        "  (nomic-embed 는 다른 모델·768차원이라 우리 1024d 벡터와 호환 안 됨)"
    )


def embed(text: str) -> list[float]:
    model = _resolve_bge()
    r = httpx.post(f"{LM}/embeddings", json={"model": model, "input": text}, timeout=120)
    r.raise_for_status()
    v = r.json()["data"][0]["embedding"]
    if len(v) != 1024:
        sys.exit(f"[차원 불일치] 임베딩 {len(v)}차원 (저장 벡터는 1024). BGE-M3 맞는지 확인.")
    return v


def _list_models() -> list[str]:
    try:
        return [m["id"] for m in httpx.get(f"{LM}/models", timeout=10).json().get("data", [])]
    except Exception:  # noqa: BLE001
        return ["(LM Studio 응답 없음)"]


def format_chunks(rows: list[dict]):
    parts, cites = [], []
    for i, r in enumerate(rows, 1):
        is_expert = r["source_type"] == "expert"
        tag = "Expert" if is_expert else "User"
        cred = r.get("author_credibility")
        cred_note = f", 신뢰도 {cred}/10" if cred else ""
        author = r.get("author") or "익명"
        parts.append(f"[{i}] [{tag}] {author}{cred_note}\n{r['text']}")
        cites.append({"rank": i, "tag": tag, "author": author,
                      "sim": round(float(r["similarity"]), 3), "chunk_id": r["chunk_id"]})
    return "\n\n".join(parts), cites


def chat(messages: list[dict]) -> str:
    r = httpx.post(
        f"{DS}/chat/completions",
        headers={"Authorization": f"Bearer {DSKEY}"},
        json={"model": MODEL, "messages": messages, "temperature": 0.2, "max_tokens": 800},
        timeout=180,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def parse_json_answer(raw: str):
    t = raw.strip()
    if t.startswith("```"):
        t = t.split("```", 2)[1]
        if t.startswith("json"):
            t = t[4:].lstrip()
        t = t.rsplit("```", 1)[0].strip()
    s, e = t.find("{"), t.rfind("}")
    if s >= 0 and e > s:
        try:
            o = json.loads(t[s:e + 1])
            return str(o.get("answer", raw)), str(o.get("recommendation", ""))
        except json.JSONDecodeError:
            pass
    return raw, ""


def main() -> None:
    query = sys.argv[1] if len(sys.argv) > 1 else "이 수분크림 진정·보습 효과가 어떤가요?"
    conn = connect()
    (domain,) = conn.cursor().execute("SELECT DISTINCT domain_id FROM chunks FETCH FIRST 1 ROWS ONLY").fetchone()

    print(f"❓ 질문: {query}\n① LM Studio 임베딩(BGE-M3)…")
    qv = embed(query)
    print("② Oracle 하이브리드 검색 (전문가3 + 일반5)…")
    rows = (oracle_match_chunks(conn, qv, domain, source_type="expert", k=3)
            + oracle_match_chunks(conn, qv, domain, source_type="public_review", k=5))
    conn.close()
    block, cites = format_chunks(rows)

    print("③ DeepSeek 답변 생성…")
    t0 = time.perf_counter()
    raw = chat([{"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"[질문]\n{query}\n\n[출처]\n{block}"}])
    ms = int((time.perf_counter() - t0) * 1000)
    ans, rec = parse_json_answer(raw)

    print("\n" + "=" * 60)
    print(f"💬 답변: {ans}")
    print(f"👉 추천: {rec}")
    print(f"\n📚 출처 {len(cites)}개 (Oracle 벡터검색):")
    for c in cites:
        print(f"  [{c['rank']}] {c['tag']} · {c['author']} · sim={c['sim']}")
    print(f"\n⏱ LLM {ms}ms · 전문가 {sum(1 for c in cites if c['tag']=='Expert')} / 일반 {sum(1 for c in cites if c['tag']=='User')}")


if __name__ == "__main__":
    main()
