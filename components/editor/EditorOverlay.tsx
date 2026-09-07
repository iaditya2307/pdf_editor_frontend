"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Position } from "@/types/editor";
import { generateId } from "@/lib/uuid";
import EditorElementBox from "@/components/editor/EditorElementBox";

interface EditorOverlayProps {
  pageNumber: number;
  width: number;
  height: number;
}

export default function EditorOverlay({ pageNumber, width, height }: EditorOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    activeTool,
    elements,
    addElement,
    selectedElementId,
    selectElement,
    setTool,
    deleteElement,
    currentTextColor,
    currentFontSize,
    currentFontFamily,
    currentStrokeColor,
    currentStrokeWidth,
    currentHighlightColor,
  } = useEditorStore();

  const [isDrawing, setIsDrawing] = useState(false);
  // Use refs for live draw state to avoid stale closures in pointer handlers
  const currentPointsRef = useRef<Position[]>([]);
  const dragStartRef = useRef<Position | null>(null);
  const dragCurrentRef = useRef<Position | null>(null);
  // Force re-render for preview updates during drawing
  const [drawTick, setDrawTick] = useState(0);

  const pageElements = elements.filter((el) => el.page === pageNumber);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
        e.preventDefault();
        deleteElement(selectedElementId);
      } else if (e.key === "Escape") {
        selectElement(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, deleteElement, selectElement]);

  const getRelativePos = useCallback((e: React.PointerEvent | PointerEvent): Position => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(width, e.clientX - rect.left)),
      y: Math.max(0, Math.min(height, e.clientY - rect.top)),
    };
  }, [width, height]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle direct clicks on the overlay backdrop, not on child elements
    if (e.target !== overlayRef.current) return;

    const pos = getRelativePos(e);

    if (activeTool === "select") {
      // Select mode: clicking empty area deselects
      selectElement(null);
      return;
    }

    if (activeTool === "text") {
      // Text tool: place a new text box
      const id = generateId();
      addElement({
        id,
        type: "text",
        page: pageNumber,
        position: pos,
        size: { width: 200, height: Math.max(32, currentFontSize * 1.5) },
        text: "",
        fontSize: currentFontSize,
        fontFamily: currentFontFamily,
        color: currentTextColor,
      });
      selectElement(id);
      setTool("select");
      return;
    }

    if (activeTool === "draw") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawing(true);
      currentPointsRef.current = [pos];
      setDrawTick((t) => t + 1);
      return;
    }

    if (
      activeTool === "highlight" ||
      activeTool === "rectangle" ||
      activeTool === "circle" ||
      activeTool === "line"
    ) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawing(true);
      dragStartRef.current = pos;
      dragCurrentRef.current = pos;
      setDrawTick((t) => t + 1);
    }
  };

  // RAF ref to throttle pointermove updates
  const rafRef = useRef<number>(0);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    if (rafRef.current) return; // already scheduled

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const pos = getRelativePos(e);
      if (activeTool === "draw") {
        currentPointsRef.current = [...currentPointsRef.current, pos];
      } else {
        dragCurrentRef.current = pos;
      }
      setDrawTick((t) => t + 1);
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    setIsDrawing(false);

    const id = generateId();

    if (activeTool === "draw") {
      const pts = currentPointsRef.current;
      if (pts.length > 1) {
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        addElement({
          id,
          type: "draw",
          page: pageNumber,
          position: { x: minX, y: minY },
          size: {
            width: Math.max(4, Math.max(...xs) - minX),
            height: Math.max(4, Math.max(...ys) - minY),
          },
          points: pts,
          strokeColor: currentStrokeColor,
          strokeWidth: currentStrokeWidth,
        });
        selectElement(id);
        setTool("select");
      }
      currentPointsRef.current = [];
    } else if (dragStartRef.current && dragCurrentRef.current) {
      const start = dragStartRef.current;
      const cur = dragCurrentRef.current;
      const minX = Math.min(start.x, cur.x);
      const minY = Math.min(start.y, cur.y);
      const w = Math.abs(cur.x - start.x);
      const h = Math.abs(cur.y - start.y);

      if (w > 4 || h > 4) {
        if (activeTool === "highlight") {
          addElement({
            id,
            type: "highlight",
            page: pageNumber,
            position: { x: minX, y: minY },
            size: { width: w, height: h },
            color: currentHighlightColor,
            opacity: 0.4,
          });
        } else if (
          activeTool === "rectangle" ||
          activeTool === "circle" ||
          activeTool === "line"
        ) {
          addElement({
            id,
            type: activeTool,
            page: pageNumber,
            position: { x: minX, y: minY },
            size: { width: w, height: h },
            strokeColor: currentStrokeColor,
            strokeWidth: currentStrokeWidth,
          });
        }
        selectElement(id);
        setTool("select");
      }

      dragStartRef.current = null;
      dragCurrentRef.current = null;
    }

    setDrawTick((t) => t + 1);
  };

  // Draw preview (rendered during active drawing)
  const renderPreview = () => {
    if (!isDrawing) return null;

    if (activeTool === "draw" && currentPointsRef.current.length > 1) {
      const d = currentPointsRef.current
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");
      return (
        <svg className="absolute inset-0 h-full w-full pointer-events-none z-30">
          <path
            d={d}
            stroke={currentStrokeColor}
            strokeWidth={currentStrokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    const start = dragStartRef.current;
    const cur = dragCurrentRef.current;
    if (start && cur) {
      const minX = Math.min(start.x, cur.x);
      const minY = Math.min(start.y, cur.y);
      const pw = Math.abs(cur.x - start.x);
      const ph = Math.abs(cur.y - start.y);

      if (activeTool === "highlight") {
        return (
          <div
            className="absolute pointer-events-none z-30"
            style={{
              left: minX,
              top: minY,
              width: pw,
              height: ph,
              backgroundColor: currentHighlightColor,
              opacity: 0.4,
              border: "1px dashed #ca8a04",
            }}
          />
        );
      }

      return (
        <div
          className={`absolute pointer-events-none z-30 ${activeTool === "circle" ? "rounded-full" : ""}`}
          style={{
            left: minX,
            top: minY,
            width: pw,
            height: ph,
            border: `${currentStrokeWidth}px dashed ${currentStrokeColor}`,
          }}
        />
      );
    }

    return null;
  };

  const cursor =
    activeTool === "draw" ||
    activeTool === "highlight" ||
    activeTool === "rectangle" ||
    activeTool === "circle" ||
    activeTool === "line"
      ? "crosshair"
      : activeTool === "text"
      ? "text"
      : "default";

  return (
    <div
      ref={overlayRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute inset-0 z-10 select-none"
      style={{ cursor }}
    >
      {/* Draw preview (on top of elements) */}
      {renderPreview()}

      {pageElements.map((element) => (
        <EditorElementBox
          key={element.id}
          element={element}
          isSelected={selectedElementId === element.id}
          pageWidth={width}
          pageHeight={height}
        />
      ))}
    </div>
  );
}