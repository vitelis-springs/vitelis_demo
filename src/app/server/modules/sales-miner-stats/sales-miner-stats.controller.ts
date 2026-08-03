import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import { SalesMinerStatsService } from "./sales-miner-stats.service";

function parseBigIntList(raw: string | null): bigint[] {
	if (!raw) return [];
	return raw
		.split(",")
		.map((v) => v.trim())
		.filter((v) => v.length > 0 && /^\d+$/.test(v))
		.map((v) => BigInt(v));
}

function parseStringList(raw: string | null): string[] {
	if (!raw) return [];
	return raw
		.split(",")
		.map((v) => v.trim())
		.filter((v) => v.length > 0);
}

function parseIntList(raw: string | null): number[] {
	if (!raw) return [];
	return raw
		.split(",")
		.map((v) => v.trim())
		.filter((v) => v.length > 0 && /^\d+$/.test(v))
		.map((v) => Number(v));
}

export class SalesMinerStatsController {
	static async listClassifiers(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const result = await SalesMinerStatsService.listClassifiers();
			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ SalesMinerStatsController.listClassifiers:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch report classifiers" },
				{ status: 500 },
			);
		}
	}

	static async getSignalStats(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const filters = SalesMinerStatsController.parseFilters(request);
			const result = await SalesMinerStatsService.getSignalStats(filters);
			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ SalesMinerStatsController.getSignalStats:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch sales miner stats" },
				{ status: 500 },
			);
		}
	}

	static async exportSignalStatsXlsx(
		request: NextRequest,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const filters = SalesMinerStatsController.parseFilters(request);
			const buffer =
				await SalesMinerStatsService.exportSignalStatsXlsx(filters);
			const exportDate = new Date().toISOString().slice(0, 10);

			return new NextResponse(buffer, {
				headers: {
					"Content-Type":
						"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"Content-Disposition": `attachment; filename="sales_miner_signal_stats_${exportDate}.xlsx"`,
				},
			});
		} catch (error) {
			console.error(
				"❌ SalesMinerStatsController.exportSignalStatsXlsx:",
				error,
			);
			return NextResponse.json(
				{ success: false, error: "Failed to export sales miner stats" },
				{ status: 500 },
			);
		}
	}

	private static parseFilters(request: NextRequest) {
		const { searchParams } = new URL(request.url);
		return {
			customerIds: parseBigIntList(searchParams.get("customerIds")),
			customerGicsCodes: parseStringList(searchParams.get("customerGics")),
			targetGicsCodes: parseStringList(searchParams.get("targetGics")),
			classifierIds: parseIntList(searchParams.get("classifierIds")),
			unitTypes: parseStringList(searchParams.get("unitTypes")),
		};
	}
}
