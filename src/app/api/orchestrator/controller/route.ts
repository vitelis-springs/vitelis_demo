import type { NextRequest } from "next/server";
import { SmEngineController } from "../../../server/modules/sm-engine";

export async function GET(request: NextRequest) {
	return SmEngineController.getController(request);
}
