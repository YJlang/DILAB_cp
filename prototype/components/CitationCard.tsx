import { Library, FlaskConical, Users } from "lucide-react";

export function CitationCard({
  expertCount,
  publicCount,
}: {
  expertCount: number;
  publicCount: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-3 tracking-wide">
        <Library size={14} strokeWidth={2} aria-hidden /> 어디서 가져온 정보?
      </div>

      <Row
        Icon={FlaskConical}
        label="전문가 의견"
        n={expertCount}
        bar="bg-brand"
      />
      <div className="h-3" />
      <Row Icon={Users} label="일반 사용자" n={publicCount} bar="bg-accent" />

      <p className="text-xs text-muted mt-4 leading-relaxed">
        모든 평가는 위 출처에 기반해요. 클릭하면 원문 인용이 펼쳐져요.
      </p>
    </div>
  );
}

function Row({
  Icon,
  label,
  n,
  bar,
}: {
  Icon: typeof FlaskConical;
  label: string;
  n: number;
  bar: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-sm">
        <span className="inline-flex items-center gap-1.5 text-ink-soft">
          <Icon size={15} strokeWidth={2} aria-hidden /> {label}
        </span>
        <span className="font-semibold tabular-nums text-ink">{n}건</span>
      </div>
      <div className="h-2 bg-stone-100 rounded-sm overflow-hidden">
        <div
          className={`h-full ${bar}`}
          style={{ width: n > 0 ? "100%" : "0%" }}
        />
      </div>
    </div>
  );
}
