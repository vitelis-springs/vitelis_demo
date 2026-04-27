/** biome-ignore-all lint/complexity/noStaticOnlyClass: <project> */
import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import {
	type CompanyLevelReportsOrchestratorSettings,
	AppSettingsService,
} from "./app-settings.service";

export class AppSettingsController {
	static async getClrOrchestrator(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const settings = await AppSettingsService.getClrOrchestrator();
			return NextResponse.json({ success: true, data: settings });
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Internal server error";
			return NextResponse.json(
				{ success: false, error: message },
				{ status: 500 },
			);
		}
	}

	static async updateClrOrchestrator(
		request: NextRequest,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const body =
				(await request.json()) as CompanyLevelReportsOrchestratorSettings;
			const settings = await AppSettingsService.updateClrOrchestrator(body);
			return NextResponse.json({ success: true, data: settings });
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Internal server error";
			return NextResponse.json(
				{ success: false, error: message },
				{ status: 500 },
			);
		}
	}
}
