import { NextRequest } from "next/server";
import { SalesMinerStatsController } from "../../../../server/modules/sales-miner-stats/sales-miner-stats.controller";

export async function GET(request: NextRequest) {
	return SalesMinerStatsController.listCapabilityTags(request);
}
