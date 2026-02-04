import { useMemo } from "react";

export default function useShowingLabel(filtered: number, total: number): string {
  return useMemo(() => {
    const percent = total > 0 ? Math.round((filtered / total) * 100) : 0;
    return `Showing ${filtered.toLocaleString()} of ${total.toLocaleString()} (${percent}%)`;
  }, [filtered, total]);
}
