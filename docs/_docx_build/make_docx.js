// DILAB ongoing-project report → DOCX (교수님 v1 코멘트 반영본)
// Mirrors ongoing-project-report.html: INC Lab nav, serif title, teal headings,
// centered "그림 N." captions, embedded interface screenshots.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType,
  LevelFormat, BorderStyle, TabStopType,
} = require("docx");

const FIG = "/Users/junha/Desktop/DILAB/docs/figures";

const C = {
  teal: "1D7A8C", title: "1F2733", ink: "2A2B2F",
  muted: "7B7F87", caption: "555555", rule: "E4E4E4", menu: "8A8D94",
};
const KR = "Malgun Gothic";
const SERIF = "Georgia";
const USABLE = 9746;

const rule = (style = BorderStyle.SINGLE) => ({ color: C.rule, space: 1, size: 6, style });

const r = (text, o = {}) => new TextRun({
  text, font: o.font || KR, size: o.size || 22,
  bold: !!o.bold, italics: !!o.it, color: o.color || C.ink,
});
const body = (runs, o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { after: o.after != null ? o.after : 170, line: o.line || 312, lineRule: "auto" },
  children: runs.map((x) => (x instanceof TextRun ? x : r(x[0], x[1] || {}))),
});
const h2 = (t) => new Paragraph({
  spacing: { before: 360, after: 140, line: 276, lineRule: "auto" },
  keepNext: true,
  children: [r(t, { size: 31, bold: true, color: C.teal })],
});
const h3 = (t) => new Paragraph({
  spacing: { before: 240, after: 100, line: 276, lineRule: "auto" },
  keepNext: true,
  children: [r(t, { size: 24, bold: true, color: C.title })],
});
const bullet = (t) => new Paragraph({
  numbering: { reference: "obj", level: 0 },
  spacing: { after: 90, line: 300, lineRule: "auto" },
  children: [r(t, { size: 22 })],
});

function figure(file, type, w, h, num, caption) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 260, after: 90 },
      keepLines: true,
      children: [new ImageRun({
        type, data: fs.readFileSync(`${FIG}/${file}`),
        transformation: { width: w, height: h },
        altText: { title: caption, description: caption, name: file },
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220, line: 264, lineRule: "auto" },
      children: [
        r(`그림 ${num}. `, { size: 20, bold: true, color: C.title }),
        r(caption, { size: 20, color: C.caption }),
      ],
    }),
  ];
}

const children = [];

children.push(new Paragraph({
  tabStops: [{ type: TabStopType.RIGHT, position: USABLE }],
  spacing: { before: 80, after: 240 },
  border: { bottom: rule() },
  children: [
    r("INC Lab", { size: 26, bold: true, color: C.title }),
    new TextRun({ text: "\tProjects     People     Publications     Lab Activities     Location",
      font: KR, size: 20, color: C.menu }),
  ],
}));

children.push(new Paragraph({
  spacing: { before: 320, after: 300, line: 312, lineRule: "auto" },
  children: [r("Development of a Consumer&Expert-RAG-Based Product Review Analysis and Evaluation System",
    { font: SERIF, size: 44, color: C.title })],
}));
children.push(body([["2026. 03. ~", { size: 22, bold: true, color: C.title }]],
  { align: AlignmentType.LEFT, after: 70 }));
children.push(body([["검색 증강 생성(RAG)을 활용한 소비자·전문가 리뷰 기반 제품 분석·평가 시스템 개발",
  { size: 22, color: C.teal, bold: true }]], { align: AlignmentType.LEFT, after: 50 }));
children.push(body([["- 딥인사이트랩 협력", { size: 21, color: C.muted }]],
  { align: AlignmentType.LEFT, after: 60 }));

children.push(new Paragraph({ spacing: { before: 160, after: 280 }, border: { bottom: rule() }, children: [] }));

children.push(h2("연구 개요"));
children.push(body([
  ["온라인에 축적되는 제품 리뷰의 양이 빠르게 증가하면서, 이를 자동으로 분석하여 제품을 평가하려는 수요가 커지고 있습니다. 그러나 기존의 리뷰 분석 방식은 주로 언급 빈도와 같은 양적 지표에 의존하기 때문에, 분석 결과가 어떤 근거에서 도출되었는지 확인하기 어렵고 도메인 전문성이 충분히 반영되지 못한다는 한계가 있습니다."],
]));
children.push(body([
  ["본 연구는 본 연구실과 소비자 리서치 전문기업 "],
  ["딥인사이트랩", { bold: true, color: C.title }],
  ["의 협력으로, "],
  ["소비자 리뷰와 전문가 리뷰", { bold: true, color: C.title }],
  ["를 함께 활용하는 "],
  ["검색 증강 생성(RAG, Retrieval-Augmented Generation)", { bold: true, color: C.title }],
  [" 기반 제품 평가 시스템 "],
  ["DILAB", { bold: true, color: C.title }],
  ["을 개발합니다. 리뷰 텍스트를 임베딩하여 벡터 데이터베이스로 구축한 뒤, 토픽 모델링과 대규모 언어 모델(LLM)을 결합하여 제품에 대한 다측면 분석과 근거 기반 응답을 제공합니다. 특히 모든 분석 결과를 원문 근거와 연결함으로써, 분석의 신뢰성과 추적 가능성을 확보하는 것을 목표로 합니다."],
]));
figure("fig1-architecture.png", "png", 620, 349, 1, "DILAB 시스템 구조 및 분석 파이프라인 개요.").forEach((p) => children.push(p));

children.push(h2("연구 목표"));
[
  "소비자 리뷰와 전문가 리뷰를 통합한 벡터 데이터베이스 구축 및 RAG 기반 근거 검색",
  "토픽 모델링과 대규모 언어 모델을 활용한 다측면 리뷰 분석(분류·감성·소비자 구매 여정)",
  "다섯 개 평가 축(효능·성분·가격·사용감·안전성)에 기반한 제품 평가 및 평가 근거 연결",
  "분석 대상 도메인을 교체할 수 있는 유연한 분석 파이프라인 설계",
].forEach((t) => children.push(bullet(t)));

children.push(h2("연구 수행 내용"));
children.push(h3("1. 리뷰 수집 및 임베딩"));
children.push(body([
  ["소비자 리뷰와 전문가 리뷰를 함께 수집한 뒤, 문서를 일정한 단위(청크)로 분할하고 다국어 임베딩 모델을 이용하여 벡터로 변환합니다. 변환된 벡터는 벡터 데이터베이스에 저장하며, 전문가 출처와 소비자 출처를 구분하여 이후 검색 단계에서 전문가 근거를 우선적으로 반영할 수 있도록 합니다."],
]));

children.push(h3("2. 토픽 모델링 및 다측면 분석"));
children.push(body([
  ["임베딩된 리뷰를 군집화하여 주요 토픽을 자동으로 추출하고, 대규모 언어 모델을 이용하여 각 리뷰의 카테고리, 감성(긍정·중립·부정), "],
  ["소비자 구매 여정 단계", { bold: true, color: C.title }],
  ["(인지-검토-사용-재구매)를 분류합니다. 분석에 필요한 도메인 정의를 코드가 아닌 설정값으로 분리하였기 때문에, 분석 로직을 그대로 유지한 채 대상 도메인만 교체할 수 있습니다."],
]));
figure("fig2-product.png", "png", 500, 423, 2, "토픽 모델링 및 감성 분석 결과 인터페이스.").forEach((p) => children.push(p));

children.push(h3("3. RAG 기반 질의응답 및 제품 평가"));
children.push(body([
  ["사용자가 자연어로 질문하면 질문을 임베딩하여 전문가·소비자 근거를 함께 검색하고, 대규모 언어 모델이 이를 바탕으로 답변을 생성합니다. 이때 답변에는 참조한 원문 근거가 함께 제시됩니다. 또한 동일한 근거를 종합하여 제품을 다섯 개 축으로 평가하며, 각 점수에는 평가의 근거가 된 원문을 연결합니다."],
]));
figure("fig3-ask.png", "png", 620, 346, 3, "RAG 기반 자연어 질의응답 인터페이스.").forEach((p) => children.push(p));

children.push(h2("연구 결과 및 향후 계획"));
children.push(body([
  ["현재 제품명 입력부터 리뷰 수집·분석·평가·질의응답에 이르는 전 과정을 자동으로 수행하는 시제품을 구현하였으며, 클라우드 환경에서 상시 동작하도록 구성하였습니다. 앞으로 분석 대상 제품과 도메인을 확대하여, 소비자와 전문가 리뷰 근거에 기반한 신뢰성과 도메인 확장성을 정량적으로 검증할 계획입니다."],
]));

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 320, after: 0, line: 264, lineRule: "auto" },
  border: { top: rule() },
  children: [r("INC Lab × 딥인사이트랩 협력  ·  제품명 DILAB(가칭)  ·  그림의 수치는 현재 시제품 데이터에 기반한 예시입니다.",
    { size: 19, color: C.muted })],
}));

const doc = new Document({
  styles: { default: { document: { run: { font: KR, size: 22, color: C.ink } } } },
  numbering: {
    config: [{
      reference: "obj",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 460, hanging: 260 } } } }],
    }],
  },
  sections: [{
    properties: { page: {
      size: { width: 11906, height: 16838 },
      margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
    } },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/Users/junha/Desktop/DILAB/docs/ongoing-project-report.docx", buf);
  console.log("DOCX written:", buf.length, "bytes");
});
