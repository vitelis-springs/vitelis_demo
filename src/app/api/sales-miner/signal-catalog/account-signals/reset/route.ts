import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../../lib/auth";
import { resetToDefaultSignalScope } from "../../../../../../lib/sm-reset-default-signals";

export async function POST(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

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
