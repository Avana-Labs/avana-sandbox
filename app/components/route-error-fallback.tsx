"use client"

import Link from "next/link"
import { useTranslation } from "@/app/lib/i18n/use-translation"

/**
 * Branded recovery UI shared by route-level error boundaries. Rendered when a
 * segment throws during render; `onRetry` re-attempts the segment and the link
 * offers a safe way back. Auth-shaped errors get a wallet-reconnect message.
 */
export function RouteErrorFallback({
  onRetry,
  homeHref = "/dashboard",
  homeLabel = "Back to dashboard",
  title = "Something went wrong",
  message,
  error,
}: {
  onRetry: () => void
  homeHref?: string
  homeLabel?: string
  title?: string
  message?: string
  error?: Error
}) {
  const { t } = useTranslation()
  const isAuth = error ? /UNAUTHENTICATED|WALLET_MISMATCH|Not authenticated/i.test(error.message) : false
  const resolvedTitle = isAuth ? t("Your session needs a refresh") : t(title)
  const resolvedMessage =
    message ??
    (isAuth
      ? t("Reconnect your wallet to continue. Authenticated sessions stay locked until access is confirmed.")
      : t("This is on our side, not your wallet. Try again, and let us know if it keeps happening."))

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-start justify-center px-5 py-16">
      <p className="text-sm text-muted-foreground">Avana</p>
      <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em]">{resolvedTitle}</h1>
      <p className="mt-6 max-w-prose text-muted-foreground">{resolvedMessage}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
        >
          {t("Try again")}
        </button>
        <Link
          href={homeHref}
          className="inline-flex rounded-full bg-muted px-6 py-3 text-sm font-semibold text-foreground transition hover:opacity-90"
        >
          {t(homeLabel)}
        </Link>
      </div>
    </main>
  )
}
