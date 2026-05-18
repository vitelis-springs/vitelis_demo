import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../../lib/auth";
import prisma from "../../../../../../lib/prisma";

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

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const { id } = await params;
	const categoryId = BigInt(id);

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
	const tierRaw =
		body.tier !== null && body.tier !== undefined ? Number(body.tier) : null;
	const tier = tierRaw !== null && tierRaw >= 1 ? tierRaw : null;
	const parentId =
		body.parentId === null || body.parentId === undefined
			? null
			: BigInt(String(body.parentId));
	const signalDefinitionId =
		body.signalDefinitionId === null || body.signalDefinitionId === undefined
			? null
			: BigInt(String(body.signalDefinitionId));
	const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

	if (!code || !name) {
		return NextResponse.json(
			{ success: false, error: "code and name are required" },
			{ status: 400 },
		);
	}

	if (parentId !== null && parentId === categoryId) {
		return NextResponse.json(
			{ success: false, error: "Category cannot be its own parent" },
			{ status: 400 },
		);
	}

	try {
		const row = await prisma.signal_categories.update({
			where: { id: categoryId },
			data: {
				code,
				name,
				description,
				...(tier !== null ? { tier } : {}),
				parent_id: parentId,
				signal_definition_id: signalDefinitionId,
				is_active: isActive,
				is_gc: true,
				updated_at: new Date(),
			},
			select: {
				id: true,
				code: true,
				name: true,
				description: true,
				is_active: true,
				is_gc: true,
				tier: true,
				parent_id: true,
				signal_definition_id: true,
				created_at: true,
				updated_at: true,
			},
		});

		return NextResponse.json({ success: true, data: serializeBigInt(row) });
	} catch (error: unknown) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "P2025"
		) {
			return NextResponse.json(
				{ success: false, error: "Category not found" },
				{ status: 404 },
			);
		}
		throw error;
	}
}
