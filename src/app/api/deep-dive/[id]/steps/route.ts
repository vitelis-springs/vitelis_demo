import { NextRequest } from "next/server";
import { ReportStepsController } from "../../../../server/modules/report-steps";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return ReportStepsController.getReportSteps(request, id);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return ReportStepsController.addStepToReport(request, id);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return ReportStepsController.reorderSteps(request, id);
}
