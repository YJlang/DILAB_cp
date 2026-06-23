import Link from "next/link";
import {
  FileSearch,
  Radar,
  Route,
  Search,
  Cpu,
  BarChart3,
  FileText,
  ShieldCheck,
  Quote,
  ArrowRight,
} from "lucide-react";
import { AnalyzeForm } from "@/components/AnalyzeForm";

export default function Home() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-10 sm:pt-20 sm:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* 카피 + 입력 */}
          <div className="lg:col-span-6">
            <p className="font-display italic text-lg sm:text-xl text-accent mb-3">
              Evidence-first product intelligence
            </p>
            <h1 className="text-3xl sm:text-[40px] font-bold tracking-tight leading-[1.2] text-ink">
              리뷰는 쌓이는데,
              <br />
              믿을 <span className="text-brand">결론</span>은 없으셨죠.
            </h1>
            <p className="mt-4 text-base text-ink-soft leading-relaxed max-w-md">
              제품명만 넣으면 전문가 리뷰 DB와 공개 후기를 함께 분석해,{" "}
              <em className="not-italic text-ink font-medium">
                어디서 가져온 결론인지
              </em>{" "}
              출처까지 추적되는 평가 리포트를 만들어 드려요.
            </p>

            <div id="analyze" className="mt-7 scroll-mt-20">
              <AnalyzeForm />
            </div>

            <p className="mt-4 text-xs text-muted">
              분석은 약 60~120초 · 가입 없이 바로 체험 · 근거 구절까지 공개
            </p>
          </div>

          {/* 리포트 미리보기 목업 */}
          <div className="lg:col-span-6">
            <ReportPreview />
          </div>
        </div>
      </section>

      {/* ── 신뢰 증거 바 ──────────────────────────────────── */}
      <section className="border-y border-line bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-4 text-center">
          <TrustStat value="전문가 + 공개" label="이중 출처 분석" />
          <TrustStat value="100%" label="결론마다 근거 구절" />
          <TrustStat value="5축" label="정량 평가 점수" />
          <TrustStat value="근거 추적" label="AI 의미 분석" />
        </div>
      </section>

      {/* ── 핵심 가치 3블록 ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <SectionHeading
          eyebrow="What you get"
          title="요약이 아니라, 근거가 보이는 평가"
          desc="DILAB은 리뷰를 한 줄로 줄이지 않아요. 어떤 데이터에서 나온 판단인지, 매번 추적할 수 있게 보여줍니다."
        />
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          <ValueCard
            Icon={FileSearch}
            title="출처 추적 분석"
            desc="모든 답변·점수 옆에 근거가 된 리뷰 구절을 함께 표시해요. 클릭 한 번이면 원문이 펼쳐집니다."
          />
          <ValueCard
            Icon={Radar}
            title="5축 정량 평가"
            desc="흩어진 정성 후기를 5개 축의 점수로 환산해, 카테고리 평균과 한눈에 비교할 수 있어요."
          />
          <ValueCard
            Icon={Route}
            title="여정·감성 분석"
            desc="구매 전 기대부터 재구매까지, 단계별로 사용자 감성이 어떻게 변하는지 따라갑니다."
          />
        </div>
      </section>

      {/* ── 작동 방식 4단계 ───────────────────────────────── */}
      <section className="border-y border-line bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="How it works"
            title="제품명 하나에서 리포트까지, 자동으로"
            desc="입력 이후의 수집·분석·합성은 전부 서버리스 파이프라인이 처리해요."
          />
          <ol className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StepCard
              n={1}
              Icon={Search}
              title="수집"
              desc="공개 후기와 전문가 글을 자동 수집해 분석 단위로 정리해요."
            />
            <StepCard
              n={2}
              Icon={Cpu}
              title="의미 분석"
              desc="AI가 의미 단위로 검색 가능하게 정리해요."
            />
            <StepCard
              n={3}
              Icon={BarChart3}
              title="분석"
              desc="감성·토픽·여정 단계를 딥러닝으로 분류하고 5축 점수를 매겨요."
            />
            <StepCard
              n={4}
              Icon={FileText}
              title="리포트"
              desc="생성형 AI가 출처를 인용하며 평가 리포트로 만들어요."
            />
          </ol>
        </div>
      </section>

      {/* ── 차별점 ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="font-display italic text-lg text-accent mb-3">
              Why DILAB
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink leading-snug">
              전문가 기준으로
              <br />
              교차검증된 평가
            </h2>
            <p className="mt-4 text-base text-ink-soft leading-relaxed">
              일반 리뷰 요약은 &ldquo;많은 사람이 좋대요&rdquo;에서 멈춰요. DILAB은
              전문가 리뷰 DB를 AI로 결합해, 공개 후기의 감성을{" "}
              <em className="not-italic text-ink font-medium">전문가 관점으로</em>{" "}
              교차검증합니다. 그래서 결론마다 &ldquo;왜&rdquo;가 따라붙어요.
            </p>
          </div>
          <ul className="space-y-3">
            <DiffRow text="모든 결론에 근거 구절이 붙어 신뢰성을 검증할 수 있어요." />
            <DiffRow text="전문가 DB + 공개 후기를 한 화면에서 비교해요." />
            <DiffRow text="감성을 색이 아니라 점수·근거로 설명해요." />
            <DiffRow text="제품 간 5축 비교로 자사·경쟁사 포지션을 한눈에 봐요." />
          </ul>
        </div>
      </section>

      {/* ── 최종 CTA ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="rounded-2xl bg-ink text-ivory px-6 py-12 sm:px-12 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
            지금 제품 하나를
            <br className="sm:hidden" /> 분석해 보세요.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-ivory/70 max-w-md mx-auto">
            가입 없이 60초면 첫 리포트를 받아볼 수 있어요. 결과가 마음에 들면 그때
            도메인을 넓히면 됩니다.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/#analyze"
              className="inline-flex items-center gap-2 rounded-md bg-ivory text-ink px-5 py-3 text-sm font-semibold hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              제품 분석 시작 <ArrowRight size={16} strokeWidth={2.2} aria-hidden />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-ivory/30 px-5 py-3 text-sm font-medium text-ivory hover:bg-ivory/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory"
            >
              데모 대시보드 둘러보기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ── 보조 컴포넌트 (랜딩 전용 정적 표현) ─────────────────── */

function SectionHeading({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="font-display italic text-lg text-accent mb-2">{eyebrow}</p>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink leading-snug">
        {title}
      </h2>
      <p className="mt-3 text-base text-ink-soft leading-relaxed">{desc}</p>
    </div>
  );
}

function TrustStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl sm:text-3xl text-ink leading-none">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

function ValueCard({
  Icon,
  title,
  desc,
}: {
  Icon: typeof FileSearch;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-6 shadow-sm">
      <span className="inline-flex w-11 h-11 rounded-lg bg-brand-soft text-brand items-center justify-center">
        <Icon size={22} strokeWidth={1.8} aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-ink-soft leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({
  n,
  Icon,
  title,
  desc,
}: {
  n: number;
  Icon: typeof Search;
  title: string;
  desc: string;
}) {
  return (
    <li className="rounded-xl border border-line bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-display text-3xl text-ink/25 leading-none tabular-nums">
          0{n}
        </span>
        <Icon size={20} strokeWidth={1.8} className="text-brand" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{desc}</p>
    </li>
  );
}

function DiffRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <ShieldCheck
        size={20}
        strokeWidth={1.8}
        className="text-brand shrink-0 mt-0.5"
        aria-hidden
      />
      <span className="text-sm text-ink-soft leading-relaxed">{text}</span>
    </li>
  );
}

/* 정적 리포트 미리보기 — 실제 데이터 아님, hero 시각용 목업 */
function ReportPreview() {
  const axes = [
    { label: "보습력", score: 8.6 },
    { label: "자극도", score: 7.9 },
    { label: "발림성", score: 8.4 },
    { label: "지속력", score: 7.2 },
    { label: "가성비", score: 8.1 },
  ];
  return (
    <div className="rounded-2xl border border-line bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-line flex items-center justify-between bg-stone-50/60">
        <span className="text-xs text-muted">예시 리포트 미리보기</span>
        <span className="text-[11px] text-muted tabular-nums">/products</span>
      </div>
      <div className="p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-muted">아누아 · 토너</div>
            <div className="text-base font-semibold text-ink">
              어성초 77% 토너
            </div>
          </div>
          <div className="text-right leading-none">
            <span className="font-display text-5xl text-brand tabular-nums">
              8.4
            </span>
            <span className="text-sm text-muted"> / 10</span>
          </div>
        </div>

        <ul className="mt-5 space-y-2">
          {axes.map((a) => (
            <li key={a.label} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 text-ink-soft">{a.label}</span>
              <span className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <span
                  className="block h-full bg-brand/70 rounded-full"
                  style={{ width: `${a.score * 10}%` }}
                />
              </span>
              <span className="w-8 text-right tabular-nums font-medium text-ink">
                {a.score}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 pt-4 border-t border-line">
          <div className="flex items-center gap-2 mb-2 text-xs text-muted">
            <Quote size={13} strokeWidth={2} aria-hidden /> 근거 구절
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-soft text-brand">
              전문가 12
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-ink-soft">
              공개 후기 48
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              긍정 72%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
