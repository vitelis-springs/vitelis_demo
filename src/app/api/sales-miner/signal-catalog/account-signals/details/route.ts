import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../../lib/auth";
import prisma from "../../../../../../lib/prisma";

export interface AccountSignalDetail {
	scopeId: string;
	signalId: string;
	signalCode: string;
	signalName: string;
	isActive: boolean;
	categoryId: string;
	categoryCode: string;
	categoryName: string;
}

export async function GET(request: NextRequest) {
	const admin = await extractAdminFromRequest(request);
	if (!admin)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
			cat.name         AS category_name
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
		ORDER BY cat.external_id, sd.name
	`;

	const data: AccountSignalDetail[] = rows.map((r) => ({
		scopeId: r.scope_id.toString(),
		signalId: r.signal_id.toString(),
		signalCode: r.signal_code,
		signalName: r.signal_name,
		isActive: r.is_active,
		categoryId: r.category_id.toString(),
		categoryCode: r.category_code,
		categoryName: r.category_name,
	}));

	return NextResponse.json({ data });
}
