import { ArrowLeft } from "lucide-react";
import { ReportDownloadButton } from "@/components/ReportDownloadButton";
import { getS1Data } from "@/lib/data";

export const dynamic = "force-dynamic";

// 한 장짜리 "제품 종합 리포트" — 제품 페이지와 동일 데이터를 인쇄용 문서로 재구성.
// 사용자 노출 문서이므로 내부 기술 용어(임베딩·LLM 등)는 쓰지 않는다.
export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getS1Data("cosmetics", slug);
  const { domain, product, ratings, sentiments, journey, documents, topics, evidenceChunks } =
    data;

  // ── 파생 지표 (제품 페이지와 같은 계산) ──
  const axes = domain.rating_axes ?? [];
  const ratingByAxis = new Map(ratings.map((r) => [r.axis, Number(r.score)]));
  const avgScore =
    ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + Number(r.score), 0) / ratings.length) * 10) / 10
      : 0;

  const sentCounts = sentiments.reduce(
    (acc, s) => {
      acc[s.sentiment] = (acc[s.sentiment] ?? 0) + 1;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 } as Record<string, number>,
  );
  const sentTotal = sentiments.length || 1;
  const posPctTotal = Math.round((sentCounts.positive / sentTotal) * 100);

  const expertCount = documents.filter((d) => d.source_type === "expert").length;
  const publicCount = documents.filter((d) => d.source_type === "public_review").length;

  const topKeywords = topics.slice(0, 8).flatMap((t) => t.keywords.slice(0, 3));
  const uniqueKeywords = Array.from(new Set(topKeywords)).slice(0, 10);

  const stages = domain.journey_stages ?? [];
  const journeyRows = stages.map((st) => {
    const inStage = journey.filter((j) => j.stage_key === st.key);
    const ids = new Set(inStage.map((j) => j.chunk_id));
    const ss = sentiments.filter((s) => ids.has(s.chunk_id));
    const pos = ss.filter((s) => s.sentiment === "positive").length;
    return {
      label: st.label,
      n: inStage.length,
      posPct: ss.length ? Math.round((pos / ss.length) * 100) : 0,
    };
  });

  const docById = new Map(documents.map((d) => [d.id, d]));
  const quotes = evidenceChunks.slice(0, 5).map((c) => {
    const d = docById.get(c.document_id);
    return {
      text: c.text,
      author: d?.author ?? "익명",
      source: d?.source_type === "expert" ? "전문가" : "일반",
    };
  });

  const today = new Date().toISOString().slice(0, 10);

  const sentRows = [
    { key: "positive", label: "긍정", n: sentCounts.positive, color: "bg-emerald-500" },
    { key: "neutral", label: "중립", n: sentCounts.neutral, color: "bg-stone-400" },
    { key: "negative", label: "부정", n: sentCounts.negative, color: "bg-rose-500" },
  ];

  return (
    <main className="min-h-full bg-stone-100 print:bg-white">
      {/* 화면 전용 툴바 — 인쇄/PDF 에는 안 나옴 */}
      <div className="print:hidden sticky top-0 z-10 bg-stone-100/90 backdrop-blur border-b border-line">
        <div className="max-w-[820px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <a
            href={`/products/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-md text-ink-soft hover:bg-stone-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ArrowLeft size={15} strokeWidth={2} aria-hidden /> 제품으로
          </a>
          <ReportDownloadButton
            slug={slug}
            domain="cosmetics"
            filename={`DILAB 리포트 - ${product.name}.pdf`}
          />
        </div>
      </div>

      {/* 문서 */}
      <article className="report-doc max-w-[820px] mx-auto my-6 print:my-0 bg-card border border-line rounded-xl shadow-sm print:shadow-none print:border-0 print:rounded-none px-8 sm:px-12 py-10 print:p-0">
        {/* 머리말 */}
        <header className="border-b-2 border-ink pb-5 mb-7">
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl leading-none text-ink">DILAB</span>
            <span className="text-[11px] tracking-[0.18em] text-muted uppercase">
              제품 종합 리포트
            </span>
          </div>
          <h1 className="font-display text-4xl text-ink mt-5 leading-tight">{product.name}</h1>
          <p className="text-sm text-muted mt-2">
            {[product.brand, product.category].filter(Boolean).join(" · ")} · 분석 기준일{" "}
            <span className="tabular-nums">{today}</span>
          </p>
        </header>

        {/* 요약 */}
        <section className="mb-9 break-inside-avoid">
          <div className="flex items-stretch gap-6">
            <div className="shrink-0 text-center">
              <div className="font-display text-6xl text-brand leading-none tabular-nums">
                {avgScore}
              </div>
              <div className="text-xs text-muted mt-1.5">종합 점수 / 10</div>
            </div>
            <div className="border-l border-line pl-6 flex flex-col justify-center">
              <p className="text-[15px] leading-relaxed text-ink">
                전문가 리뷰 <strong className="tabular-nums">{expertCount}</strong>건과 일반 사용자
                후기 <strong className="tabular-nums">{publicCount}</strong>건을 함께 분석했어요.
                5가지 기준으로 본 종합 점수는{" "}
                <strong className="tabular-nums">{avgScore}점</strong>, 전체 의견 중{" "}
                <strong className="tabular-nums">{posPctTotal}%</strong>가 긍정적이었어요.
              </p>
            </div>
          </div>
        </section>

        {/* 5축 평가 */}
        <section className="mb-9 break-inside-avoid">
          <SectionHeading>5가지 기준 평가</SectionHeading>
          <ul className="space-y-3">
            {axes.map((axis) => {
              const score = ratingByAxis.get(axis);
              const pct = score != null ? (score / 10) * 100 : 0;
              return (
                <li key={axis}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink-soft font-medium">{axis}</span>
                    <span className="tabular-nums font-semibold text-brand">
                      {score != null ? score.toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-stone-200 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-brand rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted mt-3">
            점수는 후기별 분위기를 가중 평균한 참고용 추정값이에요 (10점 만점).
          </p>
        </section>

        {/* 리뷰 분위기 */}
        <section className="mb-9 break-inside-avoid">
          <SectionHeading>리뷰 분위기 ({sentiments.length}개)</SectionHeading>
          <ul className="space-y-2.5">
            {sentRows.map((r) => {
              const pct = Math.round((r.n / sentTotal) * 100);
              return (
                <li key={r.key} className="flex items-center gap-3 text-sm">
                  <span className="w-9 text-ink-soft">{r.label}</span>
                  <div className="flex-1 h-3 rounded-full bg-stone-200 overflow-hidden">
                    <div className={`h-full ${r.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 text-right tabular-nums text-muted">
                    {r.n}개 · {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 키워드 */}
        {uniqueKeywords.length > 0 && (
          <section className="mb-9 break-inside-avoid">
            <SectionHeading>자주 언급된 키워드</SectionHeading>
            <div className="flex flex-wrap gap-2">
              {uniqueKeywords.map((k) => (
                <span
                  key={k}
                  className="px-3 py-1 rounded-full bg-brand-soft text-brand text-sm border border-brand/15"
                >
                  {k}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 구매 여정 */}
        {journeyRows.length > 0 && (
          <section className="mb-9 break-inside-avoid">
            <SectionHeading>구매 여정 분석</SectionHeading>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-line text-muted text-xs uppercase tracking-wide">
                  <th className="py-2 text-left font-medium">단계</th>
                  <th className="py-2 text-right font-medium">언급</th>
                  <th className="py-2 text-right font-medium">긍정 비율</th>
                </tr>
              </thead>
              <tbody>
                {journeyRows.map((r) => (
                  <tr key={r.label} className="border-b border-line/60">
                    <td className="py-2 text-ink-soft">{r.label}</td>
                    <td className="py-2 text-right tabular-nums">{r.n}건</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-emerald-600">
                      {r.posPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted mt-2">
              * 후기 속 표현을 단계별로 자동 분류한 참고용 추정값이에요.
            </p>
          </section>
        )}

        {/* 대표 후기 */}
        {quotes.length > 0 && (
          <section className="mb-9 break-inside-avoid">
            <SectionHeading>대표 후기</SectionHeading>
            <div className="space-y-3">
              {quotes.map((q, i) => (
                <blockquote
                  key={i}
                  className="border-l-4 border-accent bg-accent-soft/40 rounded-r-md px-4 py-3"
                >
                  <p className="text-sm text-ink leading-relaxed">“{q.text}”</p>
                  <footer className="text-xs text-muted mt-1.5">
                    — {q.author} · {q.source}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* 꼬리말 */}
        <footer className="border-t border-line pt-5 mt-10 text-xs text-muted leading-relaxed">
          <p>
            이 리포트는 전문가 리뷰와 공개 후기를 함께 분석해 자동 생성되었어요. 모든 평가는 출처를
            추적할 수 있는 근거를 바탕으로 합니다.
          </p>
          <p className="mt-2">
            생성일 <span className="tabular-nums">{today}</span> · DILAB 제품 평가 인텔리전스
          </p>
        </footer>
      </article>
    </main>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
      <span className="w-1 h-5 bg-brand rounded-full inline-block" aria-hidden />
      {children}
    </h2>
  );
}
