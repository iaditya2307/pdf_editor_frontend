"use client";

import { useEditorStore } from "@/store/editorStore";
import { generateId } from "@/lib/uuid";
import {
  Type,
  Palette,
  Minus,
  Highlighter,
  Trash2,
  ImagePlus,
  RotateCw,
  AlignLeft,
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

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  const isTextContext = activeTool === "text" || selectedElement?.type === "text";
  const isDrawContext =
    activeTool === "draw" ||
    activeTool === "rectangle" ||
    activeTool === "circle" ||
    activeTool === "line" ||
    selectedElement?.type === "draw" ||
    selectedElement?.type === "rectangle" ||
    selectedElement?.type === "circle" ||
    selectedElement?.type === "line";
  const isHighlightContext = activeTool === "highlight" || selectedElement?.type === "highlight";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        const id = generateId();
        const maxWidth = 200;
        const scale = maxWidth / img.width;
        addElement({
          id,
          type: "image",
          page: activePage,
          position: { x: 100, y: 100 },
          size: { width: maxWidth, height: img.height * scale },
          src,
        });
        selectElement(id);
        setTool("select");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-uploaded
    e.target.value = "";
  };

  const highlightColors = [
    { color: "#fef08a", label: "Yellow" },
    { color: "#bbf7d0", label: "Green" },
    { color: "#bae6fd", label: "Blue" },
    { color: "#fecdd3", label: "Pink" },
    { color: "#fed7aa", label: "Orange" },
  ];

  const fontFamilies = [
    { value: "Helvetica", label: "Helvetica" },
    { value: "TimesRoman", label: "Times New Roman" },
    { value: "Courier", label: "Courier" },
  ];

  return (
    <div
      className="flex h-10 shrink-0 items-center gap-2 border-b border-[#e4e7ec] bg-[#f8f9fb] px-4 text-xs"
      style={{ minWidth: 0 }}
    >
      {/* ── Text Controls ── */}
      {isTextContext && (
        <div className="flex items-center gap-2">
          <Type className="h-3.5 w-3.5 text-gray-400 shrink-0" />

          <select
            value={selectedElement?.type === "text" ? selectedElement.fontFamily : currentFontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="h-7 rounded-md border border-[#e4e7ec] bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer"
          >
            {fontFamilies.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <AlignLeft className="h-3 w-3 text-gray-400" />
            <input
              type="number"
              min={8}
              max={96}
              value={selectedElement?.type === "text" ? selectedElement.fontSize : currentFontSize}
              onChange={(e) => setFontSize(Math.max(8, Math.min(96, Number(e.target.value))))}
              className="h-7 w-12 rounded-md border border-[#e4e7ec] bg-white px-1.5 text-xs text-gray-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 text-center"
            />
            <span className="text-gray-400">px</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Palette className="h-3 w-3 text-gray-400" />
            <div className="relative flex h-7 w-7 items-center justify-center rounded-md border border-[#e4e7ec] bg-white cursor-pointer overflow-hidden">
              <input
                type="color"
                value={selectedElement?.type === "text" ? selectedElement.color : currentTextColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                title="Text color"
              />
              <div
                className="h-4 w-4 rounded-sm shadow-sm"
                style={{
                  backgroundColor:
                    selectedElement?.type === "text" ? selectedElement.color : currentTextColor,
                }}
              />
            </div>
          </div>

          <div className="mx-1 h-4 w-px bg-gray-200 shrink-0" />
        </div>
      )}

      {/* ── Draw / Shape Controls ── */}
      {isDrawContext && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Palette className="h-3 w-3 text-gray-400" />
            <div className="relative flex h-7 w-7 items-center justify-center rounded-md border border-[#e4e7ec] bg-white cursor-pointer overflow-hidden">
              <input
                type="color"
                value={(selectedElement as any)?.strokeColor || currentStrokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                title="Stroke color"
              />
              <div
                className="h-4 w-4 rounded-sm shadow-sm"
                style={{
                  backgroundColor: (selectedElement as any)?.strokeColor || currentStrokeColor,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Minus className="h-3 w-3 text-gray-400" />
            <select
              value={(selectedElement as any)?.strokeWidth || currentStrokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="h-7 rounded-md border border-[#e4e7ec] bg-white px-1.5 text-xs text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value={1}>1 px</option>
              <option value={2}>2 px</option>
              <option value={3}>3 px</option>
              <option value={5}>5 px</option>
              <option value={8}>8 px</option>
            </select>
          </div>

          <div className="mx-1 h-4 w-px bg-gray-200 shrink-0" />
        </div>
      )}

      {/* ── Highlight Controls ── */}
      {isHighlightContext && (
        <div className="flex items-center gap-2">
          <Highlighter className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <div className="flex items-center gap-1">
            {highlightColors.map(({ color, label }) => (
              <button
                key={color}
                onClick={() => setHighlightColor(color)}
                title={label}
                className={`h-5 w-5 rounded-full border-2 transition-all duration-100 hover:scale-110 ${
                  currentHighlightColor === color
                    ? "border-blue-500 shadow-md scale-110"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="mx-1 h-4 w-px bg-gray-200 shrink-0" />
        </div>
      )}

      {/* ── Always visible: right side actions ── */}
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        {/* Add Image */}
        <label className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[#e4e7ec] bg-white px-2.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900">
          <ImagePlus className="h-3.5 w-3.5" />
          <span>Image</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>

        {/* Rotate Page */}
        <button
          onClick={() => rotatePage(activePage)}
          title="Rotate current page 90° clockwise"
          className="flex h-7 items-center gap-1.5 rounded-md border border-[#e4e7ec] bg-white px-2.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Rotate</span>
        </button>

        {/* Delete selected */}
        {selectedElement && (
          <>
            <div className="h-4 w-px bg-gray-200" />
            <button
              onClick={() => deleteElement(selectedElement.id)}
              className="flex h-7 items-center gap-1.5 rounded-md bg-red-50 px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-100 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
