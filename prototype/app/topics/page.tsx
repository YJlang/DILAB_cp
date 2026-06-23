import { Layers, BookOpen } from "lucide-react";
import { getTopicsWithChunks } from "@/lib/data";

export const dynamic = "force-dynamic";

const SENT_EMOJI: Record<string, string> = {
  positive: "😊",
  neutral: "😐",
  negative: "😣",
  unknown: "❓",
};

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const params = await searchParams;
  const topics = await getTopicsWithChunks(params.domain ?? "cosmetics");

  const total = topics.reduce((s, t) => s + t.doc_count, 0);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <header className="border-b border-line pb-4 mb-5">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
          <Layers size={14} strokeWidth={2} aria-hidden /> 토픽 탐색
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          화장품 — {topics.length}개 주제 그룹
        </h1>
        <p className="text-sm text-muted mt-1">
          AI가 의미 단위로 분석해 비슷한 주제끼리 자동으로 묶어요. 총 {total}건의
          근거 분류됨.
        </p>
      </header>

      {topics.length === 0 ? (
        <div className="bg-card rounded-xl border border-line p-8 text-center text-muted text-sm">
          토픽이 아직 분리되지 않았어요. 제품을 더 분석하면 자동으로 주제 그룹이
          만들어져요.
        </div>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {topics.map((t) => (
            <TopicCard key={t.id} t={t} total={total} />
          ))}
        </section>
      )}

      <footer className="mt-6 text-xs text-muted">
        AI가 의미 단위로 분석해 비슷한 주제끼리 자동으로 묶어요. 근거 수가 적으면
        토픽이 작거나 불완전할 수 있어요. 제품을 더 추가 분석할수록 더 세분화돼요.
      </footer>
    </main>
  );
}

function TopicCard({
  t,
  total,
}: {
  t: import("@/lib/data").TopicWithChunks;
  total: number;
}) {
  const pct = total > 0 ? Math.round((t.doc_count / total) * 100) : 0;
  const sentTotal =
    t.sentiment.positive + t.sentiment.neutral + t.sentiment.negative;
  const posPct =
    sentTotal > 0 ? Math.round((t.sentiment.positive / sentTotal) * 100) : 0;

  return (
    <div className="bg-card rounded-xl border border-line p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-md bg-brand-soft text-brand grid place-items-center text-xs font-bold tabular-nums">
          {t.topic_index}
        </span>
        <h2 className="text-base font-bold text-ink flex-1">
          {t.keywords.slice(0, 3).join(" · ")}
        </h2>
        <span className="text-xs text-muted tabular-nums">
          {pct}% ({t.doc_count})
        </span>
      </div>

      {/* 키워드 칩 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {t.keywords.map((kw) => (
          <span
            key={kw}
            className="text-xs px-2 py-0.5 rounded-full bg-brand-soft text-brand"
          >
            #{kw}
          </span>
        ))}
      </div>

      {/* 감성 mini bar */}
      <div
        className="flex items-center gap-2 mb-3 text-xs"
        role="img"
        aria-label={`긍정 ${posPct}%, 중립 ${sentTotal > 0 ? Math.round((t.sentiment.neutral / sentTotal) * 100) : 0}%, 부정 ${sentTotal > 0 ? Math.round((t.sentiment.negative / sentTotal) * 100) : 0}%`}
      >
        <span className="text-muted">감성</span>
        <div className="flex-1 h-1.5 bg-stone-100 rounded-sm overflow-hidden flex">
          <div
            className="bg-emerald-500"
            style={{
              width: `${(t.sentiment.positive / Math.max(sentTotal, 1)) * 100}%`,
            }}
          />
          <div
            className="bg-stone-400"
            style={{
              width: `${(t.sentiment.neutral / Math.max(sentTotal, 1)) * 100}%`,
            }}
          />
          <div
            className="bg-rose-500"
            style={{
              width: `${(t.sentiment.negative / Math.max(sentTotal, 1)) * 100}%`,
            }}
          />
        </div>
        <span className="text-emerald-700 font-semibold tabular-nums">
          😊 {posPct}%
        </span>
      </div>

      {/* 대표 청크 */}
      <div className="space-y-1.5 mt-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <BookOpen size={13} strokeWidth={2} aria-hidden /> 대표 근거 (상위{" "}
          {Math.min(t.chunks.length, 5)}개)
        </div>
        {t.chunks.slice(0, 5).map((c) => (
          <div
            key={c.chunk_id}
            className="px-3 py-2 rounded-md bg-stone-50 border border-stone-100 text-xs"
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{SENT_EMOJI[c.sentiment]}</span>
              <span
                className={`font-semibold ${
                  c.source_type === "expert" ? "text-brand" : "text-accent"
                }`}
              >
                {c.source_type === "expert" ? "전문가" : "사용자"}
              </span>
              <span className="text-muted">{c.author ?? "익명"}</span>
            </div>
            <p className="text-ink-soft leading-relaxed">
              {c.text.length > 140 ? c.text.slice(0, 140) + "…" : c.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
