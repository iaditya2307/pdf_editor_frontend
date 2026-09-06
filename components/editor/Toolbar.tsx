"use client";

import { useEffect } from "react";
import { EditorTool } from "@/types/editor";
import { useEditorStore } from "@/store/editorStore";

interface ToolbarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

const tools: { id: EditorTool; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "text", label: "Text" },
  { id: "draw", label: "Draw" },
  { id: "highlight", label: "Highlight" },
  { id: "rectangle", label: "Shape" },
  { id: "image", label: "Image" },
];

export default function Toolbar({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
}: ToolbarProps) {
  const past = useEditorStore((state) => state.past);
  const future = useEditorStore((state) => state.future);
  const storeUndo = useEditorStore((state) => state.undo);
  const storeRedo = useEditorStore((state) => state.redo);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const handleUndo = () => {
    if (onUndo) onUndo();
    else storeUndo();
  };

  const handleRedo = () => {
    if (onRedo) onRedo();
    else storeRedo();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when actively typing in text input/textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [past, future]);

  return (
    <div className="flex h-12 items-center gap-1 border-b bg-white px-3 font-sans">
      {tools.map((tool) => {
        const active = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-black text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tool.label}
          </button>
        );
      })}

      <div className="mx-2 h-6 w-px bg-gray-200" />

      <button
        onClick={handleUndo}
        disabled={!canUndo}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
        title="Undo (Ctrl+Z)"
      >
        Undo
      </button>

      <button
        onClick={handleRedo}
        disabled={!canRedo}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
        title="Redo (Ctrl+Y)"
      >
        Redo
      </button>
    </div>
  );
}
