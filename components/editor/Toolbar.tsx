"use client";

import { useEffect } from "react";
import {
  MousePointer2,
  Type,
  Pencil,
  Highlighter,
  Square,
  Circle,
  Minus,
  Undo2,
  Redo2,
} from "lucide-react";
import { EditorTool } from "@/types/editor";
import { useEditorStore } from "@/store/editorStore";

interface ToolbarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
}

const tools: { id: EditorTool; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { id: "select", label: "Select", icon: <MousePointer2 className="h-4 w-4" />, shortcut: "V" },
  { id: "text", label: "Text", icon: <Type className="h-4 w-4" />, shortcut: "T" },
  { id: "draw", label: "Draw", icon: <Pencil className="h-4 w-4" />, shortcut: "D" },
  { id: "highlight", label: "Highlight", icon: <Highlighter className="h-4 w-4" />, shortcut: "H" },
  { id: "rectangle", label: "Rectangle", icon: <Square className="h-4 w-4" />, shortcut: "R" },
  { id: "circle", label: "Circle", icon: <Circle className="h-4 w-4" />, shortcut: "C" },
  { id: "line", label: "Line", icon: <Minus className="h-4 w-4" />, shortcut: "L" },
];

export default function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  const past = useEditorStore((state) => state.past);
  const future = useEditorStore((state) => state.future);
  const storeUndo = useEditorStore((state) => state.undo);
  const storeRedo = useEditorStore((state) => state.redo);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) storeRedo();
        else storeUndo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        storeRedo();
        return;
      }

      // Tool shortcuts
      const keyMap: Record<string, EditorTool> = {
        v: "select", t: "text", d: "draw",
        h: "highlight", r: "rectangle", c: "circle", l: "line",
      };
      const tool = keyMap[e.key.toLowerCase()];
      if (tool && !e.metaKey && !e.ctrlKey) {
        onToolChange(tool);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [past, future, storeUndo, storeRedo, onToolChange]);

  return (
    <div className="flex h-12 items-center gap-0.5 border-b border-[#e4e7ec] bg-white px-3 shadow-sm">
      {/* Tool buttons */}
      <div className="flex items-center gap-0.5">
        {tools.map((tool) => {
          const active = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              className={`group relative flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className={active ? "text-white" : "text-gray-500 group-hover:text-gray-700"}>
                {tool.icon}
              </span>
              <span className="hidden sm:block">{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-2 h-5 w-px bg-gray-200" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={storeUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={storeRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      {/* Active tool hint */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-gray-400">
          Press{" "}
          <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
            {tools.find((t) => t.id === activeTool)?.shortcut ?? "?"}
          </kbd>{" "}
          ·{" "}
          <span className="capitalize font-medium text-gray-500">{activeTool}</span> active
        </span>
      </div>
    </div>
  );
}
