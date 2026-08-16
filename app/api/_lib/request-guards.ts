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
