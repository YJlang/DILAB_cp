"""논문 추론통계: A(pgvector+BGE-M3) vs B(Oracle+BGE-M3) vs C(Oracle+in-DB e5) 귀속(attribution) 분석.

논지 구조
  A→B : 스토어 교체(pgvector→Oracle, 같은 1024d BGE-M3 벡터)만의 효과 — "무효과(null)"라고 주장.
  B→C : 임베딩을 DB 안으로 옮긴 효과(1024d BGE-M3 외부 → 384d e5 in-DB) — "큰 효과"라고 주장.
  각 주장을 뒷받침/반박할 수 있는 통계(paired t-test, Wilcoxon, bootstrap CI, Cohen's d_z, TOST 동등성)를 계산한다.

방법론 메모
  - 조건별 평균 CI(섹션 1 상단)는 해석이 단순한 표준 t-분포 CI(analytic)를 쓴다.
  - paired 평균차 CI(섹션 1 paired, 섹션 3 랭킹지표)는 지시대로 bootstrap(10000회, seed=42)을 쓴다.
  - per-judgment 수준(n=215)의 CI는 질의당 judge 점수 5개가 서로 독립이 아님(같은 질의 내 clustering)에도
    독립으로 취급한 근사치다 — 참고용으로만 보고하고, 논문의 주 근거는 per-query 수준(n=43, paired)로 삼는다.
  - TOST 동등성 마진 ±0.15(0–2 척도)는 이론적으로 도출된 값이 아니라 저자가 선택한 임계값이다.

실행:
    .venv/bin/python scripts/paper_stats.py
"""
from __future__ import annotations

import json
import statistics
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
from scipy import stats

REPO = Path(__file__).resolve().parent.parent
RAW_PATH = REPO / "docs/research/paper-results/results_raw.json"
OUT_MD = REPO / "docs/research/paper-results/stats.md"

SEED = 42
N_BOOT = 10000
TOST_MARGIN = 0.15  # 저자가 선택한 임계값(0–2 척도) — 이론적으로 도출된 값이 아님
CONDITIONS = ("A", "B", "C")
RNG = np.random.default_rng(SEED)


# ───────────────────────── 데이터 로딩 ─────────────────────────

def load_data() -> list[dict]:
    return json.loads(RAW_PATH.read_text(encoding="utf-8"))


def judge_scores_flat(records: list[dict], cond: str) -> np.ndarray:
    """per-judgment 수준(n = len(records) * 5)."""
    out: list[int] = []
    for r in records:
        out.extend(r[cond]["judge_scores"])
    return np.array(out, dtype=float)


def judge_means_per_query(records: list[dict], cond: str) -> np.ndarray:
    """per-query 수준(n = len(records)) — 질의당 judge 점수 5개의 평균."""
    return np.array([statistics.fmean(r[cond]["judge_scores"]) for r in records])


def total_ms(records: list[dict], cond: str) -> np.ndarray:
    """C.embed_ms 는 null(SQL 한 문장 안에서 임베딩)이라 C.total_ms 는 이미 search_ms 와 같다."""
    return np.array([r[cond]["total_ms"] for r in records], dtype=float)


# ───────────────────────── 통계 유틸 ─────────────────────────

def mean_sd_ci(xs: np.ndarray) -> tuple[float, float, float, float]:
    n = len(xs)
    m = float(np.mean(xs))
    sd = float(np.std(xs, ddof=1))
    se = sd / np.sqrt(n)
    tcrit = stats.t.ppf(0.975, df=n - 1)
    return m, sd, m - tcrit * se, m + tcrit * se


def bootstrap_ci(
    xs: np.ndarray, func: Callable[[np.ndarray], float] = np.mean,
    n_boot: int = N_BOOT, rng: np.random.Generator | None = None,
) -> tuple[float, float]:
    rng = rng if rng is not None else np.random.default_rng(SEED)
    n = len(xs)
    idx = rng.integers(0, n, size=(n_boot, n))
    boots = func(xs[idx], axis=1)
    return float(np.percentile(boots, 2.5)), float(np.percentile(boots, 97.5))


@dataclass
class PairedResult:
    n: int
    mean_diff: float
    sd_diff: float
    ci_low: float
    ci_high: float
    t_stat: float
    t_p: float
    wilcoxon_stat: float
    wilcoxon_p: float
    wilcoxon_n: int  # zero_method='wilcox' 는 diff==0 인 쌍을 제외하므로 실제 사용 n 이 다를 수 있음
    cohens_dz: float


def paired_compare(a: np.ndarray, b: np.ndarray) -> PairedResult:
    diff = a - b
    n = len(diff)
    mean_diff = float(np.mean(diff))
    sd_diff = float(np.std(diff, ddof=1))
    ci_low, ci_high = bootstrap_ci(diff, rng=np.random.default_rng(SEED))
    t_stat, t_p = stats.ttest_rel(a, b)
    n_nonzero = int(np.count_nonzero(diff))
    if n_nonzero >= 1:
        w_stat, w_p = stats.wilcoxon(a, b)
    else:
        w_stat, w_p = float("nan"), float("nan")
    cohens_dz = mean_diff / sd_diff if sd_diff > 0 else float("nan")
    return PairedResult(
        n=n, mean_diff=mean_diff, sd_diff=sd_diff, ci_low=ci_low, ci_high=ci_high,
        t_stat=float(t_stat), t_p=float(t_p),
        wilcoxon_stat=float(w_stat), wilcoxon_p=float(w_p), wilcoxon_n=n_nonzero,
        cohens_dz=cohens_dz,
    )


@dataclass
class TostResult:
    margin: float
    p_lower: float
    p_upper: float
    p_tost: float
    equivalent: bool


def tost_equivalence(diff: np.ndarray, margin: float) -> TostResult:
    """paired TOST: 두 개의 단측 t검정 중 더 보수적인(큰) p값을 채택. p_tost<0.05 면 동등성 성립."""
    n = len(diff)
    mean_diff = float(np.mean(diff))
    se = float(np.std(diff, ddof=1) / np.sqrt(n))
    df = n - 1
    t_lower = (mean_diff - (-margin)) / se  # H0: true diff <= -margin
    p_lower = 1 - stats.t.cdf(t_lower, df)
    t_upper = (mean_diff - margin) / se  # H0: true diff >= margin
    p_upper = stats.t.cdf(t_upper, df)
    p_tost = max(p_lower, p_upper)
    return TostResult(margin, p_lower, p_upper, p_tost, p_tost < 0.05)


def fmt_p(p: float) -> str:
    if np.isnan(p):
        return "n/a"
    return "p < 0.001" if p < 0.001 else f"p = {p:.3f}"


# ───────────────────────── 섹션별 계산 ─────────────────────────

def section_relevance(records: list[dict]) -> dict:
    out: dict = {"per_judgment": {}, "per_query": {}, "paired": {}, "tost": {}}
    for cond in CONDITIONS:
        flat = judge_scores_flat(records, cond)
        m, sd, lo, hi = mean_sd_ci(flat)
        out["per_judgment"][cond] = {"n": len(flat), "mean": m, "sd": sd, "ci": (lo, hi)}

        pq = judge_means_per_query(records, cond)
        m, sd, lo, hi = mean_sd_ci(pq)
        out["per_query"][cond] = {"n": len(pq), "mean": m, "sd": sd, "ci": (lo, hi)}

    a_pq = judge_means_per_query(records, "A")
    b_pq = judge_means_per_query(records, "B")
    c_pq = judge_means_per_query(records, "C")

    out["paired"]["A_vs_B"] = paired_compare(a_pq, b_pq)
    out["paired"]["B_vs_C"] = paired_compare(b_pq, c_pq)

    out["tost"]["A_vs_B"] = tost_equivalence(a_pq - b_pq, TOST_MARGIN)
    return out


def section_latency(records: list[dict]) -> dict:
    out: dict = {"desc": {}, "paired": {}}
    for cond in CONDITIONS:
        xs = total_ms(records, cond)
        out["desc"][cond] = {
            "n": len(xs), "mean": float(np.mean(xs)), "sd": float(np.std(xs, ddof=1)),
            "p50": float(np.percentile(xs, 50)), "p95": float(np.percentile(xs, 95)),
        }
    a_ms, b_ms, c_ms = total_ms(records, "A"), total_ms(records, "B"), total_ms(records, "C")

    for label, x, y in (("A_vs_B", a_ms, b_ms), ("B_vs_C", b_ms, c_ms)):
        diff = x - y
        try:
            w_stat, w_p = stats.wilcoxon(x, y)
        except ValueError:
            w_stat, w_p = float("nan"), float("nan")
        out["paired"][label] = {
            "median_diff": float(np.median(diff)),
            "wilcoxon_stat": float(w_stat), "wilcoxon_p": float(w_p),
        }
    ratio_cb = c_ms / b_ms
    out["ratio_C_over_B"] = {
        "median_of_ratio": float(np.median(ratio_cb)),
        "ratio_of_medians": float(np.median(c_ms) / np.median(b_ms)),
    }
    return out


def section_ranking(records: list[dict]) -> dict:
    metrics = {
        "jaccard_AB": np.array([r["jaccard_AB"] for r in records], dtype=float),
        "spearman_AB": np.array([r["spearman_AB"] for r in records], dtype=float),
        "recall_A_vs_B": np.array([r["recall_A_vs_B"] for r in records], dtype=float),
        "jaccard_BC": np.array([r["jaccard_BC"] for r in records], dtype=float),
    }
    out: dict = {}
    for name, xs in metrics.items():
        m, sd = float(np.mean(xs)), float(np.std(xs, ddof=1))
        lo, hi = bootstrap_ci(xs, rng=np.random.default_rng(SEED))
        out[name] = {"n": len(xs), "mean": m, "sd": sd, "ci": (lo, hi)}
    jab = metrics["jaccard_AB"]
    out["jaccard_AB_perfect_count"] = int(np.sum(jab == 1.0))
    out["jaccard_AB_min"] = float(np.min(jab))
    return out


def section_real_vs_synth(records: list[dict]) -> dict:
    real = [r for r in records if r["type"] == "real"]
    synth = [r for r in records if r["type"] == "synthetic"]
    out: dict = {"n_real": len(real), "n_synthetic": len(synth), "relevance": {}, "ranking": {}, "mw": {}}

    for cond in CONDITIONS:
        r_pq, s_pq = judge_means_per_query(real, cond), judge_means_per_query(synth, cond)
        out["relevance"][cond] = {
            "real": {"n": len(r_pq), "mean": float(np.mean(r_pq)), "sd": float(np.std(r_pq, ddof=1))},
            "synthetic": {"n": len(s_pq), "mean": float(np.mean(s_pq)), "sd": float(np.std(s_pq, ddof=1))},
        }
        try:
            u_stat, u_p = stats.mannwhitneyu(r_pq, s_pq, alternative="two-sided")
        except ValueError:
            u_stat, u_p = float("nan"), float("nan")
        out["mw"][f"relevance_{cond}"] = {"u": float(u_stat), "p": float(u_p)}

    for metric in ("jaccard_AB", "jaccard_BC"):
        r_xs = np.array([r[metric] for r in real], dtype=float)
        s_xs = np.array([r[metric] for r in synth], dtype=float)
        out["ranking"][metric] = {
            "real": {"n": len(r_xs), "mean": float(np.mean(r_xs)), "sd": float(np.std(r_xs, ddof=1))},
            "synthetic": {"n": len(s_xs), "mean": float(np.mean(s_xs)), "sd": float(np.std(s_xs, ddof=1))},
        }
        try:
            u_stat, u_p = stats.mannwhitneyu(r_xs, s_xs, alternative="two-sided")
        except ValueError:
            u_stat, u_p = float("nan"), float("nan")
        out["mw"][metric] = {"u": float(u_stat), "p": float(u_p)}
    return out


def section_sanity(records: list[dict]) -> dict:
    n = len(records)
    missing = {}
    for cond in CONDITIONS:
        bad = [i for i, r in enumerate(records) if not r[cond].get("judge_scores") or len(r[cond]["judge_scores"]) != 5]
        missing[cond] = bad

    a_embed = np.array([r["A"]["embed_ms"] for r in records])
    b_embed = np.array([r["B"]["embed_ms"] for r in records])
    embed_identical = bool(np.all(a_embed == b_embed))

    c_embed_all_null = all(r["C"]["embed_ms"] is None for r in records)
    c_total_eq_search = all(r["C"]["total_ms"] == r["C"]["search_ms"] for r in records)

    return {
        "n_records": n,
        "n_per_judgment": n * 5,
        "missing_judge_scores": missing,
        "embed_ms_A_eq_B_all": embed_identical,
        "embed_ms_max_abs_diff": float(np.max(np.abs(a_embed - b_embed))),
        "c_embed_ms_all_null": c_embed_all_null,
        "c_total_eq_search_all": c_total_eq_search,
    }


# ───────────────────────── 리포트 작성 ─────────────────────────

def fmt_ci(lo: float, hi: float, nd: int = 3) -> str:
    return f"[{lo:.{nd}f}, {hi:.{nd}f}]"


def build_markdown(records: list[dict], rel: dict, lat: dict, rank: dict, split: dict, sanity: dict) -> str:
    lines: list[str] = []
    ap = lines.append

    ap("# 논문 추론통계 리포트\n")
    ap(f"- 원자료: `docs/research/paper-results/results_raw.json` (n = {sanity['n_records']}건 질의)")
    ap("- A = pgvector + 외부 BGE-M3(1024d, HNSW 근사검색) · B = Oracle 26ai + 동일 BGE-M3 벡터(정확검색) "
       "· C = Oracle 26ai + in-DB ONNX 임베딩(multilingual-e5-small, 384d, 정확검색)")
    ap(f"- bootstrap: {N_BOOT}회 resample, seed={SEED} · TOST 동등성 마진: ±{TOST_MARGIN}(0–2 척도, 저자가 선택한 임계값)\n")

    # ── 1. 관련성 ──
    ap("## 1. 관련성(judge_scores), 질의쌍 대응(paired)\n")
    ap("### 1.1 조건별 기술통계\n")
    ap("| 조건 | 수준 | n | mean | sd | 95% CI |")
    ap("|---|---|---:|---:|---:|---|")
    for cond in CONDITIONS:
        pj = rel["per_judgment"][cond]
        ap(f"| {cond} | per-judgment | {pj['n']} | {pj['mean']:.3f} | {pj['sd']:.3f} | {fmt_ci(*pj['ci'])} |")
    for cond in CONDITIONS:
        pq = rel["per_query"][cond]
        ap(f"| {cond} | per-query mean | {pq['n']} | {pq['mean']:.3f} | {pq['sd']:.3f} | {fmt_ci(*pq['ci'])} |")
    ap("\nper-judgment(n=215)은 질의당 5개 판정을 독립으로 취급한 근사치이며(같은 질의 내부 판정은 서로 독립이 아님), "
       "per-query mean(n=43)이 이어지는 paired 검정의 단위이자 논문의 주 근거다.\n")

    ap("### 1.2 A vs B, B vs C — paired 검정 (n=43, per-query mean)\n")
    ap("| 비교 | mean diff | 95% CI(bootstrap) | Cohen's d_z | paired t | Wilcoxon W (n) |")
    ap("|---|---:|---|---:|---|---|")
    for label in ("A_vs_B", "B_vs_C"):
        p = rel["paired"][label]
        ap(f"| {label.replace('_', ' ')} | {p.mean_diff:.3f} | {fmt_ci(p.ci_low, p.ci_high)} | {p.cohens_dz:.3f} | "
           f"t({p.n - 1})={p.t_stat:.3f}, {fmt_p(p.t_p)} | W={p.wilcoxon_stat:.1f} ({fmt_p(p.wilcoxon_p)}, n={p.wilcoxon_n}) |")
    ap("\nA→B(스토어 교체)의 평균차·효과크기가 0에 가까우면 \"무효과\" 주장을 뒷받침하고, "
       "B→C(임베딩 in-DB 이전)의 평균차·효과크기가 크고 유의하면 \"큰 효과\" 주장을 뒷받침한다.\n")

    ap("### 1.3 A vs B 동등성(TOST, margin = ±0.15)\n")
    t = rel["tost"]["A_vs_B"]
    verdict = "동등성 성립" if t.equivalent else "동등성 미성립(불확정)"
    ap(f"- 하단(diff > -0.15) 검정: {fmt_p(t.p_lower)}")
    ap(f"- 상단(diff < +0.15) 검정: {fmt_p(t.p_upper)}")
    ap(f"- TOST p (두 값 중 큰 쪽) = {t.p_tost:.3f} → **{verdict}**")
    ap("- 마진 ±0.15는 이론적으로 도출된 값이 아니라 저자가 선택한 실용적 임계값이다. "
       "p>0.05(무차이) 하나만으로는 동등성을 입증하지 못하므로 이 TOST 결과를 근거로 삼는다.\n")

    # ── 2. 지연 ──
    ap("## 2. 지연(latency), 질의쌍 대응 — total_ms (C는 search_ms=total_ms)\n")
    ap("| 조건 | n | mean(ms) | sd(ms) | p50(ms) | p95(ms) |")
    ap("|---|---:|---:|---:|---:|---:|")
    for cond in CONDITIONS:
        d = lat["desc"][cond]
        ap(f"| {cond} | {d['n']} | {d['mean']:.1f} | {d['sd']:.1f} | {d['p50']:.1f} | {d['p95']:.1f} |")
    ap("")
    ap("| 비교 | median diff(ms) | Wilcoxon W | p |")
    ap("|---|---:|---:|---|")
    for label in ("A_vs_B", "B_vs_C"):
        p = lat["paired"][label]
        ap(f"| {label.replace('_', ' ')} | {p['median_diff']:.1f} | {p['wilcoxon_stat']:.1f} | {fmt_p(p['wilcoxon_p'])} |")
    r = lat["ratio_C_over_B"]
    ap(f"\nC/B 지연 비율 — 질의별 비율의 중앙값: {r['median_of_ratio']:.2f}배, 중앙값의 비율(median(C)/median(B)): "
       f"{r['ratio_of_medians']:.2f}배.\n")
    ap("B는 A보다 빠르거나 비슷한 수준인지, C(in-DB 임베딩)가 B보다 유의하게 느린지를 이 표로 판단한다.\n")

    # ── 3. 랭킹 일치도 ──
    ap("## 3. 랭킹 일치도 (n=43, 95% bootstrap CI)\n")
    ap("| 지표 | n | mean | sd | 95% CI |")
    ap("|---|---:|---:|---:|---|")
    for name in ("jaccard_AB", "spearman_AB", "recall_A_vs_B", "jaccard_BC"):
        m = rank[name]
        ap(f"| {name} | {m['n']} | {m['mean']:.3f} | {m['sd']:.3f} | {fmt_ci(*m['ci'])} |")
    ap(f"\njaccard_AB == 1.0(완전 일치)인 질의: {rank['jaccard_AB_perfect_count']}/43건. "
       f"jaccard_AB 최솟값: {rank['jaccard_AB_min']:.3f}.\n")
    ap("jaccard_AB·spearman_AB·recall_A_vs_B가 1에 가까울수록 A/B의 검색 결과가 사실상 동일함을 뜻하며, "
       "이는 스토어 교체가 무효과라는 주장과 정합적이다. jaccard_BC는 임베딩 모델이 다르므로 낮게 나오는 것이 기대된다.\n")

    # ── 4. real vs synthetic ──
    ap("## 4. real vs synthetic 강건성 점검\n")
    ap(f"- 질의 수: real = {split['n_real']}건, synthetic = {split['n_synthetic']}건\n")
    ap("### 4.1 관련성(judge_scores, per-query mean)\n")
    ap("| 조건 | real n | real mean±sd | synth n | synth mean±sd | Mann-Whitney U | p |")
    ap("|---|---:|---|---:|---|---:|---|")
    for cond in CONDITIONS:
        r_ = split["relevance"][cond]["real"]
        s_ = split["relevance"][cond]["synthetic"]
        mw = split["mw"][f"relevance_{cond}"]
        ap(f"| {cond} | {r_['n']} | {r_['mean']:.3f}±{r_['sd']:.3f} | {s_['n']} | {s_['mean']:.3f}±{s_['sd']:.3f} | "
           f"{mw['u']:.1f} | {fmt_p(mw['p'])} |")
    ap("\n### 4.2 랭킹 일치도\n")
    ap("| 지표 | real n | real mean±sd | synth n | synth mean±sd | Mann-Whitney U | p |")
    ap("|---|---:|---|---:|---|---:|---|")
    for metric in ("jaccard_AB", "jaccard_BC"):
        r_ = split["ranking"][metric]["real"]
        s_ = split["ranking"][metric]["synthetic"]
        mw = split["mw"][metric]
        ap(f"| {metric} | {r_['n']} | {r_['mean']:.3f}±{r_['sd']:.3f} | {s_['n']} | {s_['mean']:.3f}±{s_['sd']:.3f} | "
           f"{mw['u']:.1f} | {fmt_p(mw['p'])} |")
    any_sig = any(split["mw"][k]["p"] < 0.05 for k in split["mw"] if not np.isnan(split["mw"][k]["p"]))
    ap(f"\nMann-Whitney 검정에서 유의(p<0.05)한 항목이 {'있다' if any_sig else '없다'} → "
       f"synthetic 질의가 real 질의와 {'다르게' if any_sig else '유사하게'} 행동하는 것으로 보인다. "
       f"단 real n={split['n_real']}로 매우 작아 검정력이 낮으므로 유의하지 않다는 결과를 곧 '차이 없음'의 증거로 과신하지 말 것.\n")

    # ── 5. sanity checks ──
    ap("## 5. 데이터 정합성 점검(sanity checks)\n")
    ap(f"- 원자료 질의 수: {sanity['n_records']}건 (per-judgment n = {sanity['n_per_judgment']})")
    all_ok = all(len(v) == 0 for v in sanity["missing_judge_scores"].values())
    if all_ok:
        ap("- judge_scores 누락/길이 이상: 없음 — A/B/C 모두 43건 전부 5개씩 정상 채점됨.")
    else:
        for cond, bad in sanity["missing_judge_scores"].items():
            if bad:
                ap(f"- **경고**: 조건 {cond}의 judge_scores 누락/길이 이상 인덱스: {bad}")
    if sanity["embed_ms_A_eq_B_all"]:
        ap("- **A.embed_ms == B.embed_ms가 43건 전부 완전히 동일하다(최대 절대차 = 0.0ms).** "
           "즉 임베딩 시간은 조건별로 독립 측정된 것이 아니라 한 번만 측정해 A/B에 그대로 재사용한 값이다. "
           "따라서 latency 표의 A/B 간 total_ms 차이는 오직 search_ms(스토어 검색 시간) 차이만 반영하며, "
           "임베딩 단계의 조건별 변동성(네트워크·모델 서버 부하 등)은 이 데이터로 추정할 수 없다 — "
           "이 지점은 논문에서 latency decomposition을 논할 때 명시적으로 밝혀야 한다.")
    else:
        ap(f"- A.embed_ms와 B.embed_ms는 완전히 동일하지 않다(최대 절대차 = {sanity['embed_ms_max_abs_diff']:.4f}ms).")
    if sanity["c_embed_ms_all_null"]:
        ap("- C.embed_ms는 43건 전부 null이다(설계상 임베딩이 검색과 한 SQL 문 안에서 실행되어 분리 측정 불가).")
    if sanity["c_total_eq_search_all"]:
        ap("- C.total_ms == C.search_ms가 43건 전부 성립 — 지시대로 C의 전체 지연은 search_ms를 그대로 사용했다.")
    ap("")

    return "\n".join(lines) + "\n"


def print_stdout_report(rel: dict, lat: dict, rank: dict, split: dict, sanity: dict) -> None:
    print("=" * 78)
    print("1. RELEVANCE (judge_scores)")
    print("=" * 78)
    for cond in CONDITIONS:
        pj, pq = rel["per_judgment"][cond], rel["per_query"][cond]
        print(f"  {cond}: per-judgment(n={pj['n']}) mean={pj['mean']:.3f} sd={pj['sd']:.3f} "
              f"CI={fmt_ci(*pj['ci'])} | per-query(n={pq['n']}) mean={pq['mean']:.3f} sd={pq['sd']:.3f} "
              f"CI={fmt_ci(*pq['ci'])}")
    for label in ("A_vs_B", "B_vs_C"):
        p = rel["paired"][label]
        print(f"  {label}: mean_diff={p.mean_diff:.3f} CI={fmt_ci(p.ci_low, p.ci_high)} d_z={p.cohens_dz:.3f} "
              f"t={p.t_stat:.3f}({fmt_p(p.t_p)}) W={p.wilcoxon_stat:.1f}({fmt_p(p.wilcoxon_p)}, n={p.wilcoxon_n})")
    t = rel["tost"]["A_vs_B"]
    print(f"  TOST A_vs_B: p_lower={t.p_lower:.3f} p_upper={t.p_upper:.3f} p_tost={t.p_tost:.3f} "
          f"equivalent={t.equivalent}")

    print("\n" + "=" * 78)
    print("2. LATENCY (total_ms)")
    print("=" * 78)
    for cond in CONDITIONS:
        d = lat["desc"][cond]
        print(f"  {cond}: n={d['n']} mean={d['mean']:.1f} sd={d['sd']:.1f} p50={d['p50']:.1f} p95={d['p95']:.1f}")
    for label in ("A_vs_B", "B_vs_C"):
        p = lat["paired"][label]
        print(f"  {label}: median_diff={p['median_diff']:.1f}ms W={p['wilcoxon_stat']:.1f}({fmt_p(p['wilcoxon_p'])})")
    r = lat["ratio_C_over_B"]
    print(f"  ratio C/B: median_of_ratio={r['median_of_ratio']:.2f} ratio_of_medians={r['ratio_of_medians']:.2f}")

    print("\n" + "=" * 78)
    print("3. RANKING AGREEMENT")
    print("=" * 78)
    for name in ("jaccard_AB", "spearman_AB", "recall_A_vs_B", "jaccard_BC"):
        m = rank[name]
        print(f"  {name}: n={m['n']} mean={m['mean']:.3f} sd={m['sd']:.3f} CI={fmt_ci(*m['ci'])}")
    print(f"  jaccard_AB==1.0 count: {rank['jaccard_AB_perfect_count']}/43, min={rank['jaccard_AB_min']:.3f}")

    print("\n" + "=" * 78)
    print("4. REAL vs SYNTHETIC")
    print("=" * 78)
    print(f"  n_real={split['n_real']} n_synthetic={split['n_synthetic']}")
    for cond in CONDITIONS:
        r_, s_ = split["relevance"][cond]["real"], split["relevance"][cond]["synthetic"]
        mw = split["mw"][f"relevance_{cond}"]
        print(f"  relevance {cond}: real={r_['mean']:.3f}±{r_['sd']:.3f}(n={r_['n']}) "
              f"synth={s_['mean']:.3f}±{s_['sd']:.3f}(n={s_['n']}) MW p={fmt_p(mw['p'])}")
    for metric in ("jaccard_AB", "jaccard_BC"):
        r_, s_ = split["ranking"][metric]["real"], split["ranking"][metric]["synthetic"]
        mw = split["mw"][metric]
        print(f"  {metric}: real={r_['mean']:.3f}±{r_['sd']:.3f} synth={s_['mean']:.3f}±{s_['sd']:.3f} "
              f"MW p={fmt_p(mw['p'])}")

    print("\n" + "=" * 78)
    print("5. SANITY CHECKS")
    print("=" * 78)
    print(f"  n_records={sanity['n_records']} n_per_judgment={sanity['n_per_judgment']}")
    print(f"  missing judge_scores: {sanity['missing_judge_scores']}")
    print(f"  A.embed_ms == B.embed_ms for all records: {sanity['embed_ms_A_eq_B_all']} "
          f"(max abs diff = {sanity['embed_ms_max_abs_diff']:.6f}ms)")
    print(f"  C.embed_ms all null: {sanity['c_embed_ms_all_null']} | C.total_ms==C.search_ms all: "
          f"{sanity['c_total_eq_search_all']}")
    print("=" * 78)


def main() -> None:
    records = load_data()
    rel = section_relevance(records)
    lat = section_latency(records)
    rank = section_ranking(records)
    split = section_real_vs_synth(records)
    sanity = section_sanity(records)

    print_stdout_report(rel, lat, rank, split, sanity)

    md = build_markdown(records, rel, lat, rank, split, sanity)
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text(md, encoding="utf-8")
    print(f"\n✅ 리포트 저장: {OUT_MD}")


if __name__ == "__main__":
    main()
