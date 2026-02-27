import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../../../../server/modules/deep-dive";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; companyId: string; resultId: string }> },
) {
  const { id, companyId, resultId } = await params;
  return DeepDiveController.updateCompanyDataPoint(request, id, companyId, resultId);
}
