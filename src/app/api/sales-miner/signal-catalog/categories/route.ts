import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

function serializeBigInt<T>(value: T): T {
	return JSON.parse(
		JSON.stringify(value, (_key, nestedValue) =>
			typeof nestedValue === "bigint" ? nestedValue.toString() : nestedValue,
		),
	) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const q = request.nextUrl.searchParams.get("q")?.trim() || undefined;
	const parentIdParam = request.nextUrl.searchParams.get("parentId");
	const isSubcategoryRequest = parentIdParam !== null;
	const parentIdBigInt = isSubcategoryRequest ? BigInt(parentIdParam) : null;

	const page = Math.max(
		1,
		Number(request.nextUrl.searchParams.get("page") ?? 1),
	);
	const limit = Math.min(
		100,
		Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 20)),
	);
	const offset = (page - 1) * limit;

	const where = {
		is_gc: true,
		parent_id: parentIdBigInt,
		...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
	};

	try {
		const [total, items] = await prisma.$transaction([
			prisma.signal_categories.count({ where }),
			prisma.signal_categories.findMany({
				where,
				select: {
					id: true,
					code: true,
					name: true,
					tier: true,
					description: true,
					is_active: true,
					is_gc: true,
					parent_id: true,
					signal_definition_id: true,
					created_at: true,
					updated_at: true,
					signal_definitions_signal_categories_signal_definition_idTosignal_definitions:
						{ select: { name: true, description: true, created_at: true } },
					_count: {
						select: {
							other_signal_categories: true,
							signal_definitions: { where: { is_active: true } },
						},
					},
				},
				orderBy: isSubcategoryRequest
					? [{ name: "asc" }]
					: [{ tier: "asc" }, { name: "asc" }],
				...(isSubcategoryRequest ? {} : { skip: offset, take: limit }),
			}),
		]);

		const mappedItems = serializeBigInt(
			items.map((item) => ({
				id: item.id,
				code: item.code,
				name: item.name,
				tier: item.tier,
				description: item.description,
				is_active: item.is_active,
				is_gc: item.is_gc,
				parent_id: item.parent_id,
				parent_name: null,
				signal_definition_id: item.signal_definition_id,
				signal_definition_name:
					item
						.signal_definitions_signal_categories_signal_definition_idTosignal_definitions
						?.name ?? null,
				signal_definition_description:
					item
						.signal_definitions_signal_categories_signal_definition_idTosignal_definitions
						?.description ?? null,
				signal_definition_created_at:
					item
						.signal_definitions_signal_categories_signal_definition_idTosignal_definitions
						?.created_at ?? null,
				child_count: item._count.other_signal_categories,
				versions_count: item._count.signal_definitions,
				created_at: item.created_at,
				updated_at: item.updated_at,
			})),
		);

		return NextResponse.json({
			success: true,
			data: {
				items: mappedItems,
				parentItems: mappedItems,
				optionItems: mappedItems,
				parentOptionItems: mappedItems,
				total,
				page: isSubcategoryRequest ? 1 : page,
				limit: isSubcategoryRequest ? items.length : limit,
			},
		});
	} catch (error) {
		console.error("Signal catalog categories GET failed", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to load categories",
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const body = (await request.json().catch(() => null)) as unknown;
	if (!isRecord(body)) {
		return NextResponse.json(
			{ success: false, error: "Invalid request body" },
			{ status: 400 },
		);
	}

	const code = normalizeString(body.code);
	const name = normalizeString(body.name);
	const description = normalizeString(body.description);
	const tier = Number(body.tier ?? 1);
	const parentId =
		body.parentId === null || body.parentId === undefined
			? null
			: BigInt(String(body.parentId));
	const signalDefinitionId =
		body.signalDefinitionId === null || body.signalDefinitionId === undefined
			? null
			: BigInt(String(body.signalDefinitionId));
	const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

	if (!code || !name || !Number.isInteger(tier) || tier < 1) {
		return NextResponse.json(
			{ success: false, error: "code, name and valid tier are required" },
			{ status: 400 },
		);
	}

	const row = await prisma.signal_categories.create({
		data: {
			code,
			name,
			description,
			tier,
			parent_id: parentId,
			signal_definition_id: signalDefinitionId,
			is_active: isActive,
			is_gc: true,
		},
	});

	return NextResponse.json({
		success: true,
		data: serializeBigInt(row),
	});
}
