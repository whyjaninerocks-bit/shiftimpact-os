"use client";

// Captures the rendered page with html2canvas → jsPDF.
// This produces a pixel-perfect PDF that matches what the user sees on screen —
// dark backgrounds, correct colours, no browser chrome.

import { useState } from "react";

export function DownloadButton({ brandName, contentId }: { brandName: string; contentId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const content = document.getElementById(contentId);
      if (!content) return;

      // Capture the full content at 2× resolution for sharpness
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        foreignObjectRendering: true, // bypasses oklch/P3 color parsing (Tailwind v4)
      });

      const A4_W_MM = 210;
      const A4_H_MM = 297;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const imgW = A4_W_MM;
      const imgH = (canvas.height * imgW) / canvas.width;
      const pageH = A4_H_MM;

      let yOffset = 0;
      let remainingH = imgH;
      let isFirstPage = true;

      while (remainingH > 0) {
        if (!isFirstPage) pdf.addPage();

        // Crop the canvas slice that fits this page
        const sliceH = Math.min(pageH, remainingH);
        const srcY = (yOffset / imgH) * canvas.height;
        const srcH = (sliceH / imgH) * canvas.height;

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, imgW, sliceH);

        yOffset += sliceH;
        remainingH -= sliceH;
        isFirstPage = false;
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
