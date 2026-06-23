"use client";

import { useState } from "react";
import { Download, Printer, Loader2 } from "lucide-react";

/**
 * 리포트 PDF 다운로드 — 1차: 서버(클라우드 분석 엔진)가 같은 리포트 페이지를
 * 인쇄해 진짜 파일로 내려줌. 실패하면 브라우저 인쇄 창으로 자동 대체.
 */
export function ReportDownloadButton({
  slug,
  domain = "cosmetics",
  filename,
}: {
  slug: string;
  domain?: string;
  filename: string;
}) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function downloadPdf() {
    setLoading(true);
    setNote(null);
    try {
      const res = await fetch(
        `/api/report-pdf?slug=${encodeURIComponent(slug)}&domain=${encodeURIComponent(domain)}`,
      );
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // 서버 PDF 생성이 아직 준비 안 됐으면 브라우저 인쇄로 대체
      setNote("브라우저 인쇄 창으로 저장해 주세요.");
      window.print();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {note && <span className="text-xs text-muted">{note}</span>}
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-line hover:bg-stone-50 text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Printer size={15} strokeWidth={2} aria-hidden /> 인쇄
      </button>
      <button
        type="button"
        onClick={downloadPdf}
        disabled={loading}
        aria-busy={loading}
        className="inline-flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-md bg-brand text-white font-medium hover:bg-brand/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {loading ? (
          <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden />
        ) : (
          <Download size={15} strokeWidth={2} aria-hidden />
        )}
        {loading ? "PDF 만드는 중…" : "PDF 다운로드"}
      </button>
    </div>
  );
}
