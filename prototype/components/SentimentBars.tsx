type Counts = { positive: number; neutral: number; negative: number };

export function SentimentBars({ counts }: { counts: Counts }) {
  const total = counts.positive + counts.neutral + counts.negative;
  if (total === 0)
    return <p className="text-sm text-muted">감성 데이터가 아직 없어요.</p>;

  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div
      className="space-y-2"
      role="img"
      aria-label={`긍정 ${pct(counts.positive)}%, 중립 ${pct(counts.neutral)}%, 부정 ${pct(counts.negative)}%`}
    >
      <Row label="😊 좋아요" pct={pct(counts.positive)} color="bg-emerald-500" />
      <Row label="😐 그저그래요" pct={pct(counts.neutral)} color="bg-stone-400" />
      <Row label="😣 아쉬워요" pct={pct(counts.negative)} color="bg-rose-500" />
    </div>
  );
}

function Row({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 sm:w-24 shrink-0 text-sm text-ink-soft">{label}</span>
      <div className="flex-1 h-5 bg-stone-100 rounded-sm overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
        {pct}%
      </span>
    </div>
  );
}
