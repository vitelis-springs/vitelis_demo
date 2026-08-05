/** biome-ignore-all lint/complexity/noStaticOnlyClass: Service classes are static facades throughout this module tree. */
/**
 * Talks to the excel-merger service, which infers a customer's product
 * catalogue from their website.
 *
 * A run takes minutes, so nothing here waits for one: `start` returns as soon
 * as the run is recorded, and the Portfolio tab polls `get` until it settles.
 *
 * Note what this module does NOT do: it never writes to `customer_products`.
 * Discovery returns a *proposal*, and the engineer applies it through the
 * existing import endpoint after looking at it — because that import
 * deactivates every product it does not mention, which is not something to do
 * to a hand-built portfolio unattended.
 */

export interface DiscoveryConfig {
	unit?: string | null;
	subset_rule?: string | null;
	target_urls?: string[];
	source_of_truth_urls?: string[];
	aliases?: string[];
	portfolio_type?: string | null;
	taxonomy?: string[];
}

/** Exactly the keys `POST /products/import` accepts. */
export interface DiscoveredProductPayload {
	groupCategory: string;
	productName: string;
	internalDescription: string;
	subCategory: string | null;
	discovery: Record<string, unknown> | null;
	[key: string]: unknown;
}

export interface DiscoveryRunSummary {
	products: number;
	groups: number;
	unfiled: number;
	taxonomy_origin: string;
	cost_usd: number;
	duration_s: number;
	strategies: Record<string, number>;
	errors: string[];
	preflight_verdict: string;
	sources: Array<{
		url: string;
		role: string;
		status: number;
		verdict: string;
		crawlable: boolean;
	}>;
}

export interface DiscoveryRun {
	id: string;
	customer_id: number;
	status: "queued" | "running" | "succeeded" | "failed";
	created_at: string;
	finished_at: string | null;
	error: string | null;
	summary: DiscoveryRunSummary | null;
	products: DiscoveredProductPayload[] | null;
}

export class ProductDiscoveryError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "ProductDiscoveryError";
	}
}

function serviceUrl(): string {
	const url = process.env.EXCEL_MERGER_URL;
	if (!url) {
		throw new ProductDiscoveryError(
			"EXCEL_MERGER_URL is not configured — product discovery is unavailable",
			503,
		);
	}
	return url.replace(/\/+$/, "");
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${serviceUrl()}${path}`, {
		...init,
		headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
		cache: "no-store",
	});

	if (!res.ok) {
		const body = await res.text().catch(() => "");
		let detail = body.slice(0, 500);
		try {
			const parsed = JSON.parse(body) as { detail?: unknown };
			if (typeof parsed.detail === "string") detail = parsed.detail;
		} catch {
			// non-JSON error body — the raw text is the best we have
		}
		throw new ProductDiscoveryError(
			detail || `discovery service returned ${res.status}`,
			res.status,
		);
	}

	return (await res.json()) as T;
}

export class ProductDiscoveryService {
	static async start(
		customerId: string,
		config?: DiscoveryConfig,
	): Promise<DiscoveryRun> {
		return call<DiscoveryRun>("/product-discovery/runs", {
			method: "POST",
			body: JSON.stringify({
				customer_id: Number(customerId),
				config: config ?? null,
			}),
		});
	}

	static async get(runId: string): Promise<DiscoveryRun> {
		return call<DiscoveryRun>(
			`/product-discovery/runs/${encodeURIComponent(runId)}`,
		);
	}

	/**
	 * The customer's most recent run, or null if they have never had one.
	 * The tab asks on load so a refresh mid-run rejoins it rather than
	 * offering a button that would start a second.
	 */
	static async latest(customerId: string): Promise<DiscoveryRun | null> {
		return call<DiscoveryRun | null>(
			`/product-discovery/customers/${Number(customerId)}/latest-run`,
		);
	}
}
