import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  StepStatus,
  StepsMatrixCompany,
  StepsMatrixStep,
  StepsMatrixRow,
} from "../../hooks/api/useReportStepsService";

export interface StepsMatrixFilters {
  searchCompany: string;
  selectedStatuses: StepStatus[];
  selectedStepIds: number[];
  sortField: string;
  sortOrder: "ascend" | "descend" | null;
}

const STORAGE_PREFIX = "dd-steps-matrix-";

function load(reportId: number): StepsMatrixFilters | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${reportId}`);
    return raw ? (JSON.parse(raw) as StepsMatrixFilters) : null;
  } catch {
    return null;
  }
}

function save(reportId: number, filters: StepsMatrixFilters) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${reportId}`, JSON.stringify(filters));
  } catch {
    /* quota exceeded */
  }
}

const DEFAULT_FILTERS: StepsMatrixFilters = {
  searchCompany: "",
  selectedStatuses: [],
  selectedStepIds: [],
  sortField: "",
  sortOrder: null,
};

export function useStepsMatrixFilters(
  reportId: number,
  companies: StepsMatrixCompany[],
  steps: StepsMatrixStep[],
  matrix: StepsMatrixRow[]
) {
  const [searchCompany, setSearchCompany] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<StepStatus[]>([]);
  const [selectedStepIds, setSelectedStepIds] = useState<number[]>([]);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | null>(null);
  const [ready, setReady] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = load(reportId);
    if (saved) {
      setSearchCompany(saved.searchCompany ?? "");
      setSelectedStatuses(saved.selectedStatuses ?? []);
      setSelectedStepIds(saved.selectedStepIds ?? []);
      setSortField(saved.sortField ?? "");
      setSortOrder(saved.sortOrder ?? null);
    }
    setReady(true);
  }, [reportId]);

  // Persist to localStorage
  const persist = useCallback(
    (updates: Partial<StepsMatrixFilters>) => {
      save(reportId, {
        searchCompany: updates.searchCompany ?? searchCompany,
        selectedStatuses: updates.selectedStatuses ?? selectedStatuses,
        selectedStepIds: updates.selectedStepIds ?? selectedStepIds,
        sortField: updates.sortField ?? sortField,
        sortOrder: updates.sortOrder ?? sortOrder,
      });
    },
    [reportId, searchCompany, selectedStatuses, selectedStepIds, sortField, sortOrder]
  );

  // Filtered data
  const filteredData = useMemo(() => {
    let result = matrix.map((row) => {
      const company = companies.find((c) => c.id === row.companyId);
      return {
        ...row,
        companyId: row.companyId,
        companyName: company?.name ?? `Company #${row.companyId}`,
        key: row.companyId,
      };
    });

    // Filter by company name/id
    if (searchCompany.trim()) {
      const search = searchCompany.toLowerCase().trim();
      result = result.filter(
        (row) =>
          row.companyName.toLowerCase().includes(search) ||
          String(row.companyId).includes(search)
      );
    }

    // Filter by status - show only rows that have at least one step with selected status
    if (selectedStatuses.length > 0) {
      result = result.filter((row) =>
        row.statuses.some((s) => selectedStatuses.includes(s.status))
      );
    }

    // Sort
    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";

        if (sortField === "companyId") {
          aVal = a.companyId;
          bVal = b.companyId;
        } else if (sortField === "companyName") {
          aVal = a.companyName.toLowerCase();
          bVal = b.companyName.toLowerCase();
        } else if (sortField.startsWith("step-")) {
          const stepId = parseInt(sortField.replace("step-", ""), 10);
          const aStatus = a.statuses.find((s) => s.stepId === stepId)?.status ?? "PENDING";
          const bStatus = b.statuses.find((s) => s.stepId === stepId)?.status ?? "PENDING";
          // Sort order: ERROR > PROCESSING > PENDING > DONE
          const statusOrder: Record<StepStatus, number> = {
            ERROR: 3,
            PROCESSING: 2,
            PENDING: 1,
            DONE: 0,
          };
          aVal = statusOrder[aStatus];
          bVal = statusOrder[bStatus];
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortOrder === "ascend" ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortOrder === "ascend" ? cmp : -cmp;
      });
    }

    return result;
  }, [matrix, companies, searchCompany, selectedStatuses, sortField, sortOrder]);

  // Visible steps (filtered by selectedStepIds)
  const visibleSteps = useMemo(() => {
    if (selectedStepIds.length === 0) return steps;
    return steps.filter((s) => selectedStepIds.includes(s.id));
  }, [steps, selectedStepIds]);

  // Options for filters
  const companyOptions = useMemo(
    () =>
      companies.map((c) => ({
        label: `#${c.id} ${c.name}`,
        value: c.id,
      })),
    [companies]
  );

  const stepOptions = useMemo(
    () =>
      steps.map((s) => ({
        label: s.name,
        value: s.id,
      })),
    [steps]
  );

  const statusOptions: Array<{ label: string; value: StepStatus }> = [
    { label: "Pending", value: "PENDING" },
    { label: "Processing", value: "PROCESSING" },
    { label: "Done", value: "DONE" },
    { label: "Error", value: "ERROR" },
  ];

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchCompany("");
    setSelectedStatuses([]);
    setSelectedStepIds([]);
    setSortField("");
    setSortOrder(null);
    save(reportId, DEFAULT_FILTERS);
  }, [reportId]);

  // Handle table sort change
  const handleTableChange = useCallback(
    (
      _pagination: unknown,
      _filters: unknown,
      sorter: { field?: string; order?: "ascend" | "descend" | null } | Array<unknown>
    ) => {
      if (Array.isArray(sorter)) return;
      const newField = (sorter.field as string) ?? "";
      const newOrder = sorter.order ?? null;
      setSortField(newField);
      setSortOrder(newOrder);
      persist({ sortField: newField, sortOrder: newOrder });
    },
    [persist]
  );

  return {
    ready,
    // Filters state
    searchCompany,
    setSearchCompany: (val: string) => {
      setSearchCompany(val);
      persist({ searchCompany: val });
    },
    selectedStatuses,
    setSelectedStatuses: (val: StepStatus[]) => {
      setSelectedStatuses(val);
      persist({ selectedStatuses: val });
    },
    selectedStepIds,
    setSelectedStepIds: (val: number[]) => {
      setSelectedStepIds(val);
      persist({ selectedStepIds: val });
    },
    sortField,
    sortOrder,
    // Derived
    filteredData,
    visibleSteps,
    // Options
    companyOptions,
    stepOptions,
    statusOptions,
    // Actions
    resetFilters,
    handleTableChange,
  };
}
