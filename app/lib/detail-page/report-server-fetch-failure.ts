/**
 * Server fetchers degrade to the catalog (null / []) when a Convex read fails, which is the
 * right render behaviour but used to leave no trace: a deadline, a renamed query or an auth
 * error looked exactly like "no data". Log the fetcher name and cause so the fallback is
 * visible in the server logs. Keep the log to one line with no payload.
 */
export function reportServerFetchFailure(fetcher: string, error: unknown): void {
  const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  console.warn(`[server-fetch] ${fetcher} fell back: ${reason.slice(0, 300)}`)
}
