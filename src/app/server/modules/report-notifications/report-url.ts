const APP_BASE_URL = "https://vitelis-demo.vercel.app";

function baseUrl(): string {
	return APP_BASE_URL;
}

/** Route resolver for report deep-links embedded in notification payloads. */
export function buildReportUrl(
	reportId: number,
	reportType: string | null,
): string {
	const base = baseUrl();

	switch (reportType) {
		case "sales_miner":
			return `${base}/sales-miner/reports/${reportId}`;
		case "biz_miner":
			return `${base}/biz-miner/${reportId}`;
		case "internal":
			return `${base}/vitelis-sales/${reportId}`;
		default:
			return `${base}/deep-dive/${reportId}`;
	}
}
