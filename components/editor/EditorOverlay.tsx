"use client";

import { useRef, useEffect, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Position } from "@/types/editor";
import EditorElementBox from "@/components/editor/EditorElementBox";

interface EditorOverlayProps {
  pageNumber: number;
  width: number;
  height: number;
}

export default function EditorOverlay({
  pageNumber,
  width,
  height,
}: EditorOverlayProps) {
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
  const [currentPoints, setCurrentPoints] = useState<Position[]>([]);
  const [dragStartPos, setDragStartPos] = useState<Position | null>(null);
  const [dragCurrentPos, setDragCurrentPos] = useState<Position | null>(null);

  const pageElements = elements.filter(
    (element) => element.page === pageNumber
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
        deleteElement(selectedElementId);
      } else if (e.key === "Escape") {
        selectElement(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, deleteElement, selectElement]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "text" || activeTool === "select") {
      const id = crypto.randomUUID();
      addElement({
        id,
        type: "text",
        page: pageNumber,
        position: { x, y },
        size: { width: 160, height: 40 },
        text: "",
        fontSize: currentFontSize,
        fontFamily: currentFontFamily,
        color: currentTextColor,
      });

      selectElement(id);
      setTool("select");
    } else if (activeTool === "draw") {
      setIsDrawing(true);
      setCurrentPoints([{ x, y }]);
    } else if (
      activeTool === "highlight" ||
      activeTool === "rectangle" ||
      activeTool === "circle" ||
      activeTool === "line"
    ) {
      setIsDrawing(true);
      setDragStartPos({ x, y });
      setDragCurrentPos({ x, y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "draw") {
      setCurrentPoints((prev) => [...prev, { x, y }]);
    } else if (
      activeTool === "highlight" ||
      activeTool === "rectangle" ||
      activeTool === "circle" ||
      activeTool === "line"
    ) {
      setDragCurrentPos({ x, y });
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const id = crypto.randomUUID();

    if (activeTool === "draw" && currentPoints.length > 1) {
      const xs = currentPoints.map((p) => p.x);
      const ys = currentPoints.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      addElement({
        id,
        type: "draw",
        page: pageNumber,
        position: { x: minX, y: minY },
        size: {
          width: Math.max(20, maxX - minX),
          height: Math.max(20, maxY - minY),
        },
        points: currentPoints,
        strokeColor: currentStrokeColor,
        strokeWidth: currentStrokeWidth,
      });

      setCurrentPoints([]);
      selectElement(id);
      setTool("select");
    } else if (dragStartPos && dragCurrentPos) {
      const minX = Math.min(dragStartPos.x, dragCurrentPos.x);
      const minY = Math.min(dragStartPos.y, dragCurrentPos.y);
      const width = Math.abs(dragCurrentPos.x - dragStartPos.x);
      const height = Math.abs(dragCurrentPos.y - dragStartPos.y);

      if (width > 5 || height > 5) {
        if (activeTool === "highlight") {
          addElement({
            id,
            type: "highlight",
            page: pageNumber,
            position: { x: minX, y: minY },
            size: { width, height },
            color: currentHighlightColor,
            opacity: 0.35,
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
            size: { width, height },
            strokeColor: currentStrokeColor,
            strokeWidth: currentStrokeWidth,
          });
        }
        selectElement(id);
        setTool("select");
      }
      setDragStartPos(null);
      setDragCurrentPos(null);
    }
  };

  const renderDrawPreview = () => {
    if (!isDrawing) return null;

    if (activeTool === "draw" && currentPoints.length > 1) {
      const pathData = currentPoints
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");

      return (
        <svg className="absolute inset-0 h-full w-full pointer-events-none z-30">
          <path
            d={pathData}
            stroke={currentStrokeColor}
            strokeWidth={currentStrokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    if (dragStartPos && dragCurrentPos) {
      const minX = Math.min(dragStartPos.x, dragCurrentPos.x);
      const minY = Math.min(dragStartPos.y, dragCurrentPos.y);
      const previewWidth = Math.abs(dragCurrentPos.x - dragStartPos.x);
      const previewHeight = Math.abs(dragCurrentPos.y - dragStartPos.y);

      if (activeTool === "highlight") {
        return (
          <div
            className="absolute pointer-events-none z-30 border border-yellow-500"
            style={{
              left: minX,
              top: minY,
              width: previewWidth,
              height: previewHeight,
              backgroundColor: currentHighlightColor,
              opacity: 0.35,
            }}
          />
        );
      }

      if (activeTool === "rectangle" || activeTool === "circle" || activeTool === "line") {
        return (
          <div
            className={`absolute pointer-events-none z-30 ${
              activeTool === "circle" ? "rounded-full" : ""
            }`}
            style={{
              left: minX,
              top: minY,
              width: previewWidth,
              height: previewHeight,
              border: `${currentStrokeWidth}px solid ${currentStrokeColor}`,
            }}
          />
        );
      }
    }

    return null;
  };

  return (
    <div
      ref={overlayRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute inset-0 z-10 select-none"
      style={{
        pointerEvents: "auto",
        cursor:
          activeTool === "draw" ||
          activeTool === "highlight" ||
          activeTool === "rectangle" ||
          activeTool === "circle" ||
          activeTool === "line"
            ? "crosshair"
            : "text",
      }}
    >
      {renderDrawPreview()}

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