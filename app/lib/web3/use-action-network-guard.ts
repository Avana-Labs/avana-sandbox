"use client"

import { useWrongNetwork } from "@/app/lib/web3/use-wrong-network"

export type ActionNetworkGuard = {
  /** True when a wallet is connected on a chain other than the target (never in test mode). */
  isWrongNetwork: boolean
  /**
   * Non-null when a transaction submission must be blocked. Safe to feed straight into an
   * action CTA's blockedReason so the confirm button disables and the reason is shown.
   */
  blockedReason: string | null
}

/**
 * Submit-time network gate for borrow/lend/multiply action pages.
 *
 * The wrong-network banner is display-only; nothing previously stopped a user on the wrong
 * chain from previewing, confirming and persisting an action. This hook is the single source
 * the action clients use to hard-block submission (and disable the confirm CTA) until the
 * wallet is on the target chain. Inert in the headless/test mode (useWrongNetwork returns
 * false), so it never interferes with the sandbox flows.
 */
export function useActionNetworkGuard(): ActionNetworkGuard {
  const { isWrongNetwork, targetChainName } = useWrongNetwork()
  return {
    isWrongNetwork,
    blockedReason: isWrongNetwork ? `Switch your wallet to ${targetChainName} to continue.` : null,
  }
}
