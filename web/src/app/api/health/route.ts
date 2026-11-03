// Liveness probe for the container HEALTHCHECK (ADR-NEXT-S10). No CMS/data I/O —
// it proves the server serves, so a CMS outage can't restart-loop a live process.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", { headers: { "content-type": "text/plain" } });
}
