"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"
import { useWalletGate } from "@/app/lib/web3/wallet-gate"

/**
 * Loads the wallet SDK (wagmi + viem + connectkit + walletconnect + coinbase — ~1MB+ of JS)
 * only once the gate is active. `ssr: false` keeps it out of the server bundle and off the
 * client critical path; wagmi hydrates the wallet session client-side. Until then children
 * render as a plain passthrough with no wagmi context at all.
 *
 * The gate flips `active` only after this module has already been imported (see
 * `wallet-gate.tsx`), so this component mounts against a warm cache — no blank-while-loading.
 */
const LazyWeb3Provider = dynamic(
  () => import("@/app/lib/web3/web3-provider").then((m) => m.Web3Provider),
  { ssr: false },
)

export function Web3ProviderBoundary({ children }: { children: ReactNode }) {
  const { active } = useWalletGate()
  if (!active) return <>{children}</>
  return <LazyWeb3Provider>{children}</LazyWeb3Provider>
}
