import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function clientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  return forwardedFor || realIp || "unknown"
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  // Fail CLOSED: these guards protect state-changing POST endpoints (SIWE
  // nonce/verify/dev-token), and browsers always attach an Origin to such
  // cross-origin-capable requests. A missing Origin or Host is treated as a
  // mismatch rather than waved through, so a forged request stripped of its
  // Origin can't bypass the check.
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/**
 * Same-origin guard tuned for read-only GET endpoints (e.g. /api/fx-rates).
 *
 * A browser does NOT attach an `Origin` header to a plain same-origin GET, so
 * `assertSameOrigin` (which fails closed on a missing Origin) rejects the app's
 * own legitimate fetch. That's correct for a state-changing POST but wrong for a
 * cheap cached read the app fetches from its own pages.
 *
 * Instead we trust the browser-set `Sec-Fetch-Site` metadata header, which the
 * page CANNOT forge cross-origin: `same-origin` / `same-site` / `none` (a
 * top-level navigation / direct hit) are allowed, `cross-site` is blocked. When
 * the header is absent (older clients, server-to-server), fall back to comparing
 * the `Origin` (if the client sent one) against the host, and otherwise allow —
 * the endpoint is read-only and returns public FX data, so the goal is only to
 * deny another site scripting our egress, not to gate reads behind a header no
 * same-origin GET carries.
 */
export function assertSameOriginRead(request: Request) {
  const secFetchSite = request.headers.get("sec-fetch-site")
  if (secFetchSite) {
    return secFetchSite === "same-origin" || secFetchSite === "same-site" || secFetchSite === "none"
  }
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  if (origin && host) {
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }
  // No cross-origin signal at all → a same-origin GET or a server-side fetch.
  return true
}

/**
 * Per-instance in-memory rate limit. Only correct when the app runs as a single
 * Node process — on horizontally-scaled deploys (Vercel, k8s replicas) each
 * instance keeps its own bucket, so a burst can multiply by the replica count.
 * Prefer `rateLimitShared` for anything guarding a real security boundary; this
 * one remains available as a synchronous fallback for tests and single-process
 * dev, and is used automatically when no shared store is configured.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

let cachedClient: ConvexHttpClient | null = null
function sharedStoreClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL
  if (!url) return null
  if (cachedClient) return cachedClient
  cachedClient = new ConvexHttpClient(url)
  return cachedClient
}

/**
 * Shared-store rate limit backed by a Convex table (`rateLimitBuckets`). Convex
 * mutations are serializable, so concurrent callers with the same key see a single
 * counter across every Next server instance — the fix for the per-process drift
 * `rateLimit` above suffers from. Falls back to the in-memory bucket when no
 * `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_URL` is configured (tests, offline dev) so
 * this helper never turns a limiter into a hard dependency on Convex reachability.
 */
export async function rateLimitShared(key: string, limit: number, windowMs: number): Promise<boolean> {
  const client = sharedStoreClient()
  if (!client) return rateLimit(key, limit, windowMs)
  try {
    // Pass the shared secret when configured so the (public) mutation can require it.
    // Undefined when unset — the mutation only enforces it when its own env has it too.
    const secret = process.env.CONVEX_RATE_LIMIT_SECRET
    const result = await client.mutation(api.rateLimits.consume, { key, limit, windowMs, secret })
    return result.allowed
  } catch {
    // Convex temporarily unreachable — degrade to the local bucket rather than
    // fail-closed on every request. Availability wins over strict enforcement
    // for guards whose upstream endpoint (SIWE) already fails safe on abuse.
    return rateLimit(key, limit, windowMs)
  }
}
