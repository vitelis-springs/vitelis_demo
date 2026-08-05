import { Prisma } from "../../../../generated/prisma";
import prisma from "../../../../lib/prisma";
import {
	buildCategoryProductTagMatrixQuery,
	buildSignalCategoryStatsQuery,
	buildSignalStatsQuery,
	type CategoryProductTagCellRawRow,
	type SignalCategoryStatsRawRow,
	type SignalStatsRawRow,
} from "../deep-dive/signal-stats-query";

export interface SalesMinerStatsFilters {
	customerIds: bigint[];
	targetGicsCodes: string[];
	classifierIds: number[];
	/** sm_capability_tags ids — see signal-stats-query.ts's buildLineageCtes for exact anchor-product semantics. */
	capabilityTagIds: bigint[];
}

export function buildScopedRunsCte(
	filters: Pick<
		SalesMinerStatsFilters,
		"customerIds" | "targetGicsCodes" | "classifierIds"
	>,
): Prisma.Sql {
	const customerIds = filters.customerIds;
	const targetGicsPatterns = filters.targetGicsCodes.map((c) => `${c}%`);
	const classifierIds = filters.classifierIds;

	return Prisma.sql`
      SELECT rr.id
      FROM public.research_runs rr
      JOIN public.reports rp ON rp.id = rr.report_id
      WHERE rp.report_type = 'sales_miner'
        AND (cardinality(${customerIds}::bigint[]) = 0 OR rr.customer_id = ANY(${customerIds}::bigint[]))
        AND (cardinality(${classifierIds}::int[]) = 0 OR rp.report_classifier_id = ANY(${classifierIds}::int[]))
        AND (
          cardinality(${targetGicsPatterns}::text[]) = 0
          OR EXISTS (
            SELECT 1 FROM public.companies tc
            WHERE tc.id = rr.company_id AND tc.gics_code LIKE ANY(${targetGicsPatterns}::text[])
          )
        )
    `;
}

export class SalesMinerStatsRepository {
	static async listClassifiers() {
		return prisma.report_classifiers.findMany({
			orderBy: { name: "asc" },
		});
	}

	static async listCapabilityTags() {
		return prisma.sm_capability_tags.findMany({
			where: { is_active: true },
			orderBy: [{ sort_order: "asc" }, { name: "asc" }],
		});
	}

	static async getSignalStats(filters: SalesMinerStatsFilters) {
		return prisma.$queryRaw<SignalStatsRawRow[]>(
			buildSignalStatsQuery(
				buildScopedRunsCte(filters),
				filters.capabilityTagIds,
			),
		);
	}

	static async getSignalCategoryStats(filters: SalesMinerStatsFilters) {
		return prisma.$queryRaw<SignalCategoryStatsRawRow[]>(
			buildSignalCategoryStatsQuery(
				buildScopedRunsCte(filters),
				filters.capabilityTagIds,
			),
		);
	}

	static async getCategoryProductTagMatrix(filters: SalesMinerStatsFilters) {
		return prisma.$queryRaw<CategoryProductTagCellRawRow[]>(
			buildCategoryProductTagMatrixQuery(
				buildScopedRunsCte(filters),
				filters.capabilityTagIds,
			),
		);
	}
}
