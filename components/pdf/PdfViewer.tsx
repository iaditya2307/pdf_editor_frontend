"use client";

import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

import PdfPage from "@/components/pdf/PdfPage";
import { useEditorStore } from "@/store/editorStore";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "/pdf.worker.min.mjs";

interface PdfViewerProps {
  file: File;
  onLoadSuccess?: (numPages: number) => void;
}

export default function PdfViewer({
  file,
  onLoadSuccess,
}: PdfViewerProps) {
  const [pdf, setPdf] =
    useState<pdfjsLib.PDFDocumentProxy | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(
    null
  );

  const zoom = useEditorStore(
    (state) => state.zoom
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);
        setPdf(null);

        console.log("Loading PDF:", file.name);

        const arrayBuffer =
          await file.arrayBuffer();

        console.log(
          "PDF size:",
          arrayBuffer.byteLength
        );

        const loadingTask =
          pdfjsLib.getDocument({
            data: arrayBuffer,
          });

        const loadedPdf =
          await loadingTask.promise;

        console.log(
          "PDF loaded successfully"
        );

        console.log(
          "Number of pages:",
          loadedPdf.numPages
        );

        if (!cancelled) {
          setPdf(loadedPdf);
          setLoading(false);
          onLoadSuccess?.(loadedPdf.numPages);
        }
      } catch (err) {
        console.error(
          "PDF LOAD ERROR:",
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unknown PDF error"
          );

          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [file]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-lg font-medium">
            Loading PDF...
          </div>

          <div className="mt-2 text-sm text-gray-500">
            {file.name}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100">
        <div className="max-w-md rounded-lg border bg-white p-6 shadow">
          <h2 className="font-semibold text-red-600">
            Failed to load PDF
          </h2>

          <p className="mt-3 break-words text-sm text-gray-600">
            {error}
          </p>

          <p className="mt-4 text-xs text-gray-400">
            Check the browser console for the full
            error.
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
      {Array.from(
        { length: pdf.numPages },
        (_, index) => (
          <PdfPage
            key={index + 1}
            pdf={pdf}
            pageNumber={index + 1}
            scale={zoom}
          />
        )
      )}
    </div>
  );
}