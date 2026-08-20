import crypto from "node:crypto"
import { mintAskGuestJwt, resolveIssuer } from "@/app/lib/siwe/jwt"

export const runtime = "nodejs"

export const ASK_AI_GUEST_COOKIE = "avana_ask_guest"
const GUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Per-IP throttle on minting NEW guest identities. Without this, clearing the
 * `avana_ask_guest` cookie yields an unlimited supply of fresh `ask-guest:<uuid>`
 * subjects, each with its own Ask AI quota — a trivial abuse vector.
 *
 * NOTE (serverless caveat): this is a best-effort, in-memory limiter scoped to a
 * single server instance. On serverless / multi-instance deployments the counter
 * is not shared across instances, so the effective ceiling is roughly
 * `MINT_THROTTLE_MAX * <live instances>`. It still meaningfully caps a single
 * client hammering one instance. A fully correct limit would need a shared store
 * (e.g. a Convex-backed counter); that is deliberately out of scope for this
 * route, which mints pre-auth and must stay dependency-light.
 */
export const MINT_THROTTLE_MAX = 30
export const MINT_THROTTLE_WINDOW_MS = 60 * 60 * 1_000
const mintHits = new Map<string, number[]>()

export function readAskGuestId(cookieHeader: string | null) {
  const value = cookieHeader
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === ASK_AI_GUEST_COOKIE)?.[1]
  return value && GUEST_ID_PATTERN.test(value) ? value : null
}

export function readClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

/**
 * Record a new-identity mint for `ip` and report whether it is within the
 * per-IP window budget. Prunes expired timestamps so the map stays bounded.
 * Exported for testing and reuse.
 */
export function allowGuestMint(ip: string, now = Date.now()) {
  const windowStart = now - MINT_THROTTLE_WINDOW_MS
  const recent = (mintHits.get(ip) ?? []).filter((ts) => ts > windowStart)
  if (recent.length >= MINT_THROTTLE_MAX) {
    mintHits.set(ip, recent)
    return false
  }
  recent.push(now)
  mintHits.set(ip, recent)
  return true
}

/** Test-only: clear the in-memory mint counters. */
export function resetGuestMintThrottle() {
  mintHits.clear()
}

export async function POST(request: Request) {
  const existingGuestId = readAskGuestId(request.headers.get("cookie"))
  if (!existingGuestId && !allowGuestMint(readClientIp(request))) {
    return Response.json(
      { error: "Too many new Ask AI sessions from this network. Try again later." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store, private",
          "Retry-After": String(Math.ceil(MINT_THROTTLE_WINDOW_MS / 1_000)),
        },
      },
    )
  }
  const guestId = existingGuestId ?? crypto.randomUUID()
  const token = mintAskGuestJwt(guestId, resolveIssuer(new URL(request.url).origin))
  const response = Response.json(
    { jwt: token, subject: `ask-guest:${guestId}` },
    { headers: { "Cache-Control": "no-store, private" } },
  )
  if (!existingGuestId) {
    response.headers.append(
      "Set-Cookie",
      `${ASK_AI_GUEST_COOKIE}=${guestId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`,
    )
  }
  return response
}
