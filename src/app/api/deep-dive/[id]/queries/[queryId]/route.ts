import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../../server/modules/deep-dive";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; queryId: string }> }
) {
  const { id, queryId } = await params;
  return DeepDiveController.updateQuery(request, id, queryId);
}
