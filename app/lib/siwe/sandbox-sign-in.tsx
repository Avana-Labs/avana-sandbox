"use client"

import { useState } from "react"
import { useSiweAuth } from "./use-siwe-auth"

/**
 * SIWE sign-in control. Renders only when a real wallet is connected (so the demo /
 * sandbox flow is untouched when no wallet is present). Signing in mints the JWT that
 * scopes per-wallet Convex state to the connected address.
 */
export function SandboxSignInButton({ size = "desktop" }: { size?: "mobile" | "desktop" }) {
  const { isConnected, isSignedIn, signIn, signOut } = useSiweAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isConnected) return null

  const base =
    size === "mobile"
      ? "inline-flex h-9 items-center justify-center rounded-full px-3 text-[13px] font-medium transition-colors"
      : "inline-flex h-10 items-center justify-center rounded-full px-3.5 text-[14px] font-medium transition-colors"

  if (isSignedIn) {
    return (
      <button
        type="button"
        onClick={signOut}
        title="Signed in to the sandbox — click to sign out"
        className={`${base} border border-border bg-surface-inset text-foreground hover:bg-surface-inset/80`}
      >
        Signed in
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
