"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { useEditorStore } from "@/store/editorStore";
import { RotateCw, Trash2 } from "lucide-react";

interface PdfThumbnailProps {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  onClick: () => void;
}

export default function PdfThumbnail({ pdf, pageNumber, active, onClick }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const { pageRotations, rotatePage, deletePage } = useEditorStore();
  const rotationAngle = pageRotations[pageNumber] || 0;

  useEffect(() => {
    let renderTask: pdfjsLib.RenderTask | null = null;
    let cancelled = false;

    async function render() {
      try {
        setLoading(true);
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1, rotation: rotationAngle });
        const targetWidth = 144; // sidebar is 168px - 24px padding
        const scale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale, rotation: rotationAngle });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        renderTask = page.render({ canvas, canvasContext: ctx, viewport });
        await renderTask.promise;
        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.warn(`Thumbnail p${pageNumber}:`, err);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, rotationAngle]);

  return (
    <div
      className={`group relative flex w-full flex-col rounded-lg border transition-all duration-150 overflow-hidden cursor-pointer ${
        active
          ? "border-blue-400 bg-blue-50 shadow-md ring-2 ring-blue-200"
          : "border-transparent bg-white hover:border-gray-200 hover:shadow-sm"
      }`}
      onClick={onClick}
    >
      {/* Canvas */}
      <div className="relative flex items-center justify-center overflow-hidden rounded-md bg-gray-50 m-1.5">
        <canvas
          ref={canvasRef}
          className="block max-w-full rounded shadow-sm"
          style={{ display: loading ? "none" : "block" }}
        />
        {loading && (
          <div className="shimmer h-32 w-full rounded" />
        )}
      </div>

      {/* Label row */}
      <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5">
        <span className={`text-[10px] font-semibold ${active ? "text-blue-600" : "text-gray-500"}`}>
          {pageNumber}
        </span>
        {/* Quick actions - show on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); rotatePage(pageNumber); }}
            title="Rotate 90°"
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <RotateCw className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deletePage(pageNumber); }}
            title="Delete page"
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
