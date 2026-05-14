import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";

const baseKey = ["sales-miner", "signal-catalog"] as const;

export interface SignalCategoryRow {
	id: string;
	code: string;
	name: string;
	description: string | null;
	is_active: boolean;
	is_gc: boolean;
	tier: number;
	parent_id: string | null;
	parent_name: string | null;
	signal_definition_id: string | null;
	signal_definition_name: string | null;
	signal_definition_description: string | null;
	signal_definition_created_at: string | null;
	child_count: number;
	versions_count: number;
	created_at: string;
	updated_at: string;
}

export interface GicsCodeRow {
	code: string;
	name: string;
	level: number;
	parent_code: string | null;
}

export interface SignalSearchPhraseRow {
	id: string;
	phrase: string;
	phraseType: string;
	languageCode: string;
	priority: number;
	isActive: boolean;
}

export interface SignalDefinitionRow {
	id: string;
	code: string;
	signal_type_id: string;
	signal_type_name: string;
	category_id: string | null;
	category_name: string | null;
	name: string;
	description: string;
	scope: string;
	search_level: string;
	requires_company_binding: boolean;
	merged_into_signal_id: string | null;
	is_active: boolean;
	is_latest?: boolean;
	meta: unknown;
	gics_codes: string[];
	created_at: string;
	updated_at: string;
	search_phrases: SignalSearchPhraseRow[];
}

export interface PaginatedSignalCatalogResponse<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
}

export interface SignalTypeRow {
	id: string;
	code: string;
	name: string;
	description: string | null;
	is_active: boolean;
	sort_order: number;
}

export interface UpsertSignalCategoryPayload {
	id?: string;
	code: string;
	name: string;
	description?: string | null;
	tier: number;
	parentId?: string | null;
	signalDefinitionId?: string | null;
	isActive: boolean;
}

export interface CreateSignalPayload {
	sourceSignalId?: string | null;
	code: string;
	name: string;
	description: string;
	signalTypeId: string;
	/** Existing subcategory id — used when creating a new version of a signal */
	categoryId?: string | null;
	/** Tier-1 category id — when set, backend auto-creates a subcategory */
	parentCategoryId?: string | null;
	scope: string;
	searchLevel: string;
	requiresCompanyBinding: boolean;
	isActive: boolean;
	gicsCodes?: string[];
	searchPhrases: Array<{
		phrase: string;
		phraseType: string;
		languageCode: string;
		priority: number;
		isActive: boolean;
	}>;
}

export function useSignalCatalogCategories(params: {
	q: string;
	page: number;
	limit: number;
}) {
	return useQuery({
		queryKey: [...baseKey, "categories", params.q, params.page, params.limit],
		queryFn: async () => {
			const sp = new URLSearchParams();
			sp.set("page", String(params.page));
			sp.set("limit", String(params.limit));
			if (params.q.trim()) sp.set("q", params.q.trim());
			const res = await api.get(
				`/sales-miner/signal-catalog/categories?${sp.toString()}`,
			);
			return res.data as {
				success: boolean;
				data: PaginatedSignalCatalogResponse<SignalCategoryRow> & {
					parentItems: SignalCategoryRow[];
					optionItems: SignalCategoryRow[];
					parentOptionItems: SignalCategoryRow[];
				};
			};
		},
	});
}

export function useSignalCatalogSubcategories(parentId: string | null) {
	return useQuery({
		queryKey: [...baseKey, "categories", "children", parentId],
		queryFn: async () => {
			const res = await api.get(
				`/sales-miner/signal-catalog/categories?parentId=${parentId}`,
			);
			return res.data as {
				success: boolean;
				data: PaginatedSignalCatalogResponse<SignalCategoryRow>;
			};
		},
		enabled: parentId !== null,
	});
}

export function useSignalCatalogSignals(params: {
	q: string;
	page: number;
	limit: number;
	parentCategoryId?: string;
}) {
	return useQuery({
		queryKey: [
			...baseKey,
			"signals",
			params.q,
			params.page,
			params.limit,
			params.parentCategoryId,
		],
		queryFn: async () => {
			const sp = new URLSearchParams();
			sp.set("page", String(params.page));
			sp.set("limit", String(params.limit));
			if (params.q.trim()) sp.set("q", params.q.trim());
			if (params.parentCategoryId)
				sp.set("parentCategoryId", params.parentCategoryId);
			const res = await api.get(
				`/sales-miner/signal-catalog/signals?${sp.toString()}`,
			);
			return res.data as {
				success: boolean;
				data: PaginatedSignalCatalogResponse<SignalDefinitionRow>;
			};
		},
	});
}

export function useSignalVersionsByCategoryId(categoryId: string | null) {
	return useQuery({
		queryKey: [...baseKey, "signals", "versions", categoryId],
		queryFn: async () => {
			const res = await api.get(
				`/sales-miner/signal-catalog/signals?categoryId=${categoryId}`,
			);
			return res.data as {
				success: boolean;
				data: PaginatedSignalCatalogResponse<SignalDefinitionRow>;
			};
		},
		enabled: categoryId !== null,
	});
}

export function useSignalCatalogSignalTypes() {
	return useQuery({
		queryKey: [...baseKey, "signal-types"],
		queryFn: async () => {
			const res = await api.get("/sales-miner/signal-catalog/signal-types");
			return res.data as { success: boolean; data: SignalTypeRow[] };
		},
	});
}

export function useCreateSignalCategory() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: UpsertSignalCategoryPayload) => {
			const res = await api.post(
				"/sales-miner/signal-catalog/categories",
				payload,
			);
			return res.data as { success: boolean; data: SignalCategoryRow };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: baseKey });
		},
	});
}

export function useUpdateSignalCategory() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: UpsertSignalCategoryPayload) => {
			if (!payload.id) throw new Error("Category id is required");
			const res = await api.patch(
				`/sales-miner/signal-catalog/categories/${payload.id}`,
				payload,
			);
			return res.data as { success: boolean; data: SignalCategoryRow };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: baseKey });
		},
	});
}

export function useToggleSignalCategoryActive() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			row,
			isActive,
		}: {
			row: SignalCategoryRow;
			isActive: boolean;
		}) => {
			const res = await api.patch(
				`/sales-miner/signal-catalog/categories/${row.id}`,
				{
					code: row.code,
					name: row.name,
					description: row.description,
					tier: row.tier,
					parentId: row.parent_id,
					signalDefinitionId: row.signal_definition_id,
					isActive,
				},
			);
			return res.data as { success: boolean; data: SignalCategoryRow };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: baseKey });
		},
	});
}

export function useSetCurrentSignalVersion() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			row,
			signalDefinitionId,
		}: {
			row: SignalCategoryRow;
			signalDefinitionId: string;
		}) => {
			const res = await api.patch(
				`/sales-miner/signal-catalog/categories/${row.id}`,
				{
					code: row.code,
					name: row.name,
					description: row.description,
					tier: row.tier,
					parentId: row.parent_id,
					signalDefinitionId,
					isActive: row.is_active,
				},
			);
			return res.data as { success: boolean; data: SignalCategoryRow };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: baseKey });
		},
	});
}

export function useSetCurrentIndustrySignalVersion() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			signalId,
			subcategoryId,
		}: {
			signalId: string;
			subcategoryId: string;
		}) => {
			const res = await api.patch(
				`/sales-miner/signal-catalog/signals/${signalId}/set-current`,
				{ subcategoryId },
			);
			return res.data;
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: baseKey });
		},
	});
}

export function useDeactivateSignalDefinition() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (signalId: string) => {
			const res = await api.patch(
				`/sales-miner/signal-catalog/signals/${signalId}`,
				{ isActive: false },
			);
			return res.data;
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: baseKey });
		},
	});
}

export interface CurrentSignalRow {
	id: string;
	code: string;
	name: string;
	description: string;
	is_active: boolean;
	gics_codes: string[];
	link_type: "universal" | "industry";
	versions_count: number;
	created_at: string;
}

export function useSubcategoryCurrentSignals(subcategoryId: string | null) {
	return useQuery({
		queryKey: [...baseKey, "current-signals", subcategoryId],
		queryFn: async () => {
			const res = await api.get(
				`/sales-miner/signal-catalog/subcategory-current-signals?subcategoryId=${subcategoryId}`,
			);
			return res.data as { success: boolean; data: CurrentSignalRow[] };
		},
		enabled: subcategoryId !== null,
	});
}

export function useGicsCodes() {
	return useQuery({
		queryKey: [...baseKey, "gics-codes"],
		queryFn: async () => {
			const res = await api.get("/sales-miner/signal-catalog/gics-codes");
			return res.data as { success: boolean; data: GicsCodeRow[] };
		},
		staleTime: Infinity,
	});
}

export function useCreateSignalDefinition() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: CreateSignalPayload) => {
			const res = await api.post(
				"/sales-miner/signal-catalog/signals",
				payload,
			);
			return res.data as { success: boolean; data: SignalDefinitionRow };
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: baseKey });
		},
	});
}
