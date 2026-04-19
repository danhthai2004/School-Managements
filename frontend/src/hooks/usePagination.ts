import { useState, useMemo, useEffect } from "react";

export function usePagination<T>(
  data: T[], 
  optionsOrPageSize?: number | { defaultPageSize?: number, dependencies?: any[] }
) {
  const defaultPageSize = typeof optionsOrPageSize === 'number' 
    ? optionsOrPageSize 
    : (optionsOrPageSize?.defaultPageSize || 50);
    
  const dependencies = typeof optionsOrPageSize === 'object' && optionsOrPageSize?.dependencies 
    ? optionsOrPageSize.dependencies 
    : [data.length];

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Reset to first page when dependencies change (or data length changes significantly)
  useEffect(() => {
    setCurrentPage(0);
  }, dependencies);

  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const startIndex = currentPage * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, data]);

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  return {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    totalItems: data.length
  };
}
