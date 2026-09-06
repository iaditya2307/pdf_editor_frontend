"use client";

import * as pdfjsLib from "pdfjs-dist";
import { useEditorStore } from "@/store/editorStore";
import PdfThumbnail from "@/components/pdf/PdfThumbnail";
import { FileText } from "lucide-react";

interface PageSidebarProps {
  pageCount: number;
  activePage: number;
  onPageChange: (page: number) => void;
  pdf?: pdfjsLib.PDFDocumentProxy | null;
}

export default function PageSidebar({
  pageCount,
  activePage,
  onPageChange,
  pdf,
}: PageSidebarProps) {
  const deletedPages = useEditorStore((state) => state.deletedPages);
  const visiblePages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (n) => !deletedPages.includes(n)
  );

  return (
    <aside className="flex w-[168px] shrink-0 flex-col border-r border-[#e4e7ec] bg-[#f8f9fb]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#e4e7ec]">
        <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Pages
        </span>
        {visiblePages.length > 0 && (
          <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
            {visiblePages.length}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5">
        {visiblePages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-gray-400">
            <FileText className="mb-2 h-8 w-8 opacity-30" />
            No pages
          </div>
        ) : (
          visiblePages.map((pageNumber) => {
            const active = pageNumber === activePage;

            if (pdf) {
              return (
                <PdfThumbnail
                  key={pageNumber}
                  pdf={pdf}
                  pageNumber={pageNumber}
                  active={active}
                  onClick={() => onPageChange(pageNumber)}
                />
              );
            }

            return (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`w-full rounded-lg border p-1.5 transition-all ${
                  active
                    ? "border-blue-400 bg-blue-50 shadow-sm"
                    : "border-transparent hover:border-gray-200 hover:bg-white"
                }`}
              >
                <div className="flex aspect-[3/4] items-center justify-center rounded bg-white text-sm font-semibold text-gray-400 shadow-sm">
                  {pageNumber}
                </div>
                <p
                  className={`mt-1 text-center text-[10px] font-medium ${
                    active ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  Page {pageNumber}
                </p>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
