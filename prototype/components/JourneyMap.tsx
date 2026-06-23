import { Route } from "lucide-react";

type Stage = {
  key: string;
  label: string;
  order: number;
};

type StageData = {
  n: number;
  positive_pct: number;
};

export function JourneyMap({
  stages,
  data,
}: {
  stages: Stage[];
  data: Record<string, StageData>;
}) {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  return (
    <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="flex items-center gap-1.5 text-base font-bold text-ink">
          <Route size={16} strokeWidth={2} aria-hidden /> 사람들의 구매·사용 여정
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sorted.map((s, i) => {
          const d = data[s.key];
          const isHighlight = s.key === "rebuy";
          return (
            <div
              key={s.key}
              className={`rounded-lg p-4 border ${
                isHighlight
                  ? "bg-accent-soft/50 border-accent/30"
                  : "bg-stone-50 border-line"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`w-6 h-6 rounded-full text-white grid place-items-center text-xs font-bold ${
                    isHighlight ? "bg-accent" : "bg-brand"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isHighlight ? "text-accent" : "text-ink-soft"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-muted">
                  <span className="font-semibold text-ink tabular-nums">
                    {d?.n ?? 0}명
                  </span>{" "}
                  언급
                </span>
                <span
                  className={`tabular-nums font-semibold ${
                    (d?.positive_pct ?? 0) >= 70
                      ? "text-emerald-700"
                      : "text-muted"
                  }`}
                >
                  😊 {d?.positive_pct ?? 0}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted italic mt-3">
        * AI 자동 추정 (정확도 약 80%) — 정확한 분류가 아닌 경향 참고용
      </p>
    </div>
  );
}
