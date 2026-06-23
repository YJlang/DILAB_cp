/**
 * DILAB Ask API — Cloudflare Workers 안에서 직접 RAG 처리 (Phase 1).
 * BGE-M3 임베딩(Workers AI) + match_chunks RPC + DeepSeek 합성 모두 worker 내부.
 * ai-worker FastAPI 호출 폐기.
 */
import { NextResponse } from "next/server";
import { ask } from "@/lib/rag";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      query?: string;
      domain?: string;
      product?: string | null;
    };
    if (!body.query || typeof body.query !== "string") {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }
    const result = await ask({
      query: body.query,
      domainSlug: body.domain ?? "cosmetics",
      productSlug: body.product ?? null,
      expertK: 3,
      publicK: 3,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[/api/ask]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
