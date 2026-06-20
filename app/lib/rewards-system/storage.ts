import type { RewardsSessionState } from "./contracts"

const REWARDS_STATE_PREFIX = "avana.rewards.session.v1"

function stateKey(walletId: string) {
  return `${REWARDS_STATE_PREFIX}:${walletId}`
}

export function buildDefaultRewardsSessionState(): RewardsSessionState {
  return {
    events: [],
    claims: [],
    referralProfiles: {},
    relationships: [],
    firstLoginAt: 0,
    favoriteMarketIds: [],
  }
}

export function readRewardsSessionState(walletId: string, sessionSeed: string): RewardsSessionState {
  if (typeof window === "undefined") {
    return JSON.parse(sessionSeed) as RewardsSessionState
  }

  const raw = window.localStorage.getItem(stateKey(walletId))
  if (!raw) return JSON.parse(sessionSeed) as RewardsSessionState
  return JSON.parse(raw) as RewardsSessionState
}

export function writeRewardsSessionState(walletId: string, state: RewardsSessionState) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(stateKey(walletId), JSON.stringify(state))
}

export function clearRewardsSessionState(walletId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(stateKey(walletId))
}

export function buildDefaultRewardsSessionSeed() {
  return JSON.stringify(buildDefaultRewardsSessionState())
}
