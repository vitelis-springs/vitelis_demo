/**
 * @jest-environment node
 */
import {
	formatDuration,
	runDuration,
} from "../../../src/components/report-steps/steps-dashboard/run-format";

const NOW = Date.parse("2026-07-24T14:10:00.000Z");

describe("runDuration", () => {
	it("clamps an end-before-start run to 0 seconds", () => {
		const d = runDuration(
			{
				status: "DONE",
				startTime: "2026-07-24T13:36:26.850Z",
				endTime: "2026-07-24T13:31:26.850Z",
			},
			NOW,
		);
		expect(d.running).toBe(false);
		expect(d.seconds).toBe(0);
	});

	it("keeps ticking for a PROCESSING run even if it carries an end_time", () => {
		const d = runDuration(
			{
				status: "PROCESSING",
				startTime: "2026-07-24T13:56:26.850Z",
				endTime: "2026-07-24T13:56:26.850Z",
			},
			NOW,
		);
		expect(d.running).toBe(true);
		expect(d.seconds).toBeCloseTo(
			(NOW - Date.parse("2026-07-24T13:56:26.850Z")) / 1000,
		);
	});

	it("measures a completed run from start to end", () => {
		const d = runDuration(
			{
				status: "DONE",
				startTime: "2026-07-24T11:06:26.850Z",
				endTime: "2026-07-24T13:21:26.850Z",
			},
			NOW,
		);
		expect(d.seconds).toBe(8100);
	});

	it("returns null with no start, and for a failure without an end", () => {
		expect(
			runDuration({ status: "PROCESSING", startTime: null, endTime: null }, NOW)
				.seconds,
		).toBeNull();
		expect(
			runDuration(
				{
					status: "ERROR",
					startTime: "2026-07-24T12:36:26.850Z",
					endTime: null,
				},
				NOW,
			).seconds,
		).toBeNull();
	});
});

describe("formatDuration", () => {
	it("formats across the s/m/h/d thresholds", () => {
		expect(formatDuration(null)).toBe("—");
		expect(formatDuration(0.25)).toBe("0s");
		expect(formatDuration(2)).toBe("2s");
		expect(formatDuration(60)).toBe("1m");
		expect(formatDuration(312)).toBe("5m 12s");
		expect(formatDuration(8100)).toBe("2h 15m");
		expect(formatDuration(7200)).toBe("2h");
		expect(formatDuration(97200)).toBe("1d 3h");
		expect(formatDuration(86400)).toBe("1d");
	});
});
