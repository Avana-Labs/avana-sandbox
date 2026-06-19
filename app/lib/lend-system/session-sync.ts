export const LEND_SESSION_SYNC_EVENT = "avana:lend-session-sync"

export function notifyLendSessionChanged(walletId: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(LEND_SESSION_SYNC_EVENT, { detail: { walletId } }))
}
