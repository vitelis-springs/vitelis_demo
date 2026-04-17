import { report_status_enum } from "../../../../generated/prisma";
import { ReportStepsRepository } from "./report-steps.repository";

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

  static async updateGenerationStepSettings(
    stepId: number,
    settings: Record<string, string> | null
  ) {
    const step = await ReportStepsRepository.getGenerationStepById(stepId);
    if (!step) {
      return { success: false, error: "Step not found" };
    }

    const updated = await ReportStepsRepository.updateGenerationStepSettings(
      stepId,
      settings
    );

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
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

  static async updateStepOrder(reportId: number, stepId: number, order: number) {
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
    const statuses = await ReportStepsRepository.getStatusesByReportAndCompany(
      reportId,
      companyId
    );

    return {
      success: true,
      data: statuses.map((s) => ({
        stepId: s.step_id,
        stepName: s.report_generation_steps.name,
        status: s.status,
        metadata: s.metadata,
        updatedAt: s.updated_at,
      })),
    };
  }

  static async updateStepStatus(
    reportId: number,
    companyId: number,
    stepId: number,
    status: report_status_enum,
    metadata?: unknown
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
    updates: Array<{ step_id: number; status: report_status_enum }>
  ) {
    await ReportStepsRepository.bulkUpdateStatuses(reportId, companyId, updates);
    return { success: true };
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
    const byStep = new Map<
      number,
      Record<report_status_enum, number>
    >();

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
    const orch = await ReportStepsRepository.getOrchestratorByReportId(reportId);

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

    const { created, orchestrator } = await ReportStepsRepository.ensureOrchestrator(reportId);
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
    options: { parallel_limit?: number } = {}
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
      }
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
    await ReportStepsRepository.notifyEngineTick(reportId, instance);
    return { success: true };
  }

  static async updateOrchestrator(
    reportId: number,
    status?: report_status_enum,
    metadata?: Record<string, unknown>
  ) {
    try {
      // Merge metadata with existing if partial update
      // Keys with null values are removed after merge (deletion convention)
      if (metadata && !status) {
        const existing = await ReportStepsRepository.getOrchestratorByReportId(reportId);
        if (!existing) return { success: false, error: "Orchestrator not found" };

        const merged = { ...(existing.metadata as object ?? {}), ...metadata };
        const cleaned = Object.fromEntries(
          Object.entries(merged).filter(([, v]) => v !== null)
        );
        await ReportStepsRepository.upsertOrchestrator(reportId, existing.status, cleaned);
        return { success: true };
      }

      if (status && metadata) {
        const existing = await ReportStepsRepository.getOrchestratorByReportId(reportId);
        const merged = { ...(existing?.metadata as object ?? {}), ...metadata };
        const cleaned = Object.fromEntries(
          Object.entries(merged).filter(([, v]) => v !== null)
        );
        await ReportStepsRepository.upsertOrchestrator(reportId, status, cleaned);
        return { success: true };
      }

      if (status) {
        await ReportStepsRepository.updateOrchestratorStatus(reportId, status);
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
              durationSec: summary.duration_sec ? Number(summary.duration_sec) : null,
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
    const rows = await ReportStepsRepository.getReportCostByStepTask(reportId, stepId);
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
