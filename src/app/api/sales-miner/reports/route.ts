import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { optimizeSignalScope } from "../../../../lib/sm-optimize-signal-scope";
import { resetToDefaultSignalScope } from "../../../../lib/sm-reset-default-signals";

export async function POST(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

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
	const selectedCompanies = Array.isArray(companyIds) ? companyIds : [];

	// Create report_settings, reports, report_steps, and report_companies as a
	// single all-or-nothing unit, so a failure partway through (e.g. a bad
	// step/company row) never leaves an orphaned report behind.
	const { report } = await prisma.$transaction(async (tx) => {
		const reportSettings = await tx.report_settings.create({
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

		const report = await tx.reports.create({
			data: {
				id: nextReportId,
				name: name.trim(),
				description: description?.trim() || null,
				report_type: "sales_miner",
				report_settings_id: reportSettings.id,
			},
		});

		if (template.steps.length > 0) {
			await tx.report_steps.createMany({
				data: template.steps.map((s) => ({
					report_id: report.id,
					step_id: s.step_id,
					step_order: s.step_order,
				})),
			});
		}

		if (selectedCompanies.length > 0) {
			await tx.report_companies.createMany({
				data: selectedCompanies.map((companyId, i) => ({
					id: nextRcId + i,
					report_id: report.id,
					company_id: companyId,
				})),
			});
		}

		return { reportSettings, report };
	});

	if (selectedCompanies.length > 0) {
		const useOptimizedSignalCatalog =
			extraSettings?.use_optimized_signal_catalog === true;

		if (useOptimizedSignalCatalog) {
			// Seed the signal scope via Optimize (same procedure as the "Optimize
			// signals" button), using the target count supplied on the
			// create-report form.
			const globalCatalogSignalCountRaw =
				extraSettings?.global_catalog_signal_count;
			const globalCatalogSignalCount =
				typeof globalCatalogSignalCountRaw === "number" &&
				globalCatalogSignalCountRaw > 0
					? globalCatalogSignalCountRaw
					: 25;

			await optimizeSignalScope(report.id, globalCatalogSignalCount);
		} else {
			// Seed the full default signal catalog (same procedure as the "Reset
			// to default" button) — no statistics-based trimming.
			await resetToDefaultSignalScope(report.id);
		}
	}

	return NextResponse.json(
		{ data: { id: report.id, name: report.name } },
		{ status: 201 },
	);
}
