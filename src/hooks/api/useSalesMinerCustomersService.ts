import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";

const listKey = ["sales-miner", "customers", "list"] as const;
const detailKey = (id: string) =>
	["sales-miner", "customers", "detail", id] as const;

export interface SalesMinerCustomerListRow {
	id: string;
	company_id: number;
	display_name: string;
	is_active: boolean;
	settings: unknown;
	created_at: string;
	updated_at: string;
	companies: { id: number; name: string };
	_count: { customer_accounts: number };
}

export interface SalesMinerCustomerDetail {
	id: string;
	company_id: number;
	display_name: string;
	is_active: boolean;
	settings: unknown;
	created_at: string;
	updated_at: string;
	companies: {
		id: number;
		name: string;
		url?: string | null;
		country_code?: string | null;
	};
	customer_accounts: Array<{
		id: string;
		customer_id: string;
		company_id: number;
		is_active: boolean;
		created_at: string;
		updated_at: string;
		companies: { id: number; name: string; verified: boolean };
		customer_account_subsidiaries: Array<{
			id: string;
			customer_account_id: string;
			subsidiary_company_id: number;
			relation_type: string;
			is_active: boolean;
			created_at: string;
			updated_at: string;
			meta: unknown;
			companies: { id: number; name: string };
		}>;
	}>;
}

export function useSalesMinerCustomersList(params: {
	page: number;
	limit: number;
	q: string;
}) {
	return useQuery({
		queryKey: [...listKey, params.page, params.limit, params.q],
		queryFn: async () => {
			const sp = new URLSearchParams();
			sp.set("page", String(params.page));
			sp.set("limit", String(params.limit));
			if (params.q.trim()) sp.set("q", params.q.trim());
			const res = await api.get(`/sales-miner/customers?${sp.toString()}`);
			return res.data as {
				success: boolean;
				data: {
					items: SalesMinerCustomerListRow[];
					total: number;
					page: number;
					limit: number;
				};
			};
		},
	});
}

export function useSalesMinerCustomerDetail(customerId: string | null) {
	return useQuery({
		queryKey: customerId
			? detailKey(customerId)
			: ["sales-miner", "customers", "detail", "none"],
		queryFn: async () => {
			if (!customerId) throw new Error("missing id");
			const res = await api.get(`/sales-miner/customers/${customerId}`);
			return res.data as { success: boolean; data: SalesMinerCustomerDetail };
		},
		enabled: Boolean(customerId),
	});
}

export function useCreateSalesMinerCustomer() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: {
			companyId: number;
			displayName: string;
			settings?: Record<string, unknown>;
		}) => {
			const res = await api.post("/sales-miner/customers", payload);
			return res.data as { success: boolean; data: SalesMinerCustomerListRow };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: listKey });
		},
	});
}

export function useUpdateSalesMinerCustomer(customerId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: {
			displayName?: string;
			isActive?: boolean;
			settings?: Record<string, unknown>;
		}) => {
			const res = await api.patch(
				`/sales-miner/customers/${customerId}`,
				payload,
			);
			return res.data as { success: boolean; data: SalesMinerCustomerListRow };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: listKey });
			void qc.invalidateQueries({ queryKey: detailKey(customerId) });
		},
	});
}

export function useCreateSalesMinerCustomerAccount(customerId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: { companyId: number }) => {
			const res = await api.post(
				`/sales-miner/customers/${customerId}/accounts`,
				payload,
			);
			return res.data as { success: boolean; data: unknown };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: listKey });
			void qc.invalidateQueries({ queryKey: detailKey(customerId) });
		},
	});
}

export function useUpdateSalesMinerCustomerAccount(customerId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: { accountId: string; isActive: boolean }) => {
			const res = await api.patch(
				`/sales-miner/customer-accounts/${payload.accountId}`,
				{ isActive: payload.isActive },
			);
			return res.data as { success: boolean; data: unknown };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: listKey });
			void qc.invalidateQueries({ queryKey: detailKey(customerId) });
		},
	});
}

export function useCreateSalesMinerSubsidiary(customerId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: {
			accountId: string;
			subsidiaryCompanyId: number;
			relationType?: string;
			meta?: Record<string, unknown>;
		}) => {
			const res = await api.post(
				`/sales-miner/customer-accounts/${payload.accountId}/subsidiaries`,
				{
					subsidiaryCompanyId: payload.subsidiaryCompanyId,
					relationType: payload.relationType,
					meta: payload.meta,
				},
			);
			return res.data as { success: boolean; data: unknown };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: listKey });
			void qc.invalidateQueries({ queryKey: detailKey(customerId) });
		},
	});
}

export function useUpdateSalesMinerSubsidiary(customerId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: {
			subsidiaryId: string;
			isActive?: boolean;
			relationType?: string;
			meta?: Record<string, unknown>;
		}) => {
			const body: Record<string, unknown> = {};
			if (payload.isActive !== undefined) body.isActive = payload.isActive;
			if (payload.relationType !== undefined)
				body.relationType = payload.relationType;
			if (payload.meta !== undefined) body.meta = payload.meta;
			const res = await api.patch(
				`/sales-miner/customer-account-subsidiaries/${payload.subsidiaryId}`,
				body,
			);
			return res.data as { success: boolean; data: unknown };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: listKey });
			void qc.invalidateQueries({ queryKey: detailKey(customerId) });
		},
	});
}

export interface CustomerProductRow {
	id: string;
	customer_id: string;
	parent_id: string | null;
	product_level: "l2" | "l3";
	name: string;
	description: string;
	meta: unknown;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export function useCustomerProducts(
	customerId: string,
	options?: { refetchInterval?: number | false },
) {
	return useQuery({
		queryKey: ["sales-miner", "customer-products", customerId],
		queryFn: async () => {
			const res = await api.get(
				`/sales-miner/customers/${customerId}/products`,
			);
			return res.data as { success: boolean; data: CustomerProductRow[] };
		},
		refetchInterval: options?.refetchInterval,
	});
}
