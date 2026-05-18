import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../../../lib/auth";
import prisma from "../../../../../../../lib/prisma";

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
		typeof (body as Record<string, unknown>).subcategoryId !== "string"
	) {
		return NextResponse.json(
			{ success: false, error: "subcategoryId (string) is required" },
			{ status: 400 },
		);
	}

	const signalId = BigInt(id);
	const subcategoryId = BigInt(
		(body as Record<string, unknown>).subcategoryId as string,
	);

	try {
		const [signal, newVersionGics] = await Promise.all([
			prisma.signal_definitions.findUnique({
				where: { id: signalId },
				select: { code: true },
			}),
			prisma.signal_definition_gics_codes.findMany({
				where: { signal_definition_id: signalId },
				select: { gics_code: true },
			}),
		]);

		if (!signal) {
			return NextResponse.json(
				{ success: false, error: "Signal not found" },
				{ status: 404 },
			);
		}

		const newGicsCodes = newVersionGics.map((r) => r.gics_code);
		if (newGicsCodes.length > 0) {
			const existingCurrent =
				await prisma.signal_category_signal_definitions.findMany({
					where: {
						signal_category_id: subcategoryId,
						code: { not: signal.code },
					},
					select: { signal_definition_id: true },
				});
			if (existingCurrent.length > 0) {
				const conflicting = await prisma.signal_definition_gics_codes.findFirst(
					{
						where: {
							signal_definition_id: {
								in: existingCurrent.map((r) => r.signal_definition_id),
							},
							gics_code: { in: newGicsCodes },
						},
						select: { gics_code: true },
					},
				);
				if (conflicting) {
					return NextResponse.json(
						{
							success: false,
							error: `GICS code ${conflicting.gics_code} is already covered by another current signal in this subcategory`,
						},
						{ status: 409 },
					);
				}
			}
		}

		await prisma.$transaction([
			prisma.signal_category_signal_definitions.deleteMany({
				where: { signal_category_id: subcategoryId, code: signal.code },
			}),
			prisma.signal_category_signal_definitions.create({
				data: {
					signal_category_id: subcategoryId,
					signal_definition_id: signalId,
					code: signal.code,
				},
			}),
		]);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("set-current PATCH failed", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to set current version",
			},
			{ status: 500 },
		);
	}
}
