# In-Database Embedding for Korean Review RAG: An Empirical Comparison of pgvector and Oracle 26ai Vector Search

> **Draft v0.1** (2026-07-10) · 2-page short paper · 대상 학회 미정(국제, 교수님과 상의)
> 저자(안): Junha ○○, Sangsoon Lim (INC Lab) — 딥인사이트랩 산학협력
> 그림 1은 `docs/figures/dilab-arch-oracle-after.png`(벤더중립판) 재사용. 수치 출처: `paper-results/results_summary.csv`.

---

## Abstract

Retrieval-augmented generation (RAG) systems typically pair an external embedding
service with a dedicated vector store. Converged databases such as Oracle AI
Database 26ai instead offer *in-database* embedding and vector search, promising a
simpler and more governable architecture. Using a production Korean cosmetics-review
RAG system (1,347 chunks), we empirically compare three configurations: (A) pgvector
with an external BGE-M3 embedder, (B) Oracle 26ai with the same external embeddings,
and (C) Oracle 26ai with fully in-database embedding (ONNX multilingual-e5-small).
We find that swapping the vector store alone is quality-neutral (Top-10 Jaccard 0.97,
Recall@10 0.98), while moving embedding in-database trades retrieval quality
(LLM-judged relevance 1.27→1.01 of 2) and query latency (110 ms→947 ms on a free-tier
instance) for architectural consolidation: external AI components drop from three to
zero and review data never leaves the database boundary. We distill these results
into practical guidance for choosing between the two designs.

## 1. Introduction

Industrial RAG deployments face a growing demand from enterprise clients for
*verified, security-audited* data infrastructure. Our system, DILAB — a
consumer/expert review analysis service developed in an industry–academia
collaboration — originally used the open-source pgvector extension with embeddings
computed by an external service. To meet enterprise governance requirements we
migrated to Oracle AI Database 26ai, whose AI Vector Search supports both vector
storage/search and *in-database* embedding via ONNX models loaded inside the DBMS.

This migration created a rare controlled-comparison opportunity: the same production
corpus, live in both systems. We ask: **when a RAG system moves from
pgvector + external embedding to a converged database with in-database embedding,
what actually changes** in (i) retrieval quality, (ii) end-to-end latency, and
(iii) architecture?

## 2. System and Migration

DILAB ingests Korean product reviews (Naver blog/shopping), chunks and embeds them,
labels each chunk with an LLM (aspect categories, sentiment, purchase-journey stage),
and serves (a) evidence-cited Q&A via hybrid retrieval that prioritizes expert
sources and (b) five-axis product scores with evidence tracking. **[Figure 1:
before/after architecture — reuse vendor-neutral diagram]**

The original stack used Supabase PostgreSQL (pgvector 0.8, HNSW cosine) with BGE-M3
(1024-d) embeddings computed externally. The migrated stack stores vectors in Oracle
26ai (`VECTOR(384)` and `VECTOR(1024)` columns) and embeds queries and chunks inside
the database with `VECTOR_EMBEDDING` over a pre-built augmented ONNX model
(multilingual-e5-small, 384-d) — the largest multilingual option under the ~2 GB
in-database ONNX constraint on our instance class. Hybrid filtering (domain, source
type, expert-priority ordering) is expressed as a single SQL query in both systems.

## 3. Experimental Setup

**Corpus.** 1,347 review chunks (cosmetics domain) from the production service,
present identically in both stores.
**Queries.** 43 Korean queries: 13 real user queries from production logs + 30
synthetic queries covering all five evaluation axes and journey stages (fixed set).
**Conditions.**

| | Store | Query/chunk embedding | Search |
|---|---|---|---|
| A | Supabase pgvector | BGE-M3 1024-d, external | HNSW (approx.) |
| B | Oracle 26ai | BGE-M3 1024-d, external | exact |
| C | Oracle 26ai | e5-small 384-d, **in-DB** | exact |

**Metrics.** Store equivalence: Top-10 Jaccard, Spearman rank correlation, and
Recall@10 of A against exact search B on identical vectors. Embedding effect:
LLM-judged relevance of Top-5 evidence (0–2 scale, temperature 0, 215 judgments per
condition). Latency: wall-clock per query, decomposed into embedding and search
(warm, single-client; Oracle Always Free 2-ECPU instance; external embedder on a
local workstation).

## 4. Results

| Metric | Value |
|---|---|
| **Store swap (A vs B, same vectors)** | |
| Top-10 Jaccard | **0.971 ± 0.076** |
| Spearman | **0.959 ± 0.066** |
| Recall@10 (A vs exact) | **0.984 ± 0.043** |
| **Embedding swap (B vs C)** | |
| Top-10 Jaccard | 0.175 ± 0.146 |
| LLM-judged relevance (0–2): A / B / C | 1.23 / **1.27** / **1.01** |
| **Latency p50 (ms): A / B / C** | 144 / **110** / 922 |
| External AI components: A / C | 2 (embedder, store) / **0** |

**(1) Swapping the vector store is quality-neutral.** With identical vectors,
pgvector (HNSW) and Oracle (exact) return near-identical Top-10 lists; pgvector's
approximate index costs only ~1.6% recall. Retrieval quality is therefore *not* a
differentiator between the two stores at this scale.

**(2) In-database embedding trades quality for consolidation.** The in-DB ONNX size
constraint forces a smaller model (e5-small 384-d vs BGE-M3 1024-d), lowering
LLM-judged evidence relevance by ~20% (1.27→1.01). Rankings diverge strongly
(Jaccard 0.18), confirming the embedding model — not the store — dominates retrieval
behavior.

**(3) In-database embedding shifts compute into the database.** End-to-end latency
rises from 110 ms (B) to 922 ms (C, p50): ONNX inference inside a free-tier 2-ECPU
instance dominates the query path, whereas the external embedder amortizes on
dedicated hardware. Conversely, condition C eliminates every external AI component
and all query-time data egress — queries and reviews never leave the database's
security boundary, and TDE/auditing apply to the entire retrieval path.

## 5. Discussion and Conclusion

Our results decompose a converged-database migration into two independent decisions.
*Moving the store* (pgvector→26ai) is effectively free in quality and modestly
faster in our setting; organizations can adopt it for governance reasons alone.
*Moving the embedding in-database* is a genuine trade-off: it maximizes architectural
simplicity and data-boundary guarantees, but with today's in-DB model-size limits and
entry-level compute it costs retrieval quality and latency. A pragmatic hybrid —
external high-quality embeddings with converged-database storage and search
(condition B) — scored best on both quality and latency in our study. We expect the
in-DB option to strengthen as larger ONNX models and vector-optimized compute reach
converged databases; the decomposition method presented here can be reapplied as
they do.

**Limitations.** Single Korean-language corpus (1.3K chunks); free-tier database
instance; LLM-as-judge relevance without human raters; latency measured from one
client region.

---
*Acknowledgment: Industry–academia collaboration with Deep Insight Lab; Oracle AI
Database 26ai Always Free tier.*
