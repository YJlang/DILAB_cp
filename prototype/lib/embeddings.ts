/**
 * BGE-M3 임베딩 — 로컬 LM Studio(OpenAI 호환 /embeddings).
 *
 * (원본은 Cloudflare Workers AI `@cf/baai/bge-m3`. Oracle 전환 복제본은 로컬 dev
 *  전용이라 LM Studio 로 대체. 저장 벡터와 같은 BGE-M3 → 1024d 코사인 호환.)
 *
 * 전제: LM Studio 서버(:1234)에 BGE-M3 임베딩 모델 로드. env: LMSTUDIO_BASE_URL.
 */
const BASE = process.env.LMSTUDIO_BASE_URL ?? "http://localhost:1234/v1";

async function resolveModel(): Promise<string> {
  const want = process.env.EMBED_MODEL ?? "bge-m3";
  const res = await fetch(`${BASE}/models`);
  const ids: string[] = ((await res.json())?.data ?? []).map((m: { id: string }) => m.id);
  const bge = ids.find((id) => id.toLowerCase().includes("bge-m3"));
  if (bge) return bge;
  if (ids.includes(want)) return want;
  throw new Error(
    `LM Studio 에 BGE-M3 임베딩 모델이 없습니다. 로드된 모델: ${ids.join(", ")} ` +
      "(nomic-embed 는 다른 모델·768d 라 1024d 벡터와 호환 안 됨)",
  );
}

export async function embedQuery(text: string): Promise<number[]> {
  const model = await resolveModel();
  const res = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: text }),
  });
  if (!res.ok) throw new Error(`LM Studio embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const vec = (await res.json())?.data?.[0]?.embedding as number[] | undefined;
  if (!vec || vec.length !== 1024) {
    throw new Error(`임베딩 차원 이상: ${vec?.length ?? 0} (BGE-M3 1024d 필요)`);
  }
  return vec;
}
