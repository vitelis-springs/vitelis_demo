import { NextRequest, NextResponse } from "next/server";
import { N8NService } from "./n8n.service";
import { extractAdminFromRequest } from "../../../../lib/auth";

export class N8NController {
	static async startBizMiner(request: NextRequest): Promise<NextResponse> {
		try {
			const body = await request.json();
			const {
				companyName,
				businessLine,
				country,
				useCase,
				timeline,
				language,
				additionalInformation,
				url,
				competitors,
			} = body;

			if (!companyName || !businessLine || !country || !useCase || !timeline) {
				return NextResponse.json(
					{
						success: false,
						error:
							"Missing required fields: companyName, businessLine, country, useCase, timeline",
					},
					{ status: 400 },
				);
			}

			const data = await N8NService.startBizMinerWorkflow({
				companyName,
				businessLine,
				country,
				useCase,
				timeline,
				language,
				additionalInformation,
				url,
				competitors,
			});

			return NextResponse.json(data);
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "N8N API request failed";
			console.error("❌ N8NController.startBizMiner:", message);
			return NextResponse.json(
				{ success: false, error: message },
				{ status: 500 },
			);
		}
	}

	static async startSalesMiner(request: NextRequest): Promise<NextResponse> {
		try {
			const body = await request.json();
			const {
				companyName,
				businessLine,
				country,
				useCase,
				timeline,
				language,
				additionalInformation,
				url,
				competitors,
			} = body;

			if (
				!companyName ||
				!businessLine ||
				!country ||
				!useCase ||
				!timeline ||
				!language
			) {
				return NextResponse.json(
					{
						success: false,
						error:
							"Missing required fields: companyName, businessLine, country, useCase, timeline, language",
					},
					{ status: 400 },
				);
			}

			const data = await N8NService.startSalesMinerWorkflow({
				companyName,
				businessLine,
				country,
				useCase,
				timeline,
				language,
				additionalInformation,
				url,
				competitors,
			});

			return NextResponse.json(data);
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "N8N API request failed";
			console.error("❌ N8NController.startSalesMiner:", message);
			return NextResponse.json(
				{ success: false, error: message },
				{ status: 500 },
			);
		}
	}

	static async startVitelisSales(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const body = await request.json();
			const { companyName, url, useCase, industry_id } = body;

			if (!companyName || !url || industry_id === undefined) {
				return NextResponse.json(
					{
						success: false,
						error: "Missing required fields: companyName, url, industry_id",
					},
					{ status: 400 },
				);
			}

			const data = await N8NService.startVitelisSalesWorkflow({
				companyName,
				url,
				useCase,
				industry_id: Number(industry_id),
			});

			return NextResponse.json(data);
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "N8N API request failed";
			console.error("❌ N8NController.startVitelisSales:", message);
			return NextResponse.json(
				{ success: false, error: message },
				{ status: 500 },
			);
		}
	}

	static async generateXlsxReport(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const body = (await request.json()) as {
				company_ids?: unknown;
				report_ids?: unknown;
			};

			const companyIds = Array.isArray(body.company_ids)
				? body.company_ids.filter((id): id is number => typeof id === "number")
				: [];
			const reportIds = Array.isArray(body.report_ids)
				? body.report_ids.filter((id): id is number => typeof id === "number")
				: [];

			if (companyIds.length === 0 || reportIds.length === 0) {
				return NextResponse.json(
					{
						success: false,
						error: "company_ids and report_ids must be non-empty arrays",
					},
					{ status: 400 },
				);
			}

			const backendUrl = process.env.BACKEND_URL;
			if (!backendUrl) {
				return NextResponse.json(
					{ success: false, error: "BACKEND_URL is not configured" },
					{ status: 500 },
				);
			}

			const upstream = await fetch(
				`${backendUrl}/generate-company-reports-v3`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						company_ids: companyIds,
						report_ids: reportIds,
					}),
				},
			);

			if (!upstream.ok) {
				return NextResponse.json(
					{ success: false, error: "Backend request failed" },
					{ status: upstream.status },
				);
			}

			return new NextResponse(upstream.body, {
				status: 200,
				headers: {
					"Content-Type":
						upstream.headers.get("Content-Type") ??
						"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"Content-Disposition":
						upstream.headers.get("Content-Disposition") ??
						`attachment; filename="report_${Date.now()}.xlsx"`,
				},
			});
		} catch (error: unknown) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to generate XLSX report";
			console.error("❌ N8NController.generateXlsxReport:", message);
			return NextResponse.json(
				{ success: false, error: message },
				{ status: 500 },
			);
		}
	}

	static async getExecution(
		request: NextRequest,
		executionId: string,
	): Promise<NextResponse> {
		try {
			if (!executionId) {
				return NextResponse.json(
					{ success: false, message: "Execution ID is required" },
					{ status: 400 },
				);
			}

			const { searchParams } = new URL(request.url);
			const type = searchParams.get("type");

			const data = await N8NService.getExecutionDetails(executionId, type);
			return NextResponse.json({ success: true, data });
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Internal server error";
			console.error("❌ N8NController.getExecution:", message);

			const status = message.startsWith("N8N API error:")
				? parseInt(message.split(": ")[1] || "500")
				: 500;
			return NextResponse.json({ success: false, message }, { status });
		}
	}
}
