/**
 * 분석 작업 상태 조회 — 클라이언트가 5초마다 polling (Oracle analysis_jobs).
 * status=done 이면 result_slug 로 redirect, status=error 면 에러 표시.
 */
import { NextResponse } from "next/server";
import { q } from "@/lib/oracle";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ job_id: string }> }) {
  const { job_id } = await ctx.params;
  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const rows = await q<Record<string, unknown>>(
    `SELECT id "id", status "status", progress "progress",
            result_slug "result_slug", error "error"
     FROM analysis_jobs WHERE id = :id`,
    { id: job_id },
  );
  const j = rows[0];
  if (!j) return NextResponse.json({ error: "job not found" }, { status: 404 });

  let progress: unknown = {};
  try {
    progress = j.progress ? JSON.parse(j.progress as string) : {};
  } catch {
    /* keep {} */
  }
  return NextResponse.json({
    id: j.id,
    status: j.status,
    progress,
    result_slug: (j.result_slug as string | null) ?? null,
    error: (j.error as string | null) ?? null,
  });
}
