import { Sparkles, Route, Heart, Quote, Leaf, FileText } from "lucide-react";
import { AskBox } from "@/components/AskBox";
import { CitationCard } from "@/components/CitationCard";
import { CompareSelector } from "@/components/CompareSelector";
import { JourneyMap } from "@/components/JourneyMap";
import { RadarChart } from "@/components/RadarChart";
import { SentimentBars } from "@/components/SentimentBars";
import { TopicChips } from "@/components/TopicChips";
import { getS1Data, listProductsInDomain } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getS1Data("cosmetics", slug);
  const { domain, product, ratings, sentiments, journey, documents, topics } = data;
  const allProducts = await listProductsInDomain("cosmetics");
  const otherProducts = allProducts.filter((p) => p.slug !== slug);

  // 5축 데이터
  const radarData = (domain.rating_axes ?? []).map((axis) => {
    const r = ratings.find((x) => x.axis === axis);
    return { axis, product: Number(r?.score ?? 0), category: 7.0 };
  });
  const avgScore =
    ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + Number(r.score), 0) / ratings.length) * 10) / 10
      : 0;

  // 감성 분포
  const sentCounts = sentiments.reduce(
    (acc, s) => {
      acc[s.sentiment] = (acc[s.sentiment] ?? 0) + 1;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 } as Record<string, number>
  );

  // 출처 count (documents 기반)
  const expertCount = documents.filter((d) => d.source_type === "expert").length;
  const publicCount = documents.filter((d) => d.source_type === "public_review").length;

  // 토픽 키워드 — 도메인 단위 상위 토픽의 키워드 모음
  const topKeywords = topics.slice(0, 8).flatMap((t) => t.keywords.slice(0, 3));
  const uniqueKeywords = Array.from(new Set(topKeywords)).slice(0, 8);

  // 여정 단계별 집계
  const journeyByStage: Record<string, { n: number; positive_pct: number }> = {};
  const stages = domain.journey_stages ?? [];
  for (const st of stages) {
    const inStage = journey.filter((j) => j.stage_key === st.key);
    const n = inStage.length;
    if (n === 0) {
      journeyByStage[st.key] = { n: 0, positive_pct: 0 };
      continue;
    }
    const stageChunkIds = new Set(inStage.map((j) => j.chunk_id));
    const stageSents = sentiments.filter((s) => stageChunkIds.has(s.chunk_id));
    const posN = stageSents.filter((s) => s.sentiment === "positive").length;
    journeyByStage[st.key] = {
      n,
      positive_pct: stageSents.length > 0 ? Math.round((posN / stageSents.length) * 100) : 0,
    };
  }

  const fetchedAt = new Date().toISOString().slice(0, 10);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* 페이지 헤더 — 제품 정보 + 액션 */}
      <header className="border-b border-line pb-4 mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
            <Leaf size={14} strokeWidth={2} aria-hidden /> {domain.name}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {product.name}
          </h1>
          <p className="text-sm text-muted mt-1">
            {product.brand} · {product.category} ·{" "}
            <span className="tabular-nums">{fetchedAt} 분석</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <a
            href={`/ask?product=${slug}`}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-brand/30 bg-brand-soft hover:bg-brand-soft/70 text-brand font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Sparkles size={15} strokeWidth={2} aria-hidden /> Ask
          </a>
          <a
            href={`/journey/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-accent/30 bg-accent-soft/60 hover:bg-accent-soft text-accent font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Route size={15} strokeWidth={2} aria-hidden /> 여정
          </a>
          <CompareSelector productSlug={slug} others={otherProducts} />
          <a
            href={`/products/${slug}/report`}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-line hover:bg-stone-50 text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <FileText size={15} strokeWidth={2} aria-hidden /> 리포트
          </a>
          <button
            type="button"
            aria-label="이 제품 저장"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-line hover:bg-stone-50 text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Heart size={15} strokeWidth={2} aria-hidden /> 저장
          </button>
        </div>
      </header>

      {/* 한 줄 결론 */}
      <section className="mb-5">
        <div className="bg-accent-soft/50 border-l-4 border-accent rounded-md px-5 py-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-accent mb-1 tracking-wide uppercase">
            <Quote size={13} strokeWidth={2.2} aria-hidden /> 한 줄 결론
          </div>
          <p className="text-[15px] leading-relaxed text-ink">
            전문가 {expertCount}건 · 일반 사용자 {publicCount}명의 의견을 분석한 결과,
            종합 평점 <strong className="tabular-nums">{avgScore}/10</strong> 입니다.{" "}
            아래 데이터로 자세히 살펴보세요.
          </p>
        </div>
      </section>

      {/* 본문 그리드 */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측 2/3 */}
        <div className="lg:col-span-8 space-y-5">
          {/* 5축 레이더 */}
          <div className="bg-card rounded-xl border border-line p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-3">
              <h2 className="text-base font-bold text-ink">
                이 제품의 5가지 강점·약점
              </h2>
              <span className="text-xs text-muted">
                카테고리 평균 7.0 점선 · 제품 점수 강조색
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              <RadarChart data={radarData} />
              <div className="space-y-3 text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl text-brand tabular-nums leading-none">
                    {avgScore}
                  </span>
                  <span className="text-muted">/ 10 종합 점수</span>
                </div>
                <ul className="space-y-1.5 mt-3">
                  {radarData.map((d) => (
                    <li key={d.axis} className="flex justify-between gap-3">
                      <span className="text-ink-soft">{d.axis}</span>
                      <span className="tabular-nums font-semibold text-brand">
                        {d.product.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 감성 + 토픽 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-card rounded-xl border border-line p-5 shadow-sm">
              <h2 className="text-base font-bold text-ink mb-4">
                리뷰 {sentiments.length}개의 분위기
              </h2>
              <SentimentBars
                counts={{
                  positive: sentCounts.positive ?? 0,
                  neutral: sentCounts.neutral ?? 0,
                  negative: sentCounts.negative ?? 0,
                }}
              />
            </div>
            <div className="bg-card rounded-xl border border-line p-5 shadow-sm">
              <h2 className="text-base font-bold text-ink mb-3">
                자주 말하는 키워드 ({uniqueKeywords.length})
              </h2>
              <TopicChips keywords={uniqueKeywords} />
            </div>
          </div>
        </div>

        {/* 우측 1/3 */}
        <aside className="lg:col-span-4 space-y-5">
          <CitationCard expertCount={expertCount} publicCount={publicCount} />
          <AskBox domainSlug="cosmetics" productSlug={slug} />
        </aside>
      </section>

      {/* 여정 지도 */}
      <section className="mt-5">
        <JourneyMap stages={stages} data={journeyByStage} />
      </section>

      <footer className="mt-6 text-xs text-muted">
        모든 데이터는 실시간 반영 · AI 의미 분석 · 생성형 AI 리포트. 근거 구절은
        평가·답변마다 추적돼요.
      </footer>
    </main>
  );
}
