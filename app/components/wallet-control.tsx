"use client"

import { useEffect, useState } from "react"
import { ConnectKitButton, useSIWE } from "connectkit"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"
import {
  IS_OPEN_GATE_TEST_MODE,
  TEST_MODE_WALLET_ADDRESS,
} from "@/app/lib/test-mode"
import { useWrongNetwork } from "@/app/lib/web3/use-wrong-network"

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
  const { isWrongNetwork, targetChainName, isSwitching, switchToTargetChain } = useWrongNetwork()

  const base =
    // A fixed width keeps every state and translated label in the same footprint,
    // so the header never shifts as wallet or locale state changes.
    size === "mobile"
      ? "inline-flex h-9 w-[124px] items-center justify-center truncate rounded-full px-3 text-[14px] font-medium transition-colors sm:w-[136px] sm:px-4"
      : "inline-flex h-10 w-[152px] items-center justify-center truncate rounded-full px-4 font-sans text-[15px] font-medium transition-colors"
  const brand = cn(base, "bg-brand text-brand-foreground hover:bg-brand/90")
  const pill = cn(base, "gap-2 border border-border bg-transparent text-foreground hover:bg-surface-inset")

  if (IS_OPEN_GATE_TEST_MODE) {
    // Size to content (no fixed width / truncate) so the label never clips to
    // "TEST WAL…"; test mode has no other wallet states to stay aligned with.
    return (
      <div
        className={cn(
          "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border bg-transparent px-3 text-foreground",
          size === "mobile" ? "sm:h-10 sm:px-4" : "h-10 px-4",
        )}
        title={TEST_MODE_WALLET_ADDRESS}
        data-testid="test-mode-wallet"
      >
        <span
          aria-hidden
          className="size-5 shrink-0 rounded-full ring-1 ring-border"
          style={{ background: walletGradient(TEST_MODE_WALLET_ADDRESS) }}
        />
        <span className="whitespace-nowrap font-data text-[12px] font-semibold uppercase tracking-wide text-amber-500">
          Test wallet
        </span>
      </div>
    )
  }

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
        if (isWrongNetwork) {
          // Block the sign-in gate (and thus every authed action) until the wallet is
          // on the target chain. The switch prompt replaces the normal wallet states.
          const switchLabel = t("Switch to {chain}").replace("{chain}", targetChainName)
          return (
            <button
              type="button"
              onClick={() => void switchToTargetChain()}
              disabled={isSwitching}
              className={cn(
                base,
                "border border-amber-500/40 bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 disabled:opacity-70 dark:text-amber-200",
              )}
              aria-label={switchLabel}
            >
              {isSwitching ? t("Switching…") : t("Wrong network")}
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
            <span className="max-w-[110px] truncate font-data tabular-nums">{ensName ?? truncatedAddress}</span>
          </button>
        )
      }}
    </ConnectKitButton.Custom>
  )
}
