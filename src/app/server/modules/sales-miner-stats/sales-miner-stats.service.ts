import {
	SalesMinerStatsRepository,
	type SalesMinerStatsFilters,
} from "./sales-miner-stats.repository";
import { buildSignalStatsWorkbook } from "../../../../lib/xlsx/signal-stats-workbook";
import type { SignalStatsResponse } from "../../../../types/deep-dive.types";

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
}
