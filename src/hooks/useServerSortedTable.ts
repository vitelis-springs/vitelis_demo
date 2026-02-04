import type { TablePaginationConfig } from "antd";
import type { SorterResult } from "antd/es/table/interface";
import { useCallback, useMemo, useState } from "react";
import type { SortOrder } from "../types/sorting";

interface UseServerSortedTableOptions {
  defaultPageSize?: number;
  defaultSortBy?: string;
  defaultSortOrder?: SortOrder;
}

export default function useServerSortedTable({
  defaultPageSize = 50,
  defaultSortBy,
  defaultSortOrder = "desc",
}: UseServerSortedTableOptions = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const offset = (page - 1) * pageSize;

  const handleTableChange = useCallback(
    <T>(
      pagination: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: SorterResult<T> | SorterResult<T>[],
    ) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;

      if (s?.columnKey || s?.field) {
        const key = (s.columnKey ?? s.field) as string;
        const order: SortOrder = s.order === "ascend" ? "asc" : "desc";
        setSortBy(key);
        setSortOrder(order);
        setPage(1);
      }

      if (pagination.current) setPage(pagination.current);
      if (pagination.pageSize && pagination.pageSize !== pageSize) {
        setPageSize(pagination.pageSize);
        setPage(1);
      }
    },
    [pageSize],
  );

  const resetPage = useCallback(() => setPage(1), []);

  return useMemo(
    () => ({ page, pageSize, offset, sortBy, sortOrder, handleTableChange, resetPage }),
    [page, pageSize, offset, sortBy, sortOrder, handleTableChange, resetPage],
  );
}
