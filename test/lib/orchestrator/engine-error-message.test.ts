import {
	engineErrorMessage,
	engineReadErrorMessage,
	isControllerChanged,
	orchestratorErrorMessage,
} from "../../../src/lib/orchestrator/engine-error-message";

function axiosLikeError(code: string) {
	return { response: { data: { success: false, code } } };
}

describe("engineErrorMessage — a Start or Pause that failed", () => {
	it("names the missing settings so the operator knows what to set", () => {
		expect(
			engineErrorMessage(axiosLikeError("ENGINE_NOT_CONFIGURED")),
		).toContain("SM_ENGINE_BASE_URL");
	});

	/**
	 * The server's own token, not the user's session. Saying so is the whole
	 * point of not relaying the engine's 401 as a 401.
	 */
	it("points at the server token when the engine rejects it", () => {
		const message = engineErrorMessage(axiosLikeError("ENGINE_UNAUTHORIZED"));

		expect(message).toContain("SM_ENGINE_API_TOKEN");
		expect(message).toContain("this server's token");
	});

	it("says the report was not started when the engine is silent", () => {
		expect(engineErrorMessage(axiosLikeError("ENGINE_UNREACHABLE"))).toContain(
			"was not started",
		);
	});

	it("tells the reader to refresh when the run is already gone", () => {
		const message = engineErrorMessage(axiosLikeError("NO_ACTIVE_RUN"));

		expect(message).toContain("refresh");
		// There was nothing to start in the first place.
		expect(message).not.toContain("was not started");
	});

	it.each([
		["an unknown code", axiosLikeError("SOMETHING_NEW")],
		["a bare network error", new Error("Network Error")],
		["a response with no body", { response: {} }],
		["nothing at all", null],
	])("falls back to a plain explanation for %s", (_label, error) => {
		expect(engineErrorMessage(error)).toBe(
			"Could not reach SM Engine — the report was not started",
		);
	});
});

describe("engineReadErrorMessage — a status that could not be read", () => {
	/** Nothing was being started, so the action wording would simply be false. */
	it("drops the claim that a report was not started", () => {
		expect(engineReadErrorMessage(axiosLikeError("ENGINE_UNREACHABLE"))).toBe(
			"SM Engine did not respond",
		);
	});

	it("still explains the cause it knows", () => {
		expect(
			engineReadErrorMessage(axiosLikeError("ENGINE_NOT_CONFIGURED")),
		).toContain("SM_ENGINE_BASE_URL");
	});

	it("falls back without the action wording", () => {
		expect(engineReadErrorMessage(null)).toBe("Could not reach SM Engine");
	});
});

describe("a page acting for the wrong orchestrator", () => {
	const refusal = axiosLikeError("CONTROLLER_CHANGED");

	it("tells the reader the switch moved and to refresh", () => {
		const message = engineErrorMessage(refusal);

		expect(message).toContain("orchestrator was switched");
		expect(message).toContain("refresh");
		// Nothing was ever attempted, so the usual action suffix would mislead.
		expect(message).not.toContain("was not started");
	});

	/**
	 * The n8n handlers keep their own wording for their own failures, and
	 * borrow this one answer, which is not theirs alone.
	 */
	it("overrides an n8n handler's fallback wording", () => {
		expect(
			orchestratorErrorMessage(refusal, "Failed to pause report"),
		).toContain("orchestrator was switched");
	});

	it("leaves an ordinary n8n failure with its own wording", () => {
		expect(
			orchestratorErrorMessage(new Error("boom"), "Failed to pause report"),
		).toBe("Failed to pause report");
	});

	it("says nothing was changed when the switch itself could not be read", () => {
		const message = engineErrorMessage(axiosLikeError("CONTROLLER_UNREADABLE"));

		expect(message).toContain("which orchestrator is driving");
		expect(message).toContain("nothing was changed");
	});

	it("is recognisable to the hooks, so the cached controller is re-read", () => {
		expect(isControllerChanged(refusal)).toBe(true);
		expect(isControllerChanged(axiosLikeError("ENGINE_UNREACHABLE"))).toBe(
			false,
		);
		expect(isControllerChanged(null)).toBe(false);
	});
});
