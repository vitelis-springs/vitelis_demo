import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type {
	StepStatus,
	StepsMatrixCompany,
	StepsMatrixRow,
	StepsMatrixStep,
} from "../../hooks/api/useReportStepsService";

const VALID_STATUSES: StepStatus[] = ["PENDING", "PROCESSING", "DONE", "ERROR"];

function parseStatuses(raw: string | null): StepStatus[] {
	return (raw ?? "")
		.split(",")
		.filter((s): s is StepStatus => VALID_STATUSES.includes(s as StepStatus));
}

function parseIds(raw: string | null): number[] {
	return (raw ?? "")
		.split(",")
		.filter(Boolean) // drop "" so Number("") === 0 can't sneak in
		.map(Number)
		.filter((n) => Number.isFinite(n));
}

/**
 * Steps-matrix filters (company search, status, visible steps) live in the
 * URL query string (`q`, `status`, `steps`) so a filtered view is shareable
 * and survives reloads. Sorting stays local — only the table uses it.
 */
export function useStepsMatrixFilters(
	_reportId: number,
	companies: StepsMatrixCompany[],
	steps: StepsMatrixStep[],
	matrix: StepsMatrixRow[],
) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const searchCompany = searchParams.get("q") ?? "";
	const selectedStatuses = parseStatuses(searchParams.get("status"));
	const selectedStepIds = parseIds(searchParams.get("steps"));

	const [sortField, setSortField] = useState("");
	const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | null>(null);

	const setParam = useCallback(
		(key: string, value: string) => {
			const params = new URLSearchParams(searchParams.toString());
			if (value) params.set(key, value);
			else params.delete(key);
			const suffix = params.toString();
			router.replace(`${pathname}${suffix ? `?${suffix}` : ""}`, {
				scroll: false,
			});
		},
		[searchParams, router, pathname],
	);

	const setSearchCompany = useCallback(
		(val: string) => setParam("q", val.trim()),
		[setParam],
	);
	const setSelectedStatuses = useCallback(
		(val: StepStatus[]) => setParam("status", val.join(",")),
		[setParam],
	);
	const setSelectedStepIds = useCallback(
		(val: number[]) => setParam("steps", val.join(",")),
		[setParam],
	);

	const resetFilters = useCallback(() => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("q");
		params.delete("status");
		params.delete("steps");
		const suffix = params.toString();
		router.replace(`${pathname}${suffix ? `?${suffix}` : ""}`, {
			scroll: false,
		});
	}, [searchParams, router, pathname]);

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

		if (searchCompany.trim()) {
			const search = searchCompany.toLowerCase().trim();
			result = result.filter(
				(row) =>
					row.companyName.toLowerCase().includes(search) ||
					String(row.companyId).includes(search),
			);
		}

		if (selectedStatuses.length > 0) {
			result = result.filter((row) =>
				row.statuses.some((s) => selectedStatuses.includes(s.status)),
			);
		}

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
					const aStatus =
						a.statuses.find((s) => s.stepId === stepId)?.status ?? "PENDING";
					const bStatus =
						b.statuses.find((s) => s.stepId === stepId)?.status ?? "PENDING";
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
	}, [
		matrix,
		companies,
		searchCompany,
		selectedStatuses,
		sortField,
		sortOrder,
	]);

	const visibleSteps = useMemo(() => {
		if (selectedStepIds.length === 0) return steps;
		return steps.filter((s) => selectedStepIds.includes(s.id));
	}, [steps, selectedStepIds]);

	const companyOptions = useMemo(
		() =>
			companies.map((c) => ({
				label: `#${c.id} ${c.name}`,
				value: c.id,
			})),
		[companies],
	);

	const stepOptions = useMemo(
		() =>
			steps.map((s) => ({
				label: s.name,
				value: s.id,
			})),
		[steps],
	);

	const statusOptions: Array<{ label: string; value: StepStatus }> = [
		{ label: "Pending", value: "PENDING" },
		{ label: "Processing", value: "PROCESSING" },
		{ label: "Done", value: "DONE" },
		{ label: "Error", value: "ERROR" },
	];

	const handleTableChange = useCallback(
		(
			_pagination: unknown,
			_filters: unknown,
			sorter:
				| { field?: string; order?: "ascend" | "descend" | null }
				| Array<unknown>,
		) => {
			if (Array.isArray(sorter)) return;
			setSortField((sorter.field as string) ?? "");
			setSortOrder(sorter.order ?? null);
		},
		[],
	);

	return {
		ready: true,
		searchCompany,
		setSearchCompany,
		selectedStatuses,
		setSelectedStatuses,
		selectedStepIds,
		setSelectedStepIds,
		sortField,
		sortOrder,
		filteredData,
		visibleSteps,
		companyOptions,
		stepOptions,
		statusOptions,
		resetFilters,
		handleTableChange,
	};
}
