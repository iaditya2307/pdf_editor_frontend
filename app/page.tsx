"use client";

import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

import PdfViewer from "@/components/pdf/PdfViewer";
import PageSidebar from "@/components/editor/PageSidebar";
import Toolbar from "@/components/editor/Toolbar";
import { useEditorStore } from "@/store/editorStore";

export default function EditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  const activeTool = useEditorStore((state) => state.activeTool);
  const setTool = useEditorStore((state) => state.setTool);
  const activePage = useEditorStore((state) => state.activePage);
  const setActivePage = useEditorStore((state) => state.setActivePage);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }

    setFile(selectedFile);
    setActivePage(1);
    setPageCount(0);
    setPdf(null);
  };

  return (
    <main className="flex h-screen flex-col bg-gray-100">
      {/* HEADER */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-5">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-gray-900">
            PDF Editor
          </h1>

          {file && (
            <span className="max-w-[300px] truncate text-sm text-gray-500">
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
              }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Close
            </button>
          )}

          <label className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800">
            Open PDF

            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <button
            disabled={!file}
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            Download
          </button>
        </div>
      </header>

      {/* TOOLBAR */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={setTool}
      />

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
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-5xl">📄</div>

              <h2 className="text-2xl font-semibold text-gray-900">
                Start editing a PDF
              </h2>

              <p className="mt-2 text-gray-500">
                Open a PDF file to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}