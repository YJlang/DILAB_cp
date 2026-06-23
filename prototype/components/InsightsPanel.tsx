import { Target, Gem, Scale, Lightbulb } from "lucide-react";

export function InsightsPanel({
  aName,
  bName,
  aStrengths,
  bStrengths,
  actions,
  positioning,
}: {
  aName: string;
  bName: string;
  aStrengths: string[];
  bStrengths: string[];
  actions: string[];
  positioning: string;
}) {
  return (
    <div className="space-y-4">
      {positioning && (
        <div className="rounded-xl border border-brand/30 bg-brand-soft/60 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand mb-2 tracking-wide uppercase">
            <Target size={13} strokeWidth={2.2} aria-hidden /> 한 줄 포지셔닝 (자사)
          </div>
          <p className="text-base font-bold text-ink leading-relaxed">
            “{positioning}”
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StrengthCard title={`${aName} 강점`} items={aStrengths} tone="primary" />
        <StrengthCard title={`${bName} 강점`} items={bStrengths} tone="accent" />
      </div>

      {actions.length > 0 && (
        <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-3 tracking-wide uppercase">
            <Lightbulb size={13} strokeWidth={2.2} aria-hidden /> 추천 마케팅 액션
            (자사)
          </div>
          <ul className="space-y-2 text-sm">
            {actions.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand font-bold tabular-nums">
                  {i + 1}.
                </span>
                <span className="text-ink-soft leading-relaxed">{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const TONE: Record<
  "primary" | "accent",
  { box: string; Icon: typeof Gem }
> = {
  primary: { box: "bg-brand-soft/60 border-brand/20", Icon: Gem },
  accent: { box: "bg-accent-soft/50 border-accent/20", Icon: Scale },
};

function StrengthCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "primary" | "accent";
}) {
  const { box, Icon } = TONE[tone];
  return (
    <div className={`rounded-lg border ${box} p-4`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-ink mb-2 tracking-wide">
        <Icon size={13} strokeWidth={2} aria-hidden /> {title}
      </div>
      <ul className="space-y-1.5 text-sm text-ink-soft">
        {items.map((s, i) => (
          <li key={i}>• {s}</li>
        ))}
      </ul>
    </div>
  );
}
