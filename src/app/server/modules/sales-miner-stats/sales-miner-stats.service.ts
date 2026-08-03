import {
	SalesMinerStatsRepository,
	type SalesMinerStatsFilters,
} from "./sales-miner-stats.repository";
import {
	buildCategoryProductTagMatrixWorkbook,
	buildSignalCategoryStatsWorkbook,
	buildSignalStatsWorkbook,
} from "../../../../lib/xlsx/signal-stats-workbook";
import type {
	CategoryProductTagMatrixResponse,
	SignalCategoryStatsResponse,
	SignalStatsResponse,
} from "../../../../types/deep-dive.types";

export interface SalesMinerStatsRequestFilters extends SalesMinerStatsFilters {
	unitTypes: string[];
}

export class SalesMinerStatsService {
	static async listClassifiers() {
		const rows = await SalesMinerStatsRepository.listClassifiers();
		return {
			success: true,
			data: rows.map((r) => ({
				id: r.id,
				name: r.name,
				exportedToDop: r.exported_to_dop,
			})),
		};
	}

	static async listCapabilityTags() {
		const rows = await SalesMinerStatsRepository.listCapabilityTags();
		return {
			success: true,
			data: rows.map((r) => ({
				id: Number(r.id),
				code: r.code,
				name: r.name,
			})),
		};
	}

	static async getSignalStats(
		filters: SalesMinerStatsRequestFilters,
	): Promise<SignalStatsResponse> {
		const rows = await SalesMinerStatsRepository.getSignalStats(filters);
		const data = rows.map((r) => ({
			unitType: r.unit_type as "subcategory" | "product_signal",
			unitId: Number(r.unit_id),
			unitName: r.unit_name,
			externalId: r.external_id,
			signalClass: r.signal_class,
			opportunitiesCount: Number(r.opportunities_count),
			distinctSignalDefinitionCount: Number(r.distinct_signal_definition_count),
			completedSearchCount: Number(r.completed_search_count),
			signalEfficiencyPct:
				r.signal_efficiency_pct != null
					? Number(r.signal_efficiency_pct)
					: null,
			companiesResearchedCount: Number(r.companies_researched_count),
			companiesWithOpportunityCount: Number(r.companies_with_opportunity_count),
			companyHitRatePct:
				r.company_hit_rate_pct != null ? Number(r.company_hit_rate_pct) : null,
			triggerOpportunitiesCount: Number(r.trigger_opportunities_count),
			triggerEfficiencyPct:
				r.trigger_efficiency_pct != null
					? Number(r.trigger_efficiency_pct)
					: null,
		}));
		const filtered = filters.unitTypes.length
			? data.filter((r) => filters.unitTypes.includes(r.unitType))
			: data;
		return { success: true, data: filtered };
	}

	static async exportSignalStatsXlsx(
		filters: SalesMinerStatsRequestFilters,
	): Promise<ArrayBuffer> {
		const { data } = await this.getSignalStats(filters);
		return buildSignalStatsWorkbook(data);
	}

	static async getSignalCategoryStats(
		filters: SalesMinerStatsFilters,
	): Promise<SignalCategoryStatsResponse> {
		const rows =
			await SalesMinerStatsRepository.getSignalCategoryStats(filters);
		const data = rows.map((r) => ({
			categoryId: r.category_id != null ? Number(r.category_id) : null,
			categoryName: r.category_name,
			subcategoryCount: Number(r.subcategory_count),
			opportunitiesCount: Number(r.opportunities_count),
			distinctSignalDefinitionCount: Number(r.distinct_signal_definition_count),
			completedSearchCount: Number(r.completed_search_count),
			signalEfficiencyPct:
				r.signal_efficiency_pct != null
					? Number(r.signal_efficiency_pct)
					: null,
			companiesResearchedCount: Number(r.companies_researched_count),
			companiesWithOpportunityCount: Number(r.companies_with_opportunity_count),
			companyHitRatePct:
				r.company_hit_rate_pct != null ? Number(r.company_hit_rate_pct) : null,
			triggerOpportunitiesCount: Number(r.trigger_opportunities_count),
			triggerEfficiencyPct:
				r.trigger_efficiency_pct != null
					? Number(r.trigger_efficiency_pct)
					: null,
		}));
		return { success: true, data };
	}

	static async exportSignalCategoryStatsXlsx(
		filters: SalesMinerStatsFilters,
	): Promise<ArrayBuffer> {
		const { data } = await this.getSignalCategoryStats(filters);
		return buildSignalCategoryStatsWorkbook(data);
	}

	static async getCategoryProductTagMatrix(
		filters: SalesMinerStatsFilters,
	): Promise<CategoryProductTagMatrixResponse> {
		const rows =
			await SalesMinerStatsRepository.getCategoryProductTagMatrix(filters);
		const data = rows.map((r) => ({
			categoryId: r.category_id != null ? Number(r.category_id) : null,
			categoryName: r.category_name,
			capabilityTagId:
				r.capability_tag_id != null ? Number(r.capability_tag_id) : null,
			tagName: r.tag_name,
			opportunitiesCount: Number(r.opportunities_count),
			completedSearchCount: Number(r.completed_search_count),
			signalEfficiencyPct:
				r.signal_efficiency_pct != null
					? Number(r.signal_efficiency_pct)
					: null,
		}));
		return { success: true, data };
	}

	static async exportCategoryProductTagMatrixXlsx(
		filters: SalesMinerStatsFilters,
	): Promise<ArrayBuffer> {
		const { data } = await this.getCategoryProductTagMatrix(filters);
		return buildCategoryProductTagMatrixWorkbook(data);
	}
}
