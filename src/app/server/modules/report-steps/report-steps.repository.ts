import { Prisma, report_status_enum } from "../../../../generated/prisma";
import prisma from "../../../../lib/prisma";

export class ReportStepsRepository {
	// ===== report_generation_steps (довідник) =====

	static async getAllGenerationSteps() {
		return prisma.report_generation_steps.findMany({
			orderBy: { id: "asc" },
		});
	}

	static async getGenerationStepById(id: number) {
		return prisma.report_generation_steps.findUnique({
			where: { id },
		});
	}

	static async updateGenerationStep(
		stepId: number,
		data: {
			name?: string;
			url?: string;
			dependency?: string | null;
			report_type?: string | null;
			settings?: object | null;
		},
	) {
		return prisma.report_generation_steps.update({
			where: { id: stepId },
			data: {
				...(data.name !== undefined ? { name: data.name } : {}),
				...(data.url !== undefined ? { url: data.url } : {}),
				...(data.dependency !== undefined
					? { dependency: data.dependency }
					: {}),
				...(data.report_type !== undefined
					? { report_type: data.report_type }
					: {}),
				...(data.settings !== undefined
					? { settings: data.settings ?? Prisma.DbNull }
					: {}),
			},
		});
	}

	// ===== report_steps (які степи в репорті) =====

	static async getStepsByReportId(reportId: number) {
		return prisma.report_steps.findMany({
			where: { report_id: reportId },
			include: { report_generation_steps: true },
			orderBy: { step_order: "asc" },
		});
	}

	static async createStep(data: {
		report_id: number;
		step_id: number;
		step_order: number;
	}) {
		return prisma.report_steps.create({ data });
	}

	static async deleteStep(reportId: number, stepId: number) {
		return prisma.report_steps.delete({
			where: { report_id_step_id: { report_id: reportId, step_id: stepId } },
		});
	}

	static async updateStepOrder(
		reportId: number,
		stepId: number,
		newOrder: number,
	) {
		return prisma.report_steps.update({
			where: { report_id_step_id: { report_id: reportId, step_id: stepId } },
			data: { step_order: newOrder },
		});
	}

	static async reorderSteps(reportId: number, orderedStepIds: number[]) {
		return prisma.$transaction(
			orderedStepIds.map((stepId, index) =>
				prisma.report_steps.update({
					where: {
						report_id_step_id: { report_id: reportId, step_id: stepId },
					},
					data: { step_order: index + 1 },
				}),
			),
		);
	}

	// ===== report_step_statuses =====

	static async getStatusesByReportAndCompany(
		reportId: number,
		companyId: number,
	) {
		return prisma.report_step_statuses.findMany({
			where: { report_id: reportId, company_id: companyId },
			include: { report_generation_steps: true },
			orderBy: { step_id: "asc" },
		});
	}

	static async upsertStatus(data: {
		report_id: number;
		company_id: number;
		step_id: number;
		status: report_status_enum;
		metadata?: unknown;
	}) {
		return prisma.report_step_statuses.upsert({
			where: {
				report_id_company_id_step_id: {
					report_id: data.report_id,
					company_id: data.company_id,
					step_id: data.step_id,
				},
			},
			update: {
				status: data.status,
				metadata: data.metadata as object | undefined,
				updated_at: new Date(),
			},
			create: {
				report_id: data.report_id,
				company_id: data.company_id,
				step_id: data.step_id,
				status: data.status,
				metadata: data.metadata as object | undefined,
			},
		});
	}

	static async bulkUpdateStatuses(
		reportId: number,
		companyId: number,
		updates: Array<{ step_id: number; status: report_status_enum }>,
	) {
		return prisma.$transaction(
			updates.map((u) =>
				prisma.report_step_statuses.upsert({
					where: {
						report_id_company_id_step_id: {
							report_id: reportId,
							company_id: companyId,
							step_id: u.step_id,
						},
					},
					update: {
						status: u.status,
						updated_at: new Date(),
					},
					create: {
						report_id: reportId,
						company_id: companyId,
						step_id: u.step_id,
						status: u.status,
					},
				}),
			),
		);
	}

	// ===== Steps Matrix (company x step статуси) =====

	static async getStepsMatrix(reportId: number) {
		// Отримуємо всі компанії репорту
		const companies = await prisma.report_companies.findMany({
			where: { report_id: reportId },
			include: { companies: true },
		});

		// Отримуємо всі степи репорту
		const steps = await prisma.report_steps.findMany({
			where: { report_id: reportId },
			include: { report_generation_steps: true },
			orderBy: { step_order: "asc" },
		});

		// Отримуємо всі статуси
		const statuses = await prisma.report_step_statuses.findMany({
			where: { report_id: reportId },
		});

		// Формуємо матрицю
		const statusMap = new Map<string, report_status_enum>();
		for (const s of statuses) {
			statusMap.set(`${s.company_id}_${s.step_id}`, s.status);
		}

		return {
			companies: companies
				.filter((c) => c.companies)
				.map((c) => ({
					id: c.companies!.id,
					name: c.companies!.name,
				})),
			steps: steps.map((s) => ({
				id: s.step_id,
				name: s.report_generation_steps.name,
				order: s.step_order,
				url: s.report_generation_steps.url,
				dependency: s.report_generation_steps.dependency,
				settings: s.report_generation_steps.settings,
			})),
			matrix: companies
				.filter((c) => c.companies)
				.map((c) => ({
					companyId: c.companies!.id,
					statuses: steps.map((s) => ({
						stepId: s.step_id,
						status:
							statusMap.get(`${c.companies!.id}_${s.step_id}`) ||
							report_status_enum.PENDING,
					})),
				})),
		};
	}

	static async getStepsOverview(reportId: number) {
		return prisma.report_step_statuses.groupBy({
			by: ["step_id", "status"],
			where: { report_id: reportId },
			_count: { _all: true },
		});
	}

	// ===== report_orhestrator =====

	static async getOrchestratorByReportId(reportId: number) {
		return prisma.report_orhestrator.findUnique({
			where: { report_id: reportId },
		});
	}

	static async reportExists(reportId: number) {
		const report = await prisma.reports.findUnique({
			where: { id: reportId },
			select: { id: true },
		});
		return !!report;
	}

	static async getReportTypeById(reportId: number) {
		return prisma.reports.findUnique({
			where: { id: reportId },
			select: { id: true, report_type: true },
		});
	}

	static async getReportCompanyIds(reportId: number) {
		const rows = await prisma.report_companies.findMany({
			where: { report_id: reportId, company_id: { not: null } },
			select: { company_id: true },
		});
		return rows
			.map((r) => r.company_id)
			.filter((id): id is number => id !== null);
	}

	static async getConfiguredStepIds(reportId: number) {
		const rows = await prisma.report_steps.findMany({
			where: { report_id: reportId },
			select: { step_id: true },
		});
		return rows.map((r) => r.step_id);
	}

	/**
	 * Per configured step for ONE company: the step's workflow id plus that
	 * company's own status/start/end/exec_id (LEFT JOIN, so steps with no run
	 * for this company come back with nulls). Company-scoped so a cell shows
	 * the clicked company's execution, not another company's.
	 */
	static async getCompanyStepRuns(reportId: number, companyId: number) {
		return prisma.$queryRaw<
			Array<{
				step_id: number;
				name: string;
				workflow_id: string | null;
				status: string | null;
				start_time: Date | null;
				end_time: Date | null;
				exec_id: string | null;
			}>
		>`
			SELECT DISTINCT ON (rs.step_id)
				rs.step_id                     AS step_id,
				rgs.name                       AS name,
				rgs.workflow_id                AS workflow_id,
				s.status::text                 AS status,
				s.start_time                   AS start_time,
				s.end_time                     AS end_time,
				(s.metadata ->> 'exec_id')     AS exec_id
			FROM report_steps rs
			JOIN report_generation_steps rgs ON rgs.id = rs.step_id
			LEFT JOIN report_step_statuses s
				ON s.report_id = rs.report_id
				AND s.step_id = rs.step_id
				AND s.company_id = ${companyId}
			WHERE rs.report_id = ${reportId}
			ORDER BY rs.step_id
		`;
	}

	/**
	 * Per configured step: its n8n workflow id plus the latest status run
	 * (status/start/end/exec_id). Uses raw SQL because workflow_id,
	 * start_time and end_time are newer columns not in the generated client.
	 * report_steps can hold duplicate rows, so we DISTINCT ON (step_id).
	 */
	static async getReportStepRuns(reportId: number) {
		return prisma.$queryRaw<
			Array<{
				step_id: number;
				step_order: number;
				name: string;
				workflow_id: string | null;
				status: string | null;
				start_time: Date | null;
				end_time: Date | null;
				exec_id: string | null;
			}>
		>`
			SELECT DISTINCT ON (rs.step_id)
				rs.step_id                     AS step_id,
				rs.step_order                  AS step_order,
				rgs.name                       AS name,
				rgs.workflow_id                AS workflow_id,
				st.status::text                AS status,
				st.start_time                  AS start_time,
				st.end_time                    AS end_time,
				(st.metadata ->> 'exec_id')    AS exec_id
			FROM report_steps rs
			JOIN report_generation_steps rgs ON rgs.id = rs.step_id
			LEFT JOIN LATERAL (
				SELECT s.status, s.start_time, s.end_time, s.metadata
				FROM report_step_statuses s
				WHERE s.report_id = rs.report_id AND s.step_id = rs.step_id
				ORDER BY s.start_time DESC NULLS LAST, s.updated_at DESC NULLS LAST
				LIMIT 1
			) st ON true
			WHERE rs.report_id = ${reportId}
			ORDER BY rs.step_id, rs.step_order
		`;
	}

	/**
	 * Upsert an explicit set of (company_id, step_id) cells to one status in a
	 * single transaction — all or nothing. Rectangular and sparse selections
	 * both arrive here as a flat cell list. Callers must validate membership.
	 */
	static async bulkUpsertStatusCells(
		reportId: number,
		cells: Array<{ companyId: number; stepId: number }>,
		status: report_status_enum,
	) {
		const now = new Date();
		const ops = cells.map((cell) =>
			prisma.report_step_statuses.upsert({
				where: {
					report_id_company_id_step_id: {
						report_id: reportId,
						company_id: cell.companyId,
						step_id: cell.stepId,
					},
				},
				update: { status, updated_at: now },
				create: {
					report_id: reportId,
					company_id: cell.companyId,
					step_id: cell.stepId,
					status,
				},
			}),
		);
		await prisma.$transaction(ops);
		return ops.length;
	}

	// ===== report_step_templates (пресети кроків) =====

	static async listStepTemplates(includeInactive = false) {
		const templates = await prisma.report_step_templates.findMany({
			where: includeInactive ? undefined : { is_active: true },
			orderBy: { id: "asc" },
			select: {
				id: true,
				code: true,
				name: true,
				description: true,
				is_active: true,
				updated_at: true,
			},
		});

		if (templates.length === 0) return [];

		const counts = await prisma.report_step_template_steps.groupBy({
			by: ["template_id"],
			where: { template_id: { in: templates.map((t) => t.id) } },
			_count: { _all: true },
		});
		const countsByTemplateId = new Map(
			counts.map((row) => [row.template_id.toString(), row._count._all]),
		);

		return templates.map((template) => ({
			...template,
			step_count: countsByTemplateId.get(template.id.toString()) ?? 0,
		}));
	}

	static async getStepTemplateById(templateId: bigint) {
		const template = await prisma.report_step_templates.findUnique({
			where: { id: templateId },
		});
		if (!template) return null;

		const steps = await prisma.report_step_template_steps.findMany({
			where: { template_id: templateId },
			orderBy: { step_order: "asc" },
			select: {
				id: true,
				template_id: true,
				step_id: true,
				step_order: true,
				is_active: true,
				meta: true,
				created_at: true,
				updated_at: true,
			},
		});

		const generationSteps =
			steps.length === 0
				? []
				: await prisma.report_generation_steps.findMany({
						where: { id: { in: steps.map((s) => s.step_id) } },
					});
		const generationStepsById = new Map(
			generationSteps.map((step) => [step.id, step]),
		);

		return {
			...template,
			steps: steps.map((step) => ({
				...step,
				step: generationStepsById.get(step.step_id),
			})),
		};
	}

	static async getActiveTemplateSteps(templateId: bigint) {
		return prisma.report_step_template_steps.findMany({
			where: { template_id: templateId, is_active: true },
			orderBy: { step_order: "asc" },
			select: { step_id: true, step_order: true },
		});
	}

	static async createStepTemplate(input: {
		code: string;
		name: string;
		description: string | null;
		meta: object | null;
		steps: Array<{ step_id: number; step_order: number }>;
	}) {
		return prisma.$transaction(async (tx) => {
			const created = await tx.report_step_templates.create({
				data: {
					code: input.code,
					name: input.name,
					description: input.description,
					is_active: true,
					// meta is a non-nullable Json with a DB default of {}
					...(input.meta ? { meta: input.meta } : {}),
				},
			});
			if (input.steps.length > 0) {
				await tx.report_step_template_steps.createMany({
					data: input.steps.map((s) => ({
						template_id: created.id,
						step_id: s.step_id,
						step_order: s.step_order,
						is_active: true,
					})),
				});
			}
			const steps = await tx.report_step_template_steps.findMany({
				where: { template_id: created.id, is_active: true },
				orderBy: { step_order: "asc" },
				select: { step_id: true, step_order: true },
			});
			return { ...created, steps };
		});
	}

	static async updateStepTemplate(
		templateId: bigint,
		data: {
			name?: string;
			description?: string | null;
			is_active?: boolean;
			meta?: object | null;
		},
	) {
		return prisma.report_step_templates.update({
			where: { id: templateId },
			data: {
				...(data.name !== undefined ? { name: data.name } : {}),
				...(data.description !== undefined
					? { description: data.description }
					: {}),
				...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
				// meta is non-nullable; only overwrite when a value is provided
				...(data.meta ? { meta: data.meta } : {}),
				updated_at: new Date(),
			},
		});
	}

	/**
	 * Replace-only apply: wipe the report's configured steps and recreate them
	 * from the preset, atomically. Returns the resulting configured steps.
	 * Deleting report_steps cascade-deletes their report_step_statuses.
	 */
	static async replaceReportSteps(
		reportId: number,
		steps: Array<{ step_id: number; step_order: number }>,
	) {
		return prisma.$transaction(async (tx) => {
			await tx.report_steps.deleteMany({ where: { report_id: reportId } });
			if (steps.length > 0) {
				await tx.report_steps.createMany({
					data: steps.map((s) => ({
						report_id: reportId,
						step_id: s.step_id,
						step_order: s.step_order,
					})),
				});
			}
			return tx.report_steps.findMany({
				where: { report_id: reportId },
				include: { report_generation_steps: true },
				orderBy: { step_order: "asc" },
			});
		});
	}

	static async ensureOrchestrator(reportId: number) {
		const existing =
			await ReportStepsRepository.getOrchestratorByReportId(reportId);
		if (existing) {
			return { created: false, orchestrator: existing };
		}

		try {
			const created = await prisma.report_orhestrator.create({
				data: {
					report_id: reportId,
					status: report_status_enum.PENDING,
					metadata: {},
				},
			});
			return { created: true, orchestrator: created };
		} catch (error: unknown) {
			if (
				error instanceof Error &&
				error.message.includes("Unique constraint")
			) {
				const current =
					await ReportStepsRepository.getOrchestratorByReportId(reportId);
				if (current) {
					return { created: false, orchestrator: current };
				}
			}
			throw error;
		}
	}

	static async upsertOrchestrator(
		reportId: number,
		status: report_status_enum,
		metadata?: unknown,
	) {
		return prisma.report_orhestrator.upsert({
			where: { report_id: reportId },
			update: {
				status,
				metadata: metadata as object | undefined,
			},
			create: {
				report_id: reportId,
				status,
				metadata: metadata as object | undefined,
			},
		});
	}

	static async notifyEngineTick(reportId: number, instance: number) {
		const channel =
			instance === 1 ? "engine_tick" : `engine_tick_inst${instance}`;
		const payload = JSON.stringify({ report_id: reportId });
		await prisma.$executeRawUnsafe(
			`SELECT pg_notify($1, $2)`,
			channel,
			payload,
		);
	}

	static async updateOrchestratorStatus(
		reportId: number,
		status: report_status_enum,
	) {
		return prisma.report_orhestrator.update({
			where: { report_id: reportId },
			data: { status },
		});
	}

	// ===== Cost stats =====

	static async getReportCostSummary(reportId: number) {
		const rows = await prisma.$queryRaw<
			Array<{
				report_id: number;
				total_calls: bigint;
				calls_without_pricing: bigint;
				input_tokens: bigint;
				output_tokens: bigint;
				total_tokens: bigint;
				total_resource_units: bigint;
				input_cost: string;
				output_cost: string;
				mcp_cost: string;
				total_cost: string;
				started_at: Date | null;
				finished_at: Date | null;
				duration_sec: string | null;
			}>
		>`
      SELECT
        report_id,
        SUM(calls_count)::bigint                          AS total_calls,
        SUM(calls_without_pricing)::bigint                AS calls_without_pricing,
        SUM(prompt_tokens)::bigint                        AS input_tokens,
        SUM(completion_tokens)::bigint                    AS output_tokens,
        SUM(prompt_tokens + completion_tokens)::bigint    AS total_tokens,
        SUM(resource_units_count)::bigint                 AS total_resource_units,
        ROUND(SUM(input_cost)::numeric, 6)                AS input_cost,
        ROUND(SUM(output_cost)::numeric, 6)               AS output_cost,
        ROUND(SUM(mcp_cost)::numeric, 6)                  AS mcp_cost,
        ROUND(SUM(total_cost)::numeric, 6)                AS total_cost,
        MIN(first_call_at)                                AS started_at,
        MAX(last_call_at)                                 AS finished_at,
        ROUND(
          EXTRACT(EPOCH FROM (MAX(last_call_at) - MIN(first_call_at)))::numeric, 1
        )::text                                           AS duration_sec
      FROM v_external_resource_costs_by_report_company_step_task
      WHERE report_id = ${reportId}
      GROUP BY report_id
    `;
		return rows[0] ?? null;
	}

	static async getReportCostByStep(reportId: number) {
		return prisma.$queryRaw<
			Array<{
				report_id: number;
				step_id: number;
				step_order: number;
				step_name: string | null;
				step_status: string | null;
				companies_count: bigint;
				tasks_count: bigint;
				total_calls: bigint;
				calls_without_pricing: bigint;
				input_tokens: bigint;
				output_tokens: bigint;
				total_tokens: bigint;
				total_resource_units: bigint;
				input_cost: string;
				output_cost: string;
				mcp_cost: string;
				total_cost: string;
				started_at: Date | null;
				finished_at: Date | null;
				duration_sec: string | null;
			}>
		>`
      SELECT
        v.report_id,
        v.step_id,
        rs.step_order,
        rgs.name                                                    AS step_name,
        rss.status                                                  AS step_status,
        COUNT(DISTINCT v.company_id)::bigint                        AS companies_count,
        COUNT(DISTINCT v.task)::bigint                              AS tasks_count,
        SUM(v.calls_count)::bigint                                  AS total_calls,
        SUM(v.calls_without_pricing)::bigint                        AS calls_without_pricing,
        SUM(v.prompt_tokens)::bigint                                AS input_tokens,
        SUM(v.completion_tokens)::bigint                            AS output_tokens,
        SUM(v.prompt_tokens + v.completion_tokens)::bigint          AS total_tokens,
        SUM(v.resource_units_count)::bigint                         AS total_resource_units,
        ROUND(SUM(v.input_cost)::numeric, 6)                        AS input_cost,
        ROUND(SUM(v.output_cost)::numeric, 6)                       AS output_cost,
        ROUND(SUM(v.mcp_cost)::numeric, 6)                          AS mcp_cost,
        ROUND(SUM(v.total_cost)::numeric, 6)                        AS total_cost,
        MIN(v.first_call_at)                                        AS started_at,
        MAX(v.last_call_at)                                         AS finished_at,
        ROUND(
          EXTRACT(EPOCH FROM (MAX(v.last_call_at) - MIN(v.first_call_at)))::numeric, 1
        )::text                                                     AS duration_sec
      FROM v_external_resource_costs_by_report_company_step_task v
      LEFT JOIN report_steps rs
        ON rs.step_id = v.step_id AND rs.report_id = v.report_id
      LEFT JOIN report_generation_steps rgs
        ON rgs.id = v.step_id
      LEFT JOIN report_step_statuses rss
        ON rss.step_id = v.step_id AND rss.report_id = v.report_id AND rss.company_id IS NULL
      WHERE v.report_id = ${reportId}
      GROUP BY v.report_id, v.step_id, rs.step_order, rgs.name, rss.status
      ORDER BY COALESCE(rs.step_order, 999999)
    `;
	}

	static async getReportCostByStepTask(reportId: number, stepId: number) {
		return prisma.$queryRaw<
			Array<{
				report_id: number;
				step_id: number;
				task: string;
				provider: string | null;
				model: string | null;
				total_calls: bigint;
				error_count: bigint;
				companies_count: bigint;
				input_tokens: bigint;
				output_tokens: bigint;
				total_tokens: bigint;
				total_resource_units: bigint;
				avg_duration_ms: string | null;
				input_cost: string;
				output_cost: string;
				mcp_cost: string;
				total_cost: string;
				calls_without_pricing: bigint;
				first_call_at: Date | null;
				last_call_at: Date | null;
			}>
		>`
      SELECT *
      FROM v_report_cost_by_step_task
      WHERE report_id = ${reportId}
        AND step_id = ${stepId}
      ORDER BY total_cost DESC
    `;
	}

	static async getReportCostSummaryBatch(reportIds: number[]) {
		if (reportIds.length === 0) return [];
		return prisma.$queryRaw<
			Array<{
				report_id: number;
				total_cost: string;
				calls_without_pricing: bigint;
			}>
		>`
      SELECT
        report_id,
        ROUND(SUM(total_cost)::numeric, 6)  AS total_cost,
        SUM(calls_without_pricing)::bigint  AS calls_without_pricing
      FROM v_external_resource_costs_by_report_company_step_task
      WHERE report_id = ANY(${reportIds}::int[])
      GROUP BY report_id
    `;
	}
}
