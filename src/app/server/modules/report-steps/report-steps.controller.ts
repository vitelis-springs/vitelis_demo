import { NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import { report_status_enum } from "../../../../generated/prisma";
import { ReportStepsService } from "./report-steps.service";

function parseStatus(value: string | null) {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return Object.values(report_status_enum).includes(
    normalized as report_status_enum
  )
    ? (normalized as report_status_enum)
    : null;
}

export class ReportStepsController {
  // ===== Generation Steps (довідник) =====

  static async listGenerationSteps(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const result = await ReportStepsService.getAllGenerationSteps();
      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ ReportStepsController.listGenerationSteps:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch generation steps" },
        { status: 500 }
      );
    }
  }

  // ===== Report Steps =====

  static async getReportSteps(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const result = await ReportStepsService.getReportSteps(reportId);
      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ ReportStepsController.getReportSteps:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch report steps" },
        { status: 500 }
      );
    }
  }

  static async addStepToReport(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const body = (await request.json()) as { step_id?: number };
      if (typeof body.step_id !== "number" || !Number.isFinite(body.step_id)) {
        return NextResponse.json(
          { success: false, error: "step_id must be a valid number" },
          { status: 400 }
        );
      }

      const result = await ReportStepsService.addStepToReport(
        reportId,
        body.step_id
      );
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error("❌ ReportStepsController.addStepToReport:", error);
      return NextResponse.json(
        { success: false, error: "Failed to add step to report" },
        { status: 500 }
      );
    }
  }

  static async reorderSteps(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const body = (await request.json()) as {
        ordered_step_ids?: number[];
        step_id?: number;
        order?: number;
      };

      // Single step order update: { step_id, order }
      if (typeof body.step_id === "number" && typeof body.order === "number") {
        if (!Number.isFinite(body.step_id) || !Number.isFinite(body.order) || body.order < 1) {
          return NextResponse.json(
            { success: false, error: "Invalid step_id or order" },
            { status: 400 }
          );
        }
        const result = await ReportStepsService.updateStepOrder(
          reportId,
          body.step_id,
          body.order
        );
        return NextResponse.json(result);
      }

      // Bulk reorder: { ordered_step_ids }
      if (
        !Array.isArray(body.ordered_step_ids) ||
        !body.ordered_step_ids.every(
          (id) => typeof id === "number" && Number.isFinite(id)
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Provide ordered_step_ids array or step_id+order",
          },
          { status: 400 }
        );
      }

      const result = await ReportStepsService.reorderSteps(
        reportId,
        body.ordered_step_ids
      );
      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ ReportStepsController.reorderSteps:", error);
      return NextResponse.json(
        { success: false, error: "Failed to reorder steps" },
        { status: 500 }
      );
    }
  }

  static async removeStepFromReport(
    request: NextRequest,
    reportIdParam: string,
    stepIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      const stepId = Number(stepIdParam);

      if (!Number.isFinite(reportId) || !Number.isFinite(stepId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report/step id" },
          { status: 400 }
        );
      }

      const result = await ReportStepsService.removeStepFromReport(
        reportId,
        stepId
      );
      if (!result.success) {
        return NextResponse.json(result, { status: 404 });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ ReportStepsController.removeStepFromReport:", error);
      return NextResponse.json(
        { success: false, error: "Failed to remove step from report" },
        { status: 500 }
      );
    }
  }

  // ===== Steps Matrix =====

  static async getStepsMatrix(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const result = await ReportStepsService.getStepsMatrix(reportId);
      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ ReportStepsController.getStepsMatrix:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch steps matrix" },
        { status: 500 }
      );
    }
  }

  // ===== Company Step Statuses =====

  static async getCompanyStepStatuses(
    request: NextRequest,
    reportIdParam: string,
    companyIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      const companyId = Number(companyIdParam);

      if (!Number.isFinite(reportId) || !Number.isFinite(companyId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report/company id" },
          { status: 400 }
        );
      }

      const result = await ReportStepsService.getCompanyStepStatuses(
        reportId,
        companyId
      );
      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ ReportStepsController.getCompanyStepStatuses:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch company step statuses" },
        { status: 500 }
      );
    }
  }

  static async updateCompanyStepStatuses(
    request: NextRequest,
    reportIdParam: string,
    companyIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      const companyId = Number(companyIdParam);

      if (!Number.isFinite(reportId) || !Number.isFinite(companyId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report/company id" },
          { status: 400 }
        );
      }

      const body = (await request.json()) as {
        step_id?: number;
        status?: string;
        updates?: Array<{ step_id: number; status: string }>;
      };

      // Bulk update
      if (body.updates && Array.isArray(body.updates)) {
        const parsedUpdates: Array<{
          step_id: number;
          status: report_status_enum;
        }> = [];

        for (const u of body.updates) {
          const status = parseStatus(u.status);
          if (!status || typeof u.step_id !== "number") {
            return NextResponse.json(
              { success: false, error: "Invalid update format" },
              { status: 400 }
            );
          }
          parsedUpdates.push({ step_id: u.step_id, status });
        }

        const result = await ReportStepsService.bulkUpdateStepStatuses(
          reportId,
          companyId,
          parsedUpdates
        );
        return NextResponse.json(result);
      }

      // Single update
      if (body.step_id !== undefined && body.status !== undefined) {
        const status = parseStatus(body.status);
        if (
          !status ||
          typeof body.step_id !== "number" ||
          !Number.isFinite(body.step_id)
        ) {
          return NextResponse.json(
            { success: false, error: "Invalid step_id or status" },
            { status: 400 }
          );
        }

        const result = await ReportStepsService.updateStepStatus(
          reportId,
          companyId,
          body.step_id,
          status
        );
        return NextResponse.json(result);
      }

      return NextResponse.json(
        {
          success: false,
          error: "Request must include step_id+status or updates array",
        },
        { status: 400 }
      );
    } catch (error) {
      console.error(
        "❌ ReportStepsController.updateCompanyStepStatuses:",
        error
      );
      return NextResponse.json(
        { success: false, error: "Failed to update step statuses" },
        { status: 500 }
      );
    }
  }

  // ===== Orchestrator =====

  static async getOrchestratorStatus(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const result = await ReportStepsService.getOrchestratorStatus(reportId);
      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ ReportStepsController.getOrchestratorStatus:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch orchestrator status" },
        { status: 500 }
      );
    }
  }

  static async startOrchestrator(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      let body: { parallel_limit?: number } = {};
      try {
        body = await request.json();
      } catch {
        // Body може бути пустим
      }

      const result = await ReportStepsService.startOrchestrator(reportId, {
        parallel_limit: body.parallel_limit,
      });
      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ ReportStepsController.startOrchestrator:", error);
      return NextResponse.json(
        { success: false, error: "Failed to start orchestrator" },
        { status: 500 }
      );
    }
  }

  static async triggerEngineTick(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const body = (await request.json()) as { instance?: number };
      const instance = body.instance;
      if (typeof instance !== "number" || !Number.isInteger(instance) || instance < 1) {
        return NextResponse.json(
          { success: false, error: "instance must be a positive integer" },
          { status: 400 }
        );
      }

      const result = await ReportStepsService.triggerEngineTick(reportId, instance);
      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ ReportStepsController.triggerEngineTick:", error);
      return NextResponse.json(
        { success: false, error: "Failed to trigger engine tick" },
        { status: 500 }
      );
    }
  }

  static async updateOrchestratorStatus(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const body = (await request.json()) as {
        status?: string;
        metadata?: Record<string, unknown>;
      };

      const status = body.status ? parseStatus(body.status) : undefined;

      if (!status && !body.metadata) {
        return NextResponse.json(
          { success: false, error: "Must provide status or metadata" },
          { status: 400 }
        );
      }

      if (body.status && !status) {
        return NextResponse.json(
          { success: false, error: "Invalid status value" },
          { status: 400 }
        );
      }

      const result = await ReportStepsService.updateOrchestrator(
        reportId,
        status,
        body.metadata
      );
      if (!result.success) {
        return NextResponse.json(result, { status: 404 });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error(
        "❌ ReportStepsController.updateOrchestratorStatus:",
        error
      );
      return NextResponse.json(
        { success: false, error: "Failed to update orchestrator status" },
        { status: 500 }
      );
    }
  }
}
