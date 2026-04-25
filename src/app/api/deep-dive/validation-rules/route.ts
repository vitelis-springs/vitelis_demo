import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../server/modules/deep-dive";

export async function POST(request: NextRequest) {
	return DeepDiveController.createValidationRule(request);
}
