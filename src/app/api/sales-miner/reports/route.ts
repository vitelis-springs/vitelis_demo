import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { resetToDefaultSignalScope } from "../../../../lib/sm-reset-default-signals";

export async function POST(request: NextRequest) {
	const admin = await extractAdminFromRequest(request);
	if (!admin)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const body = (await request.json()) as {
		name: string;
		description?: string;
		customerId: number;
		templateId: number;
		windowFrom: string;
		windowTo: string;
		maxOpportunityCount: number;
		companyIds: number[];
		settings?: Record<string, unknown>;
	};

	const {
		name,
		description,
		customerId,
		templateId,
		windowFrom,
		windowTo,
		maxOpportunityCount,
		companyIds,
		settings: extraSettings,
	} = body;

	if (!name?.trim()) {
		return NextResponse.json({ error: "name is required" }, { status: 400 });
	}

	// Load template with its active steps
	const template = await prisma.report_step_templates.findUnique({
		where: { id: BigInt(templateId) },
		include: {
			steps: {
				where: { is_active: true },
				orderBy: { step_order: "asc" },
				select: { step_id: true, step_order: true },
			},
		},
	});

	if (!template) {
		return NextResponse.json({ error: "Template not found" }, { status: 404 });
	}

	const version = "3.1";

	// Generate IDs manually to avoid stale sequence issues
	const [maxRs, maxReport, maxRc] = await Promise.all([
		prisma.report_settings.aggregate({ _max: { id: true } }),
		prisma.reports.aggregate({ _max: { id: true } }),
		prisma.report_companies.aggregate({ _max: { id: true } }),
	]);
	const nextRsId = (maxRs._max.id ?? 0) + 1;
	const nextReportId = (maxReport._max.id ?? 0) + 1;
	const nextRcId = (maxRc._max.id ?? 0) + 1;

	// Create report_settings
	const reportSettings = await prisma.report_settings.create({
		data: {
			id: nextRsId,
			name: name.trim(),
			master_file_id: "",
			settings: {
				language: "en",
				...(extraSettings && typeof extraSettings === "object"
					? extraSettings
					: {}),
				window_from: windowFrom,
				window_to: windowTo,
				customer_id: customerId,
				version,
				max_opportunity_count: maxOpportunityCount,
			},
		},
	});

	// Create report
	const report = await prisma.reports.create({
		data: {
			id: nextReportId,
			name: name.trim(),
			description: description?.trim() || null,
			report_type: "sales_miner",
			report_settings_id: reportSettings.id,
		},
	});

	// Create report_steps from active template steps
	if (template.steps.length > 0) {
		await prisma.report_steps.createMany({
			data: template.steps.map((s) => ({
				report_id: report.id,
				step_id: s.step_id,
				step_order: s.step_order,
			})),
		});
	}

	// Create report_companies for selected companies
	const selectedCompanies = Array.isArray(companyIds) ? companyIds : [];
	if (selectedCompanies.length > 0) {
		await prisma.report_companies.createMany({
			data: selectedCompanies.map((companyId, i) => ({
				id: nextRcId + i,
				report_id: report.id,
				company_id: companyId,
			})),
		});

		// Seed the default signal scope (per company GICS code) so the report
		// starts wired up the same way "Reset to default" on the signal-catalog
		// page would leave it.
		await resetToDefaultSignalScope(report.id);
	}

	return NextResponse.json(
		{ data: { id: report.id, name: report.name } },
		{ status: 201 },
	);
}
