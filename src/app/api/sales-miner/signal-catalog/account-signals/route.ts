import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export interface AccountSignalRow {
	companyId: number;
	account: string;
	tier: number | null;
	signalCount: number;
	totalSignalCount: number;
}

export async function GET(request: NextRequest) {
	const admin = await extractAdminFromRequest(request);
	if (!admin)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const reportIdParam = request.nextUrl.searchParams.get("reportId");
	const reportId = reportIdParam ? parseInt(reportIdParam, 10) : NaN;
	if (isNaN(reportId)) {
		return NextResponse.json(
			{ error: "reportId is required" },
			{ status: 400 },
		);
	}

	const rows = await prisma.$queryRaw<
		Array<{
			company_id: number;
			account: string;
			tier: number | null;
			signal_count: bigint;
			total_signal_count: bigint;
		}>
	>`
		SELECT
			c.id                                                           AS company_id,
			c.name                                                         AS account,
			cat.tier,
			COUNT(DISTINCT rcss.signal_definition_id)
				FILTER (WHERE rcss.is_active = true)                       AS signal_count,
			COUNT(DISTINCT rcss.signal_definition_id)                      AS total_signal_count
		FROM report_company_signal_scope rcss
		JOIN companies c
			ON c.id = rcss.company_id
		JOIN signal_definitions sd
			ON sd.id = rcss.signal_definition_id
		JOIN sm_signal_subcategories sub
			ON sub.id = sd.sm_signal_subcategory_id
		JOIN sm_signal_categories cat
			ON cat.id = sub.sm_signal_category_id
		WHERE rcss.report_id = ${reportId}
		GROUP BY c.id, c.name, cat.tier
		ORDER BY c.name, cat.tier NULLS LAST
	`;

	const data: AccountSignalRow[] = rows.map((r) => ({
		companyId: r.company_id,
		account: r.account,
		tier: r.tier,
		signalCount: Number(r.signal_count),
		totalSignalCount: Number(r.total_signal_count),
	}));

	return NextResponse.json({ data });
}
