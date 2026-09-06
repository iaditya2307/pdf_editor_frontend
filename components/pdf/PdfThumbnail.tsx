"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

interface PdfThumbnailProps {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  onClick: () => void;
}

export default function PdfThumbnail({
  pdf,
  pageNumber,
  active,
  onClick,
}: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let renderTask: pdfjsLib.RenderTask | null = null;
    let isCancelled = false;

    async function renderThumbnail() {
      try {
        setLoading(true);
        const page = await pdf.getPage(pageNumber);

        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const targetWidth = 140;
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;

        if (!isCancelled) {
          setLoading(false);
        }
      } catch (error: any) {
        if (error?.name !== "RenderingCancelledException") {
          console.error(`Thumbnail render error for page ${pageNumber}:`, error);
        }
      }
    }

    renderThumbnail();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNumber]);

  return (
    <button
      onClick={onClick}
      className={`group flex w-full flex-col items-center rounded-lg p-2 transition ${
        active ? "bg-blue-100 ring-2 ring-blue-600" : "hover:bg-gray-100"
      }`}
    >
      <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded border bg-white shadow-sm">
        <canvas ref={canvasRef} className="block max-w-full max-h-full object-contain" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs text-gray-400">
            {pageNumber}
          </div>
        )}
      </div>

      <div className={`mt-1.5 text-xs font-medium ${active ? "font-semibold text-blue-700" : "text-gray-600"}`}>
        Page {pageNumber}
      </div>
    </button>
  );
}
