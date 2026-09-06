"use client";

import { useEditorStore } from "@/store/editorStore";
import {
  Type,
  Palette,
  Square,
  Highlighter,
  Trash2,
  Image as ImageIcon,
  RotateCw,
} from "lucide-react";

export default function PropertiesBar() {
  const {
    activeTool,
    selectedElementId,
    elements,
    currentTextColor,
    currentFontSize,
    currentFontFamily,
    currentStrokeColor,
    currentStrokeWidth,
    currentHighlightColor,
    setTextColor,
    setFontSize,
    setFontFamily,
    setStrokeColor,
    setStrokeWidth,
    setHighlightColor,
    deleteElement,
    addElement,
    activePage,
    selectElement,
    setTool,
    rotatePage,
  } = useEditorStore();

  const selectedElement = elements.find(
    (el) => el.id === selectedElementId
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        const id = crypto.randomUUID();
        const maxWidth = 200;
        const scale = maxWidth / img.width;
        const width = maxWidth;
        const height = img.height * scale;

        addElement({
          id,
          type: "image",
          page: activePage,
          position: { x: 100, y: 100 },
          size: { width, height },
          src,
        });

        selectElement(id);
        setTool("select");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-11 items-center gap-4 border-b bg-gray-50 px-4 text-xs text-gray-700 font-sans shadow-inner">
      {/* Active Context / Tool Indicator */}
      <div className="flex items-center gap-1.5 font-semibold text-gray-800">
        <span className="capitalize">{activeTool} Tool</span>
        {selectedElement && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
            Selected
          </span>
        )}
      </div>

      <div className="h-4 w-px bg-gray-300" />

      {/* Text Formatting Controls */}
      {(activeTool === "text" || selectedElement?.type === "text") && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Type className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={selectedElement?.type === "text" ? selectedElement.fontFamily : currentFontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs outline-none hover:border-gray-400"
            >
              <option value="Helvetica">Helvetica / Arial</option>
              <option value="TimesRoman">Times New Roman</option>
              <option value="Courier">Courier / Monospace</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-gray-500 font-medium">Size:</span>
            <input
              type="number"
              min={8}
              max={72}
              value={selectedElement?.type === "text" ? selectedElement.fontSize : currentFontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-12 rounded border border-gray-300 bg-white px-1.5 py-1 text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-1">
            <Palette className="h-3.5 w-3.5 text-gray-500" />
            <input
              type="color"
              value={selectedElement?.type === "text" ? selectedElement.color : currentTextColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-gray-300 bg-transparent p-0.5"
              title="Text Color"
            />
          </div>
        </div>
      )}

      {/* Drawing / Shape Controls */}
      {(activeTool === "draw" ||
        activeTool === "rectangle" ||
        activeTool === "circle" ||
        activeTool === "line" ||
        selectedElement?.type === "draw" ||
        selectedElement?.type === "rectangle" ||
        selectedElement?.type === "circle" ||
        selectedElement?.type === "line") && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Square className="h-3.5 w-3.5 text-gray-500" />
            <input
              type="color"
              value={
                (selectedElement as any)?.strokeColor || currentStrokeColor
              }
              onChange={(e) => setStrokeColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-gray-300 bg-transparent p-0.5"
              title="Stroke Color"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-gray-500 font-medium">Stroke:</span>
            <select
              value={
                (selectedElement as any)?.strokeWidth || currentStrokeWidth
              }
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs outline-none"
            >
              <option value={1}>1px</option>
              <option value={2}>2px</option>
              <option value={3}>3px</option>
              <option value={5}>5px</option>
              <option value={8}>8px</option>
            </select>
          </div>
        </div>
      )}

      {/* Highlight Controls */}
      {(activeTool === "highlight" || selectedElement?.type === "highlight") && (
        <div className="flex items-center gap-2">
          <Highlighter className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-gray-500 font-medium">Highlight Color:</span>
          {["#ffeb3b", "#aed581", "#80deea", "#ff80ab", "#ffb74d"].map(
            (color) => (
              <button
                key={color}
                onClick={() => setHighlightColor(color)}
                className={`h-5 w-5 rounded-full border shadow-sm transition ${
                  currentHighlightColor === color
                    ? "ring-2 ring-blue-500 ring-offset-1"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: color }}
              />
            )
          )}
        </div>
      )}

      {/* Upload Image Option */}
      <div className="flex items-center gap-2 ml-auto">
        <label className="flex cursor-pointer items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-gray-100">
          <ImageIcon className="h-3.5 w-3.5 text-gray-600" />
          <span>Add Image</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>

        {/* Rotate Active Page Button */}
        <button
          onClick={() => rotatePage(activePage)}
          className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-gray-100"
          title="Rotate Current Page 90° Clockwise"
        >
          <RotateCw className="h-3.5 w-3.5 text-gray-600" />
          <span>Rotate Page</span>
        </button>

        {/* Delete Selected Element Button */}
        {selectedElement && (
          <button
            onClick={() => deleteElement(selectedElement.id)}
            className="flex items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  );
}
