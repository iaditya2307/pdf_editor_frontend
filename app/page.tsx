"use client";

import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

import PdfViewer from "@/components/pdf/PdfViewer";
import PageSidebar from "@/components/editor/PageSidebar";
import Toolbar from "@/components/editor/Toolbar";
import PropertiesBar from "@/components/editor/PropertiesBar";
import { useEditorStore } from "@/store/editorStore";
import { exportPdf, downloadPdfBlob } from "@/lib/pdfExport";
import { Download, Upload, X } from "lucide-react";

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
  } = useEditorStore();

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      alert("Please select a valid PDF file.");
      return;
    }

    resetEditor();
    setFile(selectedFile);
    setActivePage(1);
    setPageCount(0);
    setPdf(null);
  };

  const handleDownload = async () => {
    if (!file) return;

    try {
      setIsExporting(true);
      const pdfBytes = await exportPdf({
        file,
        elements,
        pageRotations,
        deletedPages,
        pageDimensions,
      });

      const exportFileName = file.name.endsWith(".pdf")
        ? `${file.name.replace(".pdf", "")}_edited.pdf`
        : `${file.name}_edited.pdf`;

      downloadPdfBlob(pdfBytes, exportFileName);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to export PDF file. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="flex h-screen flex-col bg-gray-100 font-sans">
      {/* HEADER */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-5 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span className="rounded bg-black p-1 text-white text-xs">PDF</span>
            Editor Pro
          </h1>

          {file && (
            <span className="max-w-[300px] truncate text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              {file.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {file && (
            <button
              onClick={() => {
                setFile(null);
                setPageCount(0);
                setPdf(null);
                resetEditor();
              }}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <X className="h-3.5 w-3.5" />
              <span>Close</span>
            </button>
          )}

          <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-black px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition shadow-sm">
            <Upload className="h-3.5 w-3.5" />
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
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
          </button>
        </div>
      </header>

      {/* MAIN TOOLBAR */}
      <Toolbar activeTool={activeTool} onToolChange={setTool} />

      {/* PROPERTIES / FORMATTING BAR */}
      <PropertiesBar />

      {/* WORKSPACE */}
      <div className="flex min-h-0 flex-1">
        {file ? (
          <>
            <PageSidebar
              pageCount={pageCount}
              activePage={activePage}
              onPageChange={setActivePage}
              pdf={pdf}
            />

            <div className="min-w-0 flex-1">
              <PdfViewer
                file={file}
                onPageCountChange={setPageCount}
                onPdfLoad={setPdf}
                onDimensionsUpdate={setPageDimensions}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center max-w-md p-8 rounded-xl bg-white shadow-sm border">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-3xl">
                📄
              </div>

              <h2 className="text-xl font-bold text-gray-900">
                Full-Fledged PDF Editor
              </h2>

              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Open any PDF document to add text, freehand drawings, highlights, shapes, images, rotate pages, or delete pages — then export a clean, real PDF file.
              </p>

              <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition shadow">
                <Upload className="h-4 w-4" />
                <span>Select PDF File</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}