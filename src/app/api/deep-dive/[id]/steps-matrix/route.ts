import { NextRequest } from "next/server";
import { ReportStepsController } from "../../../../server/modules/report-steps";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return ReportStepsController.getStepsMatrix(request, id);
}
