import { NextRequest } from "next/server";
import { ReportStepsController } from "../../../../../server/modules/report-steps";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return ReportStepsController.triggerEngineTick(request, id);
}
