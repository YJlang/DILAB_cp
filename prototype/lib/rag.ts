/**
 * DILAB Ask RAG — **Oracle 26ai** 판 (원본 Supabase match_chunks 대체).
 *
 * query → BGE-M3 임베딩(LM Studio) → Oracle 하이브리드 검색(expert+public) →
 * chunks 블록 → DeepSeek chat → JSON 파싱 → 답변 + 출처.
 *
 * ⚠️ 로컬 dev 전용(node-oracledb). 시그니처·반환 타입은 원본과 동일 → UI 변경 없음.
 */
import { q } from "./oracle";
import { embedQuery } from "./embeddings";

const SYSTEM_PROMPT = `당신은 화장품 도메인 RAG 어시스턴트 DILAB Ask 입니다.
사용자 질문과 함께 제공된 [출처] 청크만 사용해 *근거 있는* 답변을 생성하세요.

규칙:
- [출처] 에 없는 내용을 만들지 마세요. 모르는 부분은 "제공된 자료로는 단정하기 어려워요" 같이 정직하게.
- [Expert] 출처를 우선 활용, [User] 출처는 보조로 — 단 [User] 만 다루는 정보(예: 향, 사용감)는 그대로 활용해도 OK.
- 답변 본문 안에서 [1], [2] 같이 출처 번호를 인용.
- 친근한 톤 ("~해요", "~할 수 있어요").
- 한국어로만 답변.

반드시 다음 JSON 만 출력 (다른 텍스트·코드블록 X):
{"answer":"3~5문장 답변, 출처 [n] 인용 포함","recommendation":"한 줄 추천 — 어떤 사람에게 적합/비적합한지"}`;

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

async function retrieve(
  qv: number[],
  domainId: string,
  productId: string | null,
  sourceType: "expert" | "public_review",
  k: number,
): Promise<MatchedChunk[]> {
  const productFilter = productId ? "AND product_id = :pid" : "";
  const binds: Record<string, unknown> = {
    qv: JSON.stringify(qv),
    domain: domainId,
    st: sourceType,
    k,
  };
  if (productId) binds.pid = productId;
  return q<MatchedChunk>(
    `SELECT id "chunk_id", text "text", source_type "source_type", author "author",
            author_credibility "author_credibility",
            (1 - VECTOR_DISTANCE(embedding, TO_VECTOR(:qv), COSINE)) "similarity"
     FROM chunks
     WHERE domain_id = :domain AND source_type = :st AND embedding IS NOT NULL ${productFilter}
     ORDER BY VECTOR_DISTANCE(embedding, TO_VECTOR(:qv), COSINE)
     FETCH FIRST :k ROWS ONLY`,
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
      model: process.env.LLM_MODEL ?? "deepseek-chat",
      messages,
      temperature: 0.2,
      max_tokens: 800,
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

  const qv = await embedQuery(query);

  const rows: MatchedChunk[] = [];
  if (expertK > 0) rows.push(...(await retrieve(qv, domainId, productId, "expert", expertK)));
  if (publicK > 0) rows.push(...(await retrieve(qv, domainId, productId, "public_review", publicK)));

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
