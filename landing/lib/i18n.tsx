"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "ko";

/* ------------------------------------------------------------------ */
/*  Copy dictionaries — the single source of truth for all UI text.   */
/* ------------------------------------------------------------------ */
const en = {
  nav: { cta: "Work with us" },
  lang: { en: "EN", ko: "한국어", label: "Language" },
  hero: {
    typing: [
      "Best moisturizer I've ever used.",
      "Broke me out in two days.",
      "Life-changing.",
      "Total waste of money.",
    ],
    headline: {
      line1: "Ten thousand reviews.",
      pre: "One ",
      accent: "honest",
      post: " answer.",
    },
    sub: "Deep Insight Lab turns the chaos of consumer voices into evidence you can act on.",
    cta: "See how",
    scroll: "Scroll",
  },
  problem: {
    eyebrow: "01 — The problem",
    labels: ["review fragments", "contradictions per product", "clear answers"],
    headline: { a: "Everyone is talking.", b: "No one is sure." },
    body: "Star ratings average away the truth. Sponsored posts blur it. Real signal drowns in noise — and decisions stall.",
  },
  approach: {
    eyebrow: "02 — What we do",
    headline: { a: "We listen at scale.", b: "Then we prove it." },
    cards: [
      {
        title: "Gather",
        body: "Every voice, from quick reviews to expert deep-dives, collected in one place.",
      },
      {
        title: "Distill",
        body: "Patterns emerge: what people love, what they doubt, and why.",
      },
      {
        title: "Verify",
        body: "Every conclusion stays traceable to the exact words that support it.",
      },
    ],
  },
  changes: {
    eyebrow: "03 — What changes for you",
    headline: { a: "Guesswork out.", b: "Evidence in." },
    cards: [
      {
        k: "Weeks → Hours",
        d: "Decisions that waited on gut feeling now rest on traceable evidence — in hours, not weeks.",
      },
      {
        k: "Two lenses, one picture",
        d: "Expert judgment and everyday experience, weighed together — so hype never outvotes truth.",
      },
      {
        k: "Every claim, sourced",
        d: 'Ask "says who?" of any conclusion — and get the exact sentences behind it.',
      },
      {
        k: "Built to travel",
        d: "Born in beauty, designed for any category where opinions pile up.",
      },
    ],
    footer: "five axes · every score traceable · expert + consumer voices",
  },
  evidence: {
    eyebrow: "04 — Evidence-first",
    headline: { a: "Don’t take our word for it.", b: "Take theirs." },
    body: "Our platform, DILAB, scores products on five axes — and every score unfolds into the real sentences behind it.",
    hintHover: "Hover the card",
    hintTap: "Tap the card",
    hintRest: " to reveal the proof",
    scoreLabel: "Product score",
    product: "Moisturizer — brand withheld",
    axes: ["Absorption", "Gentleness", "Texture", "Value", "Scent"],
    footerClosed: "Backed by 2,411 quotes",
    footerOpen: "Evidence — 3 of 2,411 quotes",
    quotes: [
      {
        quote: "Absorbs fast, zero stickiness — even in summer.",
        source: "verified purchaser",
      },
      {
        quote: "Fragrance-free and gentle on reactive skin.",
        source: "dermatology blogger",
      },
      {
        quote: "Half the price of my old cream, same glow.",
        source: "repeat buyer",
      },
    ],
  },
  about: {
    eyebrow: "05 — About",
    headline: { a: "Research first.", accent: "Always." },
    body: "Deep Insight Lab is a consumer-research company working with brands, retailers, and universities. We build tools that make honest answers inevitable.",
    partnersLabel: "Working alongside",
    partners: [
      "academic research partners",
      "consumer brands",
      "retail platforms",
    ],
  },
  cta: {
    headline: {
      pre: "Curious what ten thousand voices say about ",
      accent: "your",
      post: " product?",
    },
    button: "Start a conversation",
  },
  footer: { org: "Deep Insight Lab — Seoul, Korea", copyright: "© 2026" },
};

const ko: typeof en = {
  nav: { cta: "함께 하기" },
  lang: { en: "EN", ko: "한국어", label: "언어" },
  hero: {
    typing: [
      "인생 수분크림이에요.",
      "이틀 만에 트러블 났어요.",
      "인생템입니다.",
      "돈 낭비였어요.",
    ],
    headline: {
      line1: "수만 개의 리뷰.",
      pre: "단 하나의 ",
      accent: "정직한",
      post: " 답.",
    },
    sub: "딥인사이트랩은 쏟아지는 소비자의 목소리를, 행동할 수 있는 근거로 바꿉니다.",
    cta: "어떻게 하는지 보기",
    scroll: "스크롤",
  },
  problem: {
    eyebrow: "01 — 문제",
    labels: ["리뷰 조각", "제품당 모순", "명확한 답"],
    headline: { a: "모두가 말하지만,", b: "누구도 확신하지 못합니다." },
    body: "별점 평균은 진실을 뭉갭니다. 광고성 후기는 진실을 흐립니다. 진짜 신호는 소음에 묻히고 — 결정은 멈춥니다.",
  },
  approach: {
    eyebrow: "02 — 하는 일",
    headline: { a: "대규모로 듣고,", b: "근거로 증명합니다." },
    cards: [
      {
        title: "모으다",
        body: "짧은 후기부터 전문가의 심층 리뷰까지, 모든 목소리를 한곳에 모읍니다.",
      },
      {
        title: "꿰뚫다",
        body: "사람들이 무엇을 사랑하고, 무엇을 의심하며, 왜 그런지 — 패턴이 드러납니다.",
      },
      {
        title: "증명하다",
        body: "모든 결론은 그것을 뒷받침한 바로 그 문장까지 추적됩니다.",
      },
    ],
  },
  changes: {
    eyebrow: "03 — 무엇이 달라지나",
    headline: { a: "감이 아니라,", b: "근거로." },
    cards: [
      {
        k: "몇 주 → 몇 시간",
        d: "감에 기대 몇 주씩 미뤄지던 결정이, 추적 가능한 근거 위에서 몇 시간 만에 끝납니다.",
      },
      {
        k: "두 개의 렌즈, 하나의 그림",
        d: "전문가의 판단과 일상의 경험을 함께 저울질해, 과장이 진실을 이기지 못하게 합니다.",
      },
      {
        k: "모든 주장에 출처를",
        d: '어떤 결론에든 "누가 그래?"라고 물어보세요. 그 근거가 된 문장이 그대로 나옵니다.',
      },
      {
        k: "어디로든 확장",
        d: "뷰티에서 시작했지만, 의견이 쌓이는 모든 카테고리로 확장됩니다.",
      },
    ],
    footer: "다섯 가지 축 · 모든 점수는 추적 가능 · 전문가와 소비자의 목소리",
  },
  evidence: {
    eyebrow: "04 — 근거 우선",
    headline: { a: "저희 말은 믿지 마세요.", b: "그들의 말을 믿으세요." },
    body: "저희 플랫폼 DILAB은 제품을 다섯 가지 축으로 평가하고, 모든 점수는 그 뒤에 있는 실제 문장으로 펼쳐집니다.",
    hintHover: "카드에 올려보세요",
    hintTap: "카드를 눌러보세요",
    hintRest: " 근거가 드러납니다",
    scoreLabel: "제품 점수",
    product: "수분크림 — 브랜드 비공개",
    axes: ["흡수력", "순함", "제형", "가성비", "향"],
    footerClosed: "2,411개의 인용으로 뒷받침",
    footerOpen: "근거 — 2,411개 중 3개",
    quotes: [
      {
        quote: "흡수가 빠르고 끈적임이 전혀 없어요 — 여름에도요.",
        source: "구매 인증 사용자",
      },
      {
        quote: "무향에 예민한 피부에도 순해요.",
        source: "피부과 블로거",
      },
      {
        quote: "쓰던 크림 반값인데 광은 똑같아요.",
        source: "재구매 고객",
      },
    ],
  },
  about: {
    eyebrow: "05 — 소개",
    headline: { a: "연구가 먼저입니다.", accent: "언제나." },
    body: "딥인사이트랩은 브랜드, 유통사, 대학과 함께 일하는 소비자 리서치 기업입니다. 정직한 답이 필연이 되도록 만드는 도구를 만듭니다.",
    partnersLabel: "함께 일합니다",
    partners: ["대학·연구 파트너", "소비자 브랜드", "리테일 플랫폼"],
  },
  cta: {
    headline: {
      pre: "수만 명의 목소리가 ",
      accent: "당신의",
      post: " 제품에 대해 뭐라고 말하는지, 궁금하지 않으세요?",
    },
    button: "대화 시작하기",
  },
  footer: { org: "딥인사이트랩 — 서울, 대한민국", copyright: "© 2026" },
};

export const dictionaries = { en, ko };
export type Dict = typeof en;

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
};

const LangContext = createContext<LangContextValue | null>(null);

const STORAGE_KEY = "dil-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // hydrate from previous choice after mount (keeps SSR === first client render)
  useEffect(() => {
    const saved =
      (localStorage.getItem(STORAGE_KEY) as Lang | null) ?? null;
    if (saved === "en" || saved === "ko") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  return (
    <LangContext.Provider
      value={{ lang, setLang: setLangState, t: dictionaries[lang] }}
    >
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
