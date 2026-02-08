import { report_status_enum } from "../../../../generated/prisma";
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
      where: { rs_report_step_uniq: { report_id: reportId, step_id: stepId } },
    });
  }

  static async updateStepOrder(
    reportId: number,
    stepId: number,
    newOrder: number
  ) {
    return prisma.report_steps.update({
      where: { rs_report_step_uniq: { report_id: reportId, step_id: stepId } },
      data: { step_order: newOrder },
    });
  }

  static async reorderSteps(reportId: number, orderedStepIds: number[]) {
    return prisma.$transaction(
      orderedStepIds.map((stepId, index) =>
        prisma.report_steps.update({
          where: {
            rs_report_step_uniq: { report_id: reportId, step_id: stepId },
          },
          data: { step_order: index + 1 },
        })
      )
    );
  }

  // ===== report_step_statuses =====

  static async getStatusesByReportAndCompany(
    reportId: number,
    companyId: number
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
    updates: Array<{ step_id: number; status: report_status_enum }>
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
        })
      )
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

  static async upsertOrchestrator(
    reportId: number,
    status: report_status_enum,
    metadata?: unknown
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
      payload
    );
  }

  static async updateOrchestratorStatus(
    reportId: number,
    status: report_status_enum
  ) {
    return prisma.report_orhestrator.update({
      where: { report_id: reportId },
      data: { status },
    });
  }
}
