"use client";

// Uses dom-to-image-more (SVG foreignObject renderer) → jsPDF.
// dom-to-image-more uses the browser's native renderer so oklch/P3 colours work correctly.
//
// Smart page breaks: before capturing, the component measures the y-positions of all
// elements marked data-pdf-break="before". When slicing the captured image into A4 pages,
// if any such element would land in the last 28% of a page (the "orphan zone"), the page is
// cut early at that element's position so the section starts fresh on the next page.

import { useState } from "react";

export function DownloadButton({ brandName, contentId }: { brandName: string; contentId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const [domtoimage, { jsPDF }] = await Promise.all([
        import("dom-to-image-more").then(m => m.default ?? m),
        import("jspdf"),
      ]);

      const content = document.getElementById(contentId);
      if (!content) throw new Error("Content element not found");

      // ── Measure preferred break points BEFORE capture ───────────────
      const contentRect = content.getBoundingClientRect();
      const breakEls = content.querySelectorAll("[data-pdf-break='before']");
      const breakPosCssPx = Array.from(breakEls).map(el => {
        return (el as HTMLElement).getBoundingClientRect().top - contentRect.top;
      });

      // ── Capture at 2× for sharpness ─────────────────────────────────
      const SCALE = 2;
      const dataUrl = await (domtoimage as { toPng: (node: HTMLElement, opts: object) => Promise<string> })
        .toPng(content, { scale: SCALE });

      const A4_W = 210; // mm
      const A4_H = 297; // mm

      const img = new Image();
      await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });

      const cssPxToMm = SCALE * (A4_W / img.width);
      const imgH = (img.height * A4_W) / img.width;

      const breakPosMm = breakPosCssPx.map(px => px * cssPxToMm);

      // ── Build pages with smart page breaks ───────────────────────────
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      let yMm = 0;
      let first = true;
      const ORPHAN_THRESHOLD = 0.72;

      while (yMm < imgH - 0.5) {
        if (!first) pdf.addPage();
        first = false;

        let pageEndMm = yMm + A4_H;

        if (pageEndMm < imgH) {
          const orphanZoneStart = yMm + A4_H * ORPHAN_THRESHOLD;
          const earlyBreak = breakPosMm.find(bp => bp > orphanZoneStart && bp < pageEndMm);
          if (earlyBreak !== undefined) {
            pageEndMm = earlyBreak;
          }
        }

        pageEndMm = Math.min(pageEndMm, imgH);
        const sliceMm = pageEndMm - yMm;

        const yPx     = Math.round((yMm     / imgH) * img.height);
        const slicePx = Math.round((sliceMm / imgH) * img.height);

        const cv = document.createElement("canvas");
        cv.width  = img.width;
        cv.height = slicePx;
        const ctx = cv.getContext("2d")!;
        ctx.drawImage(img, 0, yPx, img.width, slicePx, 0, 0, img.width, slicePx);

        pdf.addImage(cv.toDataURL("image/png"), "PNG", 0, 0, A4_W, sliceMm);
        yMm = pageEndMm;
      }

      pdf.save(`Campaign Intelligence Preview — ${brandName}.pdf`);
    } catch (err) {
      console.error("[DownloadButton]", err);
      alert(`PDF generation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 border border-white/20 text-white text-sm font-medium hover:bg-white/25 disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <>
          <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          Generating…
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download Report
        </>
      )}
    </button>
  );
}
