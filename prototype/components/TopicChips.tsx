export function TopicChips({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0)
    return <p className="text-sm text-muted">토픽이 아직 분리되지 않았어요.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((kw) => (
        <span
          key={kw}
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-brand-soft text-brand"
        >
          #{kw}
        </span>
      ))}
    </div>
  );
}
