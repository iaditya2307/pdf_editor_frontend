"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { useEditorStore } from "@/store/editorStore";
import { EditorElement } from "@/types/editor";
import EditorOverlay from "@/components/editor/EditorOverlay";

interface PdfPageProps {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  onDimensionMeasured?: (pageNumber: number, width: number, height: number) => void;
}

export default function PdfPage({
  pdf,
  pageNumber,
  scale,
  onDimensionMeasured,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    pageRotations,
    initializedPages,
    markPageInitialized,
    addExtractedElements,
  } = useEditorStore();

  const rotationAngle = pageRotations[pageNumber] || 0;

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

        const page = await pdf.getPage(pageNumber);

        if (isCancelled) return;

        const viewport = page.getViewport({ scale, rotation: rotationAngle });

        setDimensions({
          width: viewport.width,
          height: viewport.height,
        });

        onDimensionMeasured?.(pageNumber, viewport.width, viewport.height);

        // Parse & Extract Original PDF Text Content if not yet initialized
        if (!initializedPages[pageNumber]) {
          try {
            const textContent = await page.getTextContent();
            const extracted: EditorElement[] = [];

            for (const item of textContent.items as any[]) {
              if (!item.str || !item.str.trim()) continue;

              const tx = item.transform; // [scaleX, skewX, skewY, scaleY, pdfX, pdfY]
              const pdfX = tx[4];
              const pdfY = tx[5];
              const fontHeight = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);

              const [screenX, screenY] = viewport.convertToViewportPoint(pdfX, pdfY);

              const computedFontSize = Math.max(11, Math.round(fontHeight * scale));
              const width = item.width
                ? Math.max(30, Math.round(item.width * scale))
                : Math.max(40, item.str.length * computedFontSize * 0.55);
              const height = Math.max(16, Math.round(computedFontSize * 1.35));

              const topY = screenY - height;

              extracted.push({
                id: crypto.randomUUID(),
                type: "text",
                page: pageNumber,
                position: {
                  x: Math.max(0, Math.round(screenX)),
                  y: Math.max(0, Math.round(topY)),
                },
                size: {
                  width: Math.round(width),
                  height: Math.round(height),
                },
                text: item.str,
                fontSize: computedFontSize,
                fontFamily: "Helvetica",
                color: "#000000",
                isOriginalPdfText: true,
                originalText: item.str,
                originalPosition: {
                  x: Math.max(0, Math.round(screenX)),
                  y: Math.max(0, Math.round(topY)),
                },
                originalSize: {
                  width: Math.round(width),
                  height: Math.round(height),
                },
              });
            }

            if (extracted.length > 0) {
              addExtractedElements(extracted);
            }
            markPageInitialized(pageNumber);
          } catch (textErr) {
            console.warn(`Text extraction skipped for page ${pageNumber}:`, textErr);
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 0));

        if (isCancelled) return;

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
          console.error(`PAGE ${pageNumber} RENDER ERROR:`, error);
          if (!isCancelled) {
            setRenderError(error?.message || "Failed to render page");
            setLoading(false);
          }
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
  }, [
    pdf,
    pageNumber,
    scale,
    rotationAngle,
    onDimensionMeasured,
    initializedPages,
    markPageInitialized,
    addExtractedElements,
  ]);

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      className="relative mx-auto mb-6 bg-white shadow-lg transition-all duration-300 select-none"
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
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 font-sans">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600">
              Rendering page {pageNumber}...
            </div>
          </div>
        </div>
      )}

      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 p-4 text-center text-red-600 z-10 font-sans">
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