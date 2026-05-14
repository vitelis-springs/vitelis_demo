import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../../lib/auth";
import prisma from "../../../../../../lib/prisma";

function serializeBigInt<T>(value: T): T {
	return JSON.parse(
		JSON.stringify(value, (_key, v) =>
			typeof v === "bigint" ? v.toString() : v,
		),
	) as T;
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const { id } = await params;
	const body = (await request.json().catch(() => null)) as unknown;

	if (
		typeof body !== "object" ||
		body === null ||
		Array.isArray(body) ||
		typeof (body as Record<string, unknown>).isActive !== "boolean"
	) {
		return NextResponse.json(
			{ success: false, error: "isActive (boolean) is required" },
			{ status: 400 },
		);
	}

	const isActive = (body as Record<string, unknown>).isActive as boolean;

	try {
		const signal = await prisma.signal_definitions.update({
			where: { id: BigInt(id) },
			data: { is_active: isActive, updated_at: new Date() },
			select: { id: true, is_active: true, updated_at: true },
		});
		return NextResponse.json({ success: true, data: serializeBigInt(signal) });
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "P2025"
		) {
			return NextResponse.json(
				{ success: false, error: "Signal not found" },
				{ status: 404 },
			);
		}
		throw error;
	}
}
