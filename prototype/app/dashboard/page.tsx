import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { getDomainStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const params = await searchParams;
  const stats = await getDomainStats(params.domain ?? "cosmetics");

  const totalSent =
    stats.sentiment_dist.positive +
    stats.sentiment_dist.neutral +
    stats.sentiment_dist.negative;
  const posPct =
    totalSent > 0
      ? Math.round((stats.sentiment_dist.positive / totalSent) * 100)
      : 0;

  // 토픽 점유율 계산
  const totalTopicDocs = stats.topics.reduce((s, t) => s + t.doc_count, 0);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <header className="border-b border-line pb-4 mb-5">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
          <LayoutDashboard size={14} strokeWidth={2} aria-hidden /> 도메인 대시보드
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {stats.domain.name}
        </h1>
        <p className="text-sm text-muted mt-1">
          slug: <code>{stats.domain.slug}</code> · 5축 평가:{" "}
          {stats.domain.rating_axes.join(" · ")}
        </p>
      </header>

      {/* KPI */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <Kpi label="제품" n={stats.counts.products} hint="분석 완료" />
        <Kpi label="수집 자료" n={stats.counts.documents} hint="후기 + 전문가" />
        <Kpi label="근거 구절" n={stats.counts.chunks} hint="AI 의미 분석" />
        <Kpi label="토픽" n={stats.counts.topics} hint="AI 주제 분류" />
        <Kpi
          label="Ask 호출"
          n={stats.counts.ask_queries}
          hint={`도메인 평균 긍정 ${posPct}%`}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 제품 리스트 */}
        <div className="lg:col-span-8 bg-card rounded-xl border border-line p-5 shadow-sm">
          <h2 className="text-base font-bold text-ink mb-3">
            분석된 제품 ({stats.products.length})
          </h2>
          {stats.products.length === 0 ? (
            <p className="text-sm text-muted">아직 분석된 제품이 없어요.</p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="text-xs text-muted border-b border-line">
                  <tr>
                    <th className="text-left py-2 font-medium">제품</th>
                    <th className="text-right font-medium">종합</th>
                    {stats.domain.rating_axes.map((ax) => (
                      <th key={ax} className="text-right font-medium">
                        {ax}
                      </th>
                    ))}
                    <th className="text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.products.map((p) => (
                    <tr key={p.id} className="border-b border-stone-100">
                      <td className="py-2.5">
                        <Link
                          href={`/products/${p.slug}`}
                          className="font-medium text-ink hover:text-brand"
                        >
                          {p.name.length > 42
                            ? p.name.slice(0, 42) + "…"
                            : p.name}
                        </Link>
                        <div className="text-xs text-muted">{p.brand}</div>
                      </td>
                      <td className="text-right tabular-nums font-semibold text-brand">
                        {p.avg_score.toFixed(1)}
                      </td>
                      {stats.domain.rating_axes.map((ax) => {
                        const v = p.ratings[ax];
                        return (
                          <td
                            key={ax}
                            className="text-right tabular-nums text-ink-soft"
                          >
                            {v !== undefined ? v.toFixed(1) : "—"}
                          </td>
                        );
                      })}
                      <td className="text-right">
                        <Link
                          href={`/products/${p.slug}`}
                          className="text-xs text-brand hover:underline"
                        >
                          리포트 →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 토픽 + 감성 */}
        <aside className="lg:col-span-4 space-y-4">
          {/* 도메인 감성 */}
          <div className="bg-card rounded-xl border border-line p-5 shadow-sm">
            <h2 className="text-base font-bold text-ink mb-3">
              도메인 전체 감성 분포
            </h2>
            <SentRow
              label="😊 좋아요"
              n={stats.sentiment_dist.positive}
              total={totalSent}
              color="bg-emerald-500"
            />
            <div className="h-2" />
            <SentRow
              label="😐 그저그래요"
              n={stats.sentiment_dist.neutral}
              total={totalSent}
              color="bg-stone-400"
            />
            <div className="h-2" />
            <SentRow
              label="😣 아쉬워요"
              n={stats.sentiment_dist.negative}
              total={totalSent}
              color="bg-rose-500"
            />
          </div>

          {/* 토픽 점유율 */}
          <div className="bg-card rounded-xl border border-line p-5 shadow-sm">
            <h2 className="text-base font-bold text-ink mb-3">
              토픽 점유율 ({stats.topics.length})
            </h2>
            {stats.topics.length === 0 ? (
              <p className="text-sm text-muted">토픽이 아직 없어요.</p>
            ) : (
              <ul className="space-y-2">
                {stats.topics.map((t, i) => {
                  const pct =
                    totalTopicDocs > 0
                      ? Math.round((t.doc_count / totalTopicDocs) * 100)
                      : 0;
                  return (
                    <li key={i} className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-ink">
                          {t.keywords.slice(0, 3).join(" · ")}
                        </span>
                        <span className="text-xs text-muted tabular-nums">
                          {pct}% ({t.doc_count})
                        </span>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-brand"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </section>

      <footer className="mt-6 text-xs text-muted">
        모든 데이터는 실시간으로 반영돼요 · 새 도메인을 추가하면 모든 화면이 자동으로
        따라옵니다.
      </footer>
    </main>
  );
}

function Kpi({ label, n, hint }: { label: string; n: number; hint: string }) {
  return (
    <div className="bg-card rounded-xl border border-line p-4 shadow-sm">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-display text-4xl text-brand tabular-nums leading-tight">
        {n}
      </div>
      <div className="text-xs text-muted mt-1">{hint}</div>
    </div>
  );
}

function SentRow({
  label,
  n,
  total,
  color,
}: {
  label: string;
  n: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-ink-soft">{label}</span>
      <div className="flex-1 h-5 bg-stone-100 rounded-sm overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-sm font-semibold tabular-nums text-ink">
        {pct}%
      </span>
    </div>
  );
}
