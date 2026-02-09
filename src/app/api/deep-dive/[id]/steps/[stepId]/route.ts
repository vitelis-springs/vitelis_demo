import { NextRequest } from "next/server";
import { ReportStepsController } from "../../../../../server/modules/report-steps";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { id, stepId } = await params;
  return ReportStepsController.removeStepFromReport(request, id, stepId);
}
