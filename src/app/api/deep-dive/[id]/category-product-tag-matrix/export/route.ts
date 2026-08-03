import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../../server/modules/deep-dive";

/** Uses exceljs; needs Node runtime. */
export const runtime = "nodejs";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return DeepDiveController.exportSalesMinerCategoryProductTagMatrixXlsx(
		request,
		id,
	);
}
