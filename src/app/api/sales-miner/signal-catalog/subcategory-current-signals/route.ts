import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

function serializeBigInt<T>(value: T): T {
	return JSON.parse(
		JSON.stringify(value, (_key, v) =>
			typeof v === "bigint" ? v.toString() : v,
		),
	) as T;
}

const signalSelect = {
	id: true,
	code: true,
	name: true,
	description: true,
	is_active: true,
	created_at: true,
	signal_definition_gics_codes: { select: { gics_code: true } },
};

export async function GET(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const subcategoryIdParam = request.nextUrl.searchParams.get("subcategoryId");
	if (!subcategoryIdParam) {
		return NextResponse.json(
			{ success: false, error: "subcategoryId is required" },
			{ status: 400 },
		);
	}

	try {
		const subcategoryId = BigInt(subcategoryIdParam);

		const [subcategory, junctionRows] = await prisma.$transaction([
			prisma.signal_categories.findUnique({
				where: { id: subcategoryId },
				select: { signal_definition_id: true },
			}),
			prisma.signal_category_signal_definitions.findMany({
				where: { signal_category_id: subcategoryId },
				select: { signal_definition_id: true },
				orderBy: { created_at: "asc" },
			}),
		]);

		const universalId = subcategory?.signal_definition_id ?? null;
		const industryIds = junctionRows.map((r) => r.signal_definition_id);

		const allIds = [
			...(universalId !== null ? [universalId] : []),
			...industryIds,
		];

		if (allIds.length === 0) {
			return NextResponse.json({ success: true, data: [] });
		}

		const [signals, versionCounts] = await Promise.all([
			prisma.signal_definitions.findMany({
				where: { id: { in: allIds }, is_active: true },
				select: signalSelect,
			}),
			prisma.signal_definitions.groupBy({
				by: ["code"],
				where: { category_id: subcategoryId, is_active: true },
				_count: { id: true },
			}),
		]);

		const versionsMap = new Map(
			versionCounts.map((r) => [r.code, r._count.id]),
		);
		const industryIdSet = new Set(industryIds.map(String));

		const items = allIds
			.map((id) => signals.find((s) => s.id === id))
			.filter((s): s is NonNullable<typeof s> => s !== null && s !== undefined)
			.map((s) => ({
				id: s.id,
				code: s.code,
				name: s.name,
				description: s.description,
				is_active: s.is_active,
				created_at: s.created_at,
				gics_codes: s.signal_definition_gics_codes.map((g) => g.gics_code),
				link_type: industryIdSet.has(s.id.toString())
					? ("industry" as const)
					: ("universal" as const),
				versions_count: versionsMap.get(s.code) ?? 1,
			}));

		return NextResponse.json({ success: true, data: serializeBigInt(items) });
	} catch (error) {
		console.error("subcategory-current-signals GET failed", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to load signals",
			},
			{ status: 500 },
		);
	}
}
