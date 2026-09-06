"use client";

import { useRef } from "react";

import {
  useEditorStore,
} from "@/store/editorStore";

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
  const overlayRef =
    useRef<HTMLDivElement>(null);

  const {
    activeTool,
    elements,
    addElement,
    selectElement,
    updateElement,
  } = useEditorStore();

  const pageElements =
    elements.filter(
      (element) =>
        element.page === pageNumber
    );

  const handleClick = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (activeTool !== "text") {
      return;
    }

    if (
      event.target !==
      overlayRef.current
    ) {
      return;
    }

    const rect =
      overlayRef.current.getBoundingClientRect();

    const x =
      event.clientX - rect.left;

    const y =
      event.clientY - rect.top;

    const id =
      crypto.randomUUID();

    addElement({
      id,
      type: "text",
      page: pageNumber,

      position: {
        x,
        y,
      },

      size: {
        width: 200,
        height: 50,
      },

      text: "",

      fontSize: 16,

      fontFamily: "Arial",

      color: "#000000",
    });

    selectElement(id);
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleClick}
      className="absolute inset-0"
      style={{
        pointerEvents:
          activeTool === "text"
            ? "auto"
            : "none",
      }}
    >
      {pageElements.map(
        (element) => {
          if (
            element.type !== "text"
          ) {
            return null;
          }

          return (
            <textarea
              key={element.id}
              autoFocus
              value={element.text}
              placeholder="Type here..."
              onChange={(event) =>
                updateElement(
                  element.id,
                  {
                    text:
                      event.target.value,
                  }
                )
              }
              onClick={(event) => {
                event.stopPropagation();

                selectElement(
                  element.id
                );
              }}
              className="absolute border border-blue-400 bg-white/20 p-1 outline-none"
              style={{
                left:
                  element.position.x,

                top:
                  element.position.y,

                width:
                  element.size.width,

                height:
                  element.size.height,

                fontSize:
                  element.fontSize,

                fontFamily:
                  element.fontFamily,

                color:
                  element.color,
              }}
            />
          );
        }
      )}
    </div>
  );
}