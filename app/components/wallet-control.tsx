"use client"

import { useEffect, useState } from "react"
import { ConnectKitButton, useSIWE } from "connectkit"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

/** Deterministic two-stop gradient identicon derived from the wallet address. */
function walletGradient(address: string): string {
  let h = 0
  for (let i = 0; i < address.length; i++) h = (Math.imul(h, 31) + address.charCodeAt(i)) | 0
  const a = Math.abs(h) % 360
  const b = (a + 90) % 360
  return `linear-gradient(135deg, hsl(${a} 75% 58%), hsl(${b} 75% 48%))`
}

/**
 * Single wallet control for the whole app. ConnectKit + SIWE drive a three-state flow:
 *   not connected  → "Connect" (opens the ConnectKit modal)
 *   connected only → "Sign in" (runs the SIWE signature once)
 *   signed in      → an account pill that opens the modal (switch / disconnect)
 * Clicking the signed-in pill opens the account view — it never silently signs you out.
 *
 * Anti-flicker: wallet/SIWE state is client-only, so SSR + the first client render show
 * a fixed-width "Connect" placeholder that exactly matches the real button. The header
 * therefore doesn't shift when ConnectKit hydrates.
 */
export function WalletControl({ size = "desktop" }: { size?: "mobile" | "desktop" }) {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const siwe = useSIWE()
  const isSignedIn = Boolean(siwe?.isSignedIn)
  const signingIn = Boolean(siwe?.isLoading)

  const base =
    size === "mobile"
      ? "inline-flex h-9 items-center justify-center rounded-full px-4 text-[14px] font-medium transition-colors"
      : "inline-flex h-10 items-center justify-center rounded-full px-4 font-sans text-[15px] font-medium transition-colors"
  const brand = cn(base, "bg-brand text-brand-foreground hover:bg-brand/90")
  const pill = cn(base, "gap-2 border border-border bg-transparent text-foreground hover:bg-surface-inset")

  if (!mounted) {
    return (
      <span className={brand} aria-hidden>
        {t("Connect")}
      </span>
    )
  }

  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, truncatedAddress, ensName, address }) => {
        if (!isConnected) {
          return (
            <button type="button" onClick={show} className={brand} aria-label={t("Connect")}>
              {isConnecting ? t("Connecting…") : t("Connect")}
            </button>
          )
        }
        if (!isSignedIn) {
          return (
            <button
              type="button"
              onClick={() => void siwe?.signIn?.()}
              disabled={signingIn}
              className={cn(brand, "disabled:opacity-70")}
              aria-label={t("Sign in")}
            >
              {signingIn ? t("Signing in…") : t("Sign in")}
            </button>
          )
        }
        return (
          <button type="button" onClick={show} className={pill} title={address}>
            {address ? (
              <span
                aria-hidden
                className="size-5 shrink-0 rounded-full ring-1 ring-border"
                style={{ background: walletGradient(address) }}
              />
            ) : null}
            <span className="font-data tabular-nums">{ensName ?? truncatedAddress}</span>
          </button>
        )
      }}
    </ConnectKitButton.Custom>
  )
}
