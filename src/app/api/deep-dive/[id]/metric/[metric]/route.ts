import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../../server/modules/deep-dive";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; metric: string }> }
) {
  const { id, metric } = await params;
  return DeepDiveController.getMetric(request, id, metric);
}
