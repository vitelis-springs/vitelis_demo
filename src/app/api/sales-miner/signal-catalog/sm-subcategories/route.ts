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

	const categoryId = request.nextUrl.searchParams.get("categoryId");
	if (!categoryId) {
		return NextResponse.json(
			{ success: false, error: "categoryId is required" },
			{ status: 400 },
		);
	}

	const items = await prisma.smSignalSubcategory.findMany({
		where: { sm_signal_category_id: BigInt(categoryId) },
		include: {
			current_version: true,
			_count: {
				select: { versions: true, industries: { where: { status: true } } },
			},
		},
		orderBy: { external_id: "asc" },
	});

	return NextResponse.json({ success: true, data: serialize(items) });
}
