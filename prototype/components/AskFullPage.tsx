"use client";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Package,
  FlaskConical,
  Wallet,
  Wind,
  Leaf,
  RefreshCw,
  MessageSquareText,
  CircleCheck,
  Library,
  BookOpen,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";

type Citation = {
  rank: number;
  cite_type: string;
  author: string | null;
  text: string;
  similarity: number;
  author_credibility: number | null;
};

type Turn = {
  id: string;
  query: string;
  loading: boolean;
  error?: string;
  answer?: string;
  recommendation?: string;
  citations?: Citation[];
  llm_model?: string;
  latency_ms?: number;
  expert_count?: number;
  public_count?: number;
};

const CATEGORIES: { tag: string; Icon: LucideIcon; items: string[] }[] = [
  {
    tag: "효능",
    Icon: Sparkles,
    items: [
      "진정 효과는 어떤가요?",
      "트러블에 도움 되나요?",
      "보습력은 충분한가요?",
    ],
  },
  {
    tag: "성분",
    Icon: FlaskConical,
    items: [
      "주요 성분이 뭐예요?",
      "어성초 함량의 의미는?",
      "민감 피부에 자극되는 성분 있나요?",
    ],
  },
  {
    tag: "가성비",
    Icon: Wallet,
    items: ["가성비는 어떤가요?", "용량 대비 가치는?"],
  },
  {
    tag: "향·사용감",
    Icon: Wind,
    items: ["향이 어떤가요?", "끈적임 없나요?", "산뜻한 편인가요?"],
  },
  {
    tag: "피부 타입",
    Icon: Leaf,
    items: ["민감성 피부에 괜찮나요?", "지성·복합성 피부에도 맞나요?"],
  },
  {
    tag: "재구매",
    Icon: RefreshCw,
    items: ["재구매할 만한가요?", "꾸준히 써야 효과 보이나요?"],
  },
];

export function AskFullPage({
  domain,
  initialProduct,
  products,
}: {
  domain: string;
  initialProduct: string | null;
  products: Array<{ slug: string; name: string; brand: string | null }>;
}) {
  const [productSlug, setProductSlug] = useState(
    initialProduct ?? products[0]?.slug ?? ""
  );
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function send(q?: string) {
    const queryToSend = (q ?? query).trim();
    if (!queryToSend) return;

    const turnId = `t${Date.now()}`;
    setTurns((prev) => [
      ...prev,
      { id: turnId, query: queryToSend, loading: true },
    ]);
    setQuery("");

    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryToSend,
          domain,
          product: productSlug || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === turnId
              ? {
                  ...t,
                  loading: false,
                  error: data.error ?? `HTTP ${r.status}`,
                }
              : t
          )
        );
        return;
      }
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? {
                ...t,
                loading: false,
                answer: data.answer,
                recommendation: data.recommendation,
                citations: data.citations,
                llm_model: data.llm_model,
                latency_ms: data.latency_ms,
                expert_count: data.expert_count,
                public_count: data.public_count,
              }
            : t
        )
      );
    } catch (e) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId ? { ...t, loading: false, error: String(e) } : t
        )
      );
    }
  }

  const currentProduct = products.find((p) => p.slug === productSlug);
  const sending = turns.some((t) => t.loading);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <header className="border-b border-line pb-4 mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
            <Sparkles size={14} strokeWidth={2} aria-hidden /> 자연어 질의 응답
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Ask</h1>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="ask-product"
            className="flex items-center gap-1 text-xs text-muted"
          >
            <Package size={13} strokeWidth={2} aria-hidden /> 분석 대상
          </label>
          <select
            id="ask-product"
            value={productSlug}
            onChange={(e) => {
              setProductSlug(e.target.value);
              setTurns([]);
            }}
            className="px-3 py-1.5 text-sm rounded-md border border-line bg-card text-ink-soft max-w-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <option value="">{`도메인 전체 (${domain})`}</option>
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name.length > 50 ? p.name.slice(0, 50) + "…" : p.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 모바일에선 대화가 위, 예시는 아래로 collapse */}
        <aside className="order-2 lg:order-1 lg:col-span-3 space-y-3">
          <details
            className="bg-card rounded-xl border border-line p-4 shadow-sm"
            open
          >
            <summary className="text-xs font-semibold text-muted tracking-wide uppercase cursor-pointer lg:cursor-default list-none">
              예시 질문
            </summary>
            <div className="space-y-3 mt-3">
              {CATEGORIES.map((c) => (
                <div key={c.tag}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft mb-1.5">
                    <c.Icon size={13} strokeWidth={2} aria-hidden /> {c.tag}
                  </div>
                  <div className="space-y-1">
                    {c.items.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="block w-full text-left text-xs px-2 py-1.5 rounded hover:bg-brand-soft text-ink-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </aside>

        {/* 우측 — 대화 */}
        <section className="order-1 lg:order-2 lg:col-span-9 space-y-4">
          <div className="min-h-[60vh] bg-card rounded-xl border border-line p-5 shadow-sm">
            {turns.length === 0 ? (
              <EmptyState productName={currentProduct?.name} />
            ) : (
              <div className="space-y-6">
                {turns.map((t) => (
                  <TurnView key={t.id} turn={t} />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* 입력 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='예: "민감성 피부에 괜찮을까요?"'
              aria-label="질문 입력"
              className="flex-1 px-4 py-3 text-sm rounded-md border border-line bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
            <button
              type="submit"
              disabled={!query.trim() || sending}
              aria-busy={sending}
              className="inline-flex items-center gap-1.5 px-5 py-3 text-sm font-semibold rounded-md bg-ink text-ivory disabled:bg-stone-300 hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {sending ? (
                <>
                  <Spinner size={15} /> 답변 받는 중…
                </>
              ) : (
                <>
                  물어보기 <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function EmptyState({ productName }: { productName: string | undefined }) {
  return (
    <div className="text-center py-16 text-muted">
      <MessageSquareText
        size={40}
        strokeWidth={1.5}
        className="mx-auto mb-3 text-stone-300"
        aria-hidden
      />
      <p className="text-sm">
        {productName ? (
          <>
            <strong className="text-ink-soft">{productName}</strong> 에 대해
            궁금한 것을 물어보세요.
          </>
        ) : (
          "분석된 제품에 대해 자유롭게 질문해 보세요."
        )}
      </p>
      <p className="text-xs mt-2">
        왼쪽 예시 질문을 클릭하거나, 아래 입력창에 직접 입력하면 돼요.
      </p>
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-ink text-ivory text-sm">
          {turn.query}
        </div>
      </div>

      {turn.loading && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
          분석 중…
        </div>
      )}

      {turn.error && (
        <div className="text-sm text-ink-soft bg-stone-50 border border-line rounded-md p-3">
          ⚠️ {turn.error}
        </div>
      )}

      {turn.answer && (
        <div className="space-y-2.5">
          <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">
              {turn.answer}
            </p>
          </div>

          {turn.recommendation && (
            <div className="rounded-md border border-accent/30 bg-accent-soft/50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-accent mb-1">
                <CircleCheck size={13} strokeWidth={2.2} aria-hidden /> 추천
              </div>
              <p className="text-sm text-ink">{turn.recommendation}</p>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Library size={13} strokeWidth={2} aria-hidden /> 전문가{" "}
            {turn.expert_count ?? 0}건 · 일반 {turn.public_count ?? 0}건 · 생성형
            AI
          </div>

          {turn.citations && turn.citations.length > 0 && (
            <details className="text-xs">
              <summary className="flex items-center gap-1.5 cursor-pointer text-ink-soft hover:text-brand font-medium">
                <BookOpen size={13} strokeWidth={2} aria-hidden /> 출처 근거{" "}
                {turn.citations.length}개 펼쳐 보기
              </summary>
              <div className="mt-2 space-y-1.5">
                {turn.citations.map((c) => (
                  <div
                    key={c.rank}
                    className="px-3 py-2 rounded-md bg-stone-50 border border-stone-100"
                  >
                    <div>
                      <span
                        className={`font-semibold ${
                          c.cite_type === "expert"
                            ? "text-brand"
                            : "text-accent"
                        }`}
                      >
                        [{c.rank}] {c.cite_type === "expert" ? "전문가" : "일반"}
                      </span>{" "}
                      <span className="text-muted">
                        sim={c.similarity.toFixed(3)} · {c.author}
                      </span>
                    </div>
                    <p className="mt-1 text-ink-soft leading-relaxed">
                      {c.text}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
