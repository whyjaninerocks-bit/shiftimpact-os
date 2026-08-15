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

      // ── Tier 1: section-level break markers ─────────────────────────
      const breakPosCssPx = Array.from(
        content.querySelectorAll("[data-pdf-break='before']")
      ).map(el => (el as HTMLElement).getBoundingClientRect().top - contentRect.top);

      // ── Tier 2: paragraph / list-item bottom edges ───────────────────
      // These are the "safe cut points" — gaps between text blocks.
      const textBottomsCssPx = Array.from(
        content.querySelectorAll("p, li, blockquote, dt, dd")
      )
        .map(el => (el as HTMLElement).getBoundingClientRect().bottom - contentRect.top)
        .filter(y => y > 4)           // ignore near-zero height elements
        .sort((a, b) => a - b);

      // ── Capture ──────────────────────────────────────────────────────
      const SCALE = 1.5;
      const dataUrl = await (domtoimage as { toPng: (node: HTMLElement, opts: object) => Promise<string> })
        .toPng(content, { scale: SCALE });

      const A4_W     = 210;
      const A4_H     = 297;
      const MARGIN_X = 0;
      const MARGIN_Y = 12;                     // top + bottom white space per page
      const CONTENT_W = A4_W - MARGIN_X * 2;
      const CONTENT_H = A4_H - MARGIN_Y * 2;  // 273mm usable per page

      const img = new Image();
      await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });

      // css-px → content-mm
      const cssPxToMm = SCALE * (CONTENT_W / img.width);
      const imgH      = (img.height / img.width) * CONTENT_W;

      const breakPosMm    = breakPosCssPx.map(px => px * cssPxToMm);
      const textBottomsMm = textBottomsCssPx.map(px => px * cssPxToMm);

      // ── Page-building loop ───────────────────────────────────────────
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      let yMm  = 0;
      let first = true;

      const ORPHAN_ZONE   = 0.65;  // break marker in last 35% → cut before it
      const SNAP_ZONE     = 35;    // mm: pull cut back to nearest item bottom in this window
      const MIN_PAGE_FILL = 0.25;  // never cut before 25% of page is filled

      while (yMm < imgH - 0.5) {
        if (!first) pdf.addPage();
        first = false;

        let pageEndMm = yMm + CONTENT_H;

        if (pageEndMm < imgH) {
          // ── Tier 1: break-marker orphan prevention ─────────────
          // Take the LAST marker in the orphan zone (closest to page end = least wasted space)
          const orphanStart  = yMm + CONTENT_H * ORPHAN_ZONE;
          const markersInZone = breakPosMm.filter(bp => bp > orphanStart && bp < pageEndMm);
          const sectionCut   = markersInZone.at(-1); // latest = least whitespace

          if (sectionCut !== undefined) {
            pageEndMm = sectionCut;
          } else {
            // ── Tier 2: snap to paragraph/item boundary ─────────
            const snapStart = pageEndMm - SNAP_ZONE;
            const minFill   = yMm + CONTENT_H * MIN_PAGE_FILL;

            const snapCut = textBottomsMm
              .filter(y => y >= Math.max(snapStart, minFill) && y < pageEndMm)
              .at(-1); // latest = closest to ideal cut

            if (snapCut !== undefined) {
              pageEndMm = snapCut;
            }
          }
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
