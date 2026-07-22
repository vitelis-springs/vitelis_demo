export const SM_PRODUCTS_SETUP_WEBHOOK_URL =
	"https://vitelis.app.n8n.cloud/webhook/sm-products-setup";

/**
 * Triggers the n8n product-setup workflow (L2 description synthesis +
 * capability tag mapping) for a customer. The webhook's "Respond to Webhook"
 * node sits right after the trigger and answers immediately with
 * `{ execution_id }`, while the actual work keeps running in the same
 * execution — so a resolved promise only means the run was *started*.
 * Progress/completion is tracked separately by polling that execution id via
 * useGetExecutionDetails (instanceType "salesminer"). A rejected promise
 * means the trigger itself failed (bad URL, validation error, network
 * failure) before the workflow ran.
 *
 * Returns the execution id, or null if the response didn't include one
 * (e.g. the n8n graph reverted to a plain ack) — callers should fall back to
 * a heuristic (like polling customer_products for blank descriptions) in
 * that case.
 */
export async function triggerProductsSetupWebhook(
	customerId: string,
): Promise<string | null> {
	const res = await fetch(SM_PRODUCTS_SETUP_WEBHOOK_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			customer_id: Number(customerId),
			report_id: null,
		}),
	});
	if (!res.ok) {
		const bodyText = await res.text().catch(() => "");
		throw new Error(
			`workflow returned ${res.status}${bodyText ? `: ${bodyText.slice(0, 300)}` : ""}`,
		);
	}
	try {
		const body: unknown = await res.json();
		if (
			body &&
			typeof body === "object" &&
			"execution_id" in body &&
			(typeof (body as { execution_id: unknown }).execution_id === "string" ||
				typeof (body as { execution_id: unknown }).execution_id === "number")
		) {
			return String((body as { execution_id: string | number }).execution_id);
		}
	} catch {
		// non-JSON or empty body — fall through to null
	}
	return null;
}
