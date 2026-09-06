"use client";

import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import PdfViewer from "@/components/pdf/PdfViewer";
import PageSidebar from "@/components/editor/PageSidebar";
import Toolbar from "@/components/editor/Toolbar";
import PropertiesBar from "@/components/editor/PropertiesBar";
import { useEditorStore } from "@/store/editorStore";
import { exportPdf, downloadPdfBlob } from "@/lib/pdfExport";
import {
  Download,
  FolderOpen,
  X,
  FileText,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

export default function EditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<
    Record<number, { width: number; height: number }>
  >({});

  const {
    activeTool,
    setTool,
    activePage,
    setActivePage,
    elements,
    pageRotations,
    deletedPages,
    resetEditor,
    zoom,
    setZoom,
  } = useEditorStore();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      alert("Please select a valid PDF file.");
      return;
    }
    resetEditor();
    setFile(selected);
    setActivePage(1);
    setPageCount(0);
    setPdf(null);
    event.target.value = "";
  };

  const handleDownload = async () => {
    if (!file) return;
    try {
      setIsExporting(true);
      const bytes = await exportPdf({
        file,
        elements,
        pageRotations,
        deletedPages,
        pageDimensions,
      });
      const name = file.name.replace(/\.pdf$/i, "") + "_edited.pdf";
      downloadPdfBlob(bytes, name);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export PDF. See console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  const hasEdits =
    elements.some(
      (el) =>
        el.type === "text" &&
        el.isOriginalPdfText &&
        el.text !== el.originalText
    ) ||
    Object.keys(pageRotations).length > 0 ||
    deletedPages.length > 0;

  return (
    <main className="flex h-screen flex-col bg-[#f0f2f5] overflow-hidden">
      {/* ── Header ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e4e7ec] bg-white px-4 shadow-sm z-20">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-gray-900 leading-none">PDF Editor Pro</h1>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-none">Edit PDF files online</p>
          </div>

          {/* File name badge */}
          {file && (
            <div className="flex items-center gap-1.5 rounded-full bg-gray-100 pl-2.5 pr-1 py-1 min-w-0 max-w-xs">
              <span className="truncate text-xs font-medium text-gray-600">
                {file.name}
              </span>
              {hasEdits && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" title="Unsaved edits" />
              )}
              <button
                onClick={() => {
                  setFile(null);
                  setPageCount(0);
                  setPdf(null);
                  resetEditor();
                }}
                className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
                title="Close document"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls - only shown when file is open */}
          {file && (
            <div className="flex items-center gap-1 rounded-lg border border-[#e4e7ec] bg-gray-50 px-1 py-0.5">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-white hover:text-gray-900 transition"
                title="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="px-1.5 text-xs font-medium text-gray-600 tabular-nums hover:text-gray-900 transition min-w-[3rem] text-center"
                title="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-white hover:text-gray-900 transition"
                title="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e4e7ec] bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm">
            <FolderOpen className="h-3.5 w-3.5 text-gray-500" />
            <span>Open PDF</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <button
            onClick={handleDownload}
            disabled={!file || isExporting}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download edited PDF"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Exporting…</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <Toolbar activeTool={activeTool} onToolChange={setTool} />

      {/* ── Properties Bar ── */}
      <PropertiesBar />

      {/* ── Workspace ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {file ? (
          <>
            <PageSidebar
              pageCount={pageCount}
              activePage={activePage}
              onPageChange={setActivePage}
              pdf={pdf}
            />
            <div className="min-w-0 flex-1 overflow-hidden">
              <PdfViewer
                file={file}
                onPageCountChange={setPageCount}
                onPdfLoad={setPdf}
                onDimensionsUpdate={setPageDimensions}
              />
            </div>
          </>
        ) : (
          /* ── Landing / Drop Zone ── */
          <LandingZone onFileSelect={handleFileChange} />
        )}
      </div>
    </main>
  );
}

function LandingZone({
  onFileSelect,
}: {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#f0f2f5] p-8">
      <div className="w-full max-w-lg">
        <label className="group block cursor-pointer">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onFileSelect}
          />
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-gray-300 bg-white px-10 py-16 text-center transition-all duration-200 group-hover:border-blue-400 group-hover:bg-blue-50/50 shadow-sm">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 shadow-inner group-hover:bg-blue-100 transition">
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Open a PDF to start editing</h2>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              Click here or drag &amp; drop a PDF file.
              <br />
              Your edits stay in the browser — nothing is uploaded.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm group-hover:bg-blue-700 transition">
              <FolderOpen className="h-4 w-4" />
              Choose PDF file
            </div>
          </div>
        </label>

        {/* Feature grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: "✏️", label: "Edit text" },
            { icon: "✍️", label: "Draw" },
            { icon: "🖊️", label: "Highlight" },
            { icon: "⬇️", label: "Export PDF" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 text-center shadow-sm border border-[#e4e7ec]"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-medium text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}