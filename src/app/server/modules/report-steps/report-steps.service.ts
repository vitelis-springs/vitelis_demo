import { report_status_enum } from "../../../../generated/prisma";
import { N8NService } from "../n8n/n8n.service";
import { NotificationDeliveriesRepository } from "../report-notifications/notification-deliveries.repository";
import { normalizePresetSteps } from "./report-steps.presets";
import { ReportStepsRepository } from "./report-steps.repository";

interface ServiceFailure {
	success: false;
	error: string;
	status?: number;
}

function fail(error: string, status: number): ServiceFailure {
	return { success: false, error, status };
}

export class ReportStepsService {
	// ===== Generation Steps (довідник) =====

	static async getAllGenerationSteps() {
		const steps = await ReportStepsRepository.getAllGenerationSteps();
		return {
			success: true,
			data: steps.map((s) => ({
				id: s.id,
				name: s.name,
				url: s.url,
				dependency: s.dependency,
				settings: s.settings,
				reportType: s.report_type ?? null,
			})),
		};
	}

	static async updateGenerationStep(
		stepId: number,
		payload: {
			name?: string;
			url?: string;
			dependency?: "rdp" | "kpi" | "category" | "url" | null;
			reportType?: "biz_miner" | "sales_miner" | null;
			settings?: Record<string, unknown> | null;
		},
	) {
		const step = await ReportStepsRepository.getGenerationStepById(stepId);
		if (!step) {
			return { success: false, error: "Step not found" };
		}

		const updated = await ReportStepsRepository.updateGenerationStep(stepId, {
			...(payload.name !== undefined ? { name: payload.name } : {}),
			...(payload.url !== undefined ? { url: payload.url } : {}),
			...(payload.dependency !== undefined
				? { dependency: payload.dependency }
				: {}),
			...(payload.reportType !== undefined
				? { report_type: payload.reportType }
				: {}),
			...(payload.settings !== undefined ? { settings: payload.settings } : {}),
		});

		return {
			success: true,
			data: {
				id: updated.id,
				name: updated.name,
				url: updated.url,
				dependency: updated.dependency,
				reportType: updated.report_type ?? null,
				settings: updated.settings,
			},
		};
	}

	// ===== Report Steps =====

	static async getReportSteps(reportId: number) {
		const [configuredSteps, allSteps] = await Promise.all([
			ReportStepsRepository.getStepsByReportId(reportId),
			ReportStepsRepository.getAllGenerationSteps(),
		]);

		const configuredIds = new Set(configuredSteps.map((s) => s.step_id));

		return {
			success: true,
			data: {
				configured: configuredSteps.map((s) => ({
					id: s.step_id,
					name: s.report_generation_steps.name,
					url: s.report_generation_steps.url,
					order: s.step_order,
					dependency: s.report_generation_steps.dependency,
					settings: s.report_generation_steps.settings,
				})),
				available: allSteps
					.filter((s) => !configuredIds.has(s.id))
					.map((s) => ({
						id: s.id,
						name: s.name,
						url: s.url,
						dependency: s.dependency,
						settings: s.settings,
						reportType: s.report_type ?? null,
					})),
			},
		};
	}

	static async addStepToReport(reportId: number, stepId: number) {
		// Перевіряємо чи степ існує
		const step = await ReportStepsRepository.getGenerationStepById(stepId);
		if (!step) {
			return { success: false, error: "Step not found" };
		}

		// Отримуємо поточні степи для визначення порядку
		const existing = await ReportStepsRepository.getStepsByReportId(reportId);
		const maxOrder = Math.max(0, ...existing.map((s) => s.step_order));

		try {
			const created = await ReportStepsRepository.createStep({
				report_id: reportId,
				step_id: stepId,
				step_order: maxOrder + 1,
			});

			return {
				success: true,
				data: {
					id: created.step_id,
					name: step.name,
					order: created.step_order,
				},
			};
		} catch (error: unknown) {
			if (
				error instanceof Error &&
				error.message.includes("Unique constraint")
			) {
				return { success: false, error: "Step already exists in report" };
			}
			throw error;
		}
	}

	static async removeStepFromReport(reportId: number, stepId: number) {
		try {
			await ReportStepsRepository.deleteStep(reportId, stepId);
			return { success: true };
		} catch (error: unknown) {
			if (
				error instanceof Error &&
				error.message.includes("Record to delete does not exist")
			) {
				return { success: false, error: "Step not found in report" };
			}
			throw error;
		}
	}

	static async reorderSteps(_reportId: number, _orderedStepIds: number[]) {
		return {
			success: false,
			error: "Bulk reorder is disabled. Update each step individually.",
		};
	}

	static async updateStepOrder(
		reportId: number,
		stepId: number,
		order: number,
	) {
		try {
			await ReportStepsRepository.updateStepOrder(reportId, stepId, order);
			return { success: true };
		} catch (error: unknown) {
			if (
				error instanceof Error &&
				error.message.includes("Record to update not found")
			) {
				return { success: false, error: "Step not found in report" };
			}
			throw error;
		}
	}

	// ===== Step Statuses =====

	static async getCompanyStepStatuses(reportId: number, companyId: number) {
		const [rows, report] = await Promise.all([
			ReportStepsRepository.getCompanyStepRuns(reportId, companyId),
			ReportStepsRepository.getReportTypeById(reportId),
		]);
		const base = N8NService.getEditorBaseUrl(
			ReportStepsService.n8nTypeForReport(report?.report_type ?? null),
		);

		return {
			success: true,
			data: rows.map((r) => {
				const workflowUrl = r.workflow_id
					? `${base}workflow/${r.workflow_id}`
					: null;
				const executionUrl =
					r.workflow_id && r.exec_id
						? `${base}workflow/${r.workflow_id}/executions/${r.exec_id}`
						: null;
				return {
					stepId: r.step_id,
					stepName: r.name,
					status: r.status,
					workflowId: r.workflow_id,
					workflowUrl,
					execId: r.exec_id,
					executionUrl,
					startTime: r.start_time ? r.start_time.toISOString() : null,
					endTime: r.end_time ? r.end_time.toISOString() : null,
				};
			}),
		};
	}

	static async updateStepStatus(
		reportId: number,
		companyId: number,
		stepId: number,
		status: report_status_enum,
		metadata?: unknown,
	) {
		const result = await ReportStepsRepository.upsertStatus({
			report_id: reportId,
			company_id: companyId,
			step_id: stepId,
			status,
			metadata,
		});

		return {
			success: true,
			data: {
				stepId: result.step_id,
				status: result.status,
				updatedAt: result.updated_at,
			},
		};
	}

	static async bulkUpdateStepStatuses(
		reportId: number,
		companyId: number,
		updates: Array<{ step_id: number; status: report_status_enum }>,
	) {
		await ReportStepsRepository.bulkUpdateStatuses(
			reportId,
			companyId,
			updates,
		);
		return { success: true };
	}

	// ===== Report-level bulk status update + presets =====

	/**
	 * Guard shared by report-level mutations: the report must exist and be a
	 * sales_miner report. Returns null on success or a typed failure.
	 */
	private static async assertSalesMinerReport(
		reportId: number,
	): Promise<ServiceFailure | null> {
		const report = await ReportStepsRepository.getReportTypeById(reportId);
		if (!report) return fail("Report not found", 404);
		if (report.report_type !== "sales_miner") {
			return fail("Report is not a sales_miner report", 400);
		}
		return null;
	}

	/**
	 * Apply one status to an explicit set of (company, step) cells in a single
	 * transaction. Both selection shapes converge here as a flat cell list:
	 * a rectangular {company_ids × step_ids} is expanded to cells by the
	 * controller, a sparse {cells} is passed straight through. Validates that
	 * the report is sales_miner and every referenced company/step belongs to
	 * it before the all-or-nothing upsert.
	 */
	static async bulkUpdateReportStepStatuses(
		reportId: number,
		cells: Array<{ companyId: number; stepId: number }>,
		status: report_status_enum,
	) {
		const guard = await ReportStepsService.assertSalesMinerReport(reportId);
		if (guard) return guard;

		if (cells.length === 0) {
			return fail("Provide at least one cell to update", 400);
		}

		const [validCompanyIds, validStepIds] = await Promise.all([
			ReportStepsRepository.getReportCompanyIds(reportId),
			ReportStepsRepository.getConfiguredStepIds(reportId),
		]);

		const companySet = new Set(validCompanyIds);
		const stepSet = new Set(validStepIds);

		const unknownCompany = cells.find((c) => !companySet.has(c.companyId));
		if (unknownCompany) {
			return fail(
				`Company ${unknownCompany.companyId} does not belong to report`,
				400,
			);
		}

		const unknownStep = cells.find((c) => !stepSet.has(c.stepId));
		if (unknownStep) {
			return fail(
				`Step ${unknownStep.stepId} is not configured for report`,
				400,
			);
		}

		const updated = await ReportStepsRepository.bulkUpsertStatusCells(
			reportId,
			cells,
			status,
		);

		return { success: true as const, data: { updated } };
	}

	static async listPresets(includeInactive = false) {
		const templates =
			await ReportStepsRepository.listStepTemplates(includeInactive);
		return {
			success: true as const,
			data: templates.map((t) => ({
				id: t.id.toString(),
				code: t.code,
				name: t.name,
				description: t.description ?? null,
				isActive: t.is_active,
				stepCount: t.step_count,
				updatedAt: t.updated_at?.toISOString() ?? null,
			})),
		};
	}

	static async getPreset(templateId: string) {
		const template = await ReportStepsRepository.getStepTemplateById(
			BigInt(templateId),
		);
		if (!template) return fail("Preset not found", 404);

		return {
			success: true as const,
			data: {
				id: template.id.toString(),
				code: template.code,
				name: template.name,
				description: template.description ?? null,
				isActive: template.is_active,
				steps: template.steps.map((s) => ({
					stepId: s.step_id,
					order: s.step_order,
					name: s.step?.name ?? `Step #${s.step_id}`,
					isActive: s.is_active,
				})),
			},
		};
	}

	/**
	 * Snapshot the report's current configured steps into a new preset.
	 * Includes all configured steps and normalizes order to 1..N.
	 */
	static async createPresetFromReport(
		reportId: number,
		input: { name: string; description?: string | null; code?: string | null },
	) {
		const guard = await ReportStepsService.assertSalesMinerReport(reportId);
		if (guard) return guard;

		const configured = await ReportStepsRepository.getStepsByReportId(reportId);
		if (configured.length === 0) {
			return fail("Report has no configured steps to snapshot", 400);
		}

		const normalized = normalizePresetSteps(
			configured.map((s) => ({
				step_id: s.step_id,
				step_order: s.step_order,
			})),
		);

		const code =
			input.code?.trim() || `report-${reportId}-${Date.now().toString(36)}`;

		const created = await ReportStepsRepository.createStepTemplate({
			code,
			name: input.name,
			description: input.description ?? null,
			meta: { source_report_id: reportId },
			steps: normalized,
		});

		return {
			success: true as const,
			data: {
				id: created.id.toString(),
				code: created.code,
				name: created.name,
				stepCount: created.steps.length,
			},
		};
	}

	static async updatePreset(
		templateId: string,
		data: {
			name?: string;
			description?: string | null;
			isActive?: boolean;
			meta?: object | null;
		},
	) {
		const existing = await ReportStepsRepository.getStepTemplateById(
			BigInt(templateId),
		);
		if (!existing) return fail("Preset not found", 404);

		const updated = await ReportStepsRepository.updateStepTemplate(
			BigInt(templateId),
			{
				...(data.name !== undefined ? { name: data.name } : {}),
				...(data.description !== undefined
					? { description: data.description }
					: {}),
				...(data.isActive !== undefined ? { is_active: data.isActive } : {}),
				...(data.meta !== undefined ? { meta: data.meta } : {}),
			},
		);

		return {
			success: true as const,
			data: {
				id: updated.id.toString(),
				name: updated.name,
				description: updated.description ?? null,
				isActive: updated.is_active,
			},
		};
	}

	/**
	 * Replace-only apply of a preset onto a report, inside a transaction.
	 * Existing report_steps (and their statuses, via cascade) are removed
	 * and rebuilt from the preset's active steps with normalized order.
	 */
	static async applyPreset(templateId: string, reportId: number) {
		const guard = await ReportStepsService.assertSalesMinerReport(reportId);
		if (guard) return guard;

		const template = await ReportStepsRepository.getStepTemplateById(
			BigInt(templateId),
		);
		if (!template) return fail("Preset not found", 404);
		if (!template.is_active) return fail("Preset is inactive", 400);

		const activeSteps = template.steps.filter((s) => s.is_active);
		if (activeSteps.length === 0) {
			return fail("Preset has no active steps", 400);
		}

		const normalized = normalizePresetSteps(
			activeSteps.map((s) => ({
				step_id: s.step_id,
				step_order: s.step_order,
			})),
		);

		const configured = await ReportStepsRepository.replaceReportSteps(
			reportId,
			normalized,
		);

		return {
			success: true as const,
			data: {
				configured: configured.map((s) => ({
					id: s.step_id,
					name: s.report_generation_steps.name,
					url: s.report_generation_steps.url,
					order: s.step_order,
					dependency: s.report_generation_steps.dependency,
					settings: s.report_generation_steps.settings,
				})),
			},
		};
	}

	/** Map a report_type to the project's n8n instance type. */
	private static n8nTypeForReport(
		reportType?: string | null,
	): string | undefined {
		if (reportType === "sales_miner") return "salesminer";
		if (reportType === "biz_miner") return "bizminer";
		if (reportType === "internal") return "vitelis_sales";
		return undefined;
	}

	/**
	 * Per configured step: workflow deep-link, latest run status, raw run
	 * timestamps, and an execution deep-link. Duration is computed on the
	 * client so a running step ticks live.
	 */
	static async getReportStepRuns(reportId: number) {
		const [rows, report] = await Promise.all([
			ReportStepsRepository.getReportStepRuns(reportId),
			ReportStepsRepository.getReportTypeById(reportId),
		]);
		const base = N8NService.getEditorBaseUrl(
			ReportStepsService.n8nTypeForReport(report?.report_type ?? null),
		);

		const runs = rows.map((r) => {
			const workflowUrl = r.workflow_id
				? `${base}workflow/${r.workflow_id}`
				: null;
			const executionUrl =
				r.workflow_id && r.exec_id
					? `${base}workflow/${r.workflow_id}/executions/${r.exec_id}`
					: null;
			return {
				stepId: r.step_id,
				order: r.step_order,
				name: r.name,
				workflowId: r.workflow_id,
				workflowUrl,
				status: r.status,
				running: r.status === "PROCESSING",
				startTime: r.start_time ? r.start_time.toISOString() : null,
				endTime: r.end_time ? r.end_time.toISOString() : null,
				execId: r.exec_id,
				executionUrl,
			};
		});

		runs.sort((a, b) => a.order - b.order || a.stepId - b.stepId);
		return { success: true as const, data: runs };
	}

	// ===== Steps Matrix =====

	static async getStepsMatrix(reportId: number) {
		const matrix = await ReportStepsRepository.getStepsMatrix(reportId);

		return {
			success: true,
			data: matrix,
		};
	}

	static async getStepsOverview(reportId: number) {
		const overview = await ReportStepsRepository.getStepsOverview(reportId);

		// Групуємо по step_id
		const byStep = new Map<number, Record<report_status_enum, number>>();

		for (const row of overview) {
			if (!byStep.has(row.step_id)) {
				byStep.set(row.step_id, {
					PENDING: 0,
					PROCESSING: 0,
					DONE: 0,
					ERROR: 0,
				});
			}
			byStep.get(row.step_id)![row.status] = row._count._all;
		}

		return {
			success: true,
			data: Array.from(byStep.entries()).map(([stepId, counts]) => ({
				stepId,
				counts,
			})),
		};
	}

	// ===== Orchestrator =====

	static async getOrchestratorStatus(reportId: number) {
		const orch =
			await ReportStepsRepository.getOrchestratorByReportId(reportId);

		return {
			success: true,
			data: orch
				? {
						reportId: orch.report_id,
						status: orch.status,
						metadata: orch.metadata,
					}
				: {
						reportId,
						status: report_status_enum.PENDING,
						metadata: null,
					},
		};
	}

	static async ensureOrchestrator(reportId: number) {
		const reportExists = await ReportStepsRepository.reportExists(reportId);
		if (!reportExists) {
			return { success: false, error: "Report not found" };
		}

		const { created, orchestrator } =
			await ReportStepsRepository.ensureOrchestrator(reportId);
		return {
			success: true,
			data: {
				created,
				reportId: orchestrator.report_id,
				status: orchestrator.status,
				metadata: orchestrator.metadata,
			},
		};
	}

	static async startOrchestrator(
		reportId: number,
		options: { parallel_limit?: number } = {},
	) {
		// Отримуємо степи репорту
		const steps = await ReportStepsRepository.getStepsByReportId(reportId);
		const stepIds = steps.map((s) => s.step_id);

		// Оновлюємо статус оркестратора
		await ReportStepsRepository.upsertOrchestrator(
			reportId,
			report_status_enum.PROCESSING,
			{
				parallel_limit: options.parallel_limit || 1,
				started_at: new Date().toISOString(),
			},
		);

		// Викликаємо n8n webhook (якщо налаштовано)
		const webhookUrl = process.env.N8N_ORCHESTRATOR_WEBHOOK;
		if (webhookUrl) {
			try {
				await fetch(webhookUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						report_id: reportId,
						parallel_limit: options.parallel_limit || 1,
						steps: stepIds,
					}),
				});
			} catch (error) {
				console.error("Failed to call orchestrator webhook:", error);
				// Продовжуємо, бо це не критична помилка
			}
		}

		return {
			success: true,
			data: {
				status: report_status_enum.PROCESSING,
				steps: stepIds,
			},
		};
	}

	static async triggerEngineTick(reportId: number, instance: number) {
		const instanceBaseUrls: Record<number, string | undefined> = {
			1: process.env.N8N_SALESMINER_URL,
			2: process.env.N8N_BIZMINER_URL,
		};

		const baseUrl = instanceBaseUrls[instance];

		if (baseUrl) {
			const webhookUrl = `${baseUrl.replace(/\/$/, "")}/webhook/orchestrator_v2_tick`;

			console.log(
				`[triggerEngineTick] instance=${instance} → POST ${webhookUrl}`,
				JSON.stringify({ report_id: reportId }),
			);

			const response = await fetch(webhookUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ report_id: reportId }),
			});

			const responseText = await response.text();

			console.log(
				`[triggerEngineTick] instance=${instance} ← ${response.status} ${response.statusText}`,
				responseText,
			);

			if (!response.ok) {
				console.error(
					`[triggerEngineTick] Webhook responded ${response.status} for report ${reportId}, instance ${instance}`,
				);
			}

			return { success: response.ok, instance };
		}

		await ReportStepsRepository.notifyEngineTick(reportId, instance);
		return { success: true, instance };
	}

	static async updateOrchestrator(
		reportId: number,
		status?: report_status_enum,
		metadata?: Record<string, unknown>,
	) {
		try {
			// Merge metadata with existing if partial update
			// Keys with null values are removed after merge (deletion convention)
			if (metadata && !status) {
				const existing =
					await ReportStepsRepository.getOrchestratorByReportId(reportId);
				if (!existing)
					return { success: false, error: "Orchestrator not found" };

				const merged = {
					...((existing.metadata as object) ?? {}),
					...metadata,
				};
				const cleaned = Object.fromEntries(
					Object.entries(merged).filter(([, v]) => v !== null),
				);
				await ReportStepsRepository.upsertOrchestrator(
					reportId,
					existing.status,
					cleaned,
				);
				return { success: true };
			}

			if (status && metadata) {
				const existing =
					await ReportStepsRepository.getOrchestratorByReportId(reportId);
				const merged = {
					...((existing?.metadata as object) ?? {}),
					...metadata,
				};
				const cleaned = Object.fromEntries(
					Object.entries(merged).filter(([, v]) => v !== null),
				);
				await ReportStepsRepository.upsertOrchestrator(
					reportId,
					status,
					cleaned,
				);
				await ReportStepsService.resetNotificationsOnRestart(reportId, status);
				return { success: true };
			}

			if (status) {
				await ReportStepsRepository.updateOrchestratorStatus(reportId, status);
				await ReportStepsService.resetNotificationsOnRestart(reportId, status);
				return { success: true };
			}

			return { success: false, error: "Nothing to update" };
		} catch (error: unknown) {
			if (
				error instanceof Error &&
				error.message.includes("Record to update not found")
			) {
				return { success: false, error: "Orchestrator not found" };
			}
			throw error;
		}
	}

	/**
	 * The "Active" UI label maps to orchestrator status PROCESSING, and is
	 * also how a report is manually restarted. Clearing prior deliveries here
	 * (rather than a separate frontend call) lets the lifecycle notifications
	 * (started/completed/failed) fire again for the new run instead of
	 * staying deduped against the previous one.
	 */
	private static async resetNotificationsOnRestart(
		reportId: number,
		status: report_status_enum,
	): Promise<void> {
		if (status !== report_status_enum.PROCESSING) return;
		await NotificationDeliveriesRepository.resetForReport(reportId);
	}

	// ===== Cost stats =====

	static async getReportCostStats(reportId: number) {
		const [summary, steps] = await Promise.all([
			ReportStepsRepository.getReportCostSummary(reportId),
			ReportStepsRepository.getReportCostByStep(reportId),
		]);

		return {
			success: true,
			data: {
				summary: summary
					? {
							totalCalls: Number(summary.total_calls),
							callsWithoutPricing: Number(summary.calls_without_pricing),
							inputTokens: Number(summary.input_tokens),
							outputTokens: Number(summary.output_tokens),
							totalTokens: Number(summary.total_tokens),
							totalResourceUnits: Number(summary.total_resource_units),
							inputCost: Number(summary.input_cost),
							outputCost: Number(summary.output_cost),
							mcpCost: Number(summary.mcp_cost),
							totalCost: Number(summary.total_cost),
							startedAt: summary.started_at?.toISOString() ?? null,
							finishedAt: summary.finished_at?.toISOString() ?? null,
							durationSec: summary.duration_sec
								? Number(summary.duration_sec)
								: null,
						}
					: null,
				steps: steps.map((s) => ({
					stepId: Number(s.step_id),
					stepOrder: Number(s.step_order),
					stepName: s.step_name,
					stepStatus: s.step_status,
					companiesCount: Number(s.companies_count),
					tasksCount: Number(s.tasks_count),
					totalCalls: Number(s.total_calls),
					callsWithoutPricing: Number(s.calls_without_pricing),
					inputTokens: Number(s.input_tokens),
					outputTokens: Number(s.output_tokens),
					totalTokens: Number(s.total_tokens),
					totalResourceUnits: Number(s.total_resource_units),
					inputCost: Number(s.input_cost),
					outputCost: Number(s.output_cost),
					mcpCost: Number(s.mcp_cost),
					totalCost: Number(s.total_cost),
					startedAt: s.started_at?.toISOString() ?? null,
					finishedAt: s.finished_at?.toISOString() ?? null,
					durationSec: s.duration_sec ? Number(s.duration_sec) : null,
				})),
			},
		};
	}

	static async getStepCostTasks(reportId: number, stepId: number) {
		const rows = await ReportStepsRepository.getReportCostByStepTask(
			reportId,
			stepId,
		);
		return {
			success: true,
			data: rows.map((r) => ({
				task: r.task,
				provider: r.provider,
				model: r.model,
				totalCalls: Number(r.total_calls),
				errorCount: Number(r.error_count),
				companiesCount: Number(r.companies_count),
				inputTokens: Number(r.input_tokens),
				outputTokens: Number(r.output_tokens),
				totalTokens: Number(r.total_tokens),
				totalResourceUnits: Number(r.total_resource_units),
				avgDurationMs: r.avg_duration_ms ? Number(r.avg_duration_ms) : null,
				inputCost: Number(r.input_cost),
				outputCost: Number(r.output_cost),
				mcpCost: Number(r.mcp_cost),
				totalCost: Number(r.total_cost),
				callsWithoutPricing: Number(r.calls_without_pricing),
				firstCallAt: r.first_call_at?.toISOString() ?? null,
				lastCallAt: r.last_call_at?.toISOString() ?? null,
			})),
		};
	}
}
