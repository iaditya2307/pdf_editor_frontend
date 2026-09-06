"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { EditorElement } from "@/types/editor";
import { useEditorStore } from "@/store/editorStore";

interface EditorElementBoxProps {
  element: EditorElement;
  isSelected: boolean;
  pageWidth: number;
  pageHeight: number;
}

type HandleType = "nw" | "n" | "ne" | "w" | "e" | "sw" | "s" | "se";

const HANDLE_POSITIONS: Record<HandleType, string> = {
  nw: "-left-1.5 -top-1.5 cursor-nwse-resize",
  n: "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize",
  ne: "-right-1.5 -top-1.5 cursor-nesw-resize",
  w: "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
  e: "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
  sw: "-left-1.5 -bottom-1.5 cursor-nesw-resize",
  s: "left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize",
  se: "-right-1.5 -bottom-1.5 cursor-nwse-resize",
};

export default function EditorElementBox({
  element,
  isSelected,
  pageWidth,
  pageHeight,
}: EditorElementBoxProps) {
  const { selectElement, updateElement, deleteElement, saveHistory } = useEditorStore();

  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at end
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // Auto-resize textarea to content
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    }
  });

  // ── Drag to move ──
  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (isEditing) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      selectElement(element.id);

      const startX = e.clientX;
      const startY = e.clientY;
      const initX = element.position.x;
      const initY = element.position.y;
      let moved = false;

      // RAF throttle
      let rafId = 0;
      let lastX = startX;
      let lastY = startY;

      const onMove = (me: PointerEvent) => {
        lastX = me.clientX;
        lastY = me.clientY;
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const dx = lastX - startX;
          const dy = lastY - startY;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
          moved = true;
          updateElement(element.id, {
            position: {
              x: Math.max(0, Math.min(pageWidth - element.size.width, initX + dx)),
              y: Math.max(0, Math.min(pageHeight - element.size.height, initY + dy)),
            },
          });
        });
      };

      const onUp = () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (moved) saveHistory(); // save ONE history entry after drag ends
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [isEditing, element, pageWidth, pageHeight, selectElement, updateElement, saveHistory]
  );

  // ── Resize handle ──
  const handleResizeStart = useCallback(
    (e: React.PointerEvent, handle: HandleType) => {
      e.stopPropagation();
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      const initPos = { ...element.position };
      const initSize = { ...element.size };
      const MIN = 20;
      let moved = false;

      let rafId = 0;
      let lastX = startX;
      let lastY = startY;

      const onMove = (me: PointerEvent) => {
        lastX = me.clientX;
        lastY = me.clientY;
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const dx = lastX - startX;
          const dy = lastY - startY;
          let nx = initPos.x;
          let ny = initPos.y;
          let nw = initSize.width;
          let nh = initSize.height;

          if (handle.includes("e")) nw = Math.max(MIN, initSize.width + dx);
          else if (handle.includes("w")) {
            const w2 = initSize.width - dx;
            if (w2 >= MIN) { nw = w2; nx = initPos.x + dx; }
          }

          if (handle.includes("s")) nh = Math.max(MIN, initSize.height + dy);
          else if (handle.includes("n")) {
            const h2 = initSize.height - dy;
            if (h2 >= MIN) { nh = h2; ny = initPos.y + dy; }
          }

          moved = true;
          updateElement(element.id, { position: { x: nx, y: ny }, size: { width: nw, height: nh } });
        });
      };

      const onUp = () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (moved) saveHistory();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [element, updateElement, saveHistory]
  );

  // ── Content rendering ──
  const renderContent = () => {
    switch (element.type) {
      case "text": {
        const style = {
          fontSize: element.fontSize,
          fontFamily: element.fontFamily,
          color: element.color,
          lineHeight: 1.35,
        } as React.CSSProperties;

        if (isEditing) {
          return (
            <textarea
              ref={textareaRef}
              value={element.text}
              onChange={(e) => updateElement(element.id, { text: e.target.value })}
              onBlur={() => {
                setIsEditing(false);
                saveHistory();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setIsEditing(false); saveHistory(); }
              }}
              className="h-full w-full resize-none bg-white/95 p-0.5 outline-none"
              style={{ ...style, border: "none" }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }

        const isModified = element.isOriginalPdfText && element.text !== element.originalText;
        const showBackground = !element.isOriginalPdfText || isModified || isSelected;

        return (
          <div
            className={`h-full w-full break-words p-0.5 whitespace-pre-wrap ${
              showBackground ? "bg-white/95 shadow-sm" : "bg-transparent hover:bg-white/50"
            }`}
            style={style}
          >
            {element.text || (
              !element.isOriginalPdfText && (
                <span className="italic text-gray-400 text-xs">Click to type…</span>
              )
            )}
          </div>
        );
      }

      case "draw": {
        const pts = element.points || [];
        const d = pts
          .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x - element.position.x} ${pt.y - element.position.y}`)
          .join(" ");
        return (
          <svg className="h-full w-full overflow-visible pointer-events-none">
            <path d={d} stroke={element.strokeColor} strokeWidth={element.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      }

      case "highlight":
        return (
          <div
            className="h-full w-full"
            style={{ backgroundColor: element.color, opacity: element.opacity ?? 0.4 }}
          />
        );

      case "rectangle":
        return (
          <div
            className="h-full w-full"
            style={{
              border: `${element.strokeWidth}px solid ${element.strokeColor}`,
              backgroundColor: element.fillColor || "transparent",
            }}
          />
        );

      case "circle":
        return (
          <div
            className="h-full w-full rounded-full"
            style={{
              border: `${element.strokeWidth}px solid ${element.strokeColor}`,
              backgroundColor: element.fillColor || "transparent",
            }}
          />
        );

      case "line":
        return (
          <svg className="h-full w-full overflow-visible pointer-events-none">
            <line
              x1={0} y1={0}
              x2={element.size.width} y2={element.size.height}
              stroke={element.strokeColor}
              strokeWidth={element.strokeWidth}
            />
          </svg>
        );

      case "image":
        return (
          <img
            src={element.src}
            alt=""
            draggable={false}
            className="h-full w-full object-contain pointer-events-none select-none"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      onPointerDown={handleDragStart}
      onClick={(e) => { e.stopPropagation(); selectElement(element.id); }}
      onDoubleClick={(e) => {
        if (element.type === "text") {
          e.stopPropagation();
          setIsEditing(true);
        }
      }}
      className={`absolute group select-none ${
        isSelected
          ? "ring-2 ring-blue-500 ring-offset-0 shadow-lg z-20"
          : "z-10 hover:ring-1 hover:ring-blue-300"
      }`}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        cursor: isEditing ? "text" : "move",
        // Transparent elements need a minimum tap target
        minWidth: 8,
        minHeight: 8,
      }}
    >
      {renderContent()}

      {isSelected && (
        <>
          {(["nw", "n", "ne", "w", "e", "sw", "s", "se"] as HandleType[]).map((h) => (
            <div
              key={h}
              onPointerDown={(e) => handleResizeStart(e, h)}
              className={`absolute h-3 w-3 rounded-full border-2 border-blue-500 bg-white shadow-sm z-30 ${HANDLE_POSITIONS[h]}`}
            />
          ))}

          {/* Delete button */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); deleteElement(element.id); }}
            className="absolute -top-7 right-0 flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow hover:bg-red-700 z-40 whitespace-nowrap"
            title="Delete (Del)"
          >
            ✕ Delete
          </button>
        </>
      )}
    </div>
  );
}
