import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";

export interface ReportStepTemplate {
	id: number;
	code: string;
	name: string;
}

export interface CustomerCompany {
	companyId: number;
	name: string;
}

export interface CreateSMReportPayload {
	name: string;
	description?: string;
	customerId: number;
	templateId: number;
	windowFrom: string;
	windowTo: string;
	maxOpportunityCount: number;
	companyIds: number[];
}

export function useCustomerCompanies(customerId: number | null) {
	return useQuery({
		queryKey: ["sales-miner", "customer-companies", customerId],
		queryFn: async () => {
			const res = await api.get(
				`/sales-miner/customers/${customerId}/companies`,
			);
			return res.data as { data: CustomerCompany[] };
		},
		enabled: customerId !== null,
	});
}

export function useReportStepTemplates() {
	return useQuery({
		queryKey: ["sales-miner", "report-step-templates"],
		queryFn: async () => {
			const res = await api.get("/sales-miner/report-step-templates");
			return res.data as { data: ReportStepTemplate[] };
		},
		staleTime: Infinity,
	});
}

export function useCreateSMReport() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: CreateSMReportPayload) => {
			const res = await api.post("/sales-miner/reports", payload);
			return res.data as { data: { id: number; name: string } };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: ["deep-dive", "list"] });
		},
	});
}
