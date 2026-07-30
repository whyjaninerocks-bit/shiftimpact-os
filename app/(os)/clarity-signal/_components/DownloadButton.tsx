"use client";

// Uses dom-to-image-more (SVG foreignObject renderer) → jsPDF.
// dom-to-image-more uses the browser's native renderer so oklch/P3 colours work correctly.

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

      // Capture at 2× for sharpness
      const dataUrl = await (domtoimage as { toPng: (node: HTMLElement, opts: object) => Promise<string> })
        .toPng(content, { scale: 2 });

      const A4_W = 210;
      const A4_H = 297;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Calculate image height maintaining aspect ratio at A4 width
      const img = new Image();
      await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });

      const imgH = (img.height * A4_W) / img.width;

      // Split into A4 pages
      let yOffset = 0;
      let remaining = imgH;
      let first = true;

      while (remaining > 0) {
        if (!first) pdf.addPage();
        const slice = Math.min(A4_H, remaining);

        // Crop the slice out of the source image via a canvas
        const cv = document.createElement("canvas");
        cv.width = img.width;
        cv.height = Math.round((slice / imgH) * img.height);
        const ctx = cv.getContext("2d")!;
        ctx.drawImage(img,
          0, Math.round((yOffset / imgH) * img.height),
          img.width, cv.height,
          0, 0, img.width, cv.height,
        );

        pdf.addImage(cv.toDataURL("image/png"), "PNG", 0, 0, A4_W, slice);
        yOffset += slice;
        remaining -= slice;
        first = false;
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
