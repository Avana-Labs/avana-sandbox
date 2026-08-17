import crypto from "node:crypto"
import { cookies } from "next/headers"
import { assertSameOrigin, clientKey, rateLimitShared } from "../../_lib/request-guards"

export const dynamic = "force-dynamic"

/** Issue a single-use SIWE nonce, bound to the client via an httpOnly cookie. */
export async function GET(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "origin not allowed" }, { status: 403 })
  if (!(await rateLimitShared(`siwe-nonce:${clientKey(request)}`, 30, 60_000))) {
    return Response.json({ error: "too many nonce requests" }, { status: 429 })
  }

  const nonce = crypto.randomBytes(16).toString("hex")
  const jar = await cookies()
  jar.set("siwe-nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  })
  return Response.json({ nonce })
}
