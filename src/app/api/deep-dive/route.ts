import { NextRequest } from "next/server";
import { DeepDiveController } from "../../server/modules/deep-dive";

export async function GET(request: NextRequest) {
  return DeepDiveController.list(request);
}
