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

	const sp = request.nextUrl.searchParams;
	const q = sp.get("q")?.trim() ?? "";
	const page = Math.max(1, Number(sp.get("page") ?? "1"));
	const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? "20")));

	const where = q
		? {
				OR: [
					{ name: { contains: q, mode: "insensitive" as const } },
					{ external_id: { contains: q, mode: "insensitive" as const } },
				],
			}
		: {};

	const [items, total] = await Promise.all([
		prisma.smSignalCategory.findMany({
			where,
			include: { _count: { select: { subcategories: true } } },
			orderBy: { external_id: "asc" },
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.smSignalCategory.count({ where }),
	]);

	return NextResponse.json({
		success: true,
		data: { items: serialize(items), total, page, limit },
	});
}
