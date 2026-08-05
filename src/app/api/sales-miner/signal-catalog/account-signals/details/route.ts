import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../../lib/auth";
import prisma from "../../../../../../lib/prisma";
import { getCompanySubcategoryEfficiencyMap } from "../../../../../../lib/sm-optimize-signal-scope";

export interface AccountSignalDetail {
	scopeId: string;
	signalId: string;
	signalCode: string;
	signalName: string;
	isActive: boolean;
	categoryId: string;
	categoryCode: string;
	categoryName: string;
	/** Groups signal_definition variants that are the same statistical/decision unit (e.g. an old and a new catalog wording of the same subcategory) — efficiency and winner/random are computed and decided at this granularity, not per signal_definition_id. */
	subcategoryId: string;
	/** Always-live signal_efficiency_pct, recomputed on every request (see getCompanySubcategoryEfficiencyMap) — drifts from selectionEfficiencyPct as new runs complete. */
	signalEfficiencyPct: number | null;
	efficiencySampleSize: number | null;
	/** 'winner' | 'random' | null — set only by optimizeSignalScope; null if this signal's scope row was never touched by Optimize. */
	selectionReason: string | null;
	/** Frozen signal_efficiency_pct snapshot from the Optimize run that set selectionReason — null for cold-start candidates or rows never touched by Optimize. */
	selectionEfficiencyPct: number | null;
}

export async function GET(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const p = request.nextUrl.searchParams;
	const reportId = parseInt(p.get("reportId") ?? "", 10);
	const companyId = parseInt(p.get("companyId") ?? "", 10);
	const tier = parseInt(p.get("tier") ?? "", 10);

	if (isNaN(reportId) || isNaN(companyId) || isNaN(tier)) {
		return NextResponse.json(
			{ error: "reportId, companyId, tier are required" },
			{ status: 400 },
		);
	}

	const rows = await prisma.$queryRaw<
		Array<{
			scope_id: bigint;
			signal_id: bigint;
			signal_code: string;
			signal_name: string;
			is_active: boolean;
			category_id: bigint;
			category_code: string;
			category_name: string;
			subcategory_id: bigint;
			selection_reason: string | null;
			selection_efficiency_pct: string | null;
		}>
	>`
		SELECT
			rcss.id          AS scope_id,
			sd.id            AS signal_id,
			sub.external_id  AS signal_code,
			sd.name          AS signal_name,
			rcss.is_active,
			cat.id           AS category_id,
			cat.external_id  AS category_code,
			cat.name         AS category_name,
			sub.id           AS subcategory_id,
			rcss.selection_reason,
			rcss.selection_efficiency_pct
		FROM report_company_signal_scope rcss
		JOIN signal_definitions sd
			ON sd.id = rcss.signal_definition_id
		JOIN sm_signal_subcategories sub
			ON sub.id = sd.sm_signal_subcategory_id
		JOIN sm_signal_categories cat
			ON cat.id = sub.sm_signal_category_id
			AND cat.tier = ${tier}
		WHERE rcss.report_id = ${reportId}
		  AND rcss.company_id = ${companyId}
		ORDER BY cat.external_id, sub.external_id, sd.name
	`;

	// Always uses getCompanySubcategoryEfficiencyMap's defaults (min sample
	// threshold 5, no product-tag filter) — NOT necessarily the exact
	// minSampleThreshold/useProductTagFilter an admin last passed to
	// optimizeSignalScope. It's a general "how do things stand" indicator,
	// not a snapshot tied to one specific Optimize run.
	const efficiencyMap = await getCompanySubcategoryEfficiencyMap(companyId);

	const data: AccountSignalDetail[] = rows.map((r) => {
		const stat = efficiencyMap.get(r.subcategory_id.toString());
		return {
			scopeId: r.scope_id.toString(),
			signalId: r.signal_id.toString(),
			signalCode: r.signal_code,
			signalName: r.signal_name,
			isActive: r.is_active,
			categoryId: r.category_id.toString(),
			categoryCode: r.category_code,
			categoryName: r.category_name,
			subcategoryId: r.subcategory_id.toString(),
			signalEfficiencyPct: stat?.efficiencyPct ?? null,
			efficiencySampleSize: stat?.companiesResearched ?? null,
			selectionReason: r.selection_reason,
			selectionEfficiencyPct:
				r.selection_efficiency_pct != null
					? Number(r.selection_efficiency_pct)
					: null,
		};
	});

	return NextResponse.json({ data });
}
