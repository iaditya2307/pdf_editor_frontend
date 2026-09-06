"use client";

import { useEffect, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

import PdfPage from "@/components/pdf/PdfPage";
import { useEditorStore } from "@/store/editorStore";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "/pdf.worker.min.mjs";

interface PdfViewerProps {
  file: File;
  onPageCountChange?: (count: number) => void;
  onPdfLoad?: (pdf: pdfjsLib.PDFDocumentProxy | null) => void;
  onDimensionsUpdate?: (dimensions: Record<number, { width: number; height: number }>) => void;
}

export default function PdfViewer({
  file,
  onPageCountChange,
  onPdfLoad,
  onDimensionsUpdate,
}: PdfViewerProps) {
  const [pdf, setPdf] =
    useState<pdfjsLib.PDFDocumentProxy | null>(null);

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
        if (prev[pageNumber]?.width === width && prev[pageNumber]?.height === height) {
          return prev;
        }
        const updated = { ...prev, [pageNumber]: { width, height } };
        onDimensionsUpdate?.(updated);
        return updated;
      });
    },
    [onDimensionsUpdate]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);
        setPdf(null);
        onPdfLoad?.(null);

        const arrayBuffer = await file.arrayBuffer();

        const loadedPdf =
          await pdfjsLib.getDocument({
            data: arrayBuffer,
          }).promise;

        if (cancelled) return;

        setPdf(loadedPdf);
        onPageCountChange?.(loadedPdf.numPages);
        onPdfLoad?.(loadedPdf);
        setLoading(false);
      } catch (err) {
        console.error("PDF LOAD ERROR:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load PDF"
          );
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [file, onPageCountChange, onPdfLoad]);

  useEffect(() => {
    if (!pdf) return;

    const pageElement = document.getElementById(
      `pdf-page-${activePage}`
    );

    pageElement?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [activePage, pdf]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 font-sans text-sm text-gray-500">
        Loading PDF...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 font-sans">
        <div className="rounded-lg bg-white p-6 shadow max-w-md text-center">
          <h2 className="font-semibold text-red-600">
            Failed to load PDF
          </h2>
          <p className="mt-2 text-sm text-gray-600 break-words">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!pdf) {
    return null;
  }

  return (
    <div className="h-full overflow-auto bg-gray-100 p-8">
      {Array.from({ length: pdf.numPages }, (_, index) => {
        const pageNumber = index + 1;
        if (deletedPages.includes(pageNumber)) return null;

        return (
          <PdfPage
            key={pageNumber}
            pdf={pdf}
            pageNumber={pageNumber}
            scale={zoom}
            onDimensionMeasured={handleDimensionMeasured}
          />
        );
      })}
    </div>
  );
}