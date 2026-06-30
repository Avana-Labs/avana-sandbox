import "server-only"
import crypto from "node:crypto"

/**
 * Minimal ES256 JWT mint + JWK publication for the SIWE → JWT bridge, using Node's
 * built-in crypto (no external dep). The private JWK is a DEV-only throwaway key in
 * `.env.local` (SIWE_JWT_PRIVATE_JWK); production supplies its own via the same var.
 *
 * Convex verifies these tokens itself: convex/auth.config.ts registers the issuer,
 * and Convex fetches `${issuer}/.well-known/jwks.json` (this app) to get the public
 * key. So we only MINT here; we never verify our own tokens server-side.
 */

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string }

const AUDIENCE = "convex"
const TTL_SECONDS = 60 * 60 // 1h

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url")
}

function privateJwk(): Jwk {
  const raw = process.env.SIWE_JWT_PRIVATE_JWK
  if (!raw) throw new Error("SIWE_JWT_PRIVATE_JWK is not set (see .env.local).")
  return JSON.parse(raw) as Jwk
}

/** The public JWK (all RSA private fields stripped) for the JWKS endpoint. */
export function getPublicJwk(): Jwk {
  const { d: _d, p: _p, q: _q, dp: _dp, dq: _dq, qi: _qi, ...pub } = privateJwk()
  return { ...pub, alg: "RS256", use: "sig" }
}

export function getSigningKid(): string {
  return privateJwk().kid ?? "avana-dev"
}

/**
 * Resolve the token issuer. Must equal the `domain` registered in
 * convex/auth.config.ts and be reachable by the Convex backend for the JWKS fetch.
 * Prefer the explicit env var; fall back to the request origin (local dev).
 */
export function resolveIssuer(requestOrigin: string): string {
  return process.env.NEXT_PUBLIC_SIWE_ISSUER || requestOrigin
}

/** Mint an ES256 JWT carrying the controlling wallet in `sub` (and a `wallet` claim). */
export function mintSandboxJwt(wallet: string, issuer: string): string {
  const jwk = privateJwk()
  const key = crypto.createPrivateKey({ key: jwk as crypto.JsonWebKeyInput["key"], format: "jwk" })
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT", kid: jwk.kid }
  const payload = {
    iss: issuer,
    aud: AUDIENCE,
    sub: wallet.toLowerCase(),
    wallet: wallet.toLowerCase(),
    iat: now,
    nbf: now,
    exp: now + TTL_SECONDS,
  }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  // RS256: RSASSA-PKCS1-v1_5 over SHA-256.
  const signature = crypto.sign("sha256", Buffer.from(signingInput), key)
  return `${signingInput}.${b64url(signature)}`
}
