export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="print:hidden border-t border-line bg-card/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <span className="font-display text-lg leading-none text-ink">DILAB</span>
          <span className="text-xs text-muted">
            © {year} · DILAB
          </span>
        </div>
        <span className="text-xs text-muted">
          AI 의미 분석 · 출처 추적 · 실시간 평가
        </span>
      </div>
    </footer>
  );
}
