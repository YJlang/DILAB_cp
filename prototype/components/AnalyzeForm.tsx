"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Spinner } from "@/components/Spinner";

type JobStatus = "pending" | "running" | "done" | "error";

type JobProgress = {
  step?: number;
  of_steps?: number;
  message?: string;
};

type JobRow = {
  id: string;
  status: JobStatus;
  progress: JobProgress;
  result_slug: string | null;
  error: string | null;
};

const EXAMPLES = [
  "닥터지 레드 블레미쉬 클리어 수딩 크림",
  "이니스프리 그린티 시드 세럼",
  "아비브 어성초 카밍 토너",
  "메디힐 NMF 마스크팩",
];

const POLL_INTERVAL_MS = 5000;
// Modal 분석 task 가 최대 900초(15분)까지 돌므로, 프론트 폴링은 그보다 짧게 끊지 않는다.
// (이전 5분 캡이 6~7분 걸리는 정상 완료를 거짓 실패로 처리하던 버그를 해소)
const POLL_TIMEOUT_MS = 14 * 60 * 1000; // 14분

export function AnalyzeForm() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function pollOnce(jobId: string, startedAt: number) {
    try {
      const r = await fetch(`/api/analyze/status/${jobId}`);
      if (!r.ok) {
        const txt = await r.text();
        stopPolling();
        setError(`상태 조회 실패 (${r.status}): ${txt.slice(0, 120)}`);
        setLoading(false);
        return;
      }
      const job = (await r.json()) as JobRow;
      setProgress(job.progress);

      if (job.status === "done" && job.result_slug) {
        stopPolling();
        router.push(`/products/${job.result_slug}`);
        return;
      }
      if (job.status === "error") {
        stopPolling();
        setError(job.error ?? "분석 중 알 수 없는 오류");
        setLoading(false);
        return;
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        stopPolling();
        setError(
          "분석이 예상보다 오래 걸리고 있어요. 백그라운드에서 계속 진행 중일 수 있으니, 잠시 후 제품 목록에서 다시 확인해주세요.",
        );
        setLoading(false);
      }
    } catch (e) {
      stopPolling();
      setError(`네트워크 오류: ${String(e).slice(0, 120)}`);
      setLoading(false);
    }
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setProgress({ step: 0, of_steps: 3, message: "분석 큐에 등록 중…" });

    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_query: query.trim() }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `등록 실패 (${r.status})`);
        setLoading(false);
        return;
      }
      const { job_id } = (await r.json()) as { job_id: string };
      const startedAt = Date.now();
      // 즉시 1회 + 이후 폴링
      void pollOnce(job_id, startedAt);
      pollRef.current = setInterval(() => {
        void pollOnce(job_id, startedAt);
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-xl space-y-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='제품명 입력 — 예: "닥터지 레드 블레미쉬 크림"'
          disabled={loading}
          aria-label="분석할 제품명 입력"
          className="flex-1 px-4 py-3 text-sm rounded-md border border-line bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:bg-stone-50"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          aria-busy={loading}
          className="inline-flex items-center gap-1.5 px-5 py-3 text-sm font-semibold rounded-md bg-ink text-ivory disabled:bg-stone-300 hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {loading ? (
            <>
              <Spinner size={15} /> 분석 중…
            </>
          ) : (
            <>
              분석 시작 <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setQuery(q)}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-ink-soft disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {loading && progress && (
        <div className="text-sm text-ink-soft bg-brand-soft border border-brand/20 rounded-md px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
            <span className="font-medium">{progress.message ?? "처리 중…"}</span>
            {progress.step != null && progress.of_steps != null && (
              <span className="ml-auto text-xs text-muted">
                {progress.step}/{progress.of_steps}
              </span>
            )}
          </div>
          <div className="text-xs text-muted mt-1.5">
            클라우드 분석 엔진이 백그라운드에서 처리 중 · 약 60~120초 소요 · 첫 실행은 준비로 +30초
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-ink-soft bg-stone-50 border border-line px-4 py-3 rounded-md whitespace-pre-wrap">
          ⚠️ {error}
        </p>
      )}
    </form>
  );
}
