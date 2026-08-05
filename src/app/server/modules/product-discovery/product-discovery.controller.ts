/** biome-ignore-all lint/complexity/noStaticOnlyClass: Controller classes are static route facades in this module. */
import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import {
	type DiscoveryConfig,
	ProductDiscoveryError,
	ProductDiscoveryService,
} from "./product-discovery.service";

function jsonSuccess<T>(data: T, status = 200) {
	return NextResponse.json({ success: true, data }, { status });
}

function jsonError(message: string, status: number) {
	return NextResponse.json({ success: false, error: message }, { status });
}

function handle(error: unknown) {
	if (error instanceof ProductDiscoveryError) {
		return jsonError(error.message, error.status);
	}
	const message = error instanceof Error ? error.message : "unknown error";
	return jsonError(`Product discovery failed: ${message}`, 500);
}

export class ProductDiscoveryController {
	static async start(request: NextRequest, customerId: string) {
		const auth = extractAdminFromRequest(request);
		if (!auth.success) return auth.response;

		try {
			// An empty body means "use whatever is saved on the customer", which
			// is the normal case; a body lets an engineer try a config before
			// committing it to customers.settings.
			const body = (await request.json().catch(() => ({}))) as {
				config?: DiscoveryConfig;
			};
			return jsonSuccess(
				await ProductDiscoveryService.start(customerId, body?.config),
			);
		} catch (error) {
			return handle(error);
		}
	}

	static async get(request: NextRequest, runId: string) {
		const auth = extractAdminFromRequest(request);
		if (!auth.success) return auth.response;

		try {
			return jsonSuccess(await ProductDiscoveryService.get(runId));
		} catch (error) {
			return handle(error);
		}
	}

	static async latest(request: NextRequest, customerId: string) {
		const auth = extractAdminFromRequest(request);
		if (!auth.success) return auth.response;

		try {
			return jsonSuccess(await ProductDiscoveryService.latest(customerId));
		} catch (error) {
			return handle(error);
		}
	}
}
