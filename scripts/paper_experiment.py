"""논문 실험: pgvector(BGE-M3) vs Oracle 26ai(BGE-M3 정확검색) vs Oracle 26ai(in-DB e5) 3조건 비교.

조건 정의
  A — pgvector + BGE-M3      : LM Studio 로 질의 임베딩(1024d) → Supabase RPC match_chunks.
  B — Oracle 26ai + BGE-M3   : 같은 1024d 질의벡터 → Oracle VECTOR_DISTANCE 정확검색(embedding_bge).
  C — Oracle 26ai + in-DB e5 : Oracle 안에서 VECTOR_EMBEDDING(DILAB_E5 ...)로 임베딩+검색을 단일 SQL로.

지표
  스토어 동등성(A vs B)  : Top-10 Jaccard · Spearman(공통 id만) · A의 B-기준 Recall@10.
  임베딩 효과(B vs C)    : Top-10 Jaccard.
  지연                   : 조건별 (임베딩시간, 검색시간) 분해, 43질의 warm-up 1회 + 측정 1회, p50/p95.
  LLM-judge 관련성       : 조건별 Top-5 청크를 v4-pro 로 0/1/2 채점(질의당 1회 호출, 3조건×43=129).

전제
  .env: ORACLE_*, SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY, DEEPSEEK_*, LLM_MODEL(=deepseek-v4-pro).
  LM Studio: http://localhost:1234 에 bge-m3 임베딩 모델 로드(꺼져 있으면 A/B 는 스킵, C만 dry-run).
  Oracle chunks: embedding(384d, in-DB e5, 조건C) · embedding_bge(1024d, BGE-M3, 조건B — load_bge_column.py 로 적재됨).

Supabase 는 읽기 전용(RPC/SELECT 만). Oracle 은 조회만(컬럼·인덱스 변경 없음).

실행:
    source .venv/bin/activate
    python scripts/paper_experiment.py            # dry-run: 연결·전제 확인만
    python scripts/paper_experiment.py --run       # 실측 전체 실행
"""
from __future__ import annotations

import argparse
import array
import csv
import json
import os
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import httpx
import numpy as np
import oracledb
from dotenv import load_dotenv
from supabase import create_client

REPO = "/Users/junha/Desktop/DILAB 복사본"
load_dotenv(os.path.join(REPO, ".env"))
oracledb.defaults.fetch_lobs = False  # CLOB → str 로 바로 받기 (text 컬럼)

QUERYSET_PATH = os.path.join(REPO, "docs/research/paper-results/queryset.json")
OUT_DIR = os.path.join(REPO, "docs/research/paper-results")
RAW_OUT = os.path.join(OUT_DIR, "results_raw.json")
CSV_OUT = os.path.join(OUT_DIR, "results_summary.csv")

DOMAIN_SLUG = "cosmetics"
K = 10
JUDGE_TOP = 5
LM_STUDIO_BASE = "http://localhost:1234/v1"
CHUNK_TEXT_CAP = 400  # judge 프롬프트용 청크 텍스트 상한(토큰 절약, 판단 근거로는 충분)


def _env(k: str) -> str:
    v = os.environ.get(k, "").strip()
    if not v:
        sys.exit(f"[.env 누락] {k}")
    return v


def oracle_connect() -> oracledb.Connection:
    return oracledb.connect(
        user=_env("ORACLE_USER"),
        password=_env("ORACLE_PASSWORD"),
        dsn=_env("ORACLE_DSN"),
        config_dir=_env("ORACLE_WALLET_DIR"),
        wallet_location=_env("ORACLE_WALLET_DIR"),
        wallet_password=_env("ORACLE_WALLET_PASSWORD"),
    )


def supabase_connect():
    return create_client(_env("SUPABASE_URL"), _env("SUPABASE_SERVICE_ROLE_KEY"))


# ───────────────────────── LM Studio (조건 A/B 질의 임베딩) ─────────────────────────

def lmstudio_bge_model() -> str | None:
    """bge-m3 가 모델 id 에 포함된 로드 모델을 찾는다. 서버가 꺼져 있으면 None."""
    try:
        r = httpx.get(f"{LM_STUDIO_BASE}/models", timeout=5)
        r.raise_for_status()
    except Exception:
        return None
    for m in r.json().get("data", []):
        if "bge-m3" in m.get("id", "").lower():
            return m["id"]
    return None


def embed_query(text: str, model_id: str) -> tuple[list[float], float]:
    """LM Studio /v1/embeddings 호출. 반환: (벡터, 왕복 ms)."""
    t0 = time.perf_counter()
    r = httpx.post(
        f"{LM_STUDIO_BASE}/embeddings", json={"model": model_id, "input": text}, timeout=30
    )
    r.raise_for_status()
    vec = r.json()["data"][0]["embedding"]
    return vec, (time.perf_counter() - t0) * 1000


# ───────────────────────── 조건별 검색 ─────────────────────────

def search_a(sb, domain_id: str, qvec: list[float]) -> tuple[list[str], dict[str, str], float]:
    """A: pgvector match_chunks RPC. 반환: (top10 id, id→text, 검색 ms)."""
    t0 = time.perf_counter()
    rows = sb.rpc(
        "match_chunks",
        {
            "query_embedding": qvec,
            "match_domain_id": domain_id,
            "match_product_id": None,
            "match_source_type": None,
            "match_count": K,
            "prefer_expert": False,
        },
    ).execute().data
    ms = (time.perf_counter() - t0) * 1000
    ids = [r["chunk_id"] for r in rows]
    texts = {r["chunk_id"]: (r.get("text") or "") for r in rows}
    return ids, texts, ms


def search_b(
    cur: oracledb.Cursor, domain_id: str, qvec: list[float]
) -> tuple[list[str], dict[str, str], float]:
    """B: Oracle embedding_bge(1024d) 정확검색. 반환: (top10 id, id→text, 검색 ms)."""
    q = array.array("f", qvec)
    t0 = time.perf_counter()
    rows = cur.execute(
        """SELECT id, text FROM chunks
           WHERE domain_id = :d AND embedding_bge IS NOT NULL
           ORDER BY VECTOR_DISTANCE(embedding_bge, :q, COSINE)
           FETCH FIRST :k ROWS ONLY""",
        d=domain_id, q=q, k=K,
    ).fetchall()
    ms = (time.perf_counter() - t0) * 1000
    ids = [r[0] for r in rows]
    texts = {r[0]: (r[1] or "") for r in rows}
    return ids, texts, ms


def search_c(
    cur: oracledb.Cursor, domain_id: str, query_text: str
) -> tuple[list[str], dict[str, str], float]:
    """C: Oracle in-DB e5 임베딩+검색 단일 SQL. 반환: (top10 id, id→text, 전체 ms(임베딩+검색))."""
    t0 = time.perf_counter()
    rows = cur.execute(
        """WITH q AS (
               SELECT VECTOR_EMBEDDING(DILAB_E5 USING 'query: ' || :t AS data) v FROM dual
           )
           SELECT c.id, c.text FROM chunks c, q
           WHERE c.domain_id = :d AND c.embedding IS NOT NULL
           ORDER BY VECTOR_DISTANCE(c.embedding, q.v, COSINE)
           FETCH FIRST :k ROWS ONLY""",
        t=query_text, d=domain_id, k=K,
    ).fetchall()
    ms = (time.perf_counter() - t0) * 1000
    ids = [r[0] for r in rows]
    texts = {r[0]: (r[1] or "") for r in rows}
    return ids, texts, ms


# ───────────────────────── 지표 ─────────────────────────

def jaccard(ids_a: list[str], ids_b: list[str]) -> float:
    sa, sb = set(ids_a), set(ids_b)
    if not sa and not sb:
        return 1.0
    return len(sa & sb) / len(sa | sb)


def spearman_common(ids_a: list[str], ids_b: list[str]) -> float | None:
    """공통 id 만 대상으로 순위 상관(= 순위값의 Pearson, scipy 없이 수동 구현)."""
    rank_a = {v: i for i, v in enumerate(ids_a)}
    rank_b = {v: i for i, v in enumerate(ids_b)}
    common = [v for v in ids_a if v in rank_b]
    n = len(common)
    if n < 2:
        return None
    ra = np.array([rank_a[v] for v in common], dtype=float)
    rb = np.array([rank_b[v] for v in common], dtype=float)
    if np.std(ra) == 0 or np.std(rb) == 0:
        return None
    return float(np.corrcoef(ra, rb)[0, 1])


def recall_at_k(ids_pred: list[str], ids_truth: list[str], k: int = K) -> float:
    return len(set(ids_pred) & set(ids_truth)) / k


def mean_sd(xs: list[float]) -> tuple[float | None, float | None]:
    xs = [x for x in xs if x is not None]
    if not xs:
        return None, None
    if len(xs) == 1:
        return xs[0], 0.0
    return statistics.fmean(xs), statistics.stdev(xs)


def pct(xs: list[float], p: float) -> float | None:
    xs = [x for x in xs if x is not None]
    if not xs:
        return None
    return float(np.percentile(np.array(xs), p))


# ───────────────────────── LLM-judge (v4-pro) ─────────────────────────

JUDGE_SYSTEM = "당신은 검색 품질 평가자. JSON만 출력"


def judge_relevance(query: str, chunk_texts: list[str]) -> list[int] | None:
    """질의-청크 5개 관련성 0(무관)/1(부분)/2(직접) 채점. 실패 시 None."""
    numbered = "\n".join(
        f"{i + 1}. {t[:CHUNK_TEXT_CAP]}" for i, t in enumerate(chunk_texts)
    )
    user = (
        f"질의: {query}\n\n청크:\n{numbered}\n\n"
        f'각 청크가 질의에 얼마나 관련 있는지 0(무관)/1(부분)/2(직접)로 채점해라. '
        f'JSON 형식으로만 답하라: {{"scores": [청크{len(chunk_texts)}개 정수]}}'
    )
    try:
        r = httpx.post(
            f"{_env('DEEPSEEK_BASE_URL')}/v1/chat/completions",
            headers={"Authorization": f"Bearer {_env('DEEPSEEK_API_KEY')}"},
            json={
                "model": os.environ.get("LLM_MODEL", "deepseek-v4-pro"),
                "messages": [
                    {"role": "system", "content": JUDGE_SYSTEM},
                    {"role": "user", "content": user},
                ],
                "temperature": 0,
                "max_tokens": 2500,  # 추론모델 — 작으면 reasoning 만 채우고 content 가 빔
            },
            timeout=120,
        )
        r.raise_for_status()
        content = (r.json()["choices"][0]["message"].get("content") or "").strip()
        if not content:
            return None
        start, end = content.find("{"), content.rfind("}")
        if start < 0 or end <= start:
            return None
        obj = json.loads(content[start : end + 1])
        scores = obj.get("scores")
        if not isinstance(scores, list) or len(scores) != len(chunk_texts):
            return None
        return [int(max(0, min(2, round(float(s))))) for s in scores]
    except Exception:
        return None


# ───────────────────────── 메인 실험 루프 ─────────────────────────

def load_queryset() -> list[tuple[str, str]]:
    qs = json.load(open(QUERYSET_PATH, encoding="utf-8"))
    return [(q, "real") for q in qs["real"]] + [(q, "synthetic") for q in qs["synthetic"]]


def get_domain_id(cur: oracledb.Cursor) -> str:
    row = cur.execute("SELECT id FROM domains WHERE slug = :s", s=DOMAIN_SLUG).fetchone()
    if not row:
        sys.exit(f"[Oracle] domains.slug='{DOMAIN_SLUG}' 없음")
    return row[0]


def get_bge_corpus_ids(cur: oracledb.Cursor) -> set[str]:
    rows = cur.execute("SELECT id FROM chunks WHERE embedding_bge IS NOT NULL").fetchall()
    return {r[0] for r in rows}


def dry_run() -> None:
    print("=== dry-run: 연결·전제 확인 ===")
    ora = oracle_connect()
    cur = ora.cursor()
    domain_id = get_domain_id(cur)
    print(f"  ✅ Oracle 연결 OK — domain_id({DOMAIN_SLUG}) = {domain_id}")
    bge_corpus = get_bge_corpus_ids(cur)
    print(f"  ✅ Oracle chunks.embedding_bge NOT NULL = {len(bge_corpus)}행")

    sb = supabase_connect()
    cnt = sb.table("chunks").select("id", count="exact").limit(1).execute().count
    print(f"  ✅ Supabase 연결 OK — chunks ≈{cnt}행 (읽기 전용 확인)")

    lm_model = lmstudio_bge_model()
    if lm_model:
        print(f"  ✅ LM Studio bge-m3 모델 로드됨: {lm_model}")
    else:
        print("  ✗ LM Studio 미가동 또는 bge-m3 모델 미로드 — A/B 조건은 LM Studio 필요")

    # 조건 C 는 LM Studio 무관 — 샘플 질의 1건으로 SQL 파이프라인만 검증
    sample_q, _ = load_queryset()[0]
    try:
        ids, _texts, ms = search_c(cur, domain_id, sample_q)
        print(f"  ✅ 조건 C(in-DB e5) 파이프라인 OK — 질의 1건 top{len(ids)} ({ms:.0f}ms)")
    except Exception as e:
        print(f"  ✗ 조건 C 파이프라인 실패: {e}")

    ora.close()

    if lm_model:
        print("\n조건 A/B/C 모두 준비됨 — 실측하려면 --run")
    else:
        print("\nLM Studio 꺼져 있음: 조건 C만 검증 완료. A/B는 LM Studio 필요 — 실측 불가")


def full_run() -> None:
    ora = oracle_connect()
    cur = ora.cursor()
    domain_id = get_domain_id(cur)
    bge_corpus = get_bge_corpus_ids(cur)
    print(f"domain_id={domain_id} · embedding_bge 코퍼스={len(bge_corpus)}행")

    lm_model = lmstudio_bge_model()
    if not lm_model:
        ora.close()
        print("LM Studio 꺼져 있음(또는 bge-m3 미로드) — A/B 조건은 LM Studio 필요합니다.")
        print("조건 C만이라도 검증하려면 --run 없이 실행(dry-run)하세요.")
        return

    sb = supabase_connect()
    queries = load_queryset()
    print(f"질의 {len(queries)}건(real {sum(1 for _, t in queries if t=='real')} / "
          f"synthetic {sum(1 for _, t in queries if t=='synthetic')}) · lm_model={lm_model}")

    raw: list[dict] = []
    out_of_bge_corpus_count = 0

    for i, (q, qtype) in enumerate(queries, 1):
        print(f"[{i}/{len(queries)}] {q[:30]!r}", flush=True)

        # ---- 임베딩(BGE-M3, A/B 공용) — warm-up 1회 + 측정 1회 ----
        embed_query(q, lm_model)
        qvec, embed_ms = embed_query(q, lm_model)

        # ---- A: pgvector match_chunks ----
        search_a(sb, domain_id, qvec)
        a_ids, a_texts, a_ms = search_a(sb, domain_id, qvec)

        # ---- B: Oracle embedding_bge 정확검색 ----
        search_b(cur, domain_id, qvec)
        b_ids, b_texts, b_ms = search_b(cur, domain_id, qvec)

        # ---- C: Oracle in-DB e5 (임베딩+검색 단일 SQL) ----
        search_c(cur, domain_id, q)
        c_ids, c_texts, c_ms = search_c(cur, domain_id, q)

        out_of_corpus = len([x for x in a_ids if x not in bge_corpus])
        out_of_bge_corpus_count += out_of_corpus

        raw.append({
            "query": q, "type": qtype,
            "A": {"top10": a_ids, "embed_ms": embed_ms, "search_ms": a_ms,
                  "total_ms": embed_ms + a_ms, "texts": [a_texts[i] for i in a_ids]},
            "B": {"top10": b_ids, "embed_ms": embed_ms, "search_ms": b_ms,
                  "total_ms": embed_ms + b_ms, "texts": [b_texts[i] for i in b_ids]},
            "C": {"top10": c_ids, "embed_ms": None, "search_ms": c_ms,
                  "total_ms": c_ms, "texts": [c_texts[i] for i in c_ids]},
            "a_ids_out_of_bge_corpus": out_of_corpus,
            "jaccard_AB": jaccard(a_ids, b_ids),
            "spearman_AB": spearman_common(a_ids, b_ids),
            "recall_A_vs_B": recall_at_k(a_ids, b_ids),
            "jaccard_BC": jaccard(b_ids, c_ids),
        })

    ora.close()
    print(f"\nA top10 중 B 코퍼스(embedding_bge NOT NULL) 밖 id 총 {out_of_bge_corpus_count}건"
          f" (질의당 평균 {out_of_bge_corpus_count/len(queries):.2f})")

    # ---- LLM-judge (v4-pro, ThreadPool 4병렬) ----
    print(f"\nLLM-judge 채점 중 (조건 3 × 질의 {len(queries)} = {3*len(queries)}콜, 4병렬)…")
    judge_jobs = []
    for qi, r in enumerate(raw):
        for cond in ("A", "B", "C"):
            texts5 = r[cond]["texts"][:JUDGE_TOP]
            judge_jobs.append((qi, cond, r["query"], texts5))

    judge_results: dict[tuple[int, str], list[int] | None] = {}
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {
            ex.submit(judge_relevance, q, texts5): (qi, cond)
            for qi, cond, q, texts5 in judge_jobs
        }
        done = 0
        for fut in as_completed(futs):
            qi, cond = futs[fut]
            judge_results[(qi, cond)] = fut.result()
            done += 1
            if done % 20 == 0:
                print(f"  judge {done}/{len(judge_jobs)}", flush=True)

    for qi, r in enumerate(raw):
        for cond in ("A", "B", "C"):
            r[cond]["judge_scores"] = judge_results.get((qi, cond))

    os.makedirs(OUT_DIR, exist_ok=True)
    json.dump(raw, open(RAW_OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\n✅ 원자료 저장: {RAW_OUT}")

    write_summary(raw, queries)


def write_summary(raw: list[dict], queries: list[tuple[str, str]]) -> None:
    rows: list[dict] = []

    def add(metric: str, condition: str, xs: list[float], is_pct: bool = False):
        m, sd = mean_sd(xs)
        p50 = pct(xs, 50) if is_pct else None
        p95 = pct(xs, 95) if is_pct else None
        n = len([x for x in xs if x is not None])
        rows.append({
            "metric": metric, "condition": condition,
            "mean": m, "sd": sd, "p50": p50, "p95": p95, "n": n,
        })

    add("jaccard_top10", "A_vs_B", [r["jaccard_AB"] for r in raw])
    add("spearman", "A_vs_B", [r["spearman_AB"] for r in raw])
    add("recall_at_10_A_vs_B", "A_vs_B", [r["recall_A_vs_B"] for r in raw])
    add("jaccard_top10", "B_vs_C", [r["jaccard_BC"] for r in raw])

    for cond in ("A", "B", "C"):
        add(f"latency_embed_ms", cond, [r[cond]["embed_ms"] for r in raw])
        add(f"latency_search_ms", cond, [r[cond]["search_ms"] for r in raw])
        add(f"latency_total_ms", cond, [r[cond]["total_ms"] for r in raw], is_pct=True)

    for cond in ("A", "B", "C"):
        scores_flat = []
        n_fail = 0
        for r in raw:
            s = r[cond]["judge_scores"]
            if s is None:
                n_fail += 1
            else:
                scores_flat.extend(s)
        m, sd = mean_sd(scores_flat)
        rows.append({
            "metric": "llm_judge_relevance", "condition": cond,
            "mean": m, "sd": sd, "p50": None, "p95": None,
            "n": len(scores_flat), "n_query_failed": n_fail,
        })

    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f, fieldnames=["metric", "condition", "mean", "sd", "p50", "p95", "n", "n_query_failed"]
        )
        w.writeheader()
        for row in rows:
            row.setdefault("n_query_failed", "")
            w.writerow(row)
    print(f"✅ 요약 저장: {CSV_OUT}")

    print("\n" + "=" * 78)
    print(f"{'metric':<24}{'cond':<8}{'mean':>10}{'sd':>10}{'p50':>10}{'p95':>10}{'n':>6}")
    print("-" * 78)
    for row in rows:
        def f4(x):
            return f"{x:.4f}" if isinstance(x, float) else ("" if x is None else str(x))
        print(
            f"{row['metric']:<24}{row['condition']:<8}{f4(row['mean']):>10}"
            f"{f4(row['sd']):>10}{f4(row['p50']):>10}{f4(row['p95']):>10}{row['n']:>6}"
        )
    print("=" * 78)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", action="store_true", help="실측 전체 실행 (기본은 dry-run)")
    args = ap.parse_args()
    if args.run:
        full_run()
    else:
        dry_run()


if __name__ == "__main__":
    main()
