"use client";

interface PageSidebarProps {
  pageCount: number;
  activePage: number;
  onPageChange: (page: number) => void;
}

export default function PageSidebar({
  pageCount,
  activePage,
  onPageChange,
}: PageSidebarProps) {
  return (
    <aside className="w-48 shrink-0 overflow-y-auto border-r bg-gray-50 p-3">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Pages
      </div>

      <div className="space-y-3">
        {Array.from({ length: pageCount }, (_, index) => {
          const pageNumber = index + 1;
          const active = pageNumber === activePage;

          return (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={`w-full rounded-lg p-2 ${
                active
                  ? "bg-gray-200"
                  : "hover:bg-gray-100"
              }`}
            >
              <div className="flex aspect-[3/4] items-center justify-center rounded bg-white text-sm text-gray-400 shadow-sm">
                {pageNumber}
              </div>

              <div className="mt-1 text-xs text-gray-500">
                Page {pageNumber}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
