"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, Layers } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "대시보드", Icon: LayoutDashboard },
  { href: "/ask", label: "Ask", Icon: Sparkles },
  { href: "/topics", label: "토픽", Icon: Layers },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="print:hidden sticky top-0 z-40 bg-ivory/85 backdrop-blur border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        <Link
          href="/"
          aria-label="DILAB 홈으로"
          className="flex items-baseline gap-2 rounded-md hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span className="font-display text-2xl leading-none text-ink">DILAB</span>
          <span className="hidden sm:inline text-[11px] tracking-wide text-muted">
            제품 평가 인텔리전스
          </span>
        </Link>

        <nav aria-label="주요 메뉴" className="flex items-center gap-0.5 sm:gap-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 min-h-[44px] px-2.5 sm:px-3 py-2 rounded-md text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  active
                    ? "bg-stone-100 text-ink font-semibold"
                    : "text-ink-soft font-medium hover:bg-stone-50 hover:text-ink"
                }`}
              >
                <Icon size={16} strokeWidth={2} aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
