/**
 * Validate runtime env once at boot, before the server accepts traffic
 * (ADR-NEXT-S10). A bad config crashes startup — the container never becomes
 * healthy — instead of surfacing as a request-time 500 through the S09 boundary.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { serverEnv } = await import("@/lib/env");
    serverEnv();
  }
}
