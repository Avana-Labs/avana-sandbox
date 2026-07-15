"use client"

import { useEffect, useRef } from "react"
import { ConnectKitButton, useSIWE } from "connectkit"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"
import { useWrongNetwork } from "@/app/lib/web3/use-wrong-network"
import { useWalletGate } from "@/app/lib/web3/wallet-gate"
import { walletButtonClasses, walletGradient, type WalletControlSize } from "@/app/components/wallet-control-shared"

/**
 * Full wallet control, dynamically loaded ONLY once the wallet SDK is mounted (see
 * `wallet-control.tsx`). Everything in this module statically imports connectkit + wagmi, so
 * it must never be on the critical path for a guest. ConnectKit + SIWE drive a three-state flow:
 *   not connected  → "Connect" (opens the ConnectKit modal)
 *   connected only → "Sign in" (runs the SIWE signature once)
 *   signed in      → an account pill that opens the modal (switch / disconnect)
 * Clicking the signed-in pill opens the account view — it never silently signs you out.
 */
export function ConnectedWalletControl({ size }: { size: WalletControlSize }) {
  const { t } = useTranslation()
  const siwe = useSIWE()
  const isSignedIn = Boolean(siwe?.isSignedIn)
  const signingIn = Boolean(siwe?.isLoading)
  const { isWrongNetwork, targetChainName, isSwitching, switchToTargetChain } = useWrongNetwork()
  const { consumeAutoOpen } = useWalletGate()

  const { base, brand, pill } = walletButtonClasses(size)

  // A guest who clicked "Connect" while idle triggered the SDK load; this control has now
  // mounted. Honor that intent by opening the ConnectKit modal via its own `show` (the
  // reliable opener), so a single click is enough. Retry briefly until `show` is wired.
  const showRef = useRef<(() => void) | null>(null)
  const autoOpenHandledRef = useRef(false)
  useEffect(() => {
    if (autoOpenHandledRef.current) return
    if (!consumeAutoOpen()) return
    autoOpenHandledRef.current = true
    let tries = 0
    const id = setInterval(() => {
      tries += 1
      if (showRef.current) {
        showRef.current()
        clearInterval(id)
      } else if (tries >= 20) {
        clearInterval(id)
      }
    }, 30)
    return () => clearInterval(id)
  }, [consumeAutoOpen])

  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, truncatedAddress, ensName, address }) => {
        showRef.current = show ?? null
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
