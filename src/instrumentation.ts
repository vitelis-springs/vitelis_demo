/**
 * Cron triggers used to live here as an in-process `setInterval` that
 * fetched internal API routes over `http://127.0.0.1:$PORT`. That pattern
 * only works on a long-lived server process; on Vercel each function
 * invocation is a short-lived, isolated instance, so the interval never
 * survived between requests and self-fetches failed with ECONNREFUSED.
 *
 * Cron triggers are now external: scheduled GitHub Actions workflows
 * (.github/workflows/cron-orchestrator.yml, cron-notifications.yml) call
 * /api/internal/orchestrator-cron and /api/internal/notification-cron
 * directly over HTTPS.
 */
export async function register() {}
