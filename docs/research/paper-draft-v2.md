# Paper Draft v2 — PyGeek 2026 submission

> **Status**: draft for review · **Frame**: migration factor decomposition (replaces v0.1's product-comparison frame)
> **Venue**: International Conference on 2026 PyGeek (Hongik Univ., Aug 19–21, 2026) — 2–5 pages incl. references, ~3 recommended; A4 two-column, 10pt, line spacing 1.15; title and abstract required in **both Korean and English**; **double-blind** (no author names, affiliations, acknowledgements, or self-identifying references in the review version).
> **Numbers**: `paper-results/results_summary.csv` + `paper-results/stats.md`. **Figure 1** to be produced as a decomposition diagram (see §Figure spec at the bottom).
> **Open item for the professor**: whether to name the vendor products or anonymize them (see §Notes at the bottom).

---

## 제목 (Korean title)

**벡터 데이터베이스 마이그레이션에서 저장소 교체와 임베딩 배치의 효과를 분리하는 요인 분해 방법**

## Title (English)

**A Factor Decomposition Method for Separating Store Substitution and Embedding Placement Effects in Vector Database Migration**

---

## 초록

검색증강생성(RAG) 시스템의 벡터 계층을 다른 데이터베이스로 이전할 때, 실무에서는 이전 전후의 시스템을 종단 간으로 비교하는 것이 일반적이다. 그러나 이러한 비교는 서로 독립적이지만 대개 동시에 수행되는 두 가지 결정, 즉 벡터를 저장하고 검색하는 엔진의 교체와 임베딩 연산이 실행되는 위치의 변경을 하나의 측정값에 섞어 버린다. 그 결과 관측된 변화를 어느 결정에 귀속해야 하는지 판단할 수 없고, 다른 인스턴스 등급이나 다른 모델 제약을 가진 환경으로 이전할 수 있는 지식도 남지 않는다. 본 연구는 원본 시스템이 이미 생성한 임베딩을 목표 저장소에 그대로 적재하는 교량 조건(bridge condition)을 삽입하여, 하나의 교란된 비교를 각각 한 요인만 다른 두 개의 비교로 분리하는 분해 방법을 제안한다. 교량 조건은 재임베딩이 필요 없고 운영 중인 서비스를 건드리지 않으므로 비용이 낮다. 운영 중인 한국어 제품 리뷰 RAG 서비스(1,347개 청크, 43개 질의)에 이 방법을 적용한 결과, 저장소 교체에서는 검색 품질의 변화가 검출되지 않은 반면(Top-10 Jaccard 0.971, 관련성 차이 0.042, p = 0.52), 임베딩을 데이터베이스 내부로 옮기는 결정은 유의하고 중간 크기의 효과를 보였다(p = 0.003, Cohen's d_z = 0.47). 즉 관측된 종단 간 변화는 사실상 전부 임베딩 배치 요인에 귀속된다. 본 방법은 특정 제품의 우열을 평가하지 않으며, 컨버지드 데이터베이스로의 이전 일반에 적용할 수 있다.

## Abstract

When the vector layer of a retrieval-augmented generation (RAG) system is migrated to a different database, practitioners typically compare the before and after systems end to end. Such a comparison conflates two decisions that are usually made at the same time: substituting the engine that stores and searches the vectors, and relocating where the embedding function is executed. The resulting delta cannot be attributed to either decision, and therefore does not transfer to other deployments. We propose a decomposition method that separates the two factors by inserting a **bridge condition**, in which the target store is loaded with the source system's original embeddings. Applying the method to a production Korean product-review RAG service (1,347 chunks, 43 queries), we find no detectable change in retrieval quality from store substitution (top-10 Jaccard 0.971; relevance difference 0.042 on a 0–2 scale, p = 0.52), whereas relocating the embedding into the database produces a significant, medium-sized effect (p = 0.003, Cohen's d_z = 0.47). Essentially all of the observed end-to-end change is therefore attributable to embedding placement rather than to the store. The method evaluates no product's superiority and generalizes to converged-database migrations.

**키워드:** 검색증강생성, 벡터 데이터베이스, 인-데이터베이스 임베딩, 마이그레이션, 요인 분해

**Keywords:** Retrieval-Augmented Generation, Vector Database, In-Database Embedding, Migration, Factor Decomposition

---

## 1. Introduction

A production retrieval-augmented generation (RAG) system [1], [2] is assembled from three replaceable parts: an embedding model, a store that indexes and searches the resulting vectors, and a generator. The vector layer is the part that most often changes after deployment. A common trajectory is to move from a vector extension on a general-purpose relational database to a converged database that provides a native vector type together with the ability to run the embedding model *inside* the database process.

Migration reports almost always evaluate such a move end to end: the system as it ran before against the system as it runs after. This is the natural thing to measure and the least informative. A migration of this kind changes two things at once — the **store**, meaning which engine holds the vectors and under what index regime, and the **placement** of the embedding function, external service versus a runtime hosted by the database. The two travel together, because in-database placement is attractive precisely when governance motivates the migration, and because a database that hosts models constrains which models it will host. In our case a size ceiling on the loadable artifact forced a change of embedding model as a side effect of the placement decision.

An end-to-end delta is therefore unattributable. A team seeing quality drop cannot tell whether the new store retrieves worse, whether the relocated model is weaker, or both; a team seeing no change cannot tell whether two effects cancelled. Neither outcome transfers to a deployment with a different instance class or model ceiling.

We make the migration measurable with a **bridge condition** that pairs the target store with the *source* system's original embeddings, turning one confounded comparison into two single-factor comparisons. We apply it to a Korean consumer- and expert-review analysis service migrated from a PostgreSQL vector extension to a converged database with in-database embedding, over its production corpus of 1,347 chunks and 43 fixed queries. Our contributions are the decomposition protocol, an empirical attribution on a production Korean corpus, and the practical guidance that follows. This study does not evaluate which database product is superior: each configuration is measured under the constraints of the deployment we operate, and latency figures characterize that deployment rather than any product.

## 2. Decomposition Method

### 2.1 Two factors, one measurement

Describe a retrieval configuration as a triple *(S, E, P)*: the store *S* (engine and index regime), the embedding model *E*, and its placement *P*, either external or in-database. A naive migration study compares *(S₀, E₀, external)* against *(S₁, E₁, in-DB)*, in which every coordinate differs, so no single-factor conclusion can be drawn.

The decomposition inserts the bridge condition *(S₁, E₀, external)*: the target store, holding the vectors the source system already produced, searched through the same application contract. Three conditions then differ pairwise in one coordinate — **A** = *(S₀, E₀, external)*, the deployed baseline; **B** = *(S₁, E₀, external)*, the bridge; **C** = *(S₁, E₁, in-DB)*, the migrated system. A → B isolates the **store factor** and B → C the **placement factor** (Fig. 1).

The bridge is cheap, which is the point. It needs no re-embedding, since the source vectors already exist; it lives in a second vector column beside the production one, leaving the running service untouched; and it reuses the target system's retrieval SQL unchanged. Ours cost one bulk load and no application change, yet without it nothing in §4 could have been attributed.

### 2.2 A confound we keep on purpose

In condition C the placement change carries a model change with it: the database loads only artifacts below a fixed size, and the multilingual model our source system used exceeds it, so C necessarily runs a smaller one. Placement and model capacity are thus confounded in B → C.

We keep this confound deliberately, because it is the unit a practitioner faces: choosing in-database placement means inheriting the ceiling, and no deployment chooses placement and capacity independently. We mark it as a limitation, and note the fourth condition that would separate them — *(S₁, E₁, external)*, the smaller model run outside the database — as this protocol's natural extension.

### 2.3 System under study

The subject system analyzes Korean consumer and expert product reviews and answers questions with cited evidence. Reviews are chunked, embedded, and labelled; retrieval is hybrid, combining vector similarity with relational filters over domain, product, and source type, and prioritizing expert sources. In both the source and target systems this retrieval contract is expressed as a single SQL statement, so the comparison holds the application logic fixed and varies only the coordinates above.

## 3. Experimental Setup

**Corpus and queries.** 1,347 review chunks from the production service (cosmetics domain), present identically in both stores with chunk identifiers verified to align one-to-one. A fixed set of 43 Korean queries — 13 from production logs and 30 synthetic ones covering the service's five evaluation axes and purchase-journey stages — is stored as a file and reused verbatim across conditions (Table 1).

**Conditions.** The baseline store is PostgreSQL with the pgvector extension [3] under an approximate HNSW index [4]; the target is a converged commercial database providing a native vector type and in-database ONNX inference [5]. Conditions A and B embed with BGE-M3 (1024-d) [6] computed externally; C embeds in-database with multilingual-e5-small (384-d) [7], the largest multilingual model below the platform's in-database artifact size ceiling (Table 1).

**Metrics.** *Ranking agreement*: Jaccard overlap of top-10 result sets, Spearman rank correlation, and Recall@10 against the bridge condition's exact search. *Relevance*: a language model judges each of the top-5 chunks against the query on a 0–2 scale at temperature 0 [8], giving 215 judgments per condition; per-query means over 43 queries are the unit of the paired tests. *Latency*: wall-clock time per query, warm, single client.

**Environment.** The target database runs on an entry-level always-free instance (2 ECPU), the external embedding service on a local workstation, with all measurements from one client region. Latency is thus a property of this deployment and is interpreted only as such.

## 4. Results

### 4.1 No store effect is detectable

With identical vectors on both sides, the two stores return nearly the same ranked lists: mean top-10 Jaccard 0.971 (95% CI [0.946, 0.992]) and Spearman 0.958 ([0.938, 0.976]), with 37 of the 43 queries returning exactly the same top-10 set and a worst case of 0.667. Recall@10 for the baseline's approximate index, measured against exact search, is 0.984 ([0.970, 0.995]).

Judged relevance is 1.228 for A and 1.270 for B on the 0–2 scale. The paired difference of −0.042 is not significant (95% CI [−0.172, 0.084]; *t*(42) = −0.643, *p* = 0.523; Wilcoxon *p* = 0.908 over the 28 queries whose scores differed at all; Cohen's *d_z* = −0.098).

Since the claim is a null, we also tested equivalence explicitly, as a non-significant *p* cannot establish one. Two one-sided tests [9] against a ±0.15 margin — a threshold chosen for practical relevance, not derived from theory — return *p* = 0.052, marginally short of equivalence at α = 0.05, because the interval's lower bound of −0.172 escapes the margin slightly. We therefore report the store effect as *not detected and bounded to a small magnitude* rather than as demonstrated equivalence. Notably that excursion lies in the direction of the target store scoring **higher**, so the data give no support to store substitution having degraded retrieval; settling equivalence formally would require more queries.

The small residual A–B gap reflects the index regime, not the engine: the baseline searches an approximate HNSW index [4] while the bridge searches exactly, costing roughly 1.6% recall at this corpus size.

### 4.2 Embedding placement accounts for the change

Between B and C — the same store, searched the same way — results diverge sharply: top-10 Jaccard falls to 0.175 ([0.133, 0.221]), meaning the two configurations retrieve largely different evidence for the same question, and judged relevance falls from 1.270 to 1.014. This difference is significant and of medium size (paired difference 0.256, 95% CI [0.098, 0.423]; *t*(42) = 3.104, *p* = 0.003; Wilcoxon *p* = 0.006 over 38 non-tied queries; Cohen's *d_z* = 0.473). Since no store effect was detectable in A → B, essentially the entire end-to-end quality change observed in the migration is attributable to the placement factor and the model capacity it carries with it.

This is the practical payoff of the decomposition. A team that had measured only the end-to-end delta would have observed a quality drop of roughly 20% and could reasonably have attributed it to the new database. The attribution would have been wrong, and the remedy it suggests — reverting the store — would have recovered nothing.

### 4.3 Latency moves with the compute tier

Mean retrieval time is 150.2 ms for A, 110.0 ms for B and 947.0 ms for C; the median C/B ratio is 8.27×, and both paired differences are significant (Wilcoxon *p* < 0.001). The increase in C is not a property of in-database embedding as such: it is model inference executing on a 2-ECPU database instance rather than on a workstation, and it is the component of our results most sensitive to the environment. We report it because it is the cost a team on a comparable tier will actually meet, and we caution against generalizing it to provisioned hardware.

One measurement caveat must be stated plainly. Query-embedding time was measured once and reused for both A and B, since both conditions call the same external service to produce the same vector. The A–B latency difference therefore reflects **store search time alone**, and our data cannot speak to per-condition variability in the embedding step. It is not an independent end-to-end timing of two pipelines, and we do not present it as one.

### 4.4 Robustness across query provenance

Because 30 of the 43 queries are synthetic, we checked whether they behave like the 13 production ones. Judged relevance is systematically lower on the synthetic subset (A: 1.147 vs. 1.415, *p* = 0.045; C: 0.880 vs. 1.323, *p* = 0.007; B: *p* = 0.125, Mann–Whitney), so absolute relevance levels in this study are depressed by the synthetic majority and should not be read as service-level quality. The ranking-agreement metrics that carry the attribution argument, however, show no difference between the subsets (Jaccard A–B, *p* = 0.441; Jaccard B–C, *p* = 0.570). The attribution therefore holds in both subsets even though the absolute scores do not transfer.

## 5. Discussion and Conclusion

The decomposition turns a migration from an outcome into two decisions with separate evidence. In our deployment the store decision came at no measurable cost. The placement decision was a genuine trade: it removes the external embedding service from the query path — model invocations outside the database fall from one to zero, and the network boundaries a query crosses from two to one — so the user's question and the retrieved review text stay inside the database boundary, and controls such as encryption at rest and auditing then cover the whole retrieval path rather than only its storage half. The price is embedding capacity and database-tier inference. Whether that price is worth paying is a governance question rather than a performance one, and the decomposition is what allows it to be posed that way.

Teams whose motivation is governance of data at rest can take the store change without the placement change. Teams needing the query path itself inside the boundary should take the placement change only after checking that the largest model their database can host suits their domain — a check the bridge makes possible before committing. We expect the balance to shift as in-database model ceilings rise, a further reason to state results as attributions rather than verdicts: the protocol can simply be re-run.

**Limitations.** A single Korean corpus of 1.3K chunks; relevance judged by a language model [8] without human raters; an entry-level database instance; placement confounded with model capacity by construction (§2.2); one client and one region. The store result is a bounded non-detection rather than demonstrated equivalence, and 43 queries are too few to settle the ±0.15 margin (§4.1). Query-embedding time was shared between A and B rather than measured per condition (§4.3).

**Conclusion.** Vector-layer migrations are routinely reported as end-to-end deltas that cannot be attributed to a cause. One inexpensive bridge condition separates store substitution from embedding placement. Applied to a production Korean review RAG service, it finds no detectable store effect and assigns the entire change to placement — a conclusion end-to-end measurement would have given to the wrong factor.

## Conflict of Interest

The authors declare that there are no potential conflicts of interest related to this paper.

## References

> Verified against primary sources on 2026-08-05 (NeurIPS proceedings, arXiv, IEEE Xplore, ACL Anthology, SAGE, Oracle documentation). All nine exist; six required correction.

[1] P. Lewis, E. Perez, A. Piktus, F. Petroni, V. Karpukhin, N. Goyal, H. Küttler, M. Lewis, W. Yih, T. Rocktäschel, S. Riedel, and D. Kiela, "Retrieval-augmented generation for knowledge-intensive NLP tasks," in *Advances in Neural Information Processing Systems*, vol. 33, 2020, pp. 9459–9474.

[2] Y. Gao, Y. Xiong, X. Gao, K. Jia, J. Pan, Y. Bi, Y. Dai, J. Sun, M. Wang, and H. Wang, "Retrieval-augmented generation for large language models: A survey," arXiv:2312.10997, 2023.

[3] pgvector, "pgvector: Open-source vector similarity search for Postgres," GitHub repository. [Online]. Available: https://github.com/pgvector/pgvector (accessed Aug. 2026).

[4] Y. A. Malkov and D. A. Yashunin, "Efficient and robust approximate nearest neighbor search using hierarchical navigable small world graphs," *IEEE Transactions on Pattern Analysis and Machine Intelligence*, vol. 42, no. 4, pp. 824–836, Apr. 2020, doi: 10.1109/TPAMI.2018.2889473.

[5] Oracle, "Oracle AI Vector Search User's Guide," Oracle AI Database 26ai documentation, Doc. ID G43963-15, Jul. 2026. [Online]. Available: https://docs.oracle.com/en/database/oracle/oracle-database/26/vecse/ (accessed Aug. 2026).

[6] J. Chen, S. Xiao, P. Zhang, K. Luo, D. Lian, and Z. Liu, "M3-Embedding: Multi-linguality, multi-functionality, multi-granularity text embeddings through self-knowledge distillation," in *Findings of the Association for Computational Linguistics: ACL 2024*, Bangkok, Thailand, Aug. 2024, pp. 2318–2335, doi: 10.18653/v1/2024.findings-acl.137.

[7] L. Wang, N. Yang, X. Huang, L. Yang, R. Majumder, and F. Wei, "Multilingual E5 text embeddings: A technical report," arXiv:2402.05672, 2024.

[8] L. Zheng, W.-L. Chiang, Y. Sheng, S. Zhuang, Z. Wu, Y. Zhuang, Z. Lin, Z. Li, D. Li, E. P. Xing, H. Zhang, J. E. Gonzalez, and I. Stoica, "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena," in *Advances in Neural Information Processing Systems 36 (NeurIPS 2023), Datasets and Benchmarks Track*, 2023.

[9] D. Lakens, "Equivalence tests: A practical primer for t tests, correlations, and meta-analyses," *Social Psychological and Personality Science*, vol. 8, no. 4, pp. 355–362, 2017, doi: 10.1177/1948550617697177.

---

# Tables

## 표 1. 실험 조건
## Table 1. Experimental conditions

| | Store | Embedding model | Placement | Search |
|---|---|---|---|---|
| A | PostgreSQL + pgvector | BGE-M3, 1024-d | external | HNSW (approximate) |
| B | Oracle AI Database 26ai | BGE-M3, 1024-d | external | exact |
| C | Oracle AI Database 26ai | multilingual-e5-small, 384-d | in-database | exact |

## 표 2. 요인별 측정 결과
## Table 2. Results by factor

| Measure | A → B (store factor) | B → C (placement factor) |
|---|---|---|
| Top-10 Jaccard | 0.971 [0.946, 0.992] | 0.175 [0.133, 0.221] |
| Spearman correlation | 0.958 [0.938, 0.976] | — |
| Recall@10 vs. exact | 0.984 [0.970, 0.995] | — |
| Judged relevance (0–2) | 1.228 → 1.270 | 1.270 → 1.014 |
| Paired difference [95% CI] | −0.042 [−0.172, 0.084] | 0.256 [0.098, 0.423] |
| Significance | *p* = 0.523 (n.s.) | *p* = 0.003 |
| Effect size (Cohen's *d_z*) | −0.098 (negligible) | 0.473 (medium) |
| Retrieval latency, mean | 150.2 → 110.0 ms | 110.0 → 947.0 ms |
| Retrieval latency, p50 | 143.9 → 109.9 ms | 109.9 → 922.3 ms |
| External model invocations per query | 1 → 1 | 1 → 0 |
| Network boundaries crossed per query | 2 → 2 | 2 → 1 |

Relevance figures are per-query means over 43 queries (215 judgments per condition); *p*-values are paired *t*-tests. Equivalence of A and B against a ±0.15 margin was tested and not established (*p* = 0.052); see §4.1.

---

# Figure spec (for Figure 1)

**그림 1. 마이그레이션 요인 분해 / Fig. 1. Decomposition of the migration into two single-factor comparisons**

Three boxes left to right — A, B, C — each showing its *(store, model, placement)* triple. Two labelled arrows between them: A→B "store factor", B→C "placement factor". A dashed outline on B marked "bridge condition (added for measurement only)". Under each arrow, the headline result: A→B "quality-neutral", B→C "carries the entire effect". Must be legible in black-and-white print; axis labels, legends, and all in-figure text in English; caption in Korean and English, placed below the figure.

---

# Notes for the professor / open items

1. **Vendor naming.** The draft names pgvector and Oracle AI Database 26ai. Oracle's licence terms have historically restricted publication of benchmark results without consent (the "DeWitt clause"). Two mitigations, either of which is sufficient: obtain consent through the industry–academia channel, or anonymize as "a converged commercial database" throughout. The paper's argument does not depend on the names — the decomposition is the contribution — so anonymization costs us nothing scientifically. **Decision needed before submission.**
2. **Deadline.** The listed submission deadline (Aug 1, 2026) has passed as of Aug 5. Late submission must be confirmed with the organizers before further work is spent on formatting.
3. **Language.** Body is in English; title and abstract are supplied in both Korean and English as the template requires. If a Korean body is preferred, the translation is mechanical from this draft.
4. **Double-blind.** This draft contains no author names, affiliations, acknowledgements, or self-identifying references. The acknowledgement of the industry–academia partner and funding must be added only in the camera-ready version.
