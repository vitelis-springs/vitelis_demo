import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function GET() {
	const templates = await prisma.report_step_templates.findMany({
		where: { is_active: true },
		orderBy: { id: "asc" },
		select: { id: true, code: true, name: true },
	});

	return NextResponse.json({
		data: templates.map((t) => ({
			id: Number(t.id),
			code: t.code,
			name: t.name,
		})),
	});
}
