import crypto from "node:crypto"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

/** Issue a single-use SIWE nonce, bound to the client via an httpOnly cookie. */
export async function GET() {
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
