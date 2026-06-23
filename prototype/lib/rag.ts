/**
 * DILAB Ask RAG — Cloudflare Workers 안에서 직접 수행하는 hybrid retrieval +
 * DeepSeek 합성. ai-worker/src/rag/answer.py 의 TypeScript port.
 *
 * 단계: query → BGE-M3 임베딩 → match_chunks RPC (expert + public) →
 *       chunks 블록 구성 → DeepSeek chat → JSON 파싱 → 답변 + 출처.
 *
 * Phase 1 은 영속화(ask_queries/responses/citations INSERT) skip — 현재 RLS 가
 * anon 으로 INSERT 거부하므로 service_role 키를 Cloudflare 에 두지 않기 위함.
 * Phase 2 에서 RLS 마이그레이션 후 영속화 켤 예정.
 */
import { supabase } from "./supabase";
import { cfEnv } from "./cf-env";
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
  const { data, error } = await supabase
    .from("domains")
    .select("id")
    .eq("slug", domainSlug)
    .single();
  if (error || !data) throw new Error(`domain not found: ${domainSlug}`);
  return data.id as string;
}

async function resolveProductId(
  domainId: string,
  productSlug: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("products")
    .select("id, metadata")
    .eq("domain_id", domainId);
  if (error) throw error;
  for (const row of data ?? []) {
    const slug = (row.metadata as { slug?: string } | null)?.slug;
    if (slug === productSlug) return row.id as string;
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
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: qv,
    match_domain_id: domainId,
    match_product_id: productId,
    match_source_type: sourceType,
    match_count: k,
    prefer_expert: false,
  });
  if (error) throw new Error(`match_chunks RPC: ${error.message}`);
  return (data ?? []) as MatchedChunk[];
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
      return {
        answer: String(obj.answer ?? raw),
        recommendation: String(obj.recommendation ?? ""),
      };
    } catch {
      // fall through
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
  error?: { message?: string };
};

async function deepseekChat(messages: Array<{ role: string; content: string }>): Promise<string> {
  const env = cfEnv();
  const res = await fetch(`${env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.LLM_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 800,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = (await res.json()) as DeepSeekResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`DeepSeek empty content: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return content;
}

export async function ask(opts: {
  query: string;
  domainSlug?: string;
  productSlug?: string | null;
  expertK?: number;
  publicK?: number;
}): Promise<AskAnswer> {
  const {
    query,
    domainSlug = "cosmetics",
    productSlug = null,
    expertK = 3,
    publicK = 3,
  } = opts;

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

  const env = cfEnv();
  return {
    query,
    answer,
    recommendation,
    citations,
    llm_model: env.LLM_MODEL,
    latency_ms: latencyMs,
    expert_count: citations.filter((c) => c.cite_type === "expert").length,
    public_count: citations.filter((c) => c.cite_type === "public").length,
    product_id: productId,
  };
}
