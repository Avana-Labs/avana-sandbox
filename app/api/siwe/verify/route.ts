import { cookies } from "next/headers"
import { recoverMessageAddress } from "viem"
import { extractSiweAddress, extractSiweNonce } from "@/app/lib/siwe/message"
import { mintSandboxJwt, resolveIssuer } from "@/app/lib/siwe/jwt"

export const dynamic = "force-dynamic"

/**
 * Verify a SIWE signature and mint a sandbox JWT (wallet in `sub`/`wallet`).
 * The token is verified by Convex against convex/auth.config.ts + this app's JWKS.
 */
export async function POST(req: Request) {
  let body: { message?: unknown; signature?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 })
  }
  const { message, signature } = body
  if (typeof message !== "string" || typeof signature !== "string") {
    return Response.json({ error: "message and signature are required" }, { status: 400 })
  }

  const address = extractSiweAddress(message)
  const nonce = extractSiweNonce(message)
  if (!address || !nonce) {
    return Response.json({ error: "malformed SIWE message" }, { status: 400 })
  }

  const jar = await cookies()
  const expectedNonce = jar.get("siwe-nonce")?.value
  if (!expectedNonce || expectedNonce !== nonce) {
    return Response.json({ error: "invalid or expired nonce" }, { status: 401 })
  }

  let recovered: string
  try {
    recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` })
  } catch {
    return Response.json({ error: "signature verification failed" }, { status: 401 })
  }
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return Response.json({ error: "signature does not match address" }, { status: 401 })
  }

  // Single-use: burn the nonce so the signed message can't be replayed.
  jar.delete("siwe-nonce")

  const issuer = resolveIssuer(new URL(req.url).origin)
  const token = mintSandboxJwt(address, issuer)
  return Response.json({ token, wallet: address.toLowerCase() })
}
