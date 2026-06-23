"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Spinner } from "@/components/Spinner";

export function CompareSelector({
  productSlug,
  others,
}: {
  productSlug: string;
  others: Array<{ slug: string; name: string }>;
}) {
  const router = useRouter();
  const [other, setOther] = useState("");
  // 비교 페이지는 Modal fetch 로 수 초 걸림 → 전환 pending 동안 스피너로 진행 상태 노출.
  const [isPending, startTransition] = useTransition();

  function go() {
    if (!other) return;
    startTransition(() => {
      router.push(`/compare/${productSlug}/${other}`);
    });
  }

  if (others.length === 0) {
    return (
      <span className="text-xs text-muted">비교할 다른 제품이 아직 없어요</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={other}
        onChange={(e) => setOther(e.target.value)}
        disabled={isPending}
        aria-label="비교할 다른 제품 선택"
        className="px-3 py-1.5 text-sm rounded-md border border-line bg-card text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
      >
        <option value="">다른 제품과 비교…</option>
        {others.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name.length > 35 ? o.name.slice(0, 35) + "…" : o.name}
          </option>
        ))}
      </select>
      <button
        onClick={go}
        disabled={!other || isPending}
        aria-label="선택한 제품과 비교"
        aria-busy={isPending}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-md bg-ink text-ivory hover:bg-ink/90 disabled:bg-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {isPending ? (
          <>
            <Spinner size={14} /> 비교 중…
          </>
        ) : (
          <>
            비교 <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
          </>
        )}
      </button>
    </div>
  );
}
