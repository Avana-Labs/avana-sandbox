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
 * Resolve the token issuer. Convex matches the token `iss` against the `domain` in
 * convex/auth.config.ts by EXACT string, and must be able to fetch `${iss}/.well-known/jwks.json`.
 *
 * Prefer the pinned env var so `iss` is DETERMINISTIC regardless of which host the request
 * arrived on — otherwise a user landing on a preview URL or a secondary Vercel alias mints a
 * token whose `iss` (the request origin) won't match the Convex-registered issuer, and sign-in
 * fails with UNAUTHENTICATED. Only fall back to the request origin for local dev; in a deployed
 * environment an unset issuer is a misconfiguration, so surface it loudly. The trailing slash is
 * stripped so a stray "…app/" here can never mismatch a "…app" registered on the Convex side.
 */
export function resolveIssuer(requestOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_SIWE_ISSUER?.trim()
  if (!configured && process.env.NODE_ENV === "production") {
    console.warn(
      "[siwe] NEXT_PUBLIC_SIWE_ISSUER is not set — issuer falls back to the request origin, so " +
        "wallet sign-in will fail on any non-canonical domain (preview URL, alias). Pin it to the " +
        "canonical origin and set the Convex SIWE_JWT_ISSUER env var to the SAME value.",
    )
  }
  return (configured || requestOrigin).replace(/\/+$/, "")
}

/** Mint an RS256 JWT carrying the supplied identity claims. */
function mintJwt(payloadClaims: Record<string, unknown>, issuer: string): string {
  const jwk = privateJwk()
  const key = crypto.createPrivateKey({ key: jwk as crypto.JsonWebKeyInput["key"], format: "jwk" })
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT", kid: jwk.kid }
  const payload = {
    iss: issuer,
    aud: AUDIENCE,
    iat: now,
    nbf: now,
    exp: now + TTL_SECONDS,
    ...payloadClaims,
  }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  // RS256: RSASSA-PKCS1-v1_5 over SHA-256.
  const signature = crypto.sign("sha256", Buffer.from(signingInput), key)
  return `${signingInput}.${b64url(signature)}`
}

/** Mint a wallet identity after SIWE verification. */
export function mintSandboxJwt(wallet: string, issuer: string): string {
  const normalized = wallet.toLowerCase()
  return mintJwt({ sub: normalized, wallet: normalized, scope: "wallet" }, issuer)
}

/**
 * Mint a limited Ask AI guest identity. It intentionally has no wallet claim,
 * so wallet-scoped Convex tools cannot treat it as an authenticated account.
 */
export function mintAskGuestJwt(guestId: string, issuer: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(guestId)) throw new Error("Invalid Ask AI guest id")
  return mintJwt({ sub: `ask-guest:${guestId.toLowerCase()}`, scope: "ask-ai" }, issuer)
}
