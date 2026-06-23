import Link from "next/link";
import { Scale } from "lucide-react";
import { CompareRadar } from "@/components/CompareRadar";
import { InsightsPanel } from "@/components/InsightsPanel";

export const dynamic = "force-dynamic";
// Server Component 에서는 process.env 직접 사용 (OpenNext 가 vars + secrets 자동 매핑).
// getCloudflareContext() 는 RSC evaluation 시점에 throw 위험 → worker bundle 전체 깨뜨림.

type Snapshot = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  ratings: Record<string, number>;
  top_keywords: string[];
  sentiment_dist: Record<string, number>;
  document_count: number;
};

type Diff = {
  axis: string;
  a_score: number;
  b_score: number;
  gap: number;
  winner: string;
};

type CompareData = {
  a: Snapshot;
  b: Snapshot;
  differentiators: Diff[];
  a_strengths: string[];
  b_strengths: string[];
  marketing_actions: string[];
  positioning_line: string;
  llm_model: string;
};

async function getCompare(a: string, b: string): Promise<CompareData> {
  const modalUrl = process.env.MODAL_COMPARE_URL;
  const proxyToken = process.env.MODAL_PROXY_TOKEN;
  if (!modalUrl || !proxyToken) {
    throw new Error("MODAL_COMPARE_URL / MODAL_PROXY_TOKEN missing at runtime");
  }
  const res = await fetch(modalUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      _token: proxyToken,
      slug_a: a,
      slug_b: b,
      domain_slug: "cosmetics",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`compare ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as CompareData | { error: string };
  if ("error" in data) {
    throw new Error(`compare: ${data.error}`);
  }
  return data;
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}) {
  const { a, b } = await params;
  const data = await getCompare(a, b);

  const radarData = data.differentiators.map((d) => ({
    axis: d.axis,
    a: d.a_score,
    b: d.b_score,
  }));

  const aLabel = data.a.brand || data.a.name.slice(0, 12);
  const bLabel = data.b.brand || data.b.name.slice(0, 12);

  const aPosPct = totalPct(data.a.sentiment_dist);
  const bPosPct = totalPct(data.b.sentiment_dist);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <header className="border-b border-line pb-4 mb-5">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
          <Scale size={14} strokeWidth={2} aria-hidden /> 데이터 기반 경쟁 비교
        </div>
        <h1 className="text-xl font-bold tracking-tight leading-relaxed text-ink">
          <span className="text-brand">{data.a.name}</span>
          <span className="mx-3 text-muted">vs</span>
          <span className="text-accent">{data.b.name}</span>
        </h1>
        <p className="text-xs text-muted mt-2">
          <span className="text-brand font-medium">A 자사 {aLabel}</span> · 분석
          문서 {data.a.document_count}건 · 긍정 {aPosPct}%
          <span className="mx-3 text-stone-300">|</span>
          <span className="text-accent font-medium">B 경쟁사 {bLabel}</span> ·
          분석 문서 {data.b.document_count}건 · 긍정 {bPosPct}%
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-card rounded-xl border border-line p-5 shadow-sm">
          <h2 className="text-base font-bold text-ink mb-3">5축 비교</h2>
          <CompareRadar data={radarData} aLabel={aLabel} bLabel={bLabel} />

          <div className="overflow-x-auto -mx-5 px-5 mt-4">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="text-muted border-b border-line text-xs">
                <tr>
                  <th className="text-left py-2 font-medium">축</th>
                  <th className="text-right font-medium">A</th>
                  <th className="text-right font-medium">B</th>
                  <th className="text-right font-medium">차이</th>
                  <th className="text-right font-medium">우위</th>
                </tr>
              </thead>
              <tbody>
                {data.differentiators.map((d) => (
                  <tr key={d.axis} className="border-b border-stone-100">
                    <td className="py-2 font-medium text-ink">{d.axis}</td>
                    <td className="text-right tabular-nums">
                      {d.a_score.toFixed(1)}
                    </td>
                    <td className="text-right tabular-nums">
                      {d.b_score.toFixed(1)}
                    </td>
                    <td className="text-right tabular-nums text-muted">
                      {d.gap > 0 ? "+" : ""}
                      {d.gap.toFixed(1)}
                    </td>
                    <td className="text-right text-xs">
                      {d.winner === "A" && (
                        <span className="text-brand font-bold">A</span>
                      )}
                      {d.winner === "B" && (
                        <span className="text-accent font-bold">B</span>
                      )}
                      {d.winner === "tie" && (
                        <span className="text-muted" aria-label="동률">
                          =
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5">
          <InsightsPanel
            aName={aLabel}
            bName={bLabel}
            aStrengths={data.a_strengths}
            bStrengths={data.b_strengths}
            actions={data.marketing_actions}
            positioning={data.positioning_line}
          />
        </div>
      </section>

      <footer className="mt-6 flex items-center justify-between text-xs text-muted">
        <span>
          생성형 AI 합성 · 실시간 데이터 · 5축 점수는 근거별 감성 가중 평균
        </span>
        <div className="flex gap-3">
          <Link href={`/products/${a}`} className="text-brand hover:underline">
            ← A 리포트
          </Link>
          <Link href={`/products/${b}`} className="text-accent hover:underline">
            B 리포트 →
          </Link>
        </div>
      </footer>
    </main>
  );
}

function totalPct(dist: Record<string, number>): number {
  const total =
    (dist.positive ?? 0) + (dist.neutral ?? 0) + (dist.negative ?? 0);
  if (total === 0) return 0;
  return Math.round(((dist.positive ?? 0) / total) * 100);
}
