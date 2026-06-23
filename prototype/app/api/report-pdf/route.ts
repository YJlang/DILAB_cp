/**
 * 리포트 PDF 프록시 — 같은 사이트의 /products/[slug]/report 페이지를
 * Modal(클라우드 분석 엔진)의 헤드리스 브라우저가 인쇄 → PDF 바이트로 회신.
 *
 * 데이터·스키마는 일절 건드리지 않음 (리포트 페이지가 Supabase 에서 읽어 렌더 → 그걸 그대로 인쇄).
 * Modal endpoint URL/token 은 server-only env 로만 접근.
 */
import { cfEnv } from "@/lib/cf-env";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const slug = searchParams.get("slug");
  const domain = searchParams.get("domain") ?? "cosmetics";
  if (!slug) return new Response("slug required", { status: 400 });

  const env = cfEnv();
  if (!env.MODAL_REPORT_URL) {
    return new Response("report service not configured", { status: 503 });
  }

  // 인쇄 대상은 항상 *우리 자신*의 리포트 페이지 (origin 고정 → SSRF 여지 없음).
  const reportUrl = `${origin}/products/${encodeURIComponent(slug)}/report?print=1`;

  const res = await fetch(env.MODAL_REPORT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _token: env.MODAL_PROXY_TOKEN, url: reportUrl, domain }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("[/api/report-pdf] modal", res.status, txt);
    return new Response(`PDF service ${res.status}`, { status: 502 });
  }

  const pdf = await res.arrayBuffer();
  const fname = `DILAB 리포트 - ${slug}.pdf`;
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
      "Cache-Control": "no-store",
    },
  });
}
