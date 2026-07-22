export const SM_GENERATE_RUN_SETTINGS_WEBHOOK_URL =
	"https://vitelis.app.n8n.cloud/webhook/sm-generate-run-settings";

/**
 * Triggers the n8n workflow that turns per-section user instructions into the
 * full SalesMiner report settings, based on the customer's product model and
 * the selected target accounts (companies). Responds synchronously with the
 * generated settings object.
 */
export async function generateReportSettings(payload: {
	customerId: number;
	accountIds: number[];
	userInstructions: Record<string, string | null>;
}): Promise<Record<string, unknown>> {
	const res = await fetch(SM_GENERATE_RUN_SETTINGS_WEBHOOK_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			customer_id: payload.customerId,
			account_ids: payload.accountIds,
			user_instructions: payload.userInstructions,
		}),
	});
	if (!res.ok) {
		const bodyText = await res.text().catch(() => "");
		throw new Error(
			`workflow returned ${res.status}${bodyText ? `: ${bodyText.slice(0, 300)}` : ""}`,
		);
	}
	return (await res.json()) as Record<string, unknown>;
}
