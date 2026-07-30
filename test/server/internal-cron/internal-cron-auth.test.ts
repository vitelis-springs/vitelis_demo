/**
 * @jest-environment node
 *
 * E2E tests for the internal cron endpoints' auth guard, through the actual
 * route handlers so a regression in wiring (not just the helper) is caught.
 */
import { NextRequest } from "next/server";

jest.mock("../../../src/lib/prisma", () => ({
	__esModule: true,
	default: {},
}));

jest.mock("../../../src/app/server/modules/report-notifications", () => ({
	ReportNotificationsService: {
		runNotificationCronOnce: jest.fn(),
	},
}));

jest.mock(
	"../../../src/app/server/modules/n8n-tasks/n8n-tasks.service",
	() => ({
		N8NTasksService: {
			runCycle: jest.fn(),
		},
	}),
);

import { POST as notificationCronPost } from "../../../src/app/api/internal/notification-cron/route";
import { POST as orchestratorCronPost } from "../../../src/app/api/internal/orchestrator-cron/route";
import { ReportNotificationsService } from "../../../src/app/server/modules/report-notifications";
import { N8NTasksService } from "../../../src/app/server/modules/n8n-tasks/n8n-tasks.service";

const ROUTES: Array<{
	name: string;
	handler: (request: NextRequest) => Promise<Response>;
	url: string;
	sideEffect: jest.Mock;
}> = [
	{
		name: "notification-cron",
		handler: notificationCronPost,
		url: "http://localhost:3000/api/internal/notification-cron",
		sideEffect: ReportNotificationsService.runNotificationCronOnce as jest.Mock,
	},
	{
		name: "orchestrator-cron",
		handler: orchestratorCronPost,
		url: "http://localhost:3000/api/internal/orchestrator-cron",
		sideEffect: N8NTasksService.runCycle as jest.Mock,
	},
];

function makeRequest(
	url: string,
	headers?: Record<string, string>,
): NextRequest {
	return new NextRequest(new URL(url), { method: "POST", headers });
}

describe.each(ROUTES)("$name internal cron auth", ({
	handler,
	url,
	sideEffect,
}) => {
	const originalSecret = process.env.INTERNAL_CRON_SECRET;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.INTERNAL_CRON_SECRET = "test-secret";
	});

	afterAll(() => {
		process.env.INTERNAL_CRON_SECRET = originalSecret;
	});

	it("rejects requests with no secret header", async () => {
		const response = await handler(makeRequest(url));
		expect(response.status).toBe(401);
		expect(sideEffect).not.toHaveBeenCalled();
	});

	it("rejects requests with a wrong secret", async () => {
		const response = await handler(
			makeRequest(url, { "x-internal-cron-secret": "wrong" }),
		);
		expect(response.status).toBe(401);
		expect(sideEffect).not.toHaveBeenCalled();
	});

	it("rejects requests when INTERNAL_CRON_SECRET is not configured server-side", async () => {
		delete process.env.INTERNAL_CRON_SECRET;
		const response = await handler(
			makeRequest(url, { "x-internal-cron-secret": "test-secret" }),
		);
		expect(response.status).toBe(401);
		expect(sideEffect).not.toHaveBeenCalled();
	});

	it("accepts requests with the correct secret", async () => {
		sideEffect.mockResolvedValueOnce(undefined);
		const response = await handler(
			makeRequest(url, { "x-internal-cron-secret": "test-secret" }),
		);
		expect(response.status).toBe(200);
		expect(sideEffect).toHaveBeenCalledTimes(1);
	});
});
