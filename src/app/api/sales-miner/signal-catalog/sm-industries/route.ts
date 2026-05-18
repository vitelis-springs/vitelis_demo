import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

function serialize<T>(v: T): T {
	return JSON.parse(
		JSON.stringify(v, (_, val) =>
			typeof val === "bigint" ? val.toString() : val,
		),
	) as T;
}

export async function GET(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const subcategoryId = request.nextUrl.searchParams.get("subcategoryId");
	if (!subcategoryId) {
		return NextResponse.json(
			{ success: false, error: "subcategoryId is required" },
			{ status: 400 },
		);
	}

	const items = await prisma.smSignalSubcategoryIndustry.findMany({
		where: { sm_signal_subcategory_id: BigInt(subcategoryId) },
		include: { current_instruction: true },
		orderBy: { gics_code: "asc" },
	});

	return NextResponse.json({ success: true, data: serialize(items) });
}
