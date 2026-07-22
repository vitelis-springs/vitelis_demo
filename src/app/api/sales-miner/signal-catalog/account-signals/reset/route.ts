import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../../lib/auth";
import { resetToDefaultSignalScope } from "../../../../../../lib/sm-reset-default-signals";

export async function POST(request: NextRequest) {
	const admin = await extractAdminFromRequest(request);
	if (!admin)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const body = (await request.json()) as { reportId: number };
	const { reportId } = body;
	if (!reportId || isNaN(reportId)) {
		return NextResponse.json(
			{ error: "reportId is required" },
			{ status: 400 },
		);
	}

	const data = await resetToDefaultSignalScope(reportId);

	return NextResponse.json({ data });
}
