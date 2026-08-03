import { Prisma } from "../../../../generated/prisma";
import prisma from "../../../../lib/prisma";
import {
	buildSignalStatsQuery,
	type SignalStatsRawRow,
} from "../deep-dive/signal-stats-query";

export interface SalesMinerStatsFilters {
	customerIds: bigint[];
	customerGicsCodes: string[];
	targetGicsCodes: string[];
	classifierIds: number[];
}

export class SalesMinerStatsRepository {
	static async listClassifiers() {
		return prisma.report_classifiers.findMany({
			orderBy: { name: "asc" },
		});
	}

	static async getSignalStats(filters: SalesMinerStatsFilters) {
		const customerIds = filters.customerIds;
		const customerGicsPatterns = filters.customerGicsCodes.map((c) => `${c}%`);
		const targetGicsPatterns = filters.targetGicsCodes.map((c) => `${c}%`);
		const classifierIds = filters.classifierIds;

		const scopedRunsCte = Prisma.sql`
      SELECT rr.id
      FROM public.research_runs rr
      JOIN public.reports rp ON rp.id = rr.report_id
      WHERE rp.report_type = 'sales_miner'
        AND (cardinality(${customerIds}::bigint[]) = 0 OR rr.customer_id = ANY(${customerIds}::bigint[]))
        AND (cardinality(${classifierIds}::int[]) = 0 OR rp.report_classifier_id = ANY(${classifierIds}::int[]))
        AND (
          cardinality(${customerGicsPatterns}::text[]) = 0
          OR EXISTS (
            SELECT 1 FROM public.customers cu
            JOIN public.companies cc ON cc.id = cu.company_id
            WHERE cu.id = rr.customer_id AND cc.gics_code LIKE ANY(${customerGicsPatterns}::text[])
          )
        )
        AND (
          cardinality(${targetGicsPatterns}::text[]) = 0
          OR EXISTS (
            SELECT 1 FROM public.companies tc
            WHERE tc.id = rr.company_id AND tc.gics_code LIKE ANY(${targetGicsPatterns}::text[])
          )
        )
    `;

		return prisma.$queryRaw<SignalStatsRawRow[]>(
			buildSignalStatsQuery(scopedRunsCte),
		);
	}
}
