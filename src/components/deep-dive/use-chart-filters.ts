import { useCallback, useEffect, useMemo, useState } from "react";
import { KpiChartItem } from "../../hooks/api/useDeepDiveService";

export interface ChartFilters {
  tab: "all" | "custom" | "top";
  selectedCompanyIds: number[];
  selectedCategories: string[];
  topN: number;
  topSortCategory: string;
}

const STORAGE_PREFIX = "dd-chart-filters-";

function load(reportId: number): ChartFilters | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${reportId}`);
    return raw ? (JSON.parse(raw) as ChartFilters) : null;
  } catch {
    return null;
  }
}

function save(reportId: number, filters: ChartFilters) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${reportId}`, JSON.stringify(filters));
  } catch { /* quota exceeded */ }
}

export function useChartFilters(
  reportId: number,
  kpiChart: KpiChartItem[],
  allCategories: string[],
) {
  const [activeTab, setActiveTab] = useState<ChartFilters["tab"]>("all");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [topN, setTopN] = useState(5);
  const [topSortCategory, setTopSortCategory] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = load(reportId);
    if (saved) {
      setActiveTab(saved.tab);
      setSelectedCompanyIds(saved.selectedCompanyIds);
      setSelectedCategories(saved.selectedCategories);
      if (saved.topN) setTopN(saved.topN);
      if (saved.topSortCategory) setTopSortCategory(saved.topSortCategory);
    }
    setReady(true);
  }, [reportId]);

  const persist = useCallback(
    (updates: Partial<ChartFilters>) => {
      save(reportId, {
        tab: updates.tab ?? activeTab,
        selectedCompanyIds: updates.selectedCompanyIds ?? selectedCompanyIds,
        selectedCategories: updates.selectedCategories ?? selectedCategories,
        topN: updates.topN ?? topN,
        topSortCategory: updates.topSortCategory ?? topSortCategory,
      });
    },
    [reportId, activeTab, selectedCompanyIds, selectedCategories, topN, topSortCategory],
  );

  const topNData = useMemo(() => {
    if (kpiChart.length === 0) return [];
    const sortKey = topSortCategory || null;
    return [...kpiChart]
      .sort((a, b) => {
        if (sortKey) {
          const aVal = typeof a[sortKey] === "number" ? (a[sortKey] as number) : 0;
          const bVal = typeof b[sortKey] === "number" ? (b[sortKey] as number) : 0;
          return bVal - aVal;
        }
        const sum = (item: KpiChartItem) =>
          allCategories.reduce((s, c) => s + (typeof item[c] === "number" ? (item[c] as number) : 0), 0);
        return sum(b) - sum(a);
      })
      .slice(0, topN);
  }, [kpiChart, allCategories, topN, topSortCategory]);

  const customData = useMemo(() => {
    if (kpiChart.length === 0) return [];
    return selectedCompanyIds.length > 0
      ? kpiChart.filter((item) => selectedCompanyIds.includes(item.companyId as number))
      : kpiChart;
  }, [kpiChart, selectedCompanyIds]);

  const visibleCategories = useMemo(() => {
    if (activeTab === "all" || activeTab === "top") return allCategories;
    return selectedCategories.length > 0 ? selectedCategories : allCategories;
  }, [activeTab, allCategories, selectedCategories]);

  const companyOptions = useMemo(
    () => kpiChart.map((item) => ({ label: item.company as string, value: item.companyId as number })),
    [kpiChart],
  );

  const categoryOptions = useMemo(
    () => allCategories.map((cat) => ({ label: cat, value: cat })),
    [allCategories],
  );

  return {
    ready,
    activeTab, setActiveTab,
    selectedCompanyIds, setSelectedCompanyIds,
    selectedCategories, setSelectedCategories,
    topN, setTopN,
    topSortCategory, setTopSortCategory,
    persist,
    topNData,
    customData,
    visibleCategories,
    companyOptions,
    categoryOptions,
  };
}
