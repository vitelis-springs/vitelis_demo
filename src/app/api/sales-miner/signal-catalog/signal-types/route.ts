import { NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import type { NextRequest } from "next/server";

function serializeBigInt<T>(value: T): T {
	return JSON.parse(
		JSON.stringify(value, (_key, nestedValue) =>
			typeof nestedValue === "bigint" ? nestedValue.toString() : nestedValue,
		),
	) as T;
}

export async function GET(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const rows = await prisma.signal_types.findMany({
		select: {
			id: true,
			code: true,
			name: true,
			description: true,
			is_active: true,
			sort_order: true,
		},
		orderBy: [{ sort_order: "asc" }, { id: "asc" }],
	});

	return NextResponse.json({ success: true, data: serializeBigInt(rows) });
}
