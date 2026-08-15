"use client";

// Uses dom-to-image-more → jsPDF with two-tier page break logic:
//
// Tier 1 (section breaks): elements with data-pdf-break="before" trigger an early
//   cut when a section header would land in the orphan zone (last 25% of the page).
//
// Tier 2 (paragraph snapping): ALL p / li / blockquote bottom edges are measured
//   before capture. When the naive page cut would fall within a SNAP_ZONE (last 18mm),
//   we pull the cut backward to the nearest paragraph bottom — ensuring cuts always
//   fall between lines, never through them.

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

      const contentRect = content.getBoundingClientRect();

      // ── Measure break-marked elements (TOP + BOTTOM) ─────────────────
      const breakBoundsCssPx = Array.from(
        content.querySelectorAll("[data-pdf-break='before']")
      ).map(el => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return { top: r.top - contentRect.top, bottom: r.bottom - contentRect.top };
      });

      // ── Measure paragraph / list-item bottom edges (Tier-3 snap) ─────
      const textBottomsCssPx = Array.from(
        content.querySelectorAll("p, li, blockquote, dt, dd")
      )
        .map(el => (el as HTMLElement).getBoundingClientRect().bottom - contentRect.top)
        .filter(y => y > 4)
        .sort((a, b) => a - b);

      // ── Capture ──────────────────────────────────────────────────────
      const SCALE = 1.5;
      const dataUrl = await (domtoimage as { toPng: (node: HTMLElement, opts: object) => Promise<string> })
        .toPng(content, { scale: SCALE });

      const A4_W      = 210;
      const A4_H      = 297;
      const MARGIN_X  = 0;
      const MARGIN_Y  = 12;
      const CONTENT_W = A4_W - MARGIN_X * 2;
      const CONTENT_H = A4_H - MARGIN_Y * 2;

      const img = new Image();
      await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });

      const cssPxToMm  = SCALE * (CONTENT_W / img.width);
      const imgH       = (img.height / img.width) * CONTENT_W;
      const breakBounds    = breakBoundsCssPx.map(b => ({
        top: b.top * cssPxToMm, bottom: b.bottom * cssPxToMm,
      }));
      const textBottomsMm  = textBottomsCssPx.map(y => y * cssPxToMm);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      let yMm  = 0;
      let first = true;

      const ORPHAN_ZONE   = 0.45;
      const SNAP_ZONE     = 35;
      const MIN_PAGE_FILL = 0.25;

      while (yMm < imgH - 0.5) {
        if (!first) pdf.addPage();
        first = false;

        let pageEndMm     = yMm + CONTENT_H;
        const minFill     = yMm + CONTENT_H * MIN_PAGE_FILL;
        const orphanStart = yMm + CONTENT_H * ORPHAN_ZONE;

        if (pageEndMm < imgH) {
          // Tier 1: straddle — latest top (min waste)
          const straddlers  = breakBounds
            .filter(b => b.top >= minFill && b.top < pageEndMm && b.bottom > pageEndMm)
            .sort((a, b) => b.top - a.top);
          const straddleCut = straddlers[0]?.top;

          // Tier 2: orphan — earliest top (move whole section to next page)
          const orphans    = breakBounds
            .filter(b => b.top > orphanStart && b.top < pageEndMm)
            .sort((a, b) => a.top - b.top);
          const orphanCut  = orphans[0]?.top;

          if (straddleCut !== undefined || orphanCut !== undefined) {
            const candidates = [straddleCut, orphanCut].filter((v): v is number => v !== undefined);
            pageEndMm = Math.min(...candidates);
          } else {
            // Tier 3: paragraph snap
            const snapStart = pageEndMm - SNAP_ZONE;
            const snapCut   = textBottomsMm
              .filter(y => y >= Math.max(snapStart, minFill) && y < pageEndMm)
              .at(-1);
            if (snapCut !== undefined) pageEndMm = snapCut;
          }

          if (pageEndMm < minFill) pageEndMm = yMm + CONTENT_H;
        }

        pageEndMm = Math.min(pageEndMm, imgH);
        const sliceMm = pageEndMm - yMm;

        const yPx     = Math.round((yMm     / imgH) * img.height);
        const slicePx = Math.round((sliceMm / imgH) * img.height);

        const cv  = document.createElement("canvas");
        cv.width  = img.width;
        cv.height = slicePx;
        cv.getContext("2d")!.drawImage(img, 0, yPx, img.width, slicePx, 0, 0, img.width, slicePx);

        pdf.addImage(cv.toDataURL("image/png"), "PNG", MARGIN_X, MARGIN_Y, CONTENT_W, sliceMm);
        yMm = pageEndMm;
      }

      pdf.save(`Clarity Signal — ${brandName}.pdf`);
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
      className="no-print inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 transition-colors shadow-sm"
    >
      {loading ? (
        <>
          <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          Generating…
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download PDF
        </>
      )}
    </button>
  );
}
