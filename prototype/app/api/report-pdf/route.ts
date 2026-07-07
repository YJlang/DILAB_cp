/**
 * 리포트 PDF — 같은 사이트의 /products/[slug]/report 페이지를 **로컬 Playwright(Chromium)**
 * 로 인쇄해 PDF 바이트로 회신. (원본은 Modal 헤드리스 브라우저였음 → Oracle 전환 복제본은
 * 로컬 dev 전용이라 Playwright 로 대체.)
 *
 * 데이터·레이아웃은 일절 건드리지 않음 — 리포트 페이지(Oracle 에서 읽어 렌더)를 그대로 인쇄.
 */
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return new Response("slug required", { status: 400 });

  // 인쇄 대상은 항상 *우리 자신*의 리포트 페이지 (origin 고정 → SSRF 여지 없음).
  const reportUrl = `${origin}/products/${encodeURIComponent(slug)}/report?print=1`;

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.goto(reportUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(1000); // 폰트·Recharts 렌더 안정화
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
    const fname = `DILAB 리포트 - ${slug}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[/api/report-pdf]", msg);
    return new Response(`PDF 생성 실패: ${msg}`, { status: 500 });
  } finally {
    await browser.close();
  }
}
