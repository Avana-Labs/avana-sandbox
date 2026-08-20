import crypto from "node:crypto"
import { mintAskGuestJwt, resolveIssuer } from "@/app/lib/siwe/jwt"

export const runtime = "nodejs"

export const ASK_AI_GUEST_COOKIE = "avana_ask_guest"
const GUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function readAskGuestId(cookieHeader: string | null) {
  const value = cookieHeader
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === ASK_AI_GUEST_COOKIE)?.[1]
  return value && GUEST_ID_PATTERN.test(value) ? value : null
}

export async function POST(request: Request) {
  const existingGuestId = readAskGuestId(request.headers.get("cookie"))
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
