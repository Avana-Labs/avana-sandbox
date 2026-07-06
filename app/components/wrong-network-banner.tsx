"use client"

import dynamic from "next/dynamic"
import { useWalletGate } from "@/app/lib/web3/wallet-gate"

// The banner body statically imports a wagmi hook, so it is code-split and only loaded once
// the wallet SDK is mounted. ssr:false — the gate only goes active client-side.
const WrongNetworkBannerInner = dynamic(
  () => import("@/app/components/wrong-network-banner-inner").then((m) => m.WrongNetworkBannerInner),
  { ssr: false },
)

/**
 * App-wide guard: when the connected wallet is on the wrong chain, a blocking banner appears
 * under the header prompting the user to switch. Actions elsewhere gate on the same
 * `useWrongNetwork()` state, so nothing can be submitted until the wallet is back on the
 * target chain.
 *
 * Split so the wagmi hook is only reached once the wallet SDK is mounted — a guest with no
 * wallet can't be on the wrong network, and there is no wagmi context to read yet.
 */
export function WrongNetworkBanner() {
  const { active } = useWalletGate()
  if (!active) return null
  return <WrongNetworkBannerInner />
}
