"use client";

import { useRef, useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
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
  } = useEditorStore();

  const pageElements = elements.filter(
    (element) => element.page === pageNumber
  );

  // Handle global keyboard shortcuts (Delete / Backspace / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger deletion if currently typing in an input/textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedElementId
      ) {
        deleteElement(selectedElementId);
      } else if (e.key === "Escape") {
        selectElement(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, deleteElement, selectElement]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // If click was on the overlay canvas directly (not on an element)
    if (event.target !== overlayRef.current) {
      return;
    }

    if (activeTool === "text") {
      const rect = overlayRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const id = crypto.randomUUID();

      addElement({
        id,
        type: "text",
        page: pageNumber,
        position: { x, y },
        size: { width: 160, height: 40 },
        text: "",
        fontSize: 16,
        fontFamily: "Arial",
        color: "#000000",
      });

      selectElement(id);
      setTool("select");
    } else if (activeTool === "select") {
      selectElement(null);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="absolute inset-0 z-10"
      style={{
        pointerEvents:
          activeTool === "text" || activeTool === "select"
            ? "auto"
            : "none",
      }}
    >
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