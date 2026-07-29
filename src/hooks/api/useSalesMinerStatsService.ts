import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api-client";
import type { SignalStatsResponse } from "../../types/deep-dive.types";

export interface SalesMinerStatsFilterParams {
	customerIds: string[];
	customerGics: string[];
	targetGics: string[];
	classifierIds: string[];
	/** Row-level display filter, not part of the query scope — only sent when exporting, to keep the file in sync with what's filtered on screen. */
	unitTypes?: string[];
}

function buildStatsFilterParams(
	filters: SalesMinerStatsFilterParams,
): URLSearchParams {
	const sp = new URLSearchParams();
	if (filters.customerIds.length)
		sp.set("customerIds", filters.customerIds.join(","));
	if (filters.customerGics.length)
		sp.set("customerGics", filters.customerGics.join(","));
	if (filters.targetGics.length)
		sp.set("targetGics", filters.targetGics.join(","));
	if (filters.classifierIds.length)
		sp.set("classifierIds", filters.classifierIds.join(","));
	if (filters.unitTypes?.length)
		sp.set("unitTypes", filters.unitTypes.join(","));
	return sp;
}

export interface ReportClassifierRow {
	id: number;
	name: string;
	exportedToDop: boolean;
}

export interface ReportClassifiersResponse {
	success: boolean;
	data: ReportClassifierRow[];
}

export const useGetReportClassifiers = () => {
	return useQuery({
		queryKey: ["sales-miner", "stats", "classifiers"],
		queryFn: async () => {
			const response = await api.get("/sales-miner/stats/classifiers");
			return response.data as ReportClassifiersResponse;
		},
		staleTime: 5 * 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useGetSalesMinerStats = (filters: SalesMinerStatsFilterParams) => {
	return useQuery({
		queryKey: [
			"sales-miner",
			"stats",
			filters.customerIds,
			filters.customerGics,
			filters.targetGics,
			filters.classifierIds,
		],
		queryFn: async () => {
			const sp = buildStatsFilterParams(filters);
			const response = await api.get(`/sales-miner/stats?${sp.toString()}`);
			return response.data as SignalStatsResponse;
		},
		staleTime: 5 * 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useExportSalesMinerStatsXlsx = () => {
	return useMutation({
		mutationFn: async (filters: SalesMinerStatsFilterParams) => {
			const sp = buildStatsFilterParams(filters);
			const response = await api.get(
				`/sales-miner/stats/export?${sp.toString()}`,
				{
					responseType: "blob",
				},
			);
			const url = URL.createObjectURL(response.data as Blob);
			const a = document.createElement("a");
			a.href = url;
			const exportDate = new Date().toISOString().slice(0, 10);
			a.download = `sales_miner_signal_stats_${exportDate}.xlsx`;
			a.click();
			URL.revokeObjectURL(url);
		},
	});
};
