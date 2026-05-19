import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../../lib/auth";
import prisma from "../../../../../../lib/prisma";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const admin = await extractAdminFromRequest(request);
	if (!admin)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = await params;
	const customerId = Number(id);
	if (!customerId || isNaN(customerId)) {
		return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
	}

	const accounts = await prisma.customer_accounts.findMany({
		where: { customer_id: BigInt(customerId), is_active: true },
		include: { companies: { select: { id: true, name: true } } },
		orderBy: { companies: { name: "asc" } },
	});

	return NextResponse.json({
		data: accounts.map((a) => ({
			companyId: a.company_id,
			name: a.companies.name,
		})),
	});
}
