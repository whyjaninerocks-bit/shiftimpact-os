"use client";

// Triggers browser print-to-PDF. Hidden during printing via @media print in the page.

export function DownloadButton({ brandName }: { brandName: string }) {
  function handlePrint() {
    // Set a clean document title so the PDF filename is meaningful
    const prev = document.title;
    document.title = `Clarity Signal — ${brandName}`;
    window.print();
    document.title = prev;
  }

  return (
    <div className="no-print flex items-center gap-3">
      <p className="text-[11px] text-neutral-400">
        In print dialog: uncheck <strong>Headers and footers</strong>
      </p>
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors shadow-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download PDF
      </button>
    </div>
  );
}
