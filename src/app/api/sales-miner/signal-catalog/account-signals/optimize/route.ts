import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../../lib/auth";
import {
	OptimizeSignalScopeError,
	optimizeSignalScope,
} from "../../../../../../lib/sm-optimize-signal-scope";

export async function POST(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const body = (await request.json()) as {
		reportId: number;
		targetCount: number;
		minSampleThreshold?: number;
		useProductTagFilter?: boolean;
	};
	const { reportId, targetCount, minSampleThreshold, useProductTagFilter } =
		body;

	if (!reportId || isNaN(reportId)) {
		return NextResponse.json(
			{ error: "reportId is required" },
			{ status: 400 },
		);
	}
	if (!targetCount || isNaN(targetCount) || targetCount <= 0) {
		return NextResponse.json(
			{ error: "targetCount must be a positive number" },
			{ status: 400 },
		);
	}

	try {
		const data = await optimizeSignalScope(reportId, targetCount, {
			minSampleThreshold,
			useProductTagFilter,
		});
		return NextResponse.json({ data });
	} catch (err) {
		if (err instanceof OptimizeSignalScopeError) {
			return NextResponse.json({ error: err.message }, { status: 400 });
		}
		throw err;
	}
}
