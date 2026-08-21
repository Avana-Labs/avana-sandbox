import crypto from "node:crypto"
import { ConvexHttpClient } from "convex/browser"
import { mintAskGuestJwt, resolveIssuer } from "@/app/lib/siwe/jwt"
import { api } from "@/convex/_generated/api"

export const runtime = "nodejs"

export const ASK_AI_GUEST_COOKIE = "avana_ask_guest"
const GUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Per-IP throttle on minting NEW guest identities. Without this, clearing the
 * `avana_ask_guest` cookie yields an unlimited supply of fresh `ask-guest:<uuid>`
 * subjects, each with its own Ask AI quota — a trivial abuse vector.
 *
 * This in-memory limiter is the per-instance FALLBACK. The primary limit is the
 * shared Convex-backed counter in `isGuestMintAllowed` (rate limiter keyed by IP),
 * which holds across serverless instances and cold starts. If Convex is briefly
 * unreachable, we degrade to this best-effort per-instance cap rather than fail open.
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

/**
 * Shared, cross-instance mint check backed by a Convex rate limiter, with the
 * in-memory limiter above as a resilient fallback if Convex is unreachable. This
 * closes the multi-instance / cold-start bypass: clearing the guest cookie can no
 * longer mint unlimited fresh quotas by hitting different serverless instances.
 */
export async function isGuestMintAllowed(ip: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (url) {
    try {
      const client = new ConvexHttpClient(url)
      const { ok } = await client.mutation(api.askAI.recordGuestMint, { ip })
      return ok
    } catch {
      // Convex unreachable — fall back to the per-instance in-memory limiter.
    }
  }
  return allowGuestMint(ip)
}

export async function POST(request: Request) {
  const existingGuestId = readAskGuestId(request.headers.get("cookie"))
  if (!existingGuestId && !(await isGuestMintAllowed(readClientIp(request)))) {
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
