import crypto from "node:crypto"
import { mintAskGuestJwt, resolveIssuer } from "@/app/lib/siwe/jwt"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const guestId = crypto.randomUUID()
  const token = mintAskGuestJwt(guestId, resolveIssuer(new URL(request.url).origin))
  return Response.json(
    { jwt: token, subject: `ask-guest:${guestId}` },
    { headers: { "Cache-Control": "no-store, private" } },
  )
}
