import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../server/modules/deep-dive";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return DeepDiveController.exportReport(request, id);
}
