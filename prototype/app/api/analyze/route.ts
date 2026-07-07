/**
 * 제품 자동 분석 API (Phase 2) — Modal serverless 함수로 fire-and-forget.
 *
 * 1. analysis_jobs INSERT (status=pending) → job_id
 * 2. Modal trigger endpoint 호출 (즉시 응답)
 * 3. { job_id } 반환 → 클라이언트가 /api/analyze/status/[job_id] polling
 *
 * 무거운 분석 (60~120초) 은 Modal 백그라운드에서 진행, Supabase 큐에 진행률 갱신.
 */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cfEnv } from "@/lib/cf-env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      product_query?: string;
      domain_slug?: string;
    };
    if (!body.product_query || body.product_query.trim().length < 2) {
      return NextResponse.json(
        { error: "product_query required (min 2 chars)" },
        { status: 400 },
      );
    }
    const domainSlug = body.domain_slug ?? "cosmetics";

    // [Oracle 전환 복제본] 신규 제품 분석은 Modal 인제스트 파이프라인(크롤링→ML→적재) +
    // Supabase write 경로라 이 로컬 Oracle 데모에선 비활성화. 기존 제품은 브라우징·Ask 가능.
    if (!process.env.SUPABASE_URL || !process.env.MODAL_TRIGGER_URL) {
      return NextResponse.json(
        {
          error:
            "신규 제품 분석은 Modal 인제스트 파이프라인(리뷰 크롤링·임베딩·토픽·평점 생성)이 필요해, " +
            "이 로컬 Oracle 데모에선 비활성화돼 있어요. 이미 분석된 제품은 대시보드·제품·Ask 에서 보실 수 있습니다.",
        },
        { status: 501 },
      );
    }

    const { data, error } = await supabase
      .from("analysis_jobs")
      .insert({
        product_query: body.product_query.trim(),
        domain_slug: domainSlug,
        status: "pending",
        progress: { step: 0, of_steps: 3, message: "큐에 등록됨" },
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[/api/analyze] insert", error);
      return NextResponse.json(
        { error: `queue insert: ${error?.message ?? "unknown"}` },
        { status: 500 },
      );
    }
    const jobId = data.id as string;

    const env = cfEnv();
    const trigger = await fetch(env.MODAL_TRIGGER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _token: env.MODAL_PROXY_TOKEN,
        job_id: jobId,
        product_query: body.product_query.trim(),
        domain_slug: domainSlug,
      }),
    });
    if (!trigger.ok) {
      const txt = await trigger.text();
      await supabase
        .from("analysis_jobs")
        .update({ status: "error", error: `Modal trigger ${trigger.status}: ${txt.slice(0, 200)}` })
        .eq("id", jobId);
      console.error("[/api/analyze] modal trigger", trigger.status, txt);
      return NextResponse.json(
        { error: `Modal trigger ${trigger.status}`, job_id: jobId },
        { status: 502 },
      );
    }

    return NextResponse.json({ job_id: jobId, status: "pending" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[/api/analyze]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
