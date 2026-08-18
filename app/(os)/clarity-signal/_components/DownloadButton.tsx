"use client";

// PDF generation: dom-to-image-more → jsPDF
//
// Four-step page break decision (first match wins):
//
//  1. Straddle (rows only)
//     A break-marked element < 150mm tall starts on this page but its bottom
//     extends past the page end — it will be cut. Cut before it (latest top = min waste).
//
//  2. Orphan (last 15% of page)
//     A break-marked element starts in the final 15% of the page — too little room
//     for useful content after it. Cut before it (latest top = min waste).
//
//  3. Parent header check
//     After steps 1–2, if the proposed cut is within 35mm of a parent section
//     card's start, only the section header would be visible above the cut.
//     Bump the cut back to the parent section's top (whole section moves to next page).
//
//  4. Paragraph snap (fallback)
//     Snap to the latest <p>/<li>/<blockquote> bottom within the last 35mm.

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

      // Measure every break-marked element: top + bottom
      const breakBoundsCssPx = Array.from(
        content.querySelectorAll("[data-pdf-break='before']")
      ).map(el => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return { top: r.top - contentRect.top, bottom: r.bottom - contentRect.top };
      });

      // Paragraph / list-item bottom edges for snap fallback
      const textBottomsCssPx = Array.from(
        content.querySelectorAll("p, li, blockquote, dt, dd")
      )
        .map(el => (el as HTMLElement).getBoundingClientRect().bottom - contentRect.top)
        .filter(y => y > 4)
        .sort((a, b) => a - b);

      // Capture
      const SCALE = 1.5;
      const dataUrl = await (domtoimage as { toPng: (node: HTMLElement, opts: object) => Promise<string> })
        .toPng(content, { scale: SCALE });

      const A4_W      = 210;
      const A4_H      = 297;
      const MARGIN_X  = 0;
      const MARGIN_Y  = 12;
      const CONTENT_W = A4_W - MARGIN_X * 2;
      const CONTENT_H = A4_H - MARGIN_Y * 2; // 273mm

      const img = new Image();
      await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });

      const cssPxToMm = SCALE * (CONTENT_W / img.width);
      const imgH      = (img.height / img.width) * CONTENT_W;

      const breakBounds   = breakBoundsCssPx.map(b => ({
        top:    b.top    * cssPxToMm,
        bottom: b.bottom * cssPxToMm,
      }));
      const textBottomsMm = textBottomsCssPx.map(y => y * cssPxToMm);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      let yMm  = 0;
      let first = true;

      // Tuning constants
      const MAX_ROW_HEIGHT  = 150;  // mm — elements taller than this are section cards, not rows
      const ORPHAN_PCT      = 0.85; // elements starting after 85% of page = orphan zone (last 15%)
      const SNAP_ZONE       = 35;   // mm — paragraph snap window
      const MIN_PAGE_FILL   = 0.25; // never cut before 25% of page
      const MIN_SECTION_VIS = 35;   // mm — if < this between section start and cut → hanging header

      while (yMm < imgH - 0.5) {
        if (!first) pdf.addPage();
        first = false;

        let pageEndMm     = yMm + CONTENT_H;
        const minFill     = yMm + CONTENT_H * MIN_PAGE_FILL;
        const orphanStart = yMm + CONTENT_H * ORPHAN_PCT;

        if (pageEndMm < imgH) {
          // ── Step 1: straddle (row-sized elements only) ──────────────
          const straddlers = breakBounds
            .filter(b =>
              b.top >= minFill &&
              b.top < pageEndMm &&
              b.bottom > pageEndMm &&
              (b.bottom - b.top) < MAX_ROW_HEIGHT  // skip full-page section cards
            )
            .sort((a, b) => b.top - a.top); // latest top = min wasted space
          const straddleCut = straddlers[0]?.top;

          // ── Step 2: orphan (last 15% of page) ──────────────────────
          const orphans = breakBounds
            .filter(b => b.top > orphanStart && b.top < pageEndMm)
            .sort((a, b) => b.top - a.top); // latest = min waste
          const orphanCut = orphans[0]?.top;

          // Take the earlier of any detected cut (more conservative = cleaner)
          const candidates = [straddleCut, orphanCut].filter((v): v is number => v !== undefined);
          let proposedCut  = candidates.length > 0 ? Math.min(...candidates) : undefined;

          // ── Step 3: parent header check ─────────────────────────────
          if (proposedCut !== undefined) {
            // Find the nearest parent section card that contains the proposed cut
            const parent = breakBounds
              .filter(b => b.top < proposedCut! && b.top >= minFill && b.bottom > proposedCut!)
              .sort((a, b) => b.top - a.top)[0]; // highest top = most immediate parent

            if (parent && (proposedCut - parent.top) < MIN_SECTION_VIS) {
              // Only the section header would show — move whole section to next page
              proposedCut = parent.top;
            }

            pageEndMm = proposedCut;
          } else {
            // ── Step 4: paragraph snap ──────────────────────────────
            const snapStart = pageEndMm - SNAP_ZONE;
            const snapCut   = textBottomsMm
              .filter(y => y >= Math.max(snapStart, minFill) && y < pageEndMm)
              .at(-1);
            if (snapCut !== undefined) pageEndMm = snapCut;
          }

          // Safety guard — never create an undersized page
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
