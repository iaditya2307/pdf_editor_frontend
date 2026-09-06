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

export default function PdfThumbnail({
  pdf,
  pageNumber,
  active,
  onClick,
}: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  const { pageRotations, rotatePage, deletePage } = useEditorStore();
  const rotationAngle = pageRotations[pageNumber] || 0;

  useEffect(() => {
    let renderTask: pdfjsLib.RenderTask | null = null;
    let isCancelled = false;

    async function renderThumbnail() {
      try {
        setLoading(true);
        const page = await pdf.getPage(pageNumber);

        if (isCancelled) return;

        const unscaledViewport = page.getViewport({
          scale: 1,
          rotation: rotationAngle,
        });
        const targetWidth = 140;
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale, rotation: rotationAngle });

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
  }, [pdf, pageNumber, rotationAngle]);

  return (
    <div
      className={`group relative flex w-full flex-col items-center rounded-lg p-2 transition font-sans ${
        active ? "bg-blue-100 ring-2 ring-blue-600" : "hover:bg-gray-100"
      }`}
    >
      <button onClick={onClick} className="w-full text-left">
        <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded border bg-white shadow-sm">
          <canvas
            ref={canvasRef}
            className="block max-w-full max-h-full object-contain transition-transform duration-300"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs text-gray-400">
              {pageNumber}
            </div>
          )}
        </div>
      </button>

      <div className="mt-1.5 flex w-full items-center justify-between px-1">
        <span
          className={`text-xs font-medium ${
            active ? "font-semibold text-blue-700" : "text-gray-600"
          }`}
        >
          Page {pageNumber}
        </span>

        {/* Thumbnail Quick Actions: Rotate & Delete */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              rotatePage(pageNumber);
            }}
            className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deletePage(pageNumber);
            }}
            className="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700"
            title="Delete Page"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
