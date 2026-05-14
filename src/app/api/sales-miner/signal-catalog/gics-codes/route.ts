import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export async function GET(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	try {
		const items = await prisma.gics_codes.findMany({
			where: { code: { not: "00000000" } },
			select: { code: true, name: true, level: true, parent_code: true },
			orderBy: [{ level: "asc" }, { code: "asc" }],
		});

		return NextResponse.json({ success: true, data: items });
	} catch (error) {
		console.error("GICS codes GET failed", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to load GICS codes",
			},
			{ status: 500 },
		);
	}
}
