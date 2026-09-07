"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { useEditorStore } from "@/store/editorStore";
import { EditorElement } from "@/types/editor";
import EditorOverlay from "@/components/editor/EditorOverlay";
import { generateId } from "@/lib/uuid";

interface PdfPageProps {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  onDimensionMeasured?: (pageNumber: number, width: number, height: number) => void;
  isVisible: boolean; // controlled by parent intersection observer
}

export default function PdfPage({
  pdf,
  pageNumber,
  scale,
  onDimensionMeasured,
  isVisible,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use ref for store actions to keep render effect stable
  const initRef = useRef(
    useEditorStore.getState().initializedPages
  );
  const markPageInitialized = useEditorStore((s) => s.markPageInitialized);
  const addExtractedElements = useEditorStore((s) => s.addExtractedElements);
  const rotationAngle = useEditorStore(
    (s) => s.pageRotations[pageNumber] || 0
  );

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  // ── Effect 1: Canvas rendering (triggered by visibility/scale/rotation) ──
  useEffect(() => {
    if (!isVisible) return; // don't render off-screen pages

    let renderTask: pdfjsLib.RenderTask | null = null;
    let cancelled = false;

    async function renderPage() {
      try {
        setLoading(true);
        setRenderError(null);

        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * dpr, rotation: rotationAngle });
        const cssViewport = page.getViewport({ scale, rotation: rotationAngle });

        const newDims = {
          width: Math.round(cssViewport.width),
          height: Math.round(cssViewport.height),
        };

        setDimensions(newDims);
        onDimensionMeasured?.(pageNumber, newDims.width, newDims.height);

        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set physical canvas size (high-res for retina)
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        // Display at CSS size
        canvas.style.width = `${newDims.width}px`;
        canvas.style.height = `${newDims.height}px`;

        renderTask = page.render({ canvas, canvasContext: ctx, viewport });
        await renderTask.promise;

        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException" && !cancelled) {
          setRenderError(err?.message ?? "Render failed");
          setLoading(false);
        }
      }
    }

    renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, scale, rotationAngle, isVisible, onDimensionMeasured]);

  // ── Effect 2: Text extraction — runs ONCE per page, independently ──
  useEffect(() => {
    // Stable ref check avoids re-running when other store state changes
    const alreadyDone = useEditorStore.getState().initializedPages[pageNumber];
    if (alreadyDone) return;

    let cancelled = false;

    async function extractText() {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        // Use scale=1 viewport for coordinate extraction (normalised)
        const vp = page.getViewport({ scale, rotation: 0 });
        const textContent = await page.getTextContent();
        if (cancelled) return;

        const extracted: EditorElement[] = [];

        for (const item of textContent.items as any[]) {
          if (!item.str?.trim()) continue;

          const tx = item.transform;
          const fontHeight = Math.sqrt(tx[0] ** 2 + tx[1] ** 2);
          const [screenX, screenY] = vp.convertToViewportPoint(tx[4], tx[5]);
          const fontSize = Math.max(11, Math.round(fontHeight * scale));
          const width = item.width
            ? Math.max(30, Math.round(item.width * scale))
            : Math.max(40, item.str.length * fontSize * 0.55);
          const height = Math.max(16, Math.round(fontSize * 1.35));
          const topY = screenY - height;

          extracted.push({
            id: generateId(),
            type: "text",
            page: pageNumber,
            position: { x: Math.max(0, Math.round(screenX)), y: Math.max(0, Math.round(topY)) },
            size: { width: Math.round(width), height: Math.round(height) },
            text: item.str,
            fontSize,
            fontFamily: "Helvetica",
            color: "#000000",
            isOriginalPdfText: true,
            originalText: item.str,
            originalPosition: { x: Math.max(0, Math.round(screenX)), y: Math.max(0, Math.round(topY)) },
            originalSize: { width: Math.round(width), height: Math.round(height) },
          });
        }

        if (!cancelled) {
          if (extracted.length > 0) addExtractedElements(extracted);
          markPageInitialized(pageNumber);
        }
      } catch (err) {
        // Text extraction is best-effort; silently skip on failure
      }
    }

    extractText();
    return () => { cancelled = true; };
    // Only run once per (pageNumber, pdf) pair — intentionally omitting store refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, pageNumber]);

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      className="relative mx-auto"
      style={{ width: dimensions.width || 612 }}
    >
      {/* Page card */}
      <div
        className="relative bg-white select-none overflow-hidden"
        style={{
          width: dimensions.width || 612,
          height: dimensions.height || 792,
          boxShadow: "0 1px 3px 0 rgb(0 0 0/0.1), 0 4px 16px 0 rgb(0 0 0/0.08)",
        }}
      >
        {/* Shimmer while rendering */}
        {loading && (
          <div className="absolute inset-0 z-10 shimmer" />
        )}

        {renderError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50 p-6">
            <div className="rounded-lg border border-red-200 bg-white p-4 text-center shadow-sm">
              <p className="text-sm font-semibold text-red-700">Render error — page {pageNumber}</p>
              <p className="mt-1 text-xs text-red-500 break-words">{renderError}</p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="absolute left-0 top-0 block" />

        {dimensions.width > 0 && dimensions.height > 0 && (
          <EditorOverlay
            pageNumber={pageNumber}
            width={dimensions.width}
            height={dimensions.height}
          />
        )}
      </div>

      {/* Page number label */}
      <div className="mt-2 flex justify-center">
        <span className="rounded-full bg-gray-200/80 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500">
          {pageNumber}
        </span>
      </div>
    </div>
  );
}