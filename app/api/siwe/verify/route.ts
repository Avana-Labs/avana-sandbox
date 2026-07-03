import { cookies } from "next/headers"
import type { Address, Hex } from "viem"
import { extractSiweAddress, extractSiweDomain, extractSiweNonce, extractSiweUri } from "@/app/lib/siwe/message"
import { mintSandboxJwt, resolveIssuer } from "@/app/lib/siwe/jwt"
import { verifySiweSignature } from "@/app/lib/siwe/signature"

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

  // Bind the signature to THIS origin. EIP-4361 puts the domain/URI in the signed
  // payload precisely so a signature phished for another site cannot be relayed here.
  // The client signs with domain = window.location.host, so it must equal our host.
  const host = req.headers.get("host")
  const domain = extractSiweDomain(message)
  if (!domain || (host && domain !== host)) {
    return Response.json({ error: "SIWE domain does not match this origin" }, { status: 401 })
  }
  const uri = extractSiweUri(message)
  if (uri) {
    try {
      const uriHost = new URL(uri).host
      if (host && uriHost !== host) {
        return Response.json({ error: "SIWE URI does not match this origin" }, { status: 401 })
      }
    } catch {
      return Response.json({ error: "malformed SIWE URI" }, { status: 400 })
    }
  }

  const jar = await cookies()
  const expectedNonce = jar.get("siwe-nonce")?.value
  if (!expectedNonce || expectedNonce !== nonce) {
    return Response.json({ error: "invalid or expired nonce" }, { status: 401 })
  }

  const signatureIsValid = await verifySiweSignature({
    address: address as Address,
    message,
    signature: signature as Hex,
  })
  if (!signatureIsValid) {
    return Response.json({ error: "signature does not match address" }, { status: 401 })
  }

  // Single-use: burn the nonce so the signed message can't be replayed.
  jar.delete("siwe-nonce")

  const issuer = resolveIssuer(new URL(req.url).origin)
  const token = mintSandboxJwt(address, issuer)
  return Response.json({ token, wallet: address.toLowerCase() })
}
