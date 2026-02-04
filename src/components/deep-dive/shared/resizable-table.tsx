"use client";

import type { TableColumnsType } from "antd";
import { useCallback, useMemo, useState } from "react";
import { Resizable } from "react-resizable";

interface ResizableTitleProps extends React.HTMLAttributes<HTMLTableCellElement> {
  onResize?: (e: React.SyntheticEvent, data: { size: { width: number } }) => void;
  width?: number;
}

export function ResizableTitle({ onResize, width, ...rest }: ResizableTitleProps) {
  if (!width || !onResize) return <th {...rest} />;
  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          style={{
            position: "absolute",
            right: -5,
            bottom: 0,
            zIndex: 1,
            width: 10,
            height: "100%",
            cursor: "col-resize",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...rest} />
    </Resizable>
  );
}

export function useResizableColumns<T>(baseColumns: TableColumnsType<T>) {
  const [widths, setWidths] = useState<number[]>(() =>
    baseColumns.map((c) => (c as { width?: number }).width ?? 200),
  );

  const handleResize = useCallback(
    (index: number) =>
      (_: React.SyntheticEvent, { size }: { size: { width: number } }) => {
        setWidths((prev) => {
          const next = [...prev];
          next[index] = size.width;
          return next;
        });
      },
    [],
  );

  return useMemo(
    () =>
      baseColumns.map((col, i) => ({
        ...col,
        width: widths[i],
        onHeaderCell: () => ({
          width: widths[i],
          onResize: handleResize(i),
        }),
      })) as TableColumnsType<T>,
    [baseColumns, widths, handleResize],
  );
}

export const RESIZABLE_TABLE_COMPONENTS = { header: { cell: ResizableTitle } } as const;
