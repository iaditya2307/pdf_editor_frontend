"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

import EditorOverlay from "@/components/editor/EditorOverlay";

interface PdfPageProps {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}

export default function PdfPage({
  pdf,
  pageNumber,
  scale,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let renderTask: pdfjsLib.RenderTask | null = null;
    let isCancelled = false;

    async function renderPage() {
      try {
        setLoading(true);
        setRenderError(null);

        console.log(`Rendering page ${pageNumber} with scale ${scale}`);

        const page = await pdf.getPage(pageNumber);

        if (isCancelled) return;

        const viewport = page.getViewport({ scale });

        setDimensions({
          width: viewport.width,
          height: viewport.height,
        });

        // Give React a tick to commit dimension state so canvas is present
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) {
          console.warn(`Canvas element not available for page ${pageNumber}`);
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) {
          console.warn(`Could not get 2d context for page ${pageNumber}`);
          return;
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;

        if (!isCancelled) {
          console.log(`Page ${pageNumber} rendered successfully`);
          setLoading(false);
        }
      } catch (error: any) {
        if (error?.name === "RenderingCancelledException") {
          return;
        }
        console.error(`PAGE ${pageNumber} RENDER ERROR:`, error);
        if (!isCancelled) {
          setRenderError(error?.message || "Failed to render page");
          setLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNumber, scale]);

  return (
    <div
      id={`page-${pageNumber}`}
      className="relative mx-auto mb-6 bg-white shadow-lg transition-all"
      style={{
        width: dimensions.width || 600,
        height: dimensions.height || 800,
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute left-0 top-0 block bg-white"
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600">
              Rendering page {pageNumber}...
            </div>
          </div>
        </div>
      )}

      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 p-4 text-center text-red-600 z-10">
          <div className="text-sm font-medium">
            Failed to render page {pageNumber}: {renderError}
          </div>
        </div>
      )}

      {dimensions.width > 0 && dimensions.height > 0 && (
        <EditorOverlay
          pageNumber={pageNumber}
          width={dimensions.width}
          height={dimensions.height}
        />
      )}
    </div>
  );
}