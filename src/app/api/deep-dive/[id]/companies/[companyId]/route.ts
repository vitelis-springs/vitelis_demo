import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../../server/modules/deep-dive";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; companyId: string }> }
) {
  const { id, companyId } = await params;
  return DeepDiveController.getCompany(request, id, companyId);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; companyId: string }> }
) {
  const { id, companyId } = await params;
  return DeepDiveController.updateCompany(request, id, companyId);
}
