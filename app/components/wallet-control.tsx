"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { IS_DEV_SHORTCUT_MODE, TEST_MODE_WALLET_ADDRESS } from "@/app/lib/test-mode"
import { useWalletGate } from "@/app/lib/web3/wallet-gate"
import { useSiweToken } from "@/app/lib/siwe/use-siwe-auth"
import {
  walletButtonClasses,
  walletGradient,
  truncateAddress,
  type WalletControlSize,
} from "@/app/components/wallet-control-shared"

// The connected control statically imports connectkit + wagmi, so it is code-split and only
// loaded once the gate is active. ssr:false — it never renders during SSR (the gate only goes
// active client-side), so there is no hydration to match.
const ConnectedWalletControl = dynamic(
  () => import("@/app/components/wallet-control-connected").then((m) => m.ConnectedWalletControl),
  { ssr: false },
)

/**
 * Single wallet control for the whole app. It picks one of three implementations:
 *   - dev open-gate/test mode  → the shared dev wallet rendered as a real address pill
 *   - wallet SDK not mounted   → the lightweight idle control (Connect / token account pill)
 *   - wallet SDK mounted       → the full ConnectKit + SIWE flow (dynamically loaded)
 *
 * This module has NO static wagmi/connectkit imports, so a guest never downloads the wallet
 * SDK just to render the header's Connect button.
 */
export function WalletControl({ size = "desktop" }: { size?: WalletControlSize }) {
  const { active } = useWalletGate()
  if (IS_DEV_SHORTCUT_MODE) return <DevWalletControl size={size} />
  return active ? <ConnectedWalletControl size={size} /> : <IdleWalletControl size={size} />
}

/**
 * Dev open-gate: the shared dev wallet reads+writes real Convex just like any user.
 * Render it as a normal connected wallet — truncated address + gradient icon — so the
 * dev environment matches production. No amber "Test wallet" label.
 */
function DevWalletControl({ size }: { size: WalletControlSize }) {
  const { pill } = walletButtonClasses(size)
  const address = TEST_MODE_WALLET_ADDRESS
  return (
    <div className={pill} title={address} data-testid="test-mode-wallet" aria-label={address}>
      <span
        aria-hidden
        className="size-5 shrink-0 rounded-full ring-1 ring-border"
        style={{ background: walletGradient(address) }}
      />
      <span className="max-w-[110px] truncate font-data tabular-nums">{truncateAddress(address)}</span>
    </div>
  )
}

/**
 * Wagmi-free control shown before the wallet SDK mounts. Reads only the persisted SIWE
 * token. Clicking either state calls `connect()`, which loads the SDK and (for a fresh
 * connect) auto-opens the modal — a returning signed-in user's SDK is already mounting via
 * the gate's restore effect, so their pill just brings up the account view.
 *
 * Anti-flicker: wallet/token state is client-only, so SSR + the first client render show a
 * fixed-width "Connect" placeholder that exactly matches the real button.
 */
function IdleWalletControl({ size }: { size: WalletControlSize }) {
  const { t } = useTranslation()
  const { connect } = useWalletGate()
  const token = useSiweToken()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { brand, pill } = walletButtonClasses(size)

  if (!mounted) {
    return (
      <span className={brand} aria-hidden>
        {t("Connect")}
      </span>
    )
  }

  if (token?.wallet) {
    const address = token.wallet
    return (
      <button type="button" onClick={connect} className={pill} title={address}>
        <span
          aria-hidden
          className="size-5 shrink-0 rounded-full ring-1 ring-border"
          style={{ background: walletGradient(address) }}
        />
        <span className="max-w-[110px] truncate font-data tabular-nums">{truncateAddress(address)}</span>
      </button>
    )
  }

  return (
    <button type="button" onClick={connect} className={brand} aria-label={t("Connect")}>
      {t("Connect")}
    </button>
  )
}
