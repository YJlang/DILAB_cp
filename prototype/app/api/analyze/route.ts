/**
 * 제품 자동 분석 API — **로컬 파이프라인** 트리거 (원본은 Modal fire-and-forget).
 *
 * 1. analysis_jobs INSERT (status=pending) → job_id (Oracle)
 * 2. 로컬 워커(scripts/run_analyze.py) detached spawn — 네이버 크롤→분석→Oracle 적재,
 *    진행에 따라 analysis_jobs 갱신
 * 3. { job_id } 반환 → 클라이언트가 /api/analyze/status/[job_id] polling
 *
 * ⚠️ 로컬 dev 전용 (venv python + Oracle). Cloudflare 배포 안 함.
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { q } from "@/lib/oracle";

export const runtime = "nodejs";

const REPO = "/Users/junha/Desktop/DILAB 복사본";
const PY = `${REPO}/.venv/bin/python`;
const SCRIPT = `${REPO}/scripts/run_analyze.py`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { product_query?: string; domain_slug?: string };
    const query = body.product_query?.trim();
    if (!query || query.length < 2) {
      return NextResponse.json({ error: "product_query required (min 2 chars)" }, { status: 400 });
    }
    const domainSlug = body.domain_slug ?? "cosmetics";
    const jobId = randomUUID();

    await q(
      `INSERT INTO analysis_jobs (id, product_query, domain_slug, status, progress, created_at, updated_at)
       VALUES (:id, :q, :d, 'pending', :prog, SYSTIMESTAMP, SYSTIMESTAMP)`,
      {
        id: jobId,
        q: query,
        d: domainSlug,
        prog: JSON.stringify({ step: 0, of_steps: 3, message: "분석 큐에 등록됨" }),
      },
    );

    // 로컬 워커를 detached 로 실행 (요청 응답 후에도 백그라운드에서 진행).
    // stdio 를 로그 파일로 보내 spawn/실행 오류를 추적 (ignore 면 조용히 죽음).
    const { openSync } = await import("node:fs");
    const logfd = openSync("/tmp/dilab_worker.log", "a");
    const child = spawn(PY, [SCRIPT, jobId, query], {
      cwd: REPO,
      detached: true,
      stdio: ["ignore", logfd, logfd],
    });
    child.on("error", (err) => {
      console.error("[/api/analyze] spawn 실패:", err);
      void q(
        `UPDATE analysis_jobs SET status='error', error=:e, updated_at=SYSTIMESTAMP WHERE id=:id`,
        { e: `worker spawn 실패: ${err.message}`.slice(0, 500), id: jobId },
      ).catch(() => {});
    });
    child.unref();

    return NextResponse.json({ job_id: jobId, status: "pending" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[/api/analyze]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
