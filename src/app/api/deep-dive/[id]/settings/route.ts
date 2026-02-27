import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../server/modules/deep-dive";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return DeepDiveController.getSettings(request, id);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return DeepDiveController.updateSettings(request, id);
}
