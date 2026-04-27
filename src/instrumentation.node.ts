const ORCHESTRATOR_INTERVAL_MS = 30_000;

const g = global as typeof global & { __orchestratorCronStarted?: boolean };

export async function register() {
	if (process.env.NEXT_RUNTIME !== "nodejs") return;
	if (g.__orchestratorCronStarted) return;
	g.__orchestratorCronStarted = true;

	const { N8NTasksService } = await import(
		"./app/server/modules/n8n-tasks/n8n-tasks.service"
	);

	const run = async () => {
		try {
			await N8NTasksService.runCycle();
		} catch (error) {
			console.error("[OrchestratorCron] cycle failed:", error);
		}
	};

	setInterval(() => void run(), ORCHESTRATOR_INTERVAL_MS);
	console.log(
		`[OrchestratorCron] started, interval=${ORCHESTRATOR_INTERVAL_MS}ms`,
	);
}
