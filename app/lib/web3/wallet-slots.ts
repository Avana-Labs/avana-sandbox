"use client"

import { useCallback, useId, useSyncExternalStore } from "react"

/**
 * The wallet SDK (wagmi + ConnectKit) is mounted as a sibling of the app tree, never as an
 * ancestor — wrapping the app and flipping the wrapper on when the SDK finished loading
 * remounted the ENTIRE app (header, gates, Convex provider, page) seconds after first paint.
 *
 * The few components that need wagmi context (header wallet pill, wrong-network banner) render
 * an empty "slot" element in the app tree and register it here; the SDK host renders the real
 * component into that slot with a portal. Nothing in the app tree ever changes parent.
 */
export type WalletSlotKind = "wallet-control-desktop" | "wallet-control-mobile" | "wrong-network-banner"

export type WalletSlot = { id: string; kind: WalletSlotKind; element: HTMLElement }

let slots: WalletSlot[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => slots
const EMPTY: WalletSlot[] = []
const getServerSnapshot = () => EMPTY

function register(slot: WalletSlot) {
  slots = [...slots.filter((s) => s.id !== slot.id), slot]
  emit()
}

function unregister(id: string) {
  if (!slots.some((s) => s.id === id)) return
  slots = slots.filter((s) => s.id !== id)
  emit()
}

/** Ref callback for a slot element; registers on mount, unregisters on unmount. */
export function useWalletSlotRef(kind: WalletSlotKind) {
  const id = useId()
  return useCallback(
    (element: HTMLElement | null) => {
      if (element) register({ id, kind, element })
      else unregister(id)
    },
    [id, kind],
  )
}

/** Live list of registered slots (read by the SDK host to render portals). */
export function useWalletSlots(): WalletSlot[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
