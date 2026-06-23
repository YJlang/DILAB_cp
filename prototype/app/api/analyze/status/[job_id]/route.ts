/**
 * 분석 작업 상태 조회 — 클라이언트가 5초마다 polling.
 * status=done 이면 result_slug 로 redirect, status=error 면 에러 표시.
 */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ job_id: string }> },
) {
  const { job_id } = await ctx.params;
  if (!job_id) {
    return NextResponse.json({ error: "job_id required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("analysis_jobs")
    .select("id, status, progress, result_slug, error, created_at, updated_at")
    .eq("id", job_id)
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: `job not found: ${error?.message ?? "unknown"}` },
      { status: 404 },
    );
  }
  return NextResponse.json(data);
}
