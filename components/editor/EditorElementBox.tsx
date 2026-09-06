"use client";

import { useState, useRef, useEffect } from "react";
import { EditorElement } from "@/types/editor";
import { useEditorStore } from "@/store/editorStore";

interface EditorElementBoxProps {
  element: EditorElement;
  isSelected: boolean;
  pageWidth: number;
  pageHeight: number;
}

type HandleType =
  | "nw"
  | "n"
  | "ne"
  | "w"
  | "e"
  | "sw"
  | "s"
  | "se";

export default function EditorElementBox({
  element,
  isSelected,
  pageWidth,
  pageHeight,
}: EditorElementBoxProps) {
  const {
    activeTool,
    selectElement,
    updateElement,
    deleteElement,
    setTool,
  } = useEditorStore();

  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Handle Dragging
  const handleDragStart = (e: React.PointerEvent) => {
    if (isEditing) return;
    e.stopPropagation();

    selectElement(element.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialPosition = { ...element.position };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newX = Math.max(
        0,
        Math.min(
          pageWidth - element.size.width,
          initialPosition.x + deltaX
        )
      );

      const newY = Math.max(
        0,
        Math.min(
          pageHeight - element.size.height,
          initialPosition.y + deltaY
        )
      );

      updateElement(element.id, {
        position: { x: newX, y: newY },
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Handle Resizing
  const handleResizeStart = (
    e: React.PointerEvent,
    handle: HandleType
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialPos = { ...element.position };
    const initialSize = { ...element.size };

    const minWidth = 40;
    const minHeight = 24;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = initialSize.width;
      let newHeight = initialSize.height;
      let newX = initialPos.x;
      let newY = initialPos.y;

      // Width / X adjustments
      if (handle.includes("e")) {
        newWidth = Math.max(minWidth, initialSize.width + deltaX);
      } else if (handle.includes("w")) {
        const possibleWidth = initialSize.width - deltaX;
        if (possibleWidth >= minWidth) {
          newWidth = possibleWidth;
          newX = initialPos.x + deltaX;
        }
      }

      // Height / Y adjustments
      if (handle.includes("s")) {
        newHeight = Math.max(minHeight, initialSize.height + deltaY);
      } else if (handle.includes("n")) {
        const possibleHeight = initialSize.height - deltaY;
        if (possibleHeight >= minHeight) {
          newHeight = possibleHeight;
          newY = initialPos.y + deltaY;
        }
      }

      updateElement(element.id, {
        position: { x: newX, y: newY },
        size: { width: newWidth, height: newHeight },
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handlePositions: Record<HandleType, string> = {
    nw: "-left-1.5 -top-1.5 cursor-nwse-resize",
    n: "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize",
    ne: "-right-1.5 -top-1.5 cursor-nesw-resize",
    w: "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
    e: "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
    sw: "-left-1.5 -bottom-1.5 cursor-nesw-resize",
    s: "left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize",
    se: "-right-1.5 -bottom-1.5 cursor-nwse-resize",
  };

  return (
    <div
      onPointerDown={handleDragStart}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`absolute group select-none ${
        isSelected
          ? "ring-2 ring-blue-500 shadow-md"
          : "hover:ring-1 hover:ring-blue-300"
      }`}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        cursor: isEditing ? "text" : "move",
      }}
    >
      {/* Element Content */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={element.text}
          onChange={(e) =>
            updateElement(element.id, { text: e.target.value })
          }
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsEditing(false);
            }
          }}
          className="h-full w-full resize-none border-none bg-transparent p-1 outline-none font-sans"
          style={{
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
            color: element.color,
          }}
        />
      ) : (
        <div
          className="h-full w-full break-words p-1 font-sans leading-tight"
          style={{
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
            color: element.color,
          }}
        >
          {element.text || (
            <span className="italic opacity-40">Type text...</span>
          )}
        </div>
      )}

      {/* Resize Handles (Only rendered when selected) */}
      {isSelected && (
        <>
          {(
            [
              "nw",
              "n",
              "ne",
              "w",
              "e",
              "sw",
              "s",
              "se",
            ] as HandleType[]
          ).map((handle) => (
            <div
              key={handle}
              onPointerDown={(e) => handleResizeStart(e, handle)}
              className={`absolute h-3 w-3 rounded-full border border-blue-600 bg-white shadow-sm z-20 ${handlePositions[handle]}`}
            />
          ))}

          {/* Quick Action Bar: Delete Button */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              deleteElement(element.id);
            }}
            className="absolute -top-7 right-0 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow hover:bg-red-600 z-30"
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
}
