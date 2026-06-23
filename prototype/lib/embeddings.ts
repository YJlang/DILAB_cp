/**
 * BGE-M3 임베딩 호출 — Cloudflare Workers AI binding (`@cf/baai/bge-m3`).
 *
 * ai-worker 의 sentence-transformers 호출을 대체. 무료 일 10,000 neurons,
 * cold start 0초, 한국어 포함 100+ 언어.
 */
import { cfEnv } from "./cf-env";

const MODEL = "@cf/baai/bge-m3";

export async function embedQuery(text: string): Promise<number[]> {
  const env = cfEnv();
  const r = await env.AI.run(MODEL, { text });
  const vec = r.data?.[0];
  if (!vec || vec.length === 0) {
    throw new Error(`BGE-M3 returned empty embedding: ${JSON.stringify(r).slice(0, 200)}`);
  }
  return vec;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const env = cfEnv();
  const r = await env.AI.run(MODEL, { text: texts });
  if (!r.data || r.data.length !== texts.length) {
    throw new Error(
      `BGE-M3 batch returned ${r.data?.length ?? 0} vectors for ${texts.length} inputs`,
    );
  }
  return r.data;
}
