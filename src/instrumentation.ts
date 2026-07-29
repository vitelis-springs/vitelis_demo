const ORCHESTRATOR_INTERVAL_MS = 30_000;
const NOTIFICATIONS_INTERVAL_MS = 60_000;

const g = global as typeof global & {
	__orchestratorCronStarted?: boolean;
	__notificationSchedulerStarted?: boolean;
};

/**
 * src/middleware.ts runs on the Edge runtime, so Next.js also needs an
 * Edge-compatible build of this file's register(). Importing Prisma-backed
 * service code here (even behind a NEXT_RUNTIME guard) makes that Edge build
 * fail, since webpack still has to resolve the import graph statically. So
 * the schedulers below only ever call `fetch` against internal API routes —
 * the actual cron logic (and its Prisma imports) lives entirely in those
 * route handlers, which Next.js only ever bundles for Node.js.
 */
function internalUrl(path: string): string {
	const port = process.env.PORT || 3000;
	return `http://127.0.0.1:${port}${path}`;
}

function startOrchestratorCron(): void {
	if (g.__orchestratorCronStarted) return;
	g.__orchestratorCronStarted = true;

	const run = async () => {
		try {
			await fetch(internalUrl("/api/internal/orchestrator-cron"), {
				method: "POST",
			});
		} catch (error) {
			console.error("[OrchestratorCron] cycle failed:", error);
		}
	};

	setInterval(() => void run(), ORCHESTRATOR_INTERVAL_MS);
	console.log(
		`[OrchestratorCron] started, interval=${ORCHESTRATOR_INTERVAL_MS}ms`,
	);
}

function startNotificationScheduler(): void {
	if (g.__notificationSchedulerStarted) return;

	if (process.env.NOTIFICATIONS_SCHEDULER_ENABLED === "false") {
		console.log(
			"[NotificationScheduler] disabled via NOTIFICATIONS_SCHEDULER_ENABLED=false",
		);
		return;
	}

	if (!process.env.N8N_NOTIFICATION_WEBHOOK_URL) {
		console.warn(
			"[NotificationScheduler] N8N_NOTIFICATION_WEBHOOK_URL is not set, scheduler will not start",
		);
		return;
	}

	g.__notificationSchedulerStarted = true;

	let running = false;
	const run = async () => {
		if (running) return;
		running = true;
		try {
			await fetch(internalUrl("/api/internal/notification-cron"), {
				method: "POST",
			});
		} catch (error) {
			console.error("[NotificationScheduler] cycle failed:", error);
		} finally {
			running = false;
		}
	};

	setInterval(() => void run(), NOTIFICATIONS_INTERVAL_MS);
	console.log(
		`[NotificationScheduler] started, interval=${NOTIFICATIONS_INTERVAL_MS}ms`,
	);
}

export async function register() {
	if (process.env.NEXT_RUNTIME !== "nodejs") return;

	startOrchestratorCron();
	startNotificationScheduler();
}
