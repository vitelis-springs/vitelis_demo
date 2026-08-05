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
	companies: {
		id: number;
		name: string;
		gics_code?: string | null;
		gics_codes?: { name: string } | null;
	};
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

// --- product discovery -----------------------------------------------------
// A run takes minutes, so nothing here waits on one. `useStartProductDiscovery`
// returns as soon as the run is recorded and `useProductDiscoveryRun` polls it.
// The result is a *proposal*: it reaches customer_products only when the
// engineer confirms and the existing import mutation writes it.

/** Exactly the keys `POST /products/import` accepts, so a confirmed preview
 * can be posted to the existing endpoint without reshaping. */
export interface DiscoveredProductPayload {
	groupCategory: string;
	productName: string;
	internalDescription: string;
	subCategory: string | null;
	valueProposition: string | null;
	painPoint: string | null;
	orgUnit: string | null;
	markets: string | null;
	geographies: string | null;
	price: string | null;
	buyingTriggerSignals: string | null;
	landAnchor: string | null;
	expandAnchor: string | null;
	scaleAnchor: string | null;
	crossPortfolioConnection: string | null;
	discovery: {
		confidence: number;
		evidence_urls: string[];
		strategies: string[];
		variants: string[];
		retrieved_at: string | null;
		unfiled: boolean;
	} | null;
}

export interface ProductDiscoveryRun {
	id: string;
	customer_id: number;
	status: "queued" | "running" | "succeeded" | "failed";
	created_at: string;
	finished_at: string | null;
	error: string | null;
	summary: {
		products: number;
		groups: number;
		unfiled: number;
		taxonomy_origin: string;
		cost_usd: number;
		duration_s: number;
		strategies: Record<string, number>;
		errors: string[];
		preflight_verdict: string;
		sources: Array<{
			url: string;
			role: string;
			status: number;
			verdict: string;
			crawlable: boolean;
		}>;
	} | null;
	products: DiscoveredProductPayload[] | null;
}

export function useStartProductDiscovery(customerId: string) {
	return useMutation({
		mutationFn: async () => {
			const res = await api.post(
				`/sales-miner/customers/${customerId}/products/discover`,
				{},
			);
			return res.data as { success: boolean; data: ProductDiscoveryRun };
		},
	});
}

/**
 * The customer's most recent run — asked on load so a refresh rejoins one.
 *
 * Polls only while that run is unfinished. An idle Portfolio tab makes one
 * request and then goes quiet, which matters because this tab is left open.
 */
export function useLatestProductDiscoveryRun(
	customerId: string,
	options?: { pollMs?: number },
) {
	const pollMs = options?.pollMs ?? 4000;
	return useQuery({
		queryKey: ["sales-miner", "product-discovery", "latest", customerId],
		queryFn: async () => {
			const res = await api.get(
				`/sales-miner/customers/${customerId}/products/discover`,
			);
			return res.data as { success: boolean; data: ProductDiscoveryRun | null };
		},
		refetchInterval: (query) => {
			const status = query.state.data?.data?.status;
			return status === "queued" || status === "running" ? pollMs : false;
		},
	});
}

export function useProductDiscoveryRun(
	customerId: string,
	runId: string | null,
	options?: { refetchInterval?: number | false },
) {
	return useQuery({
		queryKey: ["sales-miner", "product-discovery", "run", runId],
		enabled: Boolean(runId),
		queryFn: async () => {
			const res = await api.get(
				`/sales-miner/customers/${customerId}/products/discover/${runId}`,
			);
			return res.data as { success: boolean; data: ProductDiscoveryRun };
		},
		refetchInterval: options?.refetchInterval,
	});
}
