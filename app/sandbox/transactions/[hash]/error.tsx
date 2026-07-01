"use client"

import { useEffect } from "react"
import Link from "next/link"

/**
 * Route-level boundary for the JWT-gated synthetic-receipt page. The receipt query can
 * throw UNAUTHENTICATED / WALLET_MISMATCH (no token, or a wallet that doesn't own the
 * receipt); without this it would fall through to the generic framework error page.
 * Render a graceful signed-out / not-found state instead.
 */
export default function SyntheticTransactionError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error)
  }, [error])

  const isAuth = /UNAUTHENTICATED|WALLET_MISMATCH|Not authenticated/i.test(error.message)
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-5 py-16">
      <p className="text-sm text-muted-foreground">Avana sandbox</p>
      <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em]">Synthetic transaction receipt</h1>
      <p className="mt-8 text-muted-foreground">
        {isAuth
          ? "Sign in with the wallet that created this transaction to view its receipt."
          : "We couldn't load this receipt right now."}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          className="inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
        <Link
          className="inline-flex rounded-full bg-muted px-6 py-3 text-sm font-semibold text-foreground"
          href="/dashboard"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
