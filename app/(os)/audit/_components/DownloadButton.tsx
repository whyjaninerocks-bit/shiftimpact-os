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

      // ── Capture at 1.5× — sharp enough, keeps file size reasonable ──
      const SCALE = 1.5;
      const dataUrl = await (domtoimage as { toPng: (node: HTMLElement, opts: object) => Promise<string> })
        .toPng(content, { scale: SCALE });

      const A4_W = 210; // mm
      const A4_H = 297; // mm

      // Margins: give text breathing room so page cuts never slice mid-line
      const MARGIN_X = 0;   // mm — keep full width
      const MARGIN_Y = 10;  // mm — top + bottom white space per page

      const CONTENT_W = A4_W - MARGIN_X * 2; // printable width
      const CONTENT_H = A4_H - MARGIN_Y * 2; // printable height per page (277mm)

      const img = new Image();
      await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });

      // Total image height mapped to mm (image fills CONTENT_W wide)
      const imgH = (img.height / img.width) * CONTENT_W;

      // css-px → mm conversion
      const cssPxToMm = SCALE * (CONTENT_W / img.width);
      const breakPosMm = breakPosCssPx.map(px => px * cssPxToMm);

      // ── Build pages with smart page breaks ───────────────────────────
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      let yMm = 0;       // current top of unrendered content (in content-mm)
      let first = true;
      const ORPHAN_THRESHOLD = 0.78; // break early if section header in last 22% of page

      while (yMm < imgH - 0.5) {
        if (!first) pdf.addPage();
        first = false;

        let pageEndMm = yMm + CONTENT_H;

        if (pageEndMm < imgH) {
          // Look for a section break marker that falls in the orphan zone
          const orphanZoneStart = yMm + CONTENT_H * ORPHAN_THRESHOLD;
          const earlyBreak = breakPosMm.find(bp => bp > orphanZoneStart && bp < pageEndMm);
          if (earlyBreak !== undefined) {
            pageEndMm = earlyBreak;
          }
        }

        pageEndMm = Math.min(pageEndMm, imgH);
        const sliceMm = pageEndMm - yMm;

        // Convert content-mm slice back to source image pixels
        const yPx     = Math.round((yMm     / imgH) * img.height);
        const slicePx = Math.round((sliceMm / imgH) * img.height);

        const cv = document.createElement("canvas");
        cv.width  = img.width;
        cv.height = slicePx;
        const ctx = cv.getContext("2d")!;
        ctx.drawImage(img, 0, yPx, img.width, slicePx, 0, 0, img.width, slicePx);

        // Place with top/bottom margins — text never touches page edge
        pdf.addImage(cv.toDataURL("image/png"), "PNG", MARGIN_X, MARGIN_Y, CONTENT_W, sliceMm);
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
