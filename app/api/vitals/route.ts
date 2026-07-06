/**
 * Collector for the INP attribution beacons sent by <InpReporter />. Deliberately trivial:
 * it just structured-logs the payload (visible in Vercel function logs / the local terminal)
 * so the real slow interaction can be identified without a third-party analytics service.
 * sendBeacon posts a text/plain body, so parse the raw text rather than request.json().
 */
export async function POST(request: Request) {
  try {
    const raw = await request.text()
    if (raw && raw.length < 4000) {
      // eslint-disable-next-line no-console
      console.log("[web-vitals]", raw)
    }
  } catch {
    // Ignore malformed beacons — telemetry must never 500.
  }
  return new Response(null, { status: 204 })
}
