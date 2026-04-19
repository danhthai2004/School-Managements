import React from "react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalPages <= 1 && totalItems === 0) return null;

  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(0);
      if (currentPage > 2) pages.push("...");
      
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 3) pages.push("...");
      pages.push(totalPages - 1);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 min-h-[60px]">
      <div className="flex items-center text-sm text-slate-500 mb-4 sm:mb-0">
        Hiển thị <span className="font-medium text-slate-700 mx-1">{totalItems > 0 ? startItem : 0}</span> 
        đến <span className="font-medium text-slate-700 mx-1">{endItem}</span> 
        trong <span className="font-medium text-slate-700 mx-1">{totalItems}</span> kết quả
        
        {onPageSizeChange && (
          <select
            className="ml-4 px-2 py-1 text-sm border border-slate-300 rounded-md bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(0); // Reset to first page
            }}
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
            <option value={100}>100 / trang</option>
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Trước
        </button>
        
        <div className="hidden md:flex items-center gap-1 mx-1">
          {getPageNumbers().map((pageNum, idx) => (
            <React.Fragment key={idx}>
              {pageNum === "..." ? (
                <span className="px-2 text-slate-400">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(pageNum as number)}
                  className={`min-w-[32px] h-8 text-sm font-medium rounded-lg flex items-center justify-center transition-colors ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white border border-blue-600"
                      : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {(pageNum as number) + 1}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
