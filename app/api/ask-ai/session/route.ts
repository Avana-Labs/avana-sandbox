import crypto from "node:crypto"
import { mintAskGuestJwt, resolveIssuer } from "@/app/lib/siwe/jwt"
import { ASK_AI_GUEST_COOKIE, isGuestMintAllowed, readAskGuestId, readClientIp } from "./route-utils"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const existingGuestId = readAskGuestId(request.headers.get("cookie"))
  if (!existingGuestId && !(await isGuestMintAllowed(readClientIp(request)))) {
    return Response.json(
      { error: "Too many new Ask AI sessions from this network. Try again later." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store, private",
          "Retry-After": String(60 * 60),
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
