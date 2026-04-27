/** biome-ignore-all lint/complexity/noStaticOnlyClass: < project soecific> */
import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import { N8NTasksService } from "./n8n-tasks.service";

export class N8NTasksController {
	static async list(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const { searchParams } = new URL(request.url);
			const reportIdParam = searchParams.get("reportId");

			const reportId = reportIdParam ? Number(reportIdParam) : undefined;

			const tasks = await N8NTasksService.list(reportId);

			return NextResponse.json({ success: true, data: tasks });
		} catch (error: unknown) {
			console.error("Error fetching tasks:", error);
			const message =
				error instanceof Error ? error.message : "Internal server error";
			return NextResponse.json(
				{ success: false, error: message },
				{ status: 500 },
			);
		}
	}

	static async create(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const body = (await request.json()) as Record<string, unknown>;
			const { reportId, targetCompany, competitors, id } = body;

			if (!reportId || !targetCompany || !Array.isArray(competitors)) {
				return NextResponse.json(
					{
						success: false,
						error:
							"Missing required fields: reportId, targetCompany, competitors",
					},
					{ status: 400 },
				);
			}

			const task = await N8NTasksService.createCompanyLevelReport({
				reportId: Number(reportId),
				targetCompany: Number(targetCompany),
				competitors: competitors.map(Number),
				id: id ? Number(id) : Number(reportId),
			});

			return NextResponse.json({ success: true, data: task }, { status: 201 });
		} catch (error: unknown) {
			console.error("Error creating task:", error);
			const message =
				error instanceof Error ? error.message : "Internal server error";
			return NextResponse.json(
				{ success: false, error: message },
				{ status: 500 },
			);
		}
	}

	static async start(request: NextRequest, id: string): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const result = await N8NTasksService.start(Number(id));
			return NextResponse.json({ success: true, data: result });
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Internal server error";

			return NextResponse.json(
				{ success: false, error: message },
				{ status: 500 },
			);
		}
	}

	static async stop(request: NextRequest, id: string): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			await N8NTasksService.stop(Number(id));
			return NextResponse.json({ success: true });
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Internal server error";
			return NextResponse.json(
				{ success: false, error: message },
				{ status: 500 },
			);
		}
	}

	static async updateStatus(
		request: NextRequest,
		id: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const body = (await request.json()) as Record<string, unknown>;
			const { status } = body;

			if (
				typeof status !== "string" ||
				!["PENDING", "PROCESSING", "DONE", "ERROR"].includes(status)
			) {
				return NextResponse.json(
					{ success: false, error: "Invalid status value" },
					{ status: 400 },
				);
			}

			const task = await N8NTasksService.updateStatus(
				Number(id),
				status as "PENDING" | "PROCESSING" | "DONE" | "ERROR",
			);
			return NextResponse.json({ success: true, data: task });
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Internal server error";
			return NextResponse.json(
				{ success: false, error: message },
				{ status: 500 },
			);
		}
	}

	static async deleteTask(
		request: NextRequest,
		id: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			await N8NTasksService.delete(Number(id));
			return NextResponse.json({ success: true });
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
