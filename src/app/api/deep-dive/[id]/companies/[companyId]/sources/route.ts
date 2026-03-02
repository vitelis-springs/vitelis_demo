import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../../../server/modules/deep-dive";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; companyId: string }> },
) {
  // Extract parameters
  const { id, companyId } = await params;
  return DeepDiveController.getSourcesAnalytics(request, id, companyId);
}
