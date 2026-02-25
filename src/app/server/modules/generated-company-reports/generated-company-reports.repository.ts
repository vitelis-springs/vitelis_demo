import type { generated_company_reports } from "../../../../generated/prisma";
import prisma from "../../../../lib/prisma";

export class GeneratedCompanyReportsRepository {
  static async findById(id: number): Promise<generated_company_reports | null> {
    return prisma.generated_company_reports.findUnique({ where: { id } });
  }

  static async findLatestByCompanyAndReport(
    companyId: number,
    reportId: number
  ): Promise<generated_company_reports | null> {
    return prisma.generated_company_reports.findFirst({
      where: {
        company_id: companyId,
        report_id: reportId,
      },
      orderBy: { created_at: "desc" },
    });
  }
}
