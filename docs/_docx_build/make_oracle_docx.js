// DILAB 아키텍처 전환 보고 → DOCX (교수님 보고용)
// 텍스트는 편집 가능한 Word 요소, 아키텍처 다이어그램은 shoot.js 로 캡처한 PNG 삽입.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, HeadingLevel,
  BorderStyle, Table, TableRow, TableCell, WidthType, ShadingType,
} = require("docx");

const DIR = __dirname;
const OUT = "/Users/junha/Desktop/DILAB 복사본/docs/oracle-transition-report.docx";

const C = { oracle: "BE3A2B", oInk: "8E2A1F", ink: "23201D", soft: "4A463F", muted: "857E73",
  line: "E7E2DA", oSoft: "FBEDEA", old: "6E7E8E", oldSoft: "EEF1F4", good: "2E7D5B" };
const KR = "맑은 고딕"; // Malgun Gothic
const USABLE = 9360; // A4 - 여백 (dxa)

const run = (text, o = {}) => new TextRun({
  text, font: o.font || KR, size: o.size || 20, bold: !!o.bold, italics: !!o.it,
  color: o.color || C.ink, characterSpacing: o.ls,
});
const P = (runs, o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.LEFT,
  spacing: { after: o.after != null ? o.after : 150, line: o.line || 300, lineRule: "auto" },
  ...(o.shading ? { shading: { type: ShadingType.CLEAR, fill: o.shading } } : {}),
  ...(o.left ? { border: { left: { color: C.oracle, space: 14, size: 18, style: BorderStyle.SINGLE } } } : {}),
  ...(o.indent ? { indent: { left: o.indent } } : {}),
  children: runs.map((x) => (x instanceof TextRun ? x : run(x[0], x[1] || {}))),
});
const eyebrow = (t) => P([[t, { size: 15, bold: true, color: C.oracle, ls: 10 }]], { after: 90 });
const h2 = (t) => new Paragraph({
  spacing: { before: 340, after: 130 }, keepNext: true,
  border: { bottom: { color: C.line, space: 6, size: 6, style: BorderStyle.SINGLE } },
  children: [run(t, { size: 26, bold: true, color: C.ink })],
});
const h3 = (t) => new Paragraph({ spacing: { before: 180, after: 60 }, keepNext: true,
  children: [run(t, { size: 21, bold: true, color: C.oInk })] });
const bullet = (runs) => new Paragraph({
  bullet: { level: 0 }, spacing: { after: 80, line: 290 },
  children: runs.map((x) => (x instanceof TextRun ? x : run(x[0], x[1] || {}))),
});
const cap = (t) => P([[t, { size: 15, color: C.muted, it: true }]], { align: AlignmentType.CENTER, after: 60, before: 40 });

function image(file, wpx) {
  const buf = fs.readFileSync(path.join(DIR, file));
  const [w, h] = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  const width = wpx, height = Math.round(wpx * (h / w));
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 60, after: 20 },
    children: [new ImageRun({ type: "png", data: buf, transformation: { width, height } })],
  });
}

// 비교표
function cell(text, o = {}) {
  return new TableCell({
    width: { size: o.w || 33, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 130, right: 130 },
    shading: o.head ? { type: ShadingType.CLEAR, fill: "F7F4F0" } : undefined,
    children: [new Paragraph({ spacing: { after: 0, line: 264 },
      children: [run(text, { size: 18, bold: o.head || o.rh, color: o.color || (o.head ? C.muted : C.soft) })] })],
  });
}
function trow(cells) { return new TableRow({ children: cells }); }
const cmpTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: {
    top: { style: BorderStyle.SINGLE, size: 4, color: C.line }, bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line },
    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: C.line }, insideVertical: { style: BorderStyle.NONE },
  },
  rows: [
    trow([cell("구성", { head: true, w: 22 }), cell("기존 (Supabase + Modal)", { head: true }), cell("전환 후 (Oracle 26ai)", { head: true })]),
    trow([cell("저장", { rh: 1, w: 22 }), cell("Supabase Postgres", { color: C.old }), cell("Oracle 26ai", { color: C.oInk })]),
    trow([cell("벡터 검색", { rh: 1, w: 22 }), cell("pgvector · match_chunks", { color: C.old }), cell("VECTOR_DISTANCE (in-DB)", { color: C.oInk })]),
    trow([cell("임베딩", { rh: 1, w: 22 }), cell("BGE-M3 · Cloudflare / Modal", { color: C.old }), cell("in-DB ONNX (DB가 직접)", { color: C.oInk })]),
    trow([cell("분석 계산", { rh: 1, w: 22 }), cell("Modal 서버리스", { color: C.old }), cell("로컬 워커 → Oracle 적재", { color: C.oInk })]),
    trow([cell("답변 생성", { rh: 1, w: 22 }), cell("DeepSeek", { color: C.old }), cell("DeepSeek (동일)", { color: C.oInk })]),
    trow([cell("보안·거버넌스", { rh: 1, w: 22 }), cell("오픈소스 수준", { color: C.old }), cell("엔터프라이즈(암호화·VPD·감사)", { color: C.oInk })]),
  ],
});

const children = [
  eyebrow("INC LAB × 딥인사이트랩 · 아키텍처 전환 진행 보고"),
  P([["DILAB 벡터 인프라 전환", { size: 40, bold: true }]], { after: 40, line: 300 }),
  P([["pgvector · Modal → ", { size: 30, bold: true, color: C.muted }], ["Oracle AI Database 26ai", { size: 30, bold: true, color: C.oracle }]], { after: 150 }),
  P([["오픈소스 pgvector(Supabase) + Modal 서버리스 구조를, 저장·임베딩·검색을 하나로 통합하는 ", {}], ["Oracle AI Database 26ai", { bold: true }], [" 로 전환했습니다. 임베딩과 벡터 검색이 ", {}], ["데이터베이스 안(in-DB)", { bold: true }], ["에서 수행됩니다.", {}]], { size: 21, after: 130 }),
  new Paragraph({ spacing: { after: 60 }, border: { bottom: { color: C.line, space: 8, size: 6, style: BorderStyle.SINGLE } },
    children: [run("기준일 2026-07-07    ·    단계: 단일 테넌트 전환 완료 · 기능 실증    ·    배경: 수요기업 보안·검증 요구", { size: 16, color: C.muted })] }),

  h2("한눈에 — 무엇이 바뀌었나"),
  bullet([["저장·검색  ", { bold: true }], ["Supabase pgvector → Oracle 26ai 벡터 검색으로 이관", {}]]),
  bullet([["임베딩  ", { bold: true }], ["외부 임베더 제거 → DB 내부(in-DB) 임베딩 (ONNX)", {}]]),
  bullet([["컨버지드  ", { bold: true }], ["관계형·JSON·벡터를 한 DB에서 (한 SQL로 결합)", {}]]),
  bullet([["기능  ", { bold: true }], ["브라우징·질의응답·리포트·제품 자동 분석 전부 동작", {}]]),

  h2("배경 — 왜 Oracle 26ai 인가"),
  P([["수요기업(한국콜마·테팔 등)은 주요 데이터를 저장하는 공간이 ", {}], ["보안성이 높고 검증된 솔루션", { bold: true }], ["이기를 원합니다. 성능의 문제가 아니라 ", {}], ["신뢰와 거버넌스", { bold: true }], ["의 문제입니다.", {}]]),
  P([["기존 DILAB은 오픈소스 pgvector(PostgreSQL 확장)로 RAG를 구성했습니다. 이를 엔터프라이즈 보안·감사·거버넌스가 검증된 ", {}], ["Oracle AI Database 26ai", { bold: true }], ["의 벡터 검색 기능으로 대체해, 같은 서비스를 더 신뢰받는 기반 위에서 제공하는 것이 이번 전환의 목표입니다.", {}]]),
  P([["핵심 관점 — ", { bold: true, color: C.oInk }], ['"데이터를 AI로 보내는 것"이 아니라 "AI를 데이터가 있는 곳으로 가져오는 것". 임베딩·검색을 외부로 빼지 않고 데이터베이스 안에서 처리 → 데이터가 검증된 DB를 떠나지 않습니다.', {}]], { shading: C.oSoft, left: true, indent: 40, after: 160 }),

  h2("기존 아키텍처 — pgvector + Modal"),
  P([["저장은 Supabase(Postgres+pgvector), 무거운 계산(크롤링·임베딩·토픽·LLM 라벨)은 클라우드 서버리스 Modal, 질문 임베딩은 Cloudflare Workers AI — 역할이 여러 외부 서비스로 흩어져 있었습니다.", {}]]),
  image("diag0.png", 560),
  cap("저장(Supabase) · 계산(Modal) · 임베딩(CF)이 서로 다른 3개 외부 서비스로 분산"),

  h2("전환 후 아키텍처 — Oracle 26ai 중심"),
  P([["저장·임베딩·벡터 검색을 Oracle 26ai 하나", { bold: true }], ["가 담당합니다. 애플리케이션은 로컬에서 DB에 직접 연결하고, 답변 생성(LLM)만 외부(DeepSeek)에 위임합니다. 흩어져 있던 벡터 파이프라인이 DB 한 곳으로 수렴했습니다.", {}]]),
  image("diag1.png", 560),
  cap("Cloudflare AI · Modal(임베딩) · pgvector 제거 → 벡터 파이프라인이 Oracle로 완결"),

  h2("Oracle 26ai 핵심 — 임베딩과 검색이 DB 안에서"),
  P([["Oracle 26ai는 별도 벡터 전용 DB가 아니라, 관계형 데이터베이스에 벡터 기능이 내장된 컨버지드 DB입니다. DILAB이 활용하는 세 가지:", {}]]),
  h3("① 컨버지드 — 한 DB, 한 SQL"),
  P([["제품·리뷰·평점 같은 관계형 데이터와 리뷰 임베딩 벡터가 같은 DB에 있어, '벡터 유사도 + 도메인/제품/출처 필터 + 전문가 우선'을 한 번의 SQL로 처리합니다.", {}]]),
  h3("② in-DB 임베딩 — 외부 임베더 불필요"),
  P([["다국어 임베딩 모델(ONNX)을 DB에 적재해, 텍스트를 넣으면 DB가 직접 벡터로 변환합니다. 별도 임베딩 서버(과거 BGE-M3/Cloudflare)가 필요 없습니다.", {}]]),
  h3("③ 벡터 검색 — VECTOR_DISTANCE"),
  P([["코사인 거리로 의미가 가까운 근거를 찾고, HNSW 인덱스로 가속합니다. 질문 임베딩부터 근거 검색까지 전 과정이 DB 내부에서 이뤄집니다.", {}]]),
  image("diag2.png", 560),
  cap("RAG 질의응답 흐름 — 가운데 두 단계(임베딩·검색)가 모두 Oracle 26ai 내부에서 수행"),

  h2("무엇이 어디서 도나"),
  cmpTable,
  P([["임베딩·토픽·LLM 같은 계산 로직과 화면은 그대로 유지하고, '벡터를 어디에 저장·검색하느냐'만 Oracle로 바뀌었습니다. 답변 생성(DeepSeek)만 외부에 남습니다.", {}]], { before: 140 }),

  h2("달성 현황 — Oracle 위에서 실제 동작"),
  bullet([["✓  ", { bold: true, color: C.good }], ["제품 브라우징 · 대시보드 · 5축 평가 리포트 — Oracle에서 읽어 렌더", {}]]),
  bullet([["✓  ", { bold: true, color: C.good }], ["자연어 질의응답(Ask) — 질문을 Oracle이 in-DB 임베딩 → 벡터 검색 → 근거 인용 답변", {}]]),
  bullet([["✓  ", { bold: true, color: C.good }], ["PDF 리포트 생성 — Oracle 데이터를 인쇄", {}]]),
  bullet([["✓  ", { bold: true, color: C.good }], ["제품명 자동 분석 — 제품명 입력 → 네이버 크롤 → 분석 → Oracle 적재 → 화면 반영", {}]]),
  bullet([["→  ", { bold: true, color: C.old }], ["남은 과제 — 경쟁 비교(LLM) 로컬 포팅, 멀티테넌트 접근제어(Oracle VPD)", {}]]),
  P([["근거기반 신뢰성 강화 — ", { bold: true, color: C.oInk }], ["평가 점수 산정에 전문가 리뷰 가중치와 표본 수 보정을 도입해, 근거가 얕은 항목이 과신되지 않도록 했습니다. '어디서 나온 결론인지' 추적 가능한 DILAB의 차별점을 Oracle 위에서도 유지·강화합니다.", {}]], { shading: C.oSoft, left: true, indent: 40, before: 120 }),
];

const doc = new Document({
  styles: { default: { document: { run: { font: KR, size: 20, color: C.ink } } } },
  sections: [{
    properties: { page: { margin: { top: 1200, bottom: 1100, left: 1200, right: 1200 } } },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("✅ docx 생성:", OUT, "(" + Math.round(buf.length / 1024) + "KB)");
});
