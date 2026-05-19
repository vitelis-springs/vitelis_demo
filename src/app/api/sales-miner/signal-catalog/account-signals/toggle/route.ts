import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../../lib/auth";
import prisma from "../../../../../../lib/prisma";

export async function PATCH(request: NextRequest) {
	const admin = await extractAdminFromRequest(request);
	if (!admin)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const body = (await request.json()) as
		| { type: "signal"; scopeId: string; isActive: boolean }
		| {
				type: "tier";
				reportId: number;
				companyId: number;
				tier: number;
				activate: boolean;
		  };

	if (body.type === "signal") {
		await prisma.report_company_signal_scope.update({
			where: { id: BigInt(body.scopeId) },
			data: { is_active: body.isActive, updated_at: new Date() },
		});
		return NextResponse.json({ success: true });
	}

	if (body.type === "tier") {
		await prisma.$executeRaw`
			UPDATE report_company_signal_scope rcss
			SET is_active = ${body.activate}, updated_at = NOW()
			FROM signal_definitions sd
			JOIN sm_signal_subcategories sub ON sub.id = sd.sm_signal_subcategory_id
			JOIN sm_signal_categories cat ON cat.id = sub.sm_signal_category_id AND cat.tier = ${body.tier}
			WHERE rcss.signal_definition_id = sd.id
			  AND rcss.report_id = ${body.reportId}
			  AND rcss.company_id = ${body.companyId}
		`;
		return NextResponse.json({ success: true });
	}

	return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
