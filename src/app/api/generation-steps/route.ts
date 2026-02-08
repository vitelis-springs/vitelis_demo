import { NextRequest } from "next/server";
import { ReportStepsController } from "../../server/modules/report-steps";

export async function GET(request: NextRequest) {
  return ReportStepsController.listGenerationSteps(request);
}
