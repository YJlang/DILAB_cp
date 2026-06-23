"use client";
import { useState } from "react";
import { Sparkles, CircleCheck, Library } from "lucide-react";
import { Spinner } from "@/components/Spinner";

type AskResult = {
  answer: string;
  recommendation: string;
  expert_count: number;
  public_count: number;
  latency_ms: number;
  citations: {
    rank: number;
    cite_type: string;
    author: string | null;
    text: string;
    similarity: number;
  }[];
};

export function AskBox({
  domainSlug,
  productSlug,
}: {
  domainSlug: string;
  productSlug: string;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, domain: domainSlug, product: productSlug }),
      });
      if (!r.ok) {
        setError(`서버 오류 ${r.status}`);
        return;
      }
      setResult(await r.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-1.5 text-base font-bold text-ink mb-3">
        <Sparkles size={16} strokeWidth={2} aria-hidden /> 직접 물어보세요
      </h2>
      <div className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder='예: "민감성 피부에 괜찮나요?"'
          aria-label="질문 입력"
          className="flex-1 px-3 py-2 text-sm rounded-md border border-line bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        <button
          onClick={send}
          disabled={loading || !query.trim()}
          aria-busy={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md bg-ink text-ivory disabled:bg-stone-300 hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {loading ? (
            <>
              <Spinner size={14} /> 분석 중…
            </>
          ) : (
            "물어보기"
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          "민감성 피부에 괜찮나요?",
          "향이 어떤가요?",
          "가성비는 어떤가요?",
          "재구매할 만한가요?",
        ].map((q) => (
          <button
            key={q}
            onClick={() => setQuery(q)}
            className="text-xs px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-ink-soft"
          >
            {q}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-muted bg-stone-50 p-3 rounded-md">⚠️ {error}</p>
      )}

      {result && (
        <div className="space-y-3 mt-3">
          <div className="rounded-md border border-line bg-stone-50/40 p-3">
            <div className="text-xs font-semibold text-muted mb-1">답변</div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">
              {result.answer}
            </p>
          </div>
          <div className="rounded-md border border-accent/30 bg-accent-soft/50 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-accent mb-1">
              <CircleCheck size={13} strokeWidth={2.2} aria-hidden /> 추천
            </div>
            <p className="text-sm text-ink">{result.recommendation}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Library size={13} strokeWidth={2} aria-hidden /> 전문가{" "}
            {result.expert_count}건 · 일반 {result.public_count}건 · 생성형 AI
          </div>
          <div className="space-y-1.5">
            {result.citations.map((c) => (
              <div
                key={c.rank}
                className="text-xs px-3 py-2 rounded-md bg-stone-50 border border-stone-100"
              >
                <span
                  className={`font-semibold ${
                    c.cite_type === "expert" ? "text-brand" : "text-accent"
                  }`}
                >
                  [{c.rank}] {c.cite_type === "expert" ? "전문가" : "일반"}
                </span>{" "}
                <span className="text-muted">
                  sim={c.similarity.toFixed(3)} · {c.author}
                </span>
                <p className="mt-1 text-ink-soft">{c.text.slice(0, 180)}…</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
