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

  static async reorderSteps(reportId: number, orderedStepIds: number[]) {
    await ReportStepsRepository.reorderSteps(reportId, orderedStepIds);
    return { success: true };
  }

  static async updateStepOrder(reportId: number, stepId: number, order: number) {
    await ReportStepsRepository.updateStepOrder(reportId, stepId, order);
    return { success: true };
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
}
