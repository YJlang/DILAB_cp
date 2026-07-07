/**
 * DILAB Ask RAG — **Oracle 26ai** 판 (원본 Supabase match_chunks 대체).
 *
 * query → BGE-M3 임베딩(LM Studio) → Oracle 하이브리드 검색(expert+public) →
 * chunks 블록 → DeepSeek chat → JSON 파싱 → 답변 + 출처.
 *
 * ⚠️ 로컬 dev 전용(node-oracledb). 시그니처·반환 타입은 원본과 동일 → UI 변경 없음.
 */
import { q } from "./oracle";
// 임베딩도 Oracle in-DB(VECTOR_EMBEDDING, multilingual-e5-small ONNX)로 수행 → 외부 임베더 없음.

const SYSTEM_PROMPT = `당신은 화장품 도메인 **근거기반 분석 어시스턴트 DILAB Ask** 입니다. 제공된 [출처] 청크만을 유일한 근거로, 소비자·전문가 리뷰에 기반한 신뢰할 수 있는 평가를 제공합니다. 목표는 "빈도 나열"이 아니라 "근거로 검증된 판단"입니다.

## 핵심 원칙 (반드시 준수)
1. **근거 밖 금지** — [출처]에 명시된 내용만 사용. 추측·일반상식·외부지식으로 채우지 마세요. 근거가 없으면 "제공된 자료로는 단정하기 어려워요"라고 정직하게 밝힙니다.
2. **모든 주장에 인용** — 각 핵심 주장 바로 뒤에 근거 출처 번호 [n]. 인용 없는 단정은 금지.
3. **전문가 우선 가중** — [Expert] 출처를 더 신뢰하고, [User]는 보조. 단 향·발림성·사용감 등 경험적 정보는 [User]도 1차 근거로 활용.
4. **상충 처리** — 출처가 엇갈리면 양쪽을 모두 제시하고("일부는 A, 다른 후기는 B") 어느 쪽 근거가 더 두꺼운지 밝힙니다. 한쪽만 골라 단정 금지.
5. **과신 금지** — 근거가 1~2건뿐이면 "제한된 후기지만"처럼 근거의 두께를 드러냅니다. 소수 의견을 다수 사실처럼 말하지 마세요.
6. 친근한 존댓말("~해요","~할 수 있어요"), **한국어만**.

## 출력 (다른 텍스트·코드블록 없이 아래 JSON만)
{"answer":"근거 [n] 인용을 포함한 3~5문장. 전문가·소비자 근거를 종합하고, 상충·한계가 있으면 드러냄","recommendation":"한 줄 — 어떤 사람에게 적합/비적합한지, 근거 기반으로"}`;

export type Citation = {
  rank: number;
  chunk_id: string;
  cite_type: "expert" | "public";
  author: string | null;
  author_credibility: number | null;
  text: string;
  similarity: number;
};

export type AskAnswer = {
  query: string;
  answer: string;
  recommendation: string;
  citations: Citation[];
  llm_model: string;
  latency_ms: number;
  expert_count: number;
  public_count: number;
  product_id: string | null;
};

type MatchedChunk = {
  chunk_id: string;
  text: string;
  source_type: string;
  author: string | null;
  author_credibility: number | null;
  similarity: number;
};

async function resolveDomainId(domainSlug: string): Promise<string> {
  const rows = await q<{ id: string }>(`SELECT id "id" FROM domains WHERE slug = :slug`, {
    slug: domainSlug,
  });
  if (!rows[0]) throw new Error(`domain not found: ${domainSlug}`);
  return rows[0].id;
}

async function resolveProductId(domainId: string, productSlug: string): Promise<string> {
  const rows = await q<{ id: string; metadata: string }>(
    `SELECT id "id", metadata "metadata" FROM products WHERE domain_id = :d`,
    { d: domainId },
  );
  for (const row of rows) {
    let slug: string | undefined;
    try {
      slug = JSON.parse(row.metadata)?.slug;
    } catch {
      /* ignore */
    }
    if (slug === productSlug) return row.id;
  }
  throw new Error(`product slug not found: ${productSlug}`);
}

// 전문가·일반 top-k 를 **한 쿼리**로. 질문 임베딩(e5, 'query:' 프리픽스)은 CTE 에서 1회만
// 수행(기존엔 소스별×SELECT/ORDER 로 4회 재실행) → in-DB 임베딩 호출·왕복 최소화.
// ROW_NUMBER 로 source_type 별 top-k 를 뽑고 전문가 우선 정렬 → 출력은 기존과 동일.
async function retrieveHybrid(
  qtext: string,
  domainId: string,
  productId: string | null,
  expertK: number,
  publicK: number,
): Promise<MatchedChunk[]> {
  const productFilter = productId ? "AND c.product_id = :pid" : "";
  const binds: Record<string, unknown> = { qtext, domain: domainId, ek: expertK, pk: publicK };
  if (productId) binds.pid = productId;
  return q<MatchedChunk>(
    `WITH q AS (SELECT VECTOR_EMBEDDING(DILAB_E5 USING 'query: ' || :qtext AS data) AS qv FROM dual)
     SELECT chunk_id "chunk_id", text "text", source_type "source_type", author "author",
            author_credibility "author_credibility", similarity "similarity"
     FROM (
       SELECT c.id AS chunk_id, c.text, c.source_type, c.author, c.author_credibility,
              (1 - VECTOR_DISTANCE(c.embedding, q.qv, COSINE)) AS similarity,
              ROW_NUMBER() OVER (PARTITION BY c.source_type
                                 ORDER BY VECTOR_DISTANCE(c.embedding, q.qv, COSINE)) AS rn
       FROM chunks c CROSS JOIN q
       WHERE c.domain_id = :domain AND c.source_type IN ('expert', 'public_review')
         AND c.embedding IS NOT NULL ${productFilter}
     )
     WHERE (source_type = 'expert' AND rn <= :ek)
        OR (source_type = 'public_review' AND rn <= :pk)
     ORDER BY CASE source_type WHEN 'expert' THEN 0 ELSE 1 END, similarity DESC`,
    binds,
  );
}

function parseJsonAnswer(raw: string): { answer: string; recommendation: string } {
  let text = raw.trim();
  if (text.startsWith("```")) {
    const parts = text.split("```");
    text = parts.length > 1 ? parts[1] : raw;
    if (text.startsWith("json")) text = text.slice(4).trimStart();
    text = text.split("```")[0].trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(text.slice(start, end + 1));
      return { answer: String(obj.answer ?? raw), recommendation: String(obj.recommendation ?? "") };
    } catch {
      /* fall through */
    }
  }
  return { answer: raw, recommendation: "" };
}

function toCitations(rows: MatchedChunk[]): Citation[] {
  return rows.map((r, i) => ({
    rank: i + 1,
    chunk_id: r.chunk_id,
    cite_type: r.source_type === "expert" ? "expert" : "public",
    author: r.author,
    author_credibility: r.author_credibility,
    text: r.text,
    similarity: r.similarity,
  }));
}

function formatChunks(citations: Citation[]): string {
  return citations
    .map((c) => {
      const tag = c.cite_type === "expert" ? "Expert" : "User";
      const cred = c.author_credibility ? `, 신뢰도 ${c.author_credibility}/10` : "";
      return `[${c.rank}] [${tag}] ${c.author ?? "익명"}${cred}\n${c.text}`;
    })
    .join("\n\n");
}

type DeepSeekResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

async function deepseekChat(messages: Array<{ role: string; content: string }>): Promise<string> {
  const base = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? "deepseek-v4-pro",
      messages,
      temperature: 0.2,
      max_tokens: 3000, // 추론모델 reasoning 여유 (작으면 답변 content 가 빔)
    }),
  });
  if (!res.ok) {
    throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as DeepSeekResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek empty content");
  return content;
}

export async function ask(opts: {
  query: string;
  domainSlug?: string;
  productSlug?: string | null;
  expertK?: number;
  publicK?: number;
}): Promise<AskAnswer> {
  const { query, domainSlug = "cosmetics", productSlug = null, expertK = 3, publicK = 3 } = opts;

  const domainId = await resolveDomainId(domainSlug);
  const productId = productSlug ? await resolveProductId(domainId, productSlug) : null;

  const rows = await retrieveHybrid(query, domainId, productId, expertK, publicK);

  const citations = toCitations(rows);
  const userPrompt = `[질문]\n${query}\n\n[출처]\n${formatChunks(citations)}`;

  const start = Date.now();
  const raw = await deepseekChat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);
  const latencyMs = Date.now() - start;
  const { answer, recommendation } = parseJsonAnswer(raw);

  return {
    query,
    answer,
    recommendation,
    citations,
    llm_model: process.env.LLM_MODEL ?? "deepseek-chat",
    latency_ms: latencyMs,
    expert_count: citations.filter((c) => c.cite_type === "expert").length,
    public_count: citations.filter((c) => c.cite_type === "public").length,
    product_id: productId,
  };
}
