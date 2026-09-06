"use client";

export type EditorTool =
  | "select"
  | "text"
  | "draw"
  | "highlight"
  | "rectangle"
  | "image";

interface ToolbarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onUndo: () => void;
  onRedo: () => void;
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
  return (
    <div className="flex h-12 items-center gap-1 border-b bg-white px-3">
      {tools.map((tool) => {
        const active = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              active
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tool.label}
          </button>
        );
      })}

      <div className="mx-2 h-6 w-px bg-gray-200" />

      <button
        onClick={onUndo}
        className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
      >
        Undo
      </button>

      <button
        onClick={onRedo}
        className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
      >
        Redo
      </button>
    </div>
  );
}
