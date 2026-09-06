"use client";

import { useEffect, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import PdfPage from "@/components/pdf/PdfPage";
import { useEditorStore } from "@/store/editorStore";
import { Loader2 } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  file: File;
  onPageCountChange?: (count: number) => void;
  onPdfLoad?: (pdf: pdfjsLib.PDFDocumentProxy | null) => void;
  onDimensionsUpdate?: (dims: Record<number, { width: number; height: number }>) => void;
}

export default function PdfViewer({
  file,
  onPageCountChange,
  onPdfLoad,
  onDimensionsUpdate,
}: PdfViewerProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const zoom = useEditorStore((state) => state.zoom);
  const activePage = useEditorStore((state) => state.activePage);
  const deletedPages = useEditorStore((state) => state.deletedPages);

  const [pageDimensions, setPageDimensions] = useState<
    Record<number, { width: number; height: number }>
  >({});

  const handleDimensionMeasured = useCallback(
    (pageNumber: number, width: number, height: number) => {
      setPageDimensions((prev) => {
        if (prev[pageNumber]?.width === width && prev[pageNumber]?.height === height) return prev;
        const updated = { ...prev, [pageNumber]: { width, height } };
        onDimensionsUpdate?.(updated);
        return updated;
      });
    },
    [onDimensionsUpdate]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setPdf(null);
        onPdfLoad?.(null);

        const buf = await file.arrayBuffer();
        const loaded = await pdfjsLib.getDocument({ data: buf }).promise;

        if (cancelled) return;

        setPdf(loaded);
        onPageCountChange?.(loaded.numPages);
        onPdfLoad?.(loaded);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load PDF.");
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [file, onPageCountChange, onPdfLoad]);

  // Scroll to active page when it changes
  useEffect(() => {
    if (!pdf) return;
    const el = document.getElementById(`pdf-page-${activePage}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activePage, pdf]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-gray-500">Loading PDF…</p>
          <p className="text-xs text-gray-400 truncate max-w-xs">{file.name}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f0f2f5] p-8">
        <div className="max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-md text-center">
          <div className="mb-3 text-3xl">⚠️</div>
          <h2 className="text-base font-bold text-gray-900">Failed to load PDF</h2>
          <p className="mt-2 text-sm text-gray-500 break-words">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdf) return null;

  const visiblePages = Array.from({ length: pdf.numPages }, (_, i) => i + 1).filter(
    (n) => !deletedPages.includes(n)
  );

  return (
    <div
      className="h-full overflow-auto bg-[#f0f2f5]"
      style={{ scrollPaddingTop: "24px" }}
    >
      <div className="py-8 space-y-6">
        {visiblePages.map((pageNumber) => (
          <PdfPage
            key={pageNumber}
            pdf={pdf}
            pageNumber={pageNumber}
            scale={zoom}
            onDimensionMeasured={handleDimensionMeasured}
          />
        ))}
        {/* Bottom padding so last page isn't flush against the edge */}
        <div className="h-8" />
      </div>
    </div>
  );
}