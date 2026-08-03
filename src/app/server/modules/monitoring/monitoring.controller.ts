/** biome-ignore-all lint/complexity/noStaticOnlyClass: Controller methods are grouped statically to match existing module conventions. */
import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import type { MonitoringSettings } from "../app-settings/app-settings.service";
import { MonitoringService } from "./monitoring.service";

function errorResponse(error: unknown): NextResponse {
	const message =
		error instanceof Error ? error.message : "Internal server error";
	return NextResponse.json({ success: false, error: message }, { status: 500 });
}

export class MonitoringController {
	static async runs(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const data = await MonitoringService.getRuns();
			return NextResponse.json({ success: true, data });
		} catch (error: unknown) {
			console.error("Error fetching monitoring runs:", error);
			return errorResponse(error);
		}
	}

	static async getSettings(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const data = await MonitoringService.getSettings();
			return NextResponse.json({ success: true, data });
		} catch (error: unknown) {
			console.error("Error fetching monitoring settings:", error);
			return errorResponse(error);
		}
	}

	static async updateSettings(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const body = (await request.json()) as Partial<MonitoringSettings>;
			const validation = MonitoringController.validateSettings(body);
			if (validation) {
				return NextResponse.json(
					{ success: false, error: validation },
					{ status: 400 },
				);
			}

			const data = await MonitoringService.updateSettings(
				body as MonitoringSettings,
			);
			return NextResponse.json({ success: true, data });
		} catch (error: unknown) {
			console.error("Error updating monitoring settings:", error);
			return errorResponse(error);
		}
	}

	private static validateSettings(
		body: Partial<MonitoringSettings>,
	): string | null {
		if (
			!Number.isFinite(body.stuckAfterMinutes) ||
			(body.stuckAfterMinutes as number) < 1
		) {
			return "stuckAfterMinutes must be a positive number";
		}

		if (
			!Number.isFinite(body.lookbackHours) ||
			(body.lookbackHours as number) < 1
		) {
			return "lookbackHours must be a positive number";
		}

		return null;
	}
}
