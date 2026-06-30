"use client"

import { useState } from "react"
import { useSiweAuth } from "./use-siwe-auth"

/** Deterministic two-stop gradient identicon derived from the wallet address. */
function walletGradient(address: string): string {
  let h = 0
  for (let i = 0; i < address.length; i++) h = (Math.imul(h, 31) + address.charCodeAt(i)) | 0
  const a = Math.abs(h) % 360
  const b = (a + 90) % 360
  return `linear-gradient(135deg, hsl(${a} 75% 58%), hsl(${b} 75% 48%))`
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/**
 * SIWE sign-in control. Renders only when a real wallet is connected (so the demo /
 * sandbox flow is untouched when no wallet is present). Signing in mints the JWT that
 * scopes per-wallet Convex state to the connected address.
 */
export function SandboxSignInButton({ size = "desktop" }: { size?: "mobile" | "desktop" }) {
  const { isConnected, isSignedIn, signIn, signOut, address } = useSiweAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isConnected) return null

  const base =
    size === "mobile"
      ? "inline-flex h-9 items-center justify-center rounded-full px-3 text-[13px] font-medium transition-colors"
      : "inline-flex h-10 items-center justify-center rounded-full px-3.5 text-[14px] font-medium transition-colors"

  if (isSignedIn && address) {
    return (
      <button
        type="button"
        onClick={signOut}
        title={`${address} — click to disconnect`}
        className={`${base} gap-2 border border-border bg-transparent text-foreground transition-colors hover:bg-surface-inset`}
      >
        <span
          aria-hidden
          className="size-5 shrink-0 rounded-full ring-1 ring-border"
          style={{ background: walletGradient(address) }}
        />
        <span className="font-data tabular-nums">{shortAddress(address)}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      title={error ?? "Sign in with Ethereum to scope your sandbox positions"}
      onClick={async () => {
        setBusy(true)
        setError(null)
        try {
          await signIn()
        } catch (e) {
          setError(e instanceof Error ? e.message : "Sign-in failed")
        } finally {
          setBusy(false)
        }
      }}
      className={`${base} border border-brand/40 text-brand hover:bg-brand/10 disabled:opacity-60`}
    >
      {busy ? "Signing…" : "Sign in"}
    </button>
  )
}
