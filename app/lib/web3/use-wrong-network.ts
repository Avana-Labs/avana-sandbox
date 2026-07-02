"use client"

import { useCallback, useState } from "react"
import { useAccount, useSwitchChain } from "wagmi"
import { IS_DEV_SHORTCUT_MODE } from "@/app/lib/test-mode"
import { TARGET_CHAIN_ID, TARGET_CHAIN_NAME } from "@/app/lib/web3/target-chain"

export type WrongNetworkState = {
  /** True only when a wallet is connected AND on a chain other than the target. */
  isWrongNetwork: boolean
  /** The chain the app requires (e.g. "Ethereum"). */
  targetChainName: string
  targetChainId: number
  /** A switch request is in flight (wallet prompt open). */
  isSwitching: boolean
  /** Human-readable reason the last switch attempt failed, or null. */
  switchError: string | null
  /** Ask the wallet to switch to the target chain; resolves true on success. */
  switchToTargetChain: () => Promise<boolean>
}

/**
 * Detects when the connected wallet is on the wrong chain and exposes a switch
 * action. Actions must be blocked while `isWrongNetwork` is true so a user can't
 * transact against a network the app doesn't support. In the headless QA test mode
 * there is no live wagmi connection, so wrong-network detection is disabled.
 */
export function useWrongNetwork(): WrongNetworkState {
  const { isConnected, chainId } = useAccount()
  const { switchChainAsync, isPending } = useSwitchChain()
  const [switchError, setSwitchError] = useState<string | null>(null)

  const isWrongNetwork =
    !IS_DEV_SHORTCUT_MODE && isConnected && chainId != null && chainId !== TARGET_CHAIN_ID

  const switchToTargetChain = useCallback(async (): Promise<boolean> => {
    setSwitchError(null)
    try {
      await switchChainAsync({ chainId: TARGET_CHAIN_ID })
      return true
    } catch (error) {
      // A user rejecting the wallet prompt (or a wallet that can't switch) must not
      // crash the app — surface it and let them retry.
      setSwitchError(
        error instanceof Error && error.message
          ? error.message
          : `Could not switch to ${TARGET_CHAIN_NAME}.`,
      )
      return false
    }
  }, [switchChainAsync])

  return {
    isWrongNetwork,
    targetChainName: TARGET_CHAIN_NAME,
    targetChainId: TARGET_CHAIN_ID,
    isSwitching: isPending,
    switchError,
    switchToTargetChain,
  }
}
