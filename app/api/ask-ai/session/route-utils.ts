import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

export const ASK_AI_GUEST_COOKIE = "avana_ask_guest"
const GUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
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

export function resetGuestMintThrottle() {
  mintHits.clear()
}

export async function isGuestMintAllowed(ip: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  const secret = process.env.CONVEX_RATE_LIMIT_SECRET
  if (url && secret) {
    try {
      const client = new ConvexHttpClient(url)
      const { ok } = await client.mutation(api.askAI.recordGuestMint, { ip, secret })
      return ok
    } catch {
      // Convex unreachable — fall back to the per-instance limiter.
    }
  }
  if (process.env.NODE_ENV === "production" && url) return false
  return allowGuestMint(ip)
}
